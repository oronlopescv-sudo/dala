import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { verifyToken, extractToken } from '@/lib/auth';

// GET /api/playlists/:id/musics -> listar musicas da playlist
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const musics = await prisma.music.findMany({
      where: { playlistId: id },
      orderBy: { order: 'asc' },
    });

    return NextResponse.json(musics);
  } catch (error) {
    console.error('GET /api/playlists/:id/musics failed', error);
    return NextResponse.json({ error: 'Erro ao carregar músicas' }, { status: 500 });
  }
}

// POST /api/playlists/:id/musics -> adicionar musica
export async function POST(
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
    const { title, artist, duration, fileUrl } = await req.json();

    if (!title || !fileUrl) {
      return NextResponse.json(
        { error: 'Título e ficheiro são obrigatórios' },
        { status: 400 }
      );
    }

    // Verificar se é criador da playlist
    const playlist = await prisma.playlist.findUnique({ where: { id } });
    if (!playlist || playlist.creatorId !== payload.id) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    // Contar musicas para atribuir order
    const count = await prisma.music.count({ where: { playlistId: id } });

    const music = await prisma.music.create({
      data: {
        title: title.trim(),
        artist: artist?.trim() || null,
        duration: parseInt(duration) || 0,
        fileUrl: fileUrl.trim(),
        order: count,
        playlistId: id,
      },
    });

    return NextResponse.json(music, { status: 201 });
  } catch (error) {
    console.error('POST /api/playlists/:id/musics failed', error);
    return NextResponse.json({ error: 'Erro ao adicionar música' }, { status: 500 });
  }
}
