import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { DocumentsService } from './documents.service';
import { JwtAuthGuard } from '../iam/jwt.guard';
import { PoliciesGuard, CheckPolicies } from '../iam/policies.guard';

@UseGuards(JwtAuthGuard, PoliciesGuard)
@Controller('v1')
export class DocumentsController {
  constructor(private readonly docs: DocumentsService) {}

  @Get('projects/:id/docs')
  @CheckPolicies((a) => a.can('read', 'Document'))
  list(@Param('id') id: string, @Query('type') type?: any) {
    return this.docs.list(id, type);
  }

  @Post('projects/:id/docs')
  @CheckPolicies((a) => a.can('create', 'Document'))
  create(@Param('id') id: string, @Body() body: { title: string; type?: any; content?: unknown }) {
    return this.docs.create(id, body);
  }

  @Get('docs/:id')
  @CheckPolicies((a) => a.can('read', 'Document'))
  get(@Param('id') id: string) {
    return this.docs.get(id);
  }

  @Patch('docs/:id')
  @CheckPolicies((a) => a.can('update', 'Document'))
  update(@Param('id') id: string, @Body() body: { title?: string; content?: unknown }) {
    return this.docs.update(id, body);
  }
}
