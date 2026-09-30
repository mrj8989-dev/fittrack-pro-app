export function requireJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET no está definido. Copia backend/.env.example a backend/.env y rellénalo.');
  }
  return secret;
}
