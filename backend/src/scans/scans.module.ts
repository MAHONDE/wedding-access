import { Module } from '@nestjs/common';
import { ScansService } from './scans.service';
import { ScansController } from './scans.controller';
import { StatsModule } from '../stats/stats.module';

@Module({
  imports: [StatsModule],
  providers: [ScansService],
  controllers: [ScansController],
})
export class ScansModule {}
