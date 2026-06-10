import { Controller, Get } from '@nestjs/common';
import { appPrisma } from '@projectos/db';

@Controller()
export class HealthController {
  @Get('health')
  async health() {
    let db = 'down';
    try {
      await appPrisma.$queryRaw`SELECT 1`;
      db = 'up';
    } catch {
      db = 'down';
    }
    return { status: 'ok', db, ts: new Date().toISOString() };
  }
}
