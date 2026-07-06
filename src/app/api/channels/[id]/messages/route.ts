import { NextResponse, NextRequest } from 'next/server';
import prisma from '@/lib/db';
import { extractToken, verifyToken } from '@/lib/auth';

// GET /api/channels/:id/messages -> histórico de chat do canal
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const channelId = parseInt(id, 10);
    if (Number.isNaN(channelId)) {
      return NextResponse.json({ error: 'Canal inválido' }, { status: 400 });
    }

    // Obter userId do token
    const token = extractToken(req.headers.get('authorization'));
    let userId: string | null = null;

    if (token) {
      const payload = verifyToken(token);
      if (payload) {
        userId = payload.id;
      }
    }

    // Se não tem token, retorna todas as mensagens
    if (!userId) {
      const messages = await prisma.message.findMany({
        where: { channelId },
        orderBy: { createdAt: 'asc' },
        take: 100,
        include: {
          user: { select: { id: true, username: true, photoUrl: true } },
        },
      });
      return NextResponse.json(messages);
    }

    // Obter lista de utilizadores que este user tem mutado
    const mutedUsers = await prisma.mute.findMany({
      where: { muterId: userId },
      select: { mutedId: true },
    });

    const mutedIds = mutedUsers.map((m) => m.mutedId);

    // Obter mensagens, mas excluindo as dos mutados
    const messages = await prisma.message.findMany({
      where: {
        channelId,
        userId: {
          notIn: mutedIds,
        },
      },
      orderBy: { createdAt: 'asc' },
      take: 100,
      include: {
        user: { select: { id: true, username: true, photoUrl: true } },
      },
    });
    return NextResponse.json(messages);
  } catch (error) {
    console.error('GET messages failed', error);
    return NextResponse.json({ error: 'Falha ao carregar mensagens' }, { status: 500 });
  }
}
