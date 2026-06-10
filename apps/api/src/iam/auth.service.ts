import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { authPrisma } from '@projectos/db';
import { hashPassword, verifyPassword, isStrongEnough } from './password';
import type { JwtPayload } from './jwt.guard';

/**
 * Autenticación por correo + contraseña.
 * Usa `authPrisma` (rol BYPASSRLS) porque el login ocurre ANTES de que exista un
 * contexto de organización: hay que poder localizar al usuario por su email.
 */
@Injectable()
export class AuthService {
  constructor(private readonly jwt: JwtService) {}

  async login(email: string, password: string) {
    const user = await authPrisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
      include: { memberships: true },
    });
    // Comparación constante incluso si el usuario no existe (anti enumeración).
    const hash = user?.passwordHash ?? '$2a$12$invalidinvalidinvalidinvalidinv';
    const valid = await verifyPassword(password, hash);
    if (!user || !user.passwordHash || !valid) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    // Org por defecto: super-admin → su membership OWNER; normal → primera org.
    const orgId = user.memberships[0]?.organizationId;
    if (!orgId && !user.isSuperAdmin) {
      throw new UnauthorizedException('El usuario no pertenece a ninguna organización');
    }
    const role = user.memberships[0]?.role ?? 'OWNER';

    await authPrisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      orgId: orgId ?? '',
      role,
      isSuperAdmin: user.isSuperAdmin,
    };

    return {
      accessToken: await this.jwt.signAsync(payload, {
        secret: process.env.JWT_SECRET,
        expiresIn: '15m',
      }),
      refreshToken: await this.jwt.signAsync(
        { sub: user.id, typ: 'refresh' },
        { secret: process.env.JWT_REFRESH_SECRET, expiresIn: '30d' },
      ),
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        isSuperAdmin: user.isSuperAdmin,
      },
    };
  }

  /** Registro de un usuario en una organización existente (invitación). */
  async register(input: {
    email: string;
    password: string;
    name: string;
    organizationId: string;
    role?: string;
  }) {
    if (!isStrongEnough(input.password)) {
      throw new BadRequestException(
        'La contraseña debe tener ≥10 caracteres, mayúscula, minúscula y número',
      );
    }
    const email = input.email.toLowerCase().trim();
    const exists = await authPrisma.user.findUnique({ where: { email } });
    if (exists) throw new BadRequestException('El correo ya está registrado');

    const passwordHash = await hashPassword(input.password);
    const user = await authPrisma.user.create({
      data: {
        email,
        name: input.name,
        passwordHash,
        memberships: {
          create: {
            organizationId: input.organizationId,
            role: (input.role as any) ?? 'MEMBER',
          },
        },
      },
    });
    return { id: user.id, email: user.email };
  }
}
