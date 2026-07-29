import { NextRequest, NextResponse } from 'next/server';
import { unlink } from 'fs/promises';
import path from 'path';
import prisma from '@/lib/db';
import { verifyToken, extractToken } from '@/lib/auth';

const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads', 'music');

// DELETE /api/playlists/:id/musics/:musicId -> remove a música da playlist
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; musicId: string }> }
) {
  try {
    const token = extractToken(req.headers.get('authorization'));
    const payload = token ? verifyToken(token) : null;
    if (!payload) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const { id, musicId } = await params;

    // Só o dono da playlist remove músicas
    const playlist = await prisma.playlist.findUnique({ where: { id } });
    if (!playlist) {
      return NextResponse.json({ error: 'Playlist não encontrada' }, { status: 404 });
    }
    if (playlist.creatorId !== payload.id) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const music = await prisma.music.findUnique({ where: { id: musicId } });
    if (!music || music.playlistId !== id) {
      return NextResponse.json({ error: 'Música não encontrada' }, { status: 404 });
    }

    await prisma.music.delete({ where: { id: musicId } });

    // Apaga o ficheiro do disco — senão fica a ocupar espaço para sempre.
    // Só aceita o nome que nós geramos, nunca um caminho vindo de fora.
    const fileName = path.basename(music.fileUrl);
    if (/^[a-f0-9-]{36}\.[a-z0-9]{2,4}$/i.test(fileName)) {
      await unlink(path.join(UPLOAD_DIR, fileName)).catch(() => {
        // Ficheiro já não existia (ex.: perdido num deploy antigo) — não é erro
      });
    }

    // Reordena as restantes para não ficarem buracos na ordem
    const restantes = await prisma.music.findMany({
      where: { playlistId: id },
      orderBy: { order: 'asc' },
    });
    await Promise.all(
      restantes.map((m, i) =>
        m.order === i
          ? Promise.resolve(null)
          : prisma.music.update({ where: { id: m.id }, data: { order: i } })
      )
    );

    return NextResponse.json({ message: 'Música removida' });
  } catch (error) {
    console.error('DELETE /api/playlists/:id/musics/:musicId failed', error);
    return NextResponse.json({ error: 'Erro ao remover música' }, { status: 500 });
  }
}
