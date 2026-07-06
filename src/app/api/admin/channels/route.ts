import { PrismaClient } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, extractToken } from '@/lib/auth';

const prisma = new PrismaClient();

async function requireAdmin(req: NextRequest) {
  const token = extractToken(req.headers.get('authorization'));
  if (!token) return null;
  const payload = verifyToken(token);
  if (!payload) return null;
  const user = await prisma.user.findUnique({ where: { id: payload.id } });
  if (!user || user.role !== 'ADMIN' || user.banned) return null;
  return user;
}

// PATCH /api/admin/channels — editar um canal
// body: { channelId, name?, description?, type? }
export async function PATCH(req: NextRequest) {
  try {
    const admin = await requireAdmin(req);
    if (!admin) {
      return NextResponse.json({ error: 'Acesso negado — só admins' }, { status: 403 });
    }

    const { channelId, name, description, type } = await req.json();
    if (!channelId) {
      return NextResponse.json({ error: 'channelId é obrigatório' }, { status: 400 });
    }

    const data: { name?: string; description?: string | null; type?: 'PUBLIC' | 'PRIVATE' | 'THEME' } = {};
    if (name?.trim()) data.name = name.trim();
    if (description !== undefined) data.description = description?.trim() || null;
    if (['PUBLIC', 'PRIVATE', 'THEME'].includes(type)) data.type = type;

    const channel = await prisma.channel.update({
      where: { id: Number(channelId) },
      data,
    });

    return NextResponse.json({ message: 'Canal atualizado', channel });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Erro ao atualizar canal (nome já existe?)' }, { status: 500 });
  }
}

// DELETE /api/admin/channels — apagar um canal e o seu conteúdo
// body: { channelId }
export async function DELETE(req: NextRequest) {
  try {
    const admin = await requireAdmin(req);
    if (!admin) {
      return NextResponse.json({ error: 'Acesso negado — só admins' }, { status: 403 });
    }

    const { channelId } = await req.json();
    if (!channelId) {
      return NextResponse.json({ error: 'channelId é obrigatório' }, { status: 400 });
    }

    const id = Number(channelId);

    // Apaga dependências primeiro (mensagens e voice logs)
    await prisma.message.deleteMany({ where: { channelId: id } });
    await prisma.voiceLog.deleteMany({ where: { channelId: id } });
    await prisma.channel.delete({ where: { id } });

    return NextResponse.json({ message: 'Canal apagado' });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Erro ao apagar canal' }, { status: 500 });
  }
}
