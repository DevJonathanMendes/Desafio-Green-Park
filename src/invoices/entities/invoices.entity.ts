import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { LotsEntity } from '../../lots/entities/lot.entity';

@Entity({ name: 'Invoices' })
export class InvoicesEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column('varchar', { length: 255 })
  payerName: string;

  @ManyToOne(() => LotsEntity, ({ invoices }) => invoices, { onDelete: 'CASCADE' })
  @JoinColumn()
  lot: LotsEntity;

  @Column('decimal', { precision: 10, scale: 2 })
  amount: number;

  @Column('varchar', { length: 255 })
  digitalLine: string;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;
}
