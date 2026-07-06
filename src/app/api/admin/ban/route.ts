import { PrismaClient } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, extractToken } from '@/lib/auth';

const prisma = new PrismaClient();

async function requireAdmin(req: NextRequest) {
  const token = extractToken(req.headers.get('authorization'));
  if (!token) return null;
  const payload = verifyToken(token);
  if (!payload) return null;

  // Verifica na BD (não confia só no token — o role pode ter mudado)
  const user = await prisma.user.findUnique({ where: { id: payload.id } });
  if (!user || user.role !== 'ADMIN' || user.banned) return null;
  return user;
}

// POST /api/admin/ban — banir ou desbanir permanentemente
// body: { userId?: string, username?: string, action: 'ban' | 'unban' }
export async function POST(req: NextRequest) {
  try {
    const admin = await requireAdmin(req);
    if (!admin) {
      return NextResponse.json({ error: 'Acesso negado — só admins' }, { status: 403 });
    }

    const { userId, username, action } = await req.json();

    if (!userId && !username) {
      return NextResponse.json(
        { error: 'Fornece userId ou username' },
        { status: 400 }
      );
    }

    const target = await prisma.user.findFirst({
      where: userId ? { id: userId } : { username },
    });

    if (!target) {
      return NextResponse.json({ error: 'Utilizador não encontrado' }, { status: 404 });
    }

    if (target.role === 'ADMIN') {
      return NextResponse.json(
        { error: 'Não podes banir outro admin' },
        { status: 400 }
      );
    }

    const ban = action !== 'unban';

    await prisma.user.update({
      where: { id: target.id },
      data: { banned: ban, bannedAt: ban ? new Date() : null },
    });

    return NextResponse.json({
      message: ban
        ? `${target.username} foi banido permanentemente`
        : `${target.username} foi desbanido`,
      user: { id: target.id, username: target.username, banned: ban },
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Erro ao banir/desbanir' }, { status: 500 });
  }
}

// GET /api/admin/ban — listar utilizadores banidos
export async function GET(req: NextRequest) {
  try {
    const admin = await requireAdmin(req);
    if (!admin) {
      return NextResponse.json({ error: 'Acesso negado — só admins' }, { status: 403 });
    }

    const banned = await prisma.user.findMany({
      where: { banned: true },
      select: { id: true, username: true, email: true, bannedAt: true },
      orderBy: { bannedAt: 'desc' },
    });

    return NextResponse.json({ banned });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Erro ao listar banidos' }, { status: 500 });
  }
}
