import { Controller, Param, Post } from '@nestjs/common';
import { ChatService } from './chat.service';
import { NatsService } from '../common/nats.service';
import { WebSocketServer } from '@nestjs/websockets';
import { Server } from 'socket.io';

@Controller('users')
export class ChatController {
  constructor(
    private readonly chatService: ChatService,
    private readonly natsService: NatsService,
  ) {}

  @WebSocketServer()
  server: Server;

  private activeChats = new Map<string, string>(); // Map to store active chats
  private waitingUsers: string[] = []; // Stores users waiting for an agent

  @Post('request-chat/:userId')
  async requestChat(@Param('userId') userId: string) {
    console.log(`📩 User ${userId} requested a chat`);

    // Fetch the first available agent from NATS queue
    const assignedAgent = await this.natsService.getNextAvailableAgent();

    // If no agent is available, user waits
    if (!assignedAgent) {
      console.log(`⏳ No agents available. User ${userId} is waiting.`);
      this.waitingUsers.push(userId);
      return {
        message: `No available agents. User ${userId} added to the waiting list.`,
      };
    }

    // Remove agent from queue & start chat
    console.log(`🔗 Assigning Agent ${assignedAgent} to User ${userId}`);
    this.startChat(userId, assignedAgent);

    return {
      message: `User ${userId} is now chatting with Agent ${assignedAgent}`,
    };
  }

  // ✅ Start Chat Between User & Agent
  private startChat(userId: string, agentId: string) {
    if (!userId || !agentId) {
      console.error(
        `❌ Error: Invalid chat participants. userId: ${userId}, agentId: ${agentId}`,
      );
      return;
    }

    // Ensure agent is connected
    const agentSocket = this.server.sockets.sockets.get(agentId);
    if (!agentSocket) {
      console.error(`❌ Error: Agent ${agentId} is not connected.`);
      return;
    }

    const roomId = `room_${userId}_${agentId}`;
    this.server.to(agentId).emit('chat_started', { userId, roomId });
    this.server.to(userId).emit('chat_started', { agentId, roomId });

    this.activeChats.set(userId, agentId);
    this.activeChats.set(agentId, userId);

    console.log(`💬 Chat started between ${userId} and ${agentId}`);
  }

  // ✅ Assign Waiting Users When an Agent Becomes Available
  async assignWaitingUser(agentId: string) {
    if (this.waitingUsers.length > 0) {
      const nextUser = this.waitingUsers.shift(); // Get first waiting user
      if (nextUser) {
        console.log(
          `🆕 Assigning Agent ${agentId} to Waiting User ${nextUser}`,
        );
        this.startChat(nextUser, agentId);
      }
    } else {
      // If no users are waiting, return agent to queue
      console.log(`♻️ No users waiting. Agent ${agentId} added back to queue.`);
      await this.natsService.publish('agent_queue', { agentId });
    }
  }
}
