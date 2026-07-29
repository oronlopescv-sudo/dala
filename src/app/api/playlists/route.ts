import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { verifyToken, extractToken } from '@/lib/auth';

// GET /api/playlists -> lista playlists publicas e do utilizador
export async function GET(req: NextRequest) {
  try {
    const token = extractToken(req.headers.get('authorization'));
    const payload = token ? verifyToken(token) : null;

    const playlists = await prisma.playlist.findMany({
      where: payload
        ? {
            OR: [
              { isPublic: true },
              { creatorId: payload.id },
              { listeners: { some: { userId: payload.id } } },
            ],
          }
        : { isPublic: true },
      include: {
        creator: { select: { id: true, username: true, photoUrl: true } },
        musics: { orderBy: { order: 'asc' } },
        _count: { select: { listeners: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(playlists);
  } catch (error) {
    console.error('GET /api/playlists failed', error);
    return NextResponse.json({ error: 'Erro ao carregar playlists' }, { status: 500 });
  }
}

// POST /api/playlists -> criar playlist
export async function POST(req: NextRequest) {
  try {
    const token = extractToken(req.headers.get('authorization'));
    const payload = token ? verifyToken(token) : null;
    if (!payload) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const { name, description, isPublic } = await req.json();
    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Nome da playlist é obrigatório' }, { status: 400 });
    }

    const playlist = await prisma.playlist.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        isPublic: isPublic ?? false,
        creatorId: payload.id,
      },
      include: {
        creator: { select: { id: true, username: true, photoUrl: true } },
        musics: true,
        _count: { select: { listeners: true } },
      },
    });

    return NextResponse.json(playlist, { status: 201 });
  } catch (error) {
    console.error('POST /api/playlists failed', error);
    return NextResponse.json({ error: 'Erro ao criar playlist' }, { status: 500 });
  }
}
