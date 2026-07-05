import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

// GET /api/users?username=xxx  -> um utilizador
// GET /api/users?q=xxx         -> pesquisa (descoberta de pessoas)
// GET /api/users               -> lista recente
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const username = searchParams.get('username');
    const q = searchParams.get('q');
    const country = searchParams.get('country');
    const language = searchParams.get('language');

    if (username) {
      const user = await prisma.user.findUnique({ where: { username } });
      return NextResponse.json(user);
    }

    const where: Record<string, unknown> = {};
    if (q) where.username = { contains: q, mode: 'insensitive' };
    if (country) where.country = country;
    if (language) where.language = language;

    const users = await prisma.user.findMany({
      where,
      take: 50,
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(users);
  } catch (error) {
    console.error('GET /api/users failed', error);
    return NextResponse.json({ error: 'Falha ao carregar utilizadores' }, { status: 500 });
  }
}

// POST /api/users -> cria ou atualiza (upsert por username)
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const username: string = (body.username ?? '').trim();
    if (!username) {
      return NextResponse.json({ error: 'username é obrigatório' }, { status: 400 });
    }

    const data = {
      photoUrl: body.photoUrl ?? null,
      bio: body.bio ?? null,
      country: body.country ?? null,
      language: body.language ?? null,
    };

    const user = await prisma.user.upsert({
      where: { username },
      update: data,
      create: { username, ...data },
    });
    return NextResponse.json(user);
  } catch (error) {
    console.error('POST /api/users failed', error);
    return NextResponse.json({ error: 'Falha ao guardar perfil' }, { status: 500 });
  }
}
