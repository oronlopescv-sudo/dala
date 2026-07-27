import prisma from '@/lib/db';
import { verifyToken, extractToken } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';

// POST /api/admin/role — promove/degrada utilizador (ADMIN só, ou auto-promoção se for o primeiro admin)
export async function POST(req: NextRequest) {
  try {
    const token = extractToken(req.headers.get('authorization'));
    const payload = token ? verifyToken(token) : null;
    if (!payload) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const { userId, role } = await req.json();
    if (!userId || !['ADMIN', 'USER'].includes(role)) {
      return NextResponse.json({ error: 'userId e role (ADMIN|USER) obrigatórios' }, { status: 400 });
    }

    // Verificar se existe algum admin
    const adminExists = await prisma.user.findFirst({ where: { role: 'ADMIN' } });

    // Só admins podem promover outros, EXCETO auto-promoção se for o primeiro admin
    const isAutoPromote = payload.id === userId && role === 'ADMIN';
    if (!adminExists && isAutoPromote) {
      // Permitir: primeiro admin criado por auto-promoção
    } else if (payload.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    // Buscar utilizador existente para comparar com role atual
    const existingUser = await prisma.user.findUnique({ where: { id: userId } });
    if (!existingUser) {
      return NextResponse.json({ error: 'Utilizador não encontrado' }, { status: 404 });
    }

    // Se já tem o role pretendido, retornar sucesso
    if (existingUser.role === role) {
      return NextResponse.json({
        message: `Utilizador já é ${role}`,
        user: {
          id: existingUser.id,
          email: existingUser.email,
          username: existingUser.username,
          role: existingUser.role,
        },
      });
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: { role: role as 'ADMIN' | 'USER' },
    });

    return NextResponse.json({
      message: `Utilizador ${role === 'ADMIN' ? 'promovido' : 'degradado'}`,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('POST /api/admin/role failed', error);
    return NextResponse.json({ error: 'Erro ao atualizar role' }, { status: 500 });
  }
}
