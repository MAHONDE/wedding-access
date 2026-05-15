import { Module } from '@nestjs/common';
import { PrismaModule } from './common/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { CeremoniesModule } from './ceremonies/ceremonies.module';
import { GuestsModule } from './guests/guests.module';
import { QrModule } from './qr/qr.module';
import { InvitationsModule } from './invitations/invitations.module';
import { ScansModule } from './scans/scans.module';
import { SeatingModule } from './seating/seating.module';
import { BrandingModule } from './branding/branding.module';
import { StatsModule } from './stats/stats.module';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    UsersModule,
    CeremoniesModule,
    GuestsModule,
    QrModule,
    InvitationsModule,
    ScansModule,
    SeatingModule,
    BrandingModule,
    StatsModule,
  ],
})
export class AppModule {}
