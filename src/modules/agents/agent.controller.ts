import {
  Controller,
  Post,
  Get,
  Param,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { AgentService } from './agent.service';
import { NatsService } from '../common/nats.service';

@Controller('agents')
export class AgentController {
  constructor(
    private readonly agentService: AgentService,
    private readonly natsService: NatsService, // ✅ Inject NATS Service
  ) {}

  /**
   * ✅ Marks an agent as "ready" and automatically adds them to the NATS queue.
   */
  @Post('ready/:agentId')
  async markAgentReady(@Param('agentId') agentId: string) {
    try {
      // Mark the agent as online
      await this.agentService.markAgentOnline(agentId);
      console.log(`✅ Agent ${agentId} marked as online.`);

      // ✅ Publish agent to NATS queue automatically
      console.log(`✅ Agent ${agentId} is ready. Adding to queue.`);
      await this.natsService.publish('agent_queue', { agentId });

      console.log(`✅ Agent ${agentId} added to the queue.`);
      return {
        message: `Agent ${agentId} is now ready and added to the queue.`,
      };
    } catch (error) {
      console.error(
        `❌ Error while adding Agent ${agentId} to the queue:`,
        error,
      );
      throw new HttpException(
        `Failed to add Agent ${agentId} to the queue.`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * ✅ Returns the count of currently active agents.
   */
  @Get('active-count')
  async getActiveAgentsCount() {
    try {
      const count = await this.agentService.getActiveAgentsCount();
      return { activeAgents: count };
    } catch (error) {
      console.error(`❌ Error fetching active agents count:`, error);
      throw new HttpException(
        'Failed to fetch active agents count.',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
