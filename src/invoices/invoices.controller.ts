import {
  BadRequestException,
  Controller,
  FileTypeValidator,
  Get,
  MaxFileSizeValidator,
  ParseFilePipe,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { InvoicesService } from './invoices.service';

@Controller('invoices')
export class InvoicesController {
  constructor(private readonly invoicesService: InvoicesService) {}

  @Get()
  async getAllInvoices(@Query('relatorio') report: string) {
    const reportNum = Number(report);
    const isReportNumValid = !isNaN(reportNum) && Number.isInteger(reportNum);

    if (isReportNumValid) {
      if (reportNum !== 1) {
        return 'Para gerar o relatório, o valor deve ser 1';
      }

      return this.invoicesService.GenerateReport();
    }

    return this.invoicesService.getAllInvoices();
  }

  @Post('import')
  @UseInterceptors(FileInterceptor('file'))
  uploadCSV(
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 3000000 }),
          new FileTypeValidator({ fileType: /^text\/(csv)$/ }),
        ],
      }),
    )
    file: Express.Multer.File,
  ) {
    return this.invoicesService.importCSV(file);
  }

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadPdf(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('Nenhum arquivo foi enviado.');
    }

    return this.invoicesService.importPDF(file);
  }
}
