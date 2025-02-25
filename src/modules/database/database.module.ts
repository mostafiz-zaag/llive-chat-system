import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Chat } from '../chat/chat.entity';
import { Agent } from '../agents/agent.entity';
import { createConnection } from 'typeorm';
import { Client } from 'pg';

@Module({
  imports: [
    ConfigModule.forRoot(),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        const database = configService.get<string>('DATABASE_NAME');
        const user = configService.get<string>('DATABASE_USER');
        const password = configService.get<string>('DATABASE_PASS');
        const host = configService.get<string>('DATABASE_HOST');
        const port = configService.get<number>('DATABASE_PORT');

        // ✅ Automatically create the database if it doesn't exist
        const client = new Client({
          user,
          password,
          host,
          port,
          database: 'postgres', // Connect to the default database
        });

        await client.connect();
        const result = await client.query(`SELECT 1
                                           FROM pg_database
                                           WHERE datname = '${database}'`);
        if (result.rowCount === 0) {
          await client.query(`CREATE DATABASE "${database}"`);
          console.log(`✅ Database "${database}" created successfully!`);
        }
        await client.end();

        return {
          type: 'postgres',
          host,
          port,
          username: user,
          password,
          database,
          entities: [Chat, Agent],
          synchronize: true,
        };
      },
      inject: [ConfigService],
    }),
  ],
})
export class DatabaseModule {}
