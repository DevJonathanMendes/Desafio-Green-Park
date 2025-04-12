import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Buffer } from 'buffer';
import * as csv from 'fast-csv';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as pdfLib from 'pdf-lib';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { once, Readable } from 'stream';
import { In, Repository } from 'typeorm';
import { LotsEntity } from '../lots/entities/lot.entity';
import { InvoicesEntity } from './entities/invoices.entity';

@Injectable()
export class InvoicesService {
  constructor(
    @InjectRepository(InvoicesEntity)
    private readonly invoiceRepo: Repository<InvoicesEntity>,
    @InjectRepository(LotsEntity)
    private readonly lotRepo: Repository<LotsEntity>,
  ) {}

  getAllInvoices() {
    return this.invoiceRepo.find();
  }

  async importCSV(file: Express.Multer.File) {
    const stream = Readable.from(file.buffer);
    const invoices: InvoicesEntity[] = [];

    const imported: any[] = [];
    const notImported: { row: any; reason: string }[] = [];

    const lots = await this.lotRepo.find();

    // Cria um Map do nome do lote para o próprio lote (acesso rápido)
    const lotMap = new Map(lots.map((lot) => [lot.name, lot]));

    try {
      const csvStream = csv.parseStream(stream, { headers: true, delimiter: ';' });

      csvStream.on('data', (row) => {
        const { nome, unidade, valor, linha_digitavel } = row;

        if (!unidade) {
          notImported.push({ row, reason: 'Unidade não informada' });
          return;
        }

        const internalLotName = unidade.toString().padStart(4, '0'); // ex: 17 => '0017'
        const lot = lotMap.get(internalLotName);

        if (!lot) {
          notImported.push({
            row,
            reason: `Lote não encontrado: unidade='${unidade}' -> internalName='${internalLotName}'`,
          });
          return;
        }

        if (!nome || !valor || !linha_digitavel) {
          notImported.push({
            row,
            reason: 'Campos obrigatórios ausentes (nome, valor ou linha digitável)',
          });
          return;
        }

        const amount = parseFloat(valor.replace(',', '.'));
        if (isNaN(amount)) {
          notImported.push({
            row,
            reason: `Valor inválido: ${valor}`,
          });
          return;
        }

        const invoice = this.invoiceRepo.create({
          payerName: nome,
          amount,
          digitalLine: linha_digitavel,
          lot,
        });

        invoices.push(invoice);
        imported.push({
          nome,
          unidade,
          valor,
          linha_digitavel,
          lote_id: lot.id,
          nome_lote: lot.name,
        });
      });

      await once(csvStream, 'end');

      if (invoices.length > 0) {
        await this.invoiceRepo.save(invoices);
      }

      return {
        message: 'Importação finalizada.',
        importedCount: imported.length,
        notImportedCount: notImported.length,
        imported,
        notImported,
      };
    } catch (error) {
      console.error('Erro ao importar CSV:', error);
      throw new InternalServerErrorException('Erro ao processar o arquivo CSV.');
    }
  }

  async importPDF(file: Express.Multer.File) {
    try {
      const pdfBuffer = file.buffer;
      const pdfDoc = await pdfLib.PDFDocument.load(pdfBuffer);
      const totalPages = pdfDoc.getPageCount();

      // Ordem fixa de IDs conforme a ordem das páginas do PDF
      const ordemFixaIds = [2, 3, 1]; // Exemplo: página 1 = ID 2, página 2 = ID 3, etc.

      const boletos = await this.invoiceRepo.find({
        where: { id: In(ordemFixaIds) },
        select: { id: true },
      });

      // Ordena os boletos conforme a ordem fixa
      const boletosOrdenados = ordemFixaIds
        .map((id) => boletos.find((b) => b.id === id))
        .filter(Boolean);

      const outputDir = path.join(process.cwd(), 'uploads', 'boletos');
      await fs.mkdir(outputDir, { recursive: true });

      const arquivosGerados: string[] = [];
      const falharam: { motivo: string }[] = [];

      for (let i = 0; i < totalPages; i++) {
        const boleto = boletosOrdenados[i];

        if (!boleto) {
          falharam.push({ motivo: `Página ${i + 1} sem boleto correspondente.` });
          continue;
        }

        const newPdf = await pdfLib.PDFDocument.create();
        const [page] = await newPdf.copyPages(pdfDoc, [i]);
        newPdf.addPage(page);

        const pdfBytes = await newPdf.save();
        const outputFile = path.join(outputDir, `${boleto.id}.pdf`); // <--- Nome do arquivo é o ID
        await fs.writeFile(outputFile, pdfBytes);

        arquivosGerados.push(`${boleto.id}.pdf`);
      }

      return {
        message: 'Boletos processados com sucesso',
        totalBoletos: boletosOrdenados.length,
        totalPaginasPdf: totalPages,
        arquivosGerados,
        falharam,
      };
    } catch (error) {
      console.error('Erro inesperado ao dividir PDF:', error);
      throw new InternalServerErrorException('Erro ao dividir boletos em páginas.');
    }
  }

  async GenerateReport() {
    const boletos = await this.invoiceRepo.find({
      relations: { lot: true },
    });

    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage();
    const { width, height } = page.getSize();

    const fontSize = 12;
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    let y = height - 50;

    // Função para calcular a largura do texto
    const calculateTextWidth = (text: string, font: any, size: number) => {
      return font.widthOfTextAtSize(text, size);
    };

    // Colunas da tabela e os dados de cada boleto
    const headers = ['ID', 'Nome Sacado', 'ID Lote', 'Valor', 'Linha Digitável'];
    const data = boletos.map((boleto) => [
      String(boleto.id),
      boleto.payerName,
      String(boleto.lot.id),
      String(boleto.amount),
      boleto.digitalLine,
    ]);

    // Calcular a largura máxima de cada coluna com base nos textos
    const columnWidths = headers.map((header, i) => {
      const maxHeaderWidth = calculateTextWidth(header, font, fontSize);
      const maxDataWidth = Math.max(
        ...data.map((row) => calculateTextWidth(row[i], font, fontSize)),
      );
      return Math.max(maxHeaderWidth, maxDataWidth) + 10; // +10 para margens e espaçamento
    });

    // Calcular a posição X para cada coluna (distribuir a largura da página igualmente)
    let prevX = 50; // Margem inicial
    const positions = headers.map((header, i) => {
      const xPosition = prevX;
      prevX += columnWidths[i]; // Atualizar a posição para a próxima coluna
      return {
        header,
        x: xPosition,
        width: columnWidths[i],
      };
    });

    // Cabeçalho
    headers.forEach((header, i) => {
      page.drawText(header, {
        x: positions[i].x,
        y,
        size: fontSize,
        font,
        color: rgb(0, 0, 0),
      });
    });

    y -= 20;

    // Dados
    data.forEach((row) => {
      row.forEach((text, i) => {
        page.drawText(text, {
          x: positions[i].x,
          y,
          size: fontSize,
          font,
          color: rgb(0, 0, 0),
        });
      });
      y -= 20;
    });

    const pdfBytes = await pdfDoc.save();

    // return Buffer.from(pdfBytes).toString('base64');
    return { base64: Buffer.from(pdfBytes).toString('base64') };
  }
}
