import { Body, Controller, Get, Post, Query, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { AiService } from './ai.service';
import { JwtAuthGuard, type JwtPayload } from '../iam/jwt.guard';

@UseGuards(JwtAuthGuard)
@Controller('v1/ai')
export class AiController {
  constructor(private readonly ai: AiService) {}

  // POST /v1/ai/ask  { question }
  @Post('ask')
  ask(@Req() req: Request & { user: JwtPayload }, @Body() body: { question: string }) {
    return this.ai.ask(body.question, req.user.sub);
  }

  // POST /v1/ai/plan-week  (para el usuario autenticado)
  @Post('plan-week')
  planWeek(@Req() req: Request & { user: JwtPayload }) {
    return this.ai.planWeek(req.user.sub);
  }

  // GET /v1/ai/risks?projectId=
  @Get('risks')
  risks(@Query('projectId') projectId: string) {
    return this.ai.risks(projectId);
  }

  // GET /v1/ai/bottlenecks?projectId=
  @Get('bottlenecks')
  bottlenecks(@Query('projectId') projectId: string) {
    return this.ai.bottlenecks(projectId);
  }
}
