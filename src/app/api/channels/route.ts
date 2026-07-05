import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import type { ChannelType } from '@prisma/client';

const DEFAULT_CHANNELS: { name: string; description: string; type: ChannelType }[] = [
  { name: 'Geral', description: 'Conversa livre sobre tudo', type: 'PUBLIC' },
  { name: 'Música', description: 'Partilha e fala sobre música', type: 'THEME' },
  { name: 'Games', description: 'Jogadores de Cabo Verde e do mundo', type: 'THEME' },
  { name: 'Idiomas', description: 'Pratica idiomas com falantes reais', type: 'THEME' },
];

// GET /api/channels        -> lista todos (+ semente inicial)
// GET /api/channels?q=xxx  -> pesquisa por nome/descrição
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get('q')?.trim();

    if (q) {
      const channels = await prisma.channel.findMany({
        where: {
          OR: [
            { name: { contains: q, mode: 'insensitive' } },
            { description: { contains: q, mode: 'insensitive' } },
          ],
        },
        orderBy: { createdAt: 'asc' },
        include: { _count: { select: { messages: true } } },
      });
      return NextResponse.json(channels);
    }

    let channels = await prisma.channel.findMany({
      orderBy: { createdAt: 'asc' },
      include: { _count: { select: { messages: true } } },
    });

    if (channels.length === 0) {
      await prisma.channel.createMany({ data: DEFAULT_CHANNELS });
      channels = await prisma.channel.findMany({
        orderBy: { createdAt: 'asc' },
        include: { _count: { select: { messages: true } } },
      });
    }

    return NextResponse.json(channels);
  } catch (error) {
    console.error('GET /api/channels failed', error);
    return NextResponse.json({ error: 'Falha ao carregar canais' }, { status: 500 });
  }
}

// POST /api/channels -> cria canal (público / privado / tema)
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const name: string = (body.name ?? '').trim();
    if (!name) {
      return NextResponse.json({ error: 'Nome do canal é obrigatório' }, { status: 400 });
    }

    const type: ChannelType = ['PUBLIC', 'PRIVATE', 'THEME'].includes(body.type)
      ? body.type
      : 'PUBLIC';

    const existing = await prisma.channel.findUnique({ where: { name } });
    if (existing) {
      return NextResponse.json({ error: 'Já existe um canal com esse nome' }, { status: 409 });
    }

    const channel = await prisma.channel.create({
      data: {
        name,
        description: body.description?.trim() || null,
        type,
        creatorId: body.creatorId || null,
      },
      include: { _count: { select: { messages: true } } },
    });
    return NextResponse.json(channel, { status: 201 });
  } catch (error) {
    console.error('POST /api/channels failed', error);
    return NextResponse.json({ error: 'Falha ao criar canal' }, { status: 500 });
  }
}
