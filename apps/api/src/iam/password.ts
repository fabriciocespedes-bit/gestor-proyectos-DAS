import bcrypt from 'bcryptjs';

const COST = 12;

/** Hash de contraseña (bcrypt, cost 12). Nunca guardar la contraseña en claro. */
export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, COST);
}

export function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

/** Política mínima de contraseña (reforzar según plan). */
export function isStrongEnough(plain: string): boolean {
  return (
    plain.length >= 10 &&
    /[a-z]/.test(plain) &&
    /[A-Z]/.test(plain) &&
    /\d/.test(plain)
  );
}
