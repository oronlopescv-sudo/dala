import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import type { FriendStatus } from '@prisma/client';

// GET /api/friends?userId=xxx -> amigos (aceites) e pedidos pendentes
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    if (!userId) {
      return NextResponse.json({ error: 'userId é obrigatório' }, { status: 400 });
    }

    const friendships = await prisma.friendship.findMany({
      where: { OR: [{ aId: userId }, { bId: userId }] },
      include: {
        a: { select: { id: true, username: true, photoUrl: true } },
        b: { select: { id: true, username: true, photoUrl: true } },
      },
    });

    return NextResponse.json(friendships);
  } catch (error) {
    console.error('GET /api/friends failed', error);
    return NextResponse.json({ error: 'Falha ao carregar amigos' }, { status: 500 });
  }
}

// POST /api/friends -> adiciona amigo / bloqueia
// body: { aId, bId, status? }
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { aId, bId } = body;
    const status: FriendStatus = ['PENDING', 'ACCEPTED', 'BLOCKED'].includes(body.status)
      ? body.status
      : 'PENDING';

    if (!aId || !bId || aId === bId) {
      return NextResponse.json({ error: 'IDs inválidos' }, { status: 400 });
    }

    const friendship = await prisma.friendship.upsert({
      where: { aId_bId: { aId, bId } },
      update: { status },
      create: { aId, bId, status },
    });
    return NextResponse.json(friendship, { status: 201 });
  } catch (error) {
    console.error('POST /api/friends failed', error);
    return NextResponse.json({ error: 'Falha ao adicionar amigo' }, { status: 500 });
  }
}
