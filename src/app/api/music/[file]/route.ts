import { NextRequest, NextResponse } from 'next/server';
import { readFile, stat } from 'fs/promises';
import path from 'path';

// O Next.js só serve os ficheiros que estavam em public/ no momento do build.
// As músicas são escritas depois, por isso precisam desta rota para tocar.
const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads', 'music');

const MIME: Record<string, string> = {
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.ogg': 'audio/ogg',
  '.m4a': 'audio/mp4',
  '.mp4': 'audio/mp4',
};

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ file: string }> }
) {
  try {
    const { file } = await params;

    // Só nomes que nós geramos: <uuid>.<ext>. Bloqueia ".." e caminhos.
    if (!/^[a-f0-9-]{36}\.[a-z0-9]{2,4}$/i.test(file)) {
      return NextResponse.json({ error: 'Nome inválido' }, { status: 400 });
    }

    const full = path.join(UPLOAD_DIR, file);
    // Defesa extra: o caminho final tem de continuar dentro da pasta
    if (!full.startsWith(UPLOAD_DIR)) {
      return NextResponse.json({ error: 'Nome inválido' }, { status: 400 });
    }

    const info = await stat(full).catch(() => null);
    if (!info?.isFile()) {
      return NextResponse.json({ error: 'Música não encontrada' }, { status: 404 });
    }

    const data = await readFile(full);
    const ext = path.extname(file).toLowerCase();

    return new NextResponse(new Uint8Array(data), {
      headers: {
        'Content-Type': MIME[ext] ?? 'application/octet-stream',
        'Content-Length': String(info.size),
        'Cache-Control': 'public, max-age=31536000, immutable',
        'Accept-Ranges': 'bytes',
      },
    });
  } catch (error) {
    console.error('GET /api/music/:file failed', error);
    return NextResponse.json({ error: 'Erro ao carregar música' }, { status: 500 });
  }
}
