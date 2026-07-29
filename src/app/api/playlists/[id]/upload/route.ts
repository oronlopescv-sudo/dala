import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { randomUUID } from 'crypto';
import prisma from '@/lib/db';
import { verifyToken, extractToken } from '@/lib/auth';

const MAX_MUSICS_PER_PLAYLIST = 10;
const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10 MB
const ALLOWED_TYPES = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/x-m4a', 'audio/mp4'];

const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads', 'music');

// POST /api/playlists/:id/upload -> recebe o ficheiro de audio e cria a musica
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

    // Só o criador da playlist adiciona músicas
    const playlist = await prisma.playlist.findUnique({ where: { id } });
    if (!playlist) {
      return NextResponse.json({ error: 'Playlist não encontrada' }, { status: 404 });
    }
    if (playlist.creatorId !== payload.id) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const count = await prisma.music.count({ where: { playlistId: id } });
    if (count >= MAX_MUSICS_PER_PLAYLIST) {
      return NextResponse.json(
        { error: `Máximo de ${MAX_MUSICS_PER_PLAYLIST} músicas por playlist` },
        { status: 400 }
      );
    }

    const form = await req.formData();
    const file = form.get('file');
    if (!file || typeof file === 'string') {
      return NextResponse.json({ error: 'Ficheiro em falta' }, { status: 400 });
    }

    if (file.size > MAX_FILE_BYTES) {
      return NextResponse.json({ error: 'Ficheiro maior que 10 MB' }, { status: 400 });
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: 'Formato não suportado. Usa MP3, WAV, OGG ou M4A.' },
        { status: 400 }
      );
    }

    // Nome gerado por nós: o nome original do utilizador nunca toca no caminho
    const ext = (file.name.split('.').pop() ?? 'mp3').toLowerCase().replace(/[^a-z0-9]/g, '');
    const fileName = `${randomUUID()}.${ext || 'mp3'}`;

    await mkdir(UPLOAD_DIR, { recursive: true });
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(path.join(UPLOAD_DIR, fileName), buffer);

    const title = String(form.get('title') ?? '').trim() || file.name.replace(/\.[^.]+$/, '');
    const artist = String(form.get('artist') ?? '').trim() || null;
    const duration = parseInt(String(form.get('duration') ?? '0'), 10) || 0;

    const music = await prisma.music.create({
      data: {
        title: title.slice(0, 200),
        artist: artist ? artist.slice(0, 200) : null,
        duration,
        // Servido por /api/music: o Next não serve ficheiros escritos
        // em public/ depois do build.
        fileUrl: `/api/music/${fileName}`,
        order: count,
        playlistId: id,
      },
    });

    return NextResponse.json(music, { status: 201 });
  } catch (error) {
    console.error('POST /api/playlists/:id/upload failed', error);
    return NextResponse.json({ error: 'Erro ao carregar música' }, { status: 500 });
  }
}
