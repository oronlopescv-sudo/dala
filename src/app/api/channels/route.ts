import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { verifyToken, extractToken } from '@/lib/auth';
import type { ChannelType, ChannelMode } from '@prisma/client';

// Só o admin e o criador da sala podem ver o código de acesso.
// Para os restantes o campo é removido da resposta.
type ChannelLike = { accessCode?: string | null; creatorId?: string | null };

async function hideSecretCodes<T extends ChannelLike>(
  channels: T[],
  authHeader: string | null
): Promise<(T & { hasAccessCode: boolean })[]> {
  let viewerId: string | null = null;
  let isAdmin = false;

  const token = extractToken(authHeader);
  if (token) {
    const payload = verifyToken(token);
    if (payload) {
      viewerId = payload.id;
      const user = await prisma.user.findUnique({ where: { id: payload.id } });
      isAdmin = user?.role === 'ADMIN';
    }
  }

  return channels.map((c) => {
    const canSee = isAdmin || (viewerId !== null && c.creatorId === viewerId);
    // hasAccessCode diz que a sala é protegida, sem revelar o código
    return canSee
      ? { ...c, hasAccessCode: !!c.accessCode }
      : { ...c, accessCode: null, hasAccessCode: !!c.accessCode };
  });
}

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
      return NextResponse.json(
        await hideSecretCodes(channels, req.headers.get('authorization'))
      );
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

    return NextResponse.json(
      await hideSecretCodes(channels, req.headers.get('authorization'))
    );
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

    const type: ChannelType = ['PUBLIC', 'PRIVATE', 'THEME', 'RADIO'].includes(body.type)
      ? body.type
      : 'PUBLIC';

    const mode: ChannelMode = ['FREE', 'MODERATED'].includes(body.mode)
      ? body.mode
      : 'FREE';

    const existing = await prisma.channel.findUnique({ where: { name } });
    if (existing) {
      return NextResponse.json({ error: 'Já existe um canal com esse nome' }, { status: 409 });
    }

    // Validar limites de criação por utilizador (exceto THEME)
    if (body.creatorId && type !== 'THEME') {
      const oneMonthAgo = new Date();
      oneMonthAgo.setDate(oneMonthAgo.getDate() - 30);

      // Limite: 1 canal público por mês
      if (type === 'PUBLIC') {
        const recentPublic = await prisma.channel.count({
          where: {
            creatorId: body.creatorId,
            type: 'PUBLIC',
            createdAt: { gte: oneMonthAgo },
          },
        });
        if (recentPublic >= 1) {
          return NextResponse.json(
            { error: 'Máximo 1 canal público por mês. Tenta de novo a mês que vem.' },
            { status: 429 }
          );
        }
      }

      // Limite: 10 canais privados (ativos ou recentes)
      if (type === 'PRIVATE') {
        const recentPrivate = await prisma.channel.count({
          where: {
            creatorId: body.creatorId,
            type: 'PRIVATE',
            OR: [
              { expiresAt: null }, // sem expiração
              { expiresAt: { gt: new Date() } }, // ainda não expirou
            ],
          },
        });
        if (recentPrivate >= 10) {
          return NextResponse.json(
            { error: 'Máximo 10 canais privados. Alguns vão expirar em 5 dias.' },
            { status: 429 }
          );
        }
      }
    }

    // Gerar ou usar código de acesso personalizado para canais privados
    let accessCode: string | null = null;
    if (type === 'PRIVATE') {
      if (body.customAccessCode && typeof body.customAccessCode === 'string') {
        accessCode = body.customAccessCode;
      } else if (body.accessCode === true) {
        // Se accessCode foi true, gerar aleatório
        accessCode = Math.random().toString(36).substring(2, 8).toUpperCase();
      }
    }

    // Definir expiração para canais privados: +5 dias
    const expiresAt = type === 'PRIVATE' ? new Date(Date.now() + 5 * 24 * 60 * 60 * 1000) : null;

    const channel = await prisma.channel.create({
      data: {
        name,
        description: body.description?.trim() || null,
        type,
        mode,
        accessCode,
        expiresAt,
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
