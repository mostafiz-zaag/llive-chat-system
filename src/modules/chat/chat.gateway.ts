import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { NatsService } from '../common/nats.service';
import { AgentService } from '../agents/agent.service'; // Make sure to import AgentService

@WebSocketGateway({ cors: true, namespace: '/chat' })
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;
  private activeChats = new Map<string, string>();
  private waitingUsers: string[] = []; // Store waiting users

  constructor(
    private readonly natsService: NatsService,
    private readonly agentService: AgentService, // Inject the AgentService
  ) {}

  async handleConnection(client: Socket) {
    console.log(`✅ Client connected: ${client.id}`);
  }

  async handleDisconnect(client: Socket) {
    console.log(`❌ Client disconnected: ${client.id}`);
    this.cleanupDisconnectedUser(client.id);
  }

  private cleanupDisconnectedUser(clientId: string) {
    const chatPartner = this.activeChats.get(clientId);
    if (chatPartner) {
      this.activeChats.delete(clientId);
      this.activeChats.delete(chatPartner);
      this.server.to(chatPartner).emit('chat_ended', {
        message: 'Chat partner disconnected.',
      });
    }
  }

  @SubscribeMessage('agent_ready')
  async handleAgentReady(client: Socket) {
    console.log(`✅ Agent ${client.id} is ready.`);

    if (this.waitingUsers.length > 0) {
      const nextUser = this.waitingUsers.shift();
      if (!nextUser) {
        console.warn(`⚠️ No valid waiting user found.`);
        return;
      }
      console.log(`🆕 Assigning Agent ${client.id} to Waiting User ${nextUser}`);
      this.startChat(nextUser, client.id);
    } else {
      console.log(`♻️ No waiting users. Agent ${client.id} added to queue.`);
      await this.natsService.publish('agent_queue', { agentId: client.id });
    }
  }

  @SubscribeMessage('user_request_chat')
  async handleUserRequest(client: Socket) {
    console.log(`📩 User ${client.id} requested a chat`);

    const assignedAgent = await this.natsService.getNextAvailableAgent();

    if (!assignedAgent) {
      console.log(`⏳ No available agents. User ${client.id} is waiting.`);
      this.waitingUsers.push(client.id);
      this.server
        .to(client.id)
        .emit('chat_wait', { message: 'No agents available. Please wait...' });
      return;
    }

    console.log(`🔗 Assigning Agent ${assignedAgent} to User ${client.id}`);
    this.startChat(client.id, assignedAgent);
  }

  private startChat(userId: string, agentId: string) {
    if (!userId || !agentId) {
      console.error(`❌ Error: Invalid chat participants. userId: ${userId}, agentId: ${agentId}`);
      return;
    }

    const roomId = `room_${userId}_${agentId}`;
    this.server.to(agentId).emit('chat_started', { userId, roomId });
    this.server.to(userId).emit('chat_started', { agentId, roomId });

    this.activeChats.set(userId, agentId);
    this.activeChats.set(agentId, userId);

    console.log(`💬 Chat started between ${userId} and ${agentId}`);
  }

  @SubscribeMessage('send_message')
  async handleSendMessage(
    client: Socket,
    data: { message: string; roomId: string },
  ) {
    const chatPartner = this.activeChats.get(client.id);
    if (!chatPartner) {
      console.warn(`⚠️ Message from ${client.id} ignored: No active chat.`);
      return;
    }

    console.log(`📨 Message from ${client.id} to ${chatPartner}: ${data.message}`);
    this.server
      .to(data.roomId)
      .emit('receive_message', { sender: client.id, message: data.message });
  }

  @SubscribeMessage('end_chat')
  async handleEndChat(client: Socket) {
    const chatPartner = this.activeChats.get(client.id);
    if (!chatPartner) {
      console.warn(`⚠️ End chat request from ${client.id} ignored: No active chat.`);
      return;
    }

    console.log(`🚪 Chat ended between ${client.id} and ${chatPartner}`);
    this.activeChats.delete(client.id);
    this.activeChats.delete(chatPartner);

    this.server.to(client.id).emit('chat_ended');
    this.server.to(chatPartner).emit('chat_ended');

    if (this.waitingUsers.length > 0) {
      const nextUser = this.waitingUsers.shift();
      if (!nextUser) {
        console.warn(`⚠️ No valid waiting user found.`);
        return;
      }
      console.log(`🆕 Assigning Agent ${chatPartner} to Waiting User ${nextUser}`);
      this.startChat(nextUser, chatPartner);
    } else {
      console.log(`♻️ No waiting users. Agent ${chatPartner} added back to queue.`);
      await this.natsService.publish('agent_queue', { agentId: chatPartner });
    }
  }
}
