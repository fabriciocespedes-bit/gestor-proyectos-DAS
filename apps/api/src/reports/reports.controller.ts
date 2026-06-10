import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../iam/jwt.guard';
import { PoliciesGuard, CheckPolicies } from '../iam/policies.guard';

@UseGuards(JwtAuthGuard, PoliciesGuard)
@Controller('v1/reports')
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  @Get('cycle-time')
  @CheckPolicies((a) => a.can('read', 'Report'))
  cycle(@Query('projectId') projectId: string) {
    return this.reports.cycleTime(projectId);
  }

  @Get('velocity')
  @CheckPolicies((a) => a.can('read', 'Report'))
  velocity(@Query('projectId') projectId: string, @Query('weeks') weeks?: string) {
    return this.reports.velocity(projectId, weeks ? Number(weeks) : 6);
  }

  @Get('burndown')
  @CheckPolicies((a) => a.can('read', 'Report'))
  burndown(@Query('projectId') projectId: string) {
    return this.reports.burndown(projectId);
  }

  @Get('capacity-usage')
  @CheckPolicies((a) => a.can('read', 'Report'))
  capacity(@Query('from') from: string, @Query('to') to: string) {
    return this.reports.capacityUsage(new Date(from), new Date(to));
  }
}
