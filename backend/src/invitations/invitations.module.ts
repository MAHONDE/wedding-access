import { Module } from '@nestjs/common';
import { InvitationsService } from './invitations.service';
import { InvitationsController } from './invitations.controller';
import { QrModule } from '../qr/qr.module';

@Module({
  imports: [QrModule],
  providers: [InvitationsService],
  controllers: [InvitationsController],
})
export class InvitationsModule {}
