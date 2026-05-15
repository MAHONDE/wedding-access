import { Module } from '@nestjs/common';
import { StatsService } from './stats.service';
import { StatsController } from './stats.controller';
import { StatsGateway } from './stats.gateway';

@Module({
  providers: [StatsService, StatsGateway],
  controllers: [StatsController],
  exports: [StatsGateway],
})
export class StatsModule {}
