import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AgentController } from './agent.controller';
import { AgentService } from './agent.service';
import { Agent } from './agent.entity'; // ✅ Import Agent entity
import { NatsService } from '../common/nats.service'; // ✅ Import NatsService

@Module({
  imports: [TypeOrmModule.forFeature([Agent])], // ✅ Register Agent entity
  controllers: [AgentController],
  providers: [AgentService, NatsService], // ✅ Provide services
  exports: [AgentService],
})
export class AgentModule {}
