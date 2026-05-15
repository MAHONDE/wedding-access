import { Module } from '@nestjs/common';
import { ScansService } from './scans.service';
import { ScansController } from './scans.controller';

@Module({
  providers: [ScansService],
  controllers: [ScansController],
})
export class ScansModule {}
