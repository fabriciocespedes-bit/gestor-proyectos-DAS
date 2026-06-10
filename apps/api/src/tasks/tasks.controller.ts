import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { TasksService, type CreateTaskDto } from './tasks.service';
import { JwtAuthGuard, type JwtPayload } from '../iam/jwt.guard';
import { PoliciesGuard, CheckPolicies } from '../iam/policies.guard';

@UseGuards(JwtAuthGuard, PoliciesGuard)
@Controller('v1/tasks')
export class TasksController {
  constructor(private readonly tasks: TasksService) {}

  // POST /v1/tasks
  @Post()
  @CheckPolicies((a) => a.can('create', 'Task'))
  create(@Body() body: CreateTaskDto) {
    return this.tasks.create(body);
  }

  // PATCH /v1/tasks/:id  (mover tarjeta)
  @Patch(':id')
  @CheckPolicies((a) => a.can('update', 'Task'))
  move(
    @Param('id') id: string,
    @Body() body: { columnId: string; order: number; status: string },
  ) {
    return this.tasks.move(id, body.columnId, body.order, body.status);
  }

  // POST /v1/tasks/:id/recompute-priority
  @Post(':id/recompute-priority')
  @CheckPolicies((a) => a.can('update', 'Task'))
  recompute(@Param('id') id: string) {
    return this.tasks.recomputePriority(id);
  }

  // GET /v1/tasks/today  (qué hacer hoy, por el usuario autenticado)
  @Get('today')
  @CheckPolicies((a) => a.can('read', 'Task'))
  today(
    @Req() req: Request & { user: JwtPayload },
    @Query('limit') limit?: string,
  ) {
    return this.tasks.todayFor(req.user.sub, limit ? Number(limit) : 10);
  }
}
