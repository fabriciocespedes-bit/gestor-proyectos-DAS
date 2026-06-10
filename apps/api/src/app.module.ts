import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CommonModule } from './common/common.module';
import { IamModule } from './iam/iam.module';
import { ProjectsModule } from './projects/projects.module';
import { TasksModule } from './tasks/tasks.module';
import { TimeboxingModule } from './timeboxing/timeboxing.module';
import { GanttModule } from './gantt/gantt.module';
import { OkrModule } from './okr/okr.module';
import { DocumentsModule } from './documents/documents.module';
import { ReportsModule } from './reports/reports.module';
import { NotificationsModule } from './notifications/notifications.module';
import { AiModule } from './ai/ai.module';
import { HealthController } from './health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    CommonModule, // PrismaService (request-scoped, RLS)
    IamModule, // auth + guards + CASL
    ProjectsModule,
    TasksModule,
    TimeboxingModule,
    GanttModule,
    OkrModule,
    DocumentsModule,
    ReportsModule,
    NotificationsModule,
    AiModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
