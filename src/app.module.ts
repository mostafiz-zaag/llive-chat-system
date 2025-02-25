import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './modules/database/database.module';
import { NatsService } from './modules/common/nats.service';
import { AgentModule } from './modules/agents/agent.module';
import { ChatModule } from './modules/chat/chat.module';

@Module({
  imports: [ConfigModule.forRoot(), DatabaseModule, AgentModule, ChatModule],
  providers: [NatsService],
})
export class AppModule {}
