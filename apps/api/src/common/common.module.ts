import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

/**
 * Provee PrismaService (request-scoped, ligado al tenant del JWT) a toda la app.
 * Global para no tener que importarlo en cada feature module.
 */
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class CommonModule {}
