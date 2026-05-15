import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { TemplatesService } from './templates.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard)
@Controller('templates')
export class TemplatesController {
  constructor(private service: TemplatesService) {}

  @Post(':ceremonyId')
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
  upload(
    @CurrentUser() user: any,
    @Param('ceremonyId') ceremonyId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body('name') name?: string,
  ) {
    return this.service.upload(user, ceremonyId, file, name);
  }

  @Get(':ceremonyId')
  getActive(@CurrentUser() user: any, @Param('ceremonyId') ceremonyId: string) {
    return this.service.getActive(user, ceremonyId);
  }

  @Put(':ceremonyId')
  update(
    @CurrentUser() user: any,
    @Param('ceremonyId') ceremonyId: string,
    @Body() dto: any,
  ) {
    return this.service.update(user, ceremonyId, dto);
  }

  @Post(':ceremonyId/qr-zone')
  setQrZone(
    @CurrentUser() user: any,
    @Param('ceremonyId') ceremonyId: string,
    @Body() config: { x: number; y: number; width: number; height: number },
  ) {
    return this.service.setQrZone(user, ceremonyId, config);
  }

  @Delete(':ceremonyId')
  deactivate(@CurrentUser() user: any, @Param('ceremonyId') ceremonyId: string) {
    return this.service.deactivate(user, ceremonyId);
  }
}
