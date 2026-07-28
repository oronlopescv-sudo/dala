import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { sanitizeUser, verifyToken, extractToken } from '@/lib/auth';

// GET /api/auth/me -> devolve o utilizador atual a partir do token.
// Serve para refrescar dados guardados no dispositivo (ex.: o role mudou).
export async function GET(req: NextRequest) {
  try {
    const token = extractToken(req.headers.get('authorization'));
    if (!token) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const payload = verifyToken(token);
    if (!payload) {
      return NextResponse.json({ error: 'Sessão inválida' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({ where: { id: payload.id } });
    if (!user) {
      return NextResponse.json({ error: 'Utilizador não encontrado' }, { status: 404 });
    }

    if (user.banned) {
      return NextResponse.json({ error: 'Conta banida' }, { status: 403 });
    }

    return NextResponse.json({ user: sanitizeUser(user) });
  } catch (error) {
    console.error('GET /api/auth/me failed', error);
    return NextResponse.json({ error: 'Erro ao carregar utilizador' }, { status: 500 });
  }
}
