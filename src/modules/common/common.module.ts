import { Module } from '@nestjs/common';
import { NatsService } from './nats.service';

@Module({
  providers: [NatsService], // ✅ Register NatsService here
  exports: [NatsService], // ✅ Export it for other modules
})
export class CommonModule {}
