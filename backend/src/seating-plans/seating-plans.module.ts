import { Module } from '@nestjs/common';
import { SeatingPlansService } from './seating-plans.service';
import { SeatingPlansController } from './seating-plans.controller';

@Module({
  providers: [SeatingPlansService],
  controllers: [SeatingPlansController],
})
export class SeatingPlansModule {}
