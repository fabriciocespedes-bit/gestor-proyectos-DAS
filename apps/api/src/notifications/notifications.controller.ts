import { Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard, type JwtPayload } from '../iam/jwt.guard';

@UseGuards(JwtAuthGuard)
@Controller('v1/notifications')
export class NotificationsController {
  constructor(private readonly notifs: NotificationsService) {}

  @Get()
  list(@Req() req: Request & { user: JwtPayload }) {
    return this.notifs.list(req.user.sub);
  }

  @Post(':id/read')
  markRead(@Param('id') id: string) {
    return this.notifs.markRead(id);
  }

  // Disparable por cron/BullMQ (o manualmente por un admin).
  @Post('scan')
  scan() {
    return this.notifs.scanAndNotify();
  }
}
