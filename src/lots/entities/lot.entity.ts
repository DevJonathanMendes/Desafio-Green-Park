import { Column, CreateDateColumn, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { InvoicesEntity } from '../../invoices/entities/invoices.entity';

@Entity({ name: 'Lots' })
export class LotsEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column('varchar', { length: 100 })
  name: string;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @OneToMany(() => InvoicesEntity, ({ lot }) => lot)
  invoices: InvoicesEntity[];
}
