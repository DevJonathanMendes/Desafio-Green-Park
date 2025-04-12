import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LotsEntity } from '../lots/entities/lot.entity';
import { InvoicesEntity } from './entities/invoices.entity';
import { InvoicesController } from './invoices.controller';
import { InvoicesService } from './invoices.service';

@Module({
  imports: [TypeOrmModule.forFeature([InvoicesEntity, LotsEntity])],
  controllers: [InvoicesController],
  providers: [InvoicesService],
})
export class InvoicesModule {}
