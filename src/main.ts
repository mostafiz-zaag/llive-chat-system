import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { NatsService } from './modules/common/nats.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useWebSocketAdapter(new IoAdapter(app));

  const natsService = app.get(NatsService);
  await natsService.connect(); // ✅ Ensure NATS is connected
  console.log('✅ NATS JetStream Connected');

  await app.listen(3000, '0.0.0.0'); // ✅ Binds to all interfaces (fix)
  console.log('🚀 Server running on http://localhost:3000');
}

bootstrap();
