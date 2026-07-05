import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

// GET /api/channels/:id/messages -> histórico de chat do canal
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const channelId = parseInt(id, 10);
    if (Number.isNaN(channelId)) {
      return NextResponse.json({ error: 'Canal inválido' }, { status: 400 });
    }

    const messages = await prisma.message.findMany({
      where: { channelId },
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
