import { IsOptional, IsString, IsNumberString } from 'class-validator';

export class GetInvoicesQueryDto {
  @IsOptional()
  @IsString()
  nome?: string;

  @IsOptional()
  @IsNumberString()
  valor_inicial?: string;

  @IsOptional()
  @IsNumberString()
  valor_final?: string;

  @IsOptional()
  @IsNumberString()
  id_lote?: string;
}
