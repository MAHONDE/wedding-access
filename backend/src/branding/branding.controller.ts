import {
  Body,
  Controller,
  Delete,
  Get,
  Patch,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { BrandingService } from './branding.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

/* GET /branding is intentionally public — the app logo and name are
   needed before authentication (splash screen, login page).
   Write operations (upload/delete/patch) remain JWT-protected. */
@Controller('branding')
export class BrandingController {
  constructor(private service: BrandingService) {}

  @Get()
  get() {
    return this.service.get();
  }

  @UseGuards(JwtAuthGuard)
  @Patch()
  update(
    @CurrentUser() user: any,
    @Body() dto: { appName?: string; activeThemeMode?: string },
  ) {
    return this.service.update(dto, user.sub);
  }

  @UseGuards(JwtAuthGuard)
  @Post('monogram')
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
  uploadMonogram(
    @CurrentUser() user: any,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.service.uploadMonogram(file, user.sub);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('monogram')
  deleteMonogram(@CurrentUser() user: any) {
    return this.service.deleteMonogram(user.sub);
  }

  @UseGuards(JwtAuthGuard)
  @Post('logo')
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
  uploadLogo(
    @CurrentUser() user: any,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.service.uploadLogo(file, user.sub);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('logo')
  deleteLogo(@CurrentUser() user: any) {
    return this.service.deleteLogo(user.sub);
  }
}
