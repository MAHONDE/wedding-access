import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { Response } from 'express';
import { SeatingPlansService } from './seating-plans.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import * as fs from 'fs';
import * as path from 'path';

@UseGuards(JwtAuthGuard)
@Controller('seating-plans')
export class SeatingPlansController {
  constructor(private service: SeatingPlansService) {}

  @Get()
  list(
    @CurrentUser() user: any,
    @Query('ceremonyId') ceremonyId?: string,
  ) {
    return this.service.list(user, ceremonyId);
  }

  @Post()
  create(
    @CurrentUser() user: any,
    @Body() dto: { ceremonyId: string; name: string; planData?: any; sourceType?: string },
  ) {
    return this.service.create(user, dto);
  }

  @Put(':id')
  update(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: { name?: string; planData?: any },
  ) {
    return this.service.update(user, id, dto);
  }

  @Delete(':id')
  delete(@CurrentUser() user: any, @Param('id') id: string) {
    return this.service.delete(user, id);
  }

  @Post(':id/room-photo')
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
  addRoomPhoto(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.service.addRoomPhoto(user, id, file);
  }

  @Post(':id/generate-pdf')
  generatePdf(@CurrentUser() user: any, @Param('id') id: string) {
    return this.service.generatePdf(user, id);
  }

  @Get(':id/download-pdf')
  async downloadPdf(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Res() res: Response,
  ) {
    const filePath = await this.service.downloadPdf(user, id);
    const fileName = path.basename(filePath);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${fileName}"`,
    });
    fs.createReadStream(filePath).pipe(res);
  }
}
