import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class Agent {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', unique: true }) // ✅ Explicitly define as string
  agentId: string;

  @Column({ type: 'boolean', default: true }) // ✅ Explicitly define as boolean
  isActive: boolean;
}
