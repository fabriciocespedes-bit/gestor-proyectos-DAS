import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { TimeboxingService } from './timeboxing.service';
import { JwtAuthGuard } from '../iam/jwt.guard';
import { PoliciesGuard, CheckPolicies } from '../iam/policies.guard';

@UseGuards(JwtAuthGuard, PoliciesGuard)
@Controller('v1')
export class TimeboxingController {
  constructor(private readonly svc: TimeboxingService) {}

  // POST /v1/tasks/:id/timeboxes/generate  (propone bloques, no persiste)
  @Post('tasks/:id/timeboxes/generate')
  @CheckPolicies((a) => a.can('update', 'Task'))
  generate(
    @Param('id') id: string,
    @Body() body: { from?: string; maxBlockHours?: number },
  ) {
    const from = body.from ? new Date(body.from) : new Date();
    return this.svc.generate(id, from, body.maxBlockHours ?? 2);
  }

  // POST /v1/tasks/:id/timeboxes  (confirma)
  @Post('tasks/:id/timeboxes')
  @CheckPolicies((a) => a.can('update', 'Task'))
  commit(@Param('id') id: string, @Body() body: { blocks: any[] }) {
    const blocks = body.blocks.map((b) => ({
      ...b,
      start: new Date(b.start),
      end: new Date(b.end),
    }));
    return this.svc.commit(id, blocks);
  }

  // GET /v1/users/:id/capacity?from=&to=
  @Get('users/:id/capacity')
  @CheckPolicies((a) => a.can('read', 'Report'))
  capacity(
    @Param('id') id: string,
    @Query('from') from: string,
    @Query('to') to: string,
  ) {
    return this.svc.userCapacity(id, new Date(from), new Date(to));
  }
}
