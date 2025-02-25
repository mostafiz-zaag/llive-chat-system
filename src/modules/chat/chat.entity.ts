import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity()
export class Chat {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  userId: string;

  @Column()
  agentId: string;

  @Column()
  senderId: string;

  @Column('text')
  message: string;

  @CreateDateColumn()
  timestamp: Date;
}
