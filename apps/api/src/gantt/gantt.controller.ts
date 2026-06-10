import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { GanttService } from './gantt.service';
import { JwtAuthGuard } from '../iam/jwt.guard';
import { PoliciesGuard, CheckPolicies } from '../iam/policies.guard';

@UseGuards(JwtAuthGuard, PoliciesGuard)
@Controller('v1')
export class GanttController {
  constructor(private readonly gantt: GanttService) {}

  // GET /v1/projects/:id/gantt
  @Get('projects/:id/gantt')
  @CheckPolicies((a) => a.can('read', 'Project'))
  plan(@Param('id') id: string) {
    return this.gantt.gantt(id);
  }

  // POST /v1/tasks/:id/dependencies  { blockingId, type? }
  @Post('tasks/:id/dependencies')
  @CheckPolicies((a) => a.can('update', 'Task'))
  addDep(
    @Param('id') id: string,
    @Body() body: { blockingId: string; type?: string },
  ) {
    return this.gantt.addDependency(id, body.blockingId, body.type);
  }

  // DELETE /v1/tasks/:id/dependencies/:blockingId
  @Delete('tasks/:id/dependencies/:blockingId')
  @CheckPolicies((a) => a.can('update', 'Task'))
  removeDep(@Param('id') id: string, @Param('blockingId') blockingId: string) {
    return this.gantt.removeDependency(id, blockingId);
  }
}
