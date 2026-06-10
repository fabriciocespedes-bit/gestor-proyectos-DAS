import { Global, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtAuthGuard } from './jwt.guard';
import { PoliciesGuard } from './policies.guard';
import { AbilityFactory } from './ability.factory';

/**
 * Módulo de Identidad y Acceso. Global: exporta los guards y la fábrica de
 * habilidades para que cualquier módulo de features los pueda usar.
 */
@Global()
@Module({
  imports: [
    JwtModule.register({
      // Los secretos se pasan explícitamente en cada sign/verify (auth.service,
      // jwt.guard) para poder rotar access vs refresh por separado.
      global: false,
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtAuthGuard, PoliciesGuard, AbilityFactory],
  exports: [JwtAuthGuard, PoliciesGuard, AbilityFactory, JwtModule],
})
export class IamModule {}
