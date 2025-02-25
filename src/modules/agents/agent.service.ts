import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Agent } from './agent.entity';

@Injectable()
export class AgentService {
  constructor(
    @InjectRepository(Agent)
    private readonly agentRepository: Repository<Agent>, // ✅ Inject Repository
  ) {}

  async markAgentOnline(agentId: string) {
    let agent = await this.agentRepository.findOne({ where: { agentId } });

    if (!agent) {
      agent = this.agentRepository.create({ agentId, isActive: true });
    } else {
      agent.isActive = true;
    }

    await this.agentRepository.save(agent);
  }

  async getActiveAgentsCount(): Promise<number> {
    return this.agentRepository.count({ where: { isActive: true } });
  }
}
