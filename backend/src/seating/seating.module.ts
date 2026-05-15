import { Module } from '@nestjs/common';
import { SeatingService } from './seating.service';
import { SeatingController } from './seating.controller';

@Module({
  providers: [SeatingService],
  controllers: [SeatingController],
})
export class SeatingModule {}
