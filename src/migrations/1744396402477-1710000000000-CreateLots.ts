import { MigrationInterface, QueryRunner, Table } from 'typeorm';
import { LotsEntity } from '../lots/entities/lot.entity';

const lots = Array.from({ length: 100 }, (_, i) => ({
  id: i,
  name: (i + 5).toString().padStart(4, '0'),
}));

export class InsertLots1710000000001 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'Lots',
        columns: [
          {
            name: 'id',
            type: 'serial',
            isPrimary: true,
          },
          {
            name: 'name',
            type: 'varchar',
            length: '100',
            isNullable: false,
          },
          {
            name: 'isActive',
            type: 'boolean',
            default: true,
          },
          {
            name: 'createdAt',
            type: 'timestamp with time zone',
            default: 'now()',
          },
        ],
      }),
    );

    await queryRunner.manager.getRepository(LotsEntity).insert(lots);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('Lots');
  }
}
