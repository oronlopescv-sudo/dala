import { NextRequest } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Extrai o IP real do cliente (atrás do proxy do Easypanel/Traefik)
export function getClientIp(req: NextRequest): string | null {
  const fwd = req.headers.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0].trim();
  const real = req.headers.get('x-real-ip');
  if (real) return real.trim();
  return null;
}

export async function isIpBanned(ip: string | null): Promise<boolean> {
  if (!ip) return false;
  const ban = await prisma.ipBan.findUnique({ where: { ip } });
  return !!ban;
}
