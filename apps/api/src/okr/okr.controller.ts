import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { OkrService } from './okr.service';
import { JwtAuthGuard } from '../iam/jwt.guard';
import { PoliciesGuard, CheckPolicies } from '../iam/policies.guard';

@UseGuards(JwtAuthGuard, PoliciesGuard)
@Controller('v1')
export class OkrController {
  constructor(private readonly okr: OkrService) {}

  @Get('objectives')
  @CheckPolicies((a) => a.can('read', 'Objective'))
  list(@Query('period') period?: string) {
    return this.okr.list(period);
  }

  @Post('objectives')
  @CheckPolicies((a) => a.can('create', 'Objective'))
  createObjective(@Body() body: { title: string; description?: string; period: string }) {
    return this.okr.createObjective(body);
  }

  @Post('objectives/:id/key-results')
  @CheckPolicies((a) => a.can('update', 'Objective'))
  createKr(
    @Param('id') id: string,
    @Body() body: { title: string; metric: string; unit?: string; startValue?: number; targetValue: number },
  ) {
    return this.okr.createKeyResult(id, body);
  }

  @Patch('key-results/:id')
  @CheckPolicies((a) => a.can('update', 'Objective'))
  updateKr(@Param('id') id: string, @Body() body: { currentValue: number }) {
    return this.okr.updateKeyResult(id, body.currentValue);
  }

  @Post('key-results/:id/link')
  @CheckPolicies((a) => a.can('update', 'Objective'))
  link(@Param('id') id: string, @Body() body: { projectId?: string; taskId?: string }) {
    return this.okr.link(id, body);
  }
}
