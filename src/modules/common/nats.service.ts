import { Injectable, OnModuleInit } from '@nestjs/common';
import {
  connect,
  consumerOpts,
  JetStreamClient,
  JetStreamManager,
  JetStreamSubscription,
  NatsConnection,
} from 'nats';

@Injectable()
export class NatsService implements OnModuleInit {
  private nc: NatsConnection;
  private js: JetStreamClient;
  private jsm: JetStreamManager;

  async onModuleInit() {
    await this.connect();
  }

  async connect() {
    if (!this.nc) {
      this.nc = await connect({
        servers: process.env.NATS_SERVER || 'nats://localhost:4222',
      });
      this.js = this.nc.jetstream();
      this.jsm = await this.nc.jetstreamManager();
      console.log('✅ NATS JetStream Connected');
    }
  }

  async publish(queue: string, data: any) {
    console.log(`📤 Publishing to queue: ${queue}`, data);
    const msg = JSON.stringify(data);
    await this.js.publish(queue, Buffer.from(msg));
  }

  async subscribe(queue: string, callback: (data: any) => void) {
    try {
      console.log(`✅ Subscribing to queue: ${queue}`);

      const opts = consumerOpts();
      opts.durable(queue);
      opts.ackExplicit();
      opts.deliverAll();
      opts.manualAck();

      const sub: JetStreamSubscription = await this.js.pullSubscribe(
        queue,
        opts,
      );

      (async () => {
        for await (const msg of sub) {
          try {
            const parsedData = JSON.parse(msg.data.toString());
            console.log(`📥 Received message from queue ${queue}:`, parsedData);
            callback(parsedData);
            msg.ack();
          } catch (error) {
            console.error(`❌ Error processing NATS message:`, error);
          }
        }
      })();
    } catch (error) {
      console.error(`❌ Error subscribing to NATS queue '${queue}':`, error);
    }
  }

  async getNextAvailableAgent(): Promise<string | null> {
    try {
      console.log(`🔄 Checking for available agents in NATS queue...`);

      // Fetching the consumer to retrieve the messages
      const consumer = await this.js.consumers.get(
        'AGENT_STREAM',
        'agent_queue',
      );
      console.log(`✅ Consumer found for 'agent_queue'. Fetching messages...`);

      // Fetch a single message with a timeout of 5 seconds
      const messages = await consumer.fetch({ max_messages: 1, expires: 5000 });

      let agentId: string | null = null;

      // Iterate over the fetched messages (if any)
      for await (const msg of messages) {
        console.log(`📥 Message received: ${msg.data.toString()}`);

        // Parse the received message
        const parsedData = JSON.parse(msg.data.toString());
        console.log(`📥 Assigned agent from queue:`, parsedData);

        // Acknowledge the message to remove it from the queue
        msg.ack();
        agentId = parsedData.agentId; // Set the agentId from the message
        break; // Break after processing the first message
      }

      // Check if an agent was successfully assigned
      if (agentId) {
        console.log(`✅ Assigned agent: ${agentId}`);
        return agentId;
      } else {
        console.log('❌ No available agents in queue.');
        return null;
      }
    } catch (error) {


      console.error(`❌ Error pulling from NATS queue:`, error);
      return null;
    }
  }
}
