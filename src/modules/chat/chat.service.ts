import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Chat } from './chat.entity';

@Injectable()
export class ChatService {
  constructor(
    @InjectRepository(Chat)
    private readonly chatRepository: Repository<Chat>,
  ) {}

  /**
   * Handle a user requesting a chat.
   */
  requestChat(userId: string) {
    return { message: `User ${userId} requested a chat` };
  }

  /**
   * Save a chat message to the database.
   */
  async saveMessage(
    userId: string,
    agentId: string,
    senderId: string,
    message: string,
  ) {
    const chat = this.chatRepository.create({
      userId,
      agentId,
      senderId,
      message,
    });
    return this.chatRepository.save(chat);
  }

  /**
   * Retrieve chat history between a user and an agent.
   */
  async getChatHistory(userId: string, agentId: string) {
    return this.chatRepository.find({
      where: { userId, agentId },
      order: { timestamp: 'ASC' },
    });
  }

  /**
   * Store a message in chat history.
   */
  async storeMessageInHistory(
    userId: string,
    agentId: string,
    message: string,
    senderId: string,
  ) {
    return this.saveMessage(userId, agentId, senderId, message);
  }
}
