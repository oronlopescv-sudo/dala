import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { verifyToken, extractToken } from '@/lib/auth';
import bcrypt from 'bcryptjs';

// POST /api/auth/change-password -> muda a password do utilizador autenticado
export async function POST(req: NextRequest) {
  try {
    const token = extractToken(req.headers.get('authorization'));
    const payload = token ? verifyToken(token) : null;
    if (!payload) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const { currentPassword, newPassword } = await req.json();
    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { error: 'currentPassword e newPassword obrigatórios' },
        { status: 400 }
      );
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { error: 'A nova password deve ter pelo menos 6 caracteres' },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({ where: { id: payload.id } });
    if (!user) {
      return NextResponse.json({ error: 'Utilizador não encontrado' }, { status: 404 });
    }

    const passwordMatch = await bcrypt.compare(currentPassword, user.password || '');
    if (!passwordMatch) {
      return NextResponse.json({ error: 'Password atual incorreta' }, { status: 401 });
    }

    const hashed = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: payload.id },
      data: { password: hashed },
    });

    return NextResponse.json({ message: 'Password alterada com sucesso' });
  } catch (error) {
    console.error('POST /api/auth/change-password failed', error);
    return NextResponse.json({ error: 'Erro ao alterar password' }, { status: 500 });
  }
}
