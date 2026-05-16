import { Module } from '@nestjs/common';
import { PrismaModule } from './common/prisma.module';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { CeremoniesModule } from './ceremonies/ceremonies.module';
import { GuestsModule } from './guests/guests.module';
import { QrModule } from './qr/qr.module';
import { TemplatesModule } from './templates/templates.module';
import { InvitationsModule } from './invitations/invitations.module';
import { ScansModule } from './scans/scans.module';
import { SeatingPlansModule } from './seating-plans/seating-plans.module';
import { SeatingModule } from './seating/seating.module';
import { BrandingModule } from './branding/branding.module';
import { StatsModule } from './stats/stats.module';
import { FilesModule } from './files/files.module';

@Module({
  providers: [AppService],
  imports: [
    PrismaModule,
    AuthModule,
    UsersModule,
    CeremoniesModule,
    GuestsModule,
    QrModule,
    TemplatesModule,
    InvitationsModule,
    ScansModule,
    SeatingPlansModule,
    SeatingModule,
    BrandingModule,
    StatsModule,
    FilesModule,
  ],
})
export class AppModule {}
