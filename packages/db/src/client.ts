import { PrismaClient } from '@prisma/client';

/**
 * Cliente de RUNTIME — se conecta como `projectos_app` (rol SIN privilegios de
 * superusuario). RLS está activo: toda query debe correr con contexto de tenant
 * (ver tenant.ts). DATABASE_URL apunta a este rol.
 */
export const appPrisma = new PrismaClient({
  datasources: { db: { url: process.env.DATABASE_URL } },
  log: ['warn', 'error'],
});

/**
 * Cliente de IDENTIDAD — se conecta como `projectos_auth` (rol con BYPASSRLS).
 * Uso EXCLUSIVO del módulo de auth: buscar usuario por email en el login y el
 * registro, operaciones que ocurren ANTES de existir contexto de organización.
 * Nunca exponer fuera de AuthService.
 */
export const authPrisma = new PrismaClient({
  datasources: { db: { url: process.env.AUTH_DATABASE_URL } },
  log: ['warn', 'error'],
});

export * from './tenant';
export { Prisma, PrismaClient } from '@prisma/client';
