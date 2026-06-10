import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { IsIn, IsOptional, IsString, MinLength } from 'class-validator';
import { ProjectsService, type CreateProjectDto } from './projects.service';
import { JwtAuthGuard } from '../iam/jwt.guard';
import { PoliciesGuard, CheckPolicies } from '../iam/policies.guard';

class CreateProjectBody implements CreateProjectDto {
  @IsString() @MinLength(2) key!: string;
  @IsString() @MinLength(2) name!: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() goal?: string;
  @IsOptional() @IsString() teamId?: string;
  @IsOptional() @IsString() ownerId?: string;
  @IsOptional() @IsString() startDate?: string;
  @IsOptional() @IsString() dueDate?: string;
  @IsOptional() @IsIn(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'])
  priority?: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
}

@UseGuards(JwtAuthGuard, PoliciesGuard)
@Controller('v1/projects')
export class ProjectsController {
  constructor(private readonly projects: ProjectsService) {}

  @Get()
  @CheckPolicies((a) => a.can('read', 'Project'))
  list(
    @Query('status') status?: string,
    @Query('priority') priority?: string,
    @Query('teamId') teamId?: string,
  ) {
    return this.projects.list({ status, priority, teamId });
  }

  @Post()
  @CheckPolicies((a) => a.can('create', 'Project'))
  create(@Body() body: CreateProjectBody) {
    return this.projects.create(body);
  }

  @Get(':id')
  @CheckPolicies((a) => a.can('read', 'Project'))
  get(@Param('id') id: string) {
    return this.projects.get(id);
  }

  @Patch(':id')
  @CheckPolicies((a) => a.can('update', 'Project'))
  update(@Param('id') id: string, @Body() body: Partial<CreateProjectBody> & { status?: string }) {
    return this.projects.update(id, body);
  }

  @Delete(':id')
  @CheckPolicies((a) => a.can('delete', 'Project'))
  remove(@Param('id') id: string) {
    return this.projects.remove(id);
  }

  @Get(':id/board')
  @CheckPolicies((a) => a.can('read', 'Project'))
  board(@Param('id') id: string) {
    return this.projects.board(id);
  }

  @Post(':id/recompute-risk')
  @CheckPolicies((a) => a.can('update', 'Project'))
  risk(@Param('id') id: string) {
    return this.projects.computeRisk(id);
  }
}
