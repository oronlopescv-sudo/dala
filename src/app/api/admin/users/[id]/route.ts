import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { verifyToken, extractToken } from '@/lib/auth';

// DELETE /api/admin/users/:id -> elimina uma conta de utilizador (admin só)
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = extractToken(req.headers.get('authorization'));
    const payload = token ? verifyToken(token) : null;
    if (!payload) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const { id } = await params;

    // Verificar se o requester é admin
    const requester = await prisma.user.findUnique({ where: { id: payload.id } });
    if (requester?.role !== 'ADMIN' || requester.banned) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    // Não deixar eliminar a si próprio
    if (id === payload.id) {
      return NextResponse.json(
        { error: 'Não podes eliminar a tua própria conta' },
        { status: 400 }
      );
    }

    // Verificar se o utilizador existe
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      return NextResponse.json({ error: 'Utilizador não encontrado' }, { status: 404 });
    }

    // Eliminar o utilizador
    await prisma.user.delete({ where: { id } });

    return NextResponse.json({ message: `Utilizador ${user.email} eliminado` });
  } catch (error) {
    console.error('DELETE /api/admin/users/:id failed', error);
    return NextResponse.json({ error: 'Erro ao eliminar utilizador' }, { status: 500 });
  }
}
