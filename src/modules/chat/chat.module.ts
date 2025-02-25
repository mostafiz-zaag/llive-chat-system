import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm'; // ✅ Import TypeORM
import { Chat } from './chat.entity'; // ✅ Import Chat entity
import { ChatService } from './chat.service';
import { ChatController } from './chat.controller';
import { ChatGateway } from './chat.gateway';
import { CommonModule } from '../common/common.module';
import { AgentModule } from '../agents/agent.module'; // ✅ Import AgentModule

@Module({
  imports: [
    TypeOrmModule.forFeature([Chat]), // ✅ Register Chat entity
    CommonModule,
    AgentModule, // ✅ Import AgentModule to access AgentService
  ],
  providers: [ChatService, ChatGateway],
  controllers: [ChatController],
  exports: [ChatService],
})
export class ChatModule {}
