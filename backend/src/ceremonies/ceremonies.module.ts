import { Module } from '@nestjs/common';
import { CeremoniesService } from './ceremonies.service';
import { CeremoniesController } from './ceremonies.controller';

@Module({
  providers: [CeremoniesService],
  controllers: [CeremoniesController],
})
export class CeremoniesModule {}
