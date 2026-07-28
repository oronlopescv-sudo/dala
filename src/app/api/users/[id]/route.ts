import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { sanitizeUser } from '@/lib/auth';

// GET /api/users/:id -> perfil público de um utilizador.
// Devolve só o que é seguro mostrar a terceiros: sem email nem password.
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await prisma.user.findUnique({ where: { id } });

    if (!user) {
      return NextResponse.json({ error: 'Utilizador não encontrado' }, { status: 404 });
    }

    return NextResponse.json({
      id: user.id,
      username: user.username,
      photoUrl: user.photoUrl,
      bio: user.bio,
      country: user.country,
      language: user.language,
      createdAt: user.createdAt,
    });
  } catch (error) {
    console.error('GET /api/users/:id failed', error);
    return NextResponse.json({ error: 'Falha ao carregar perfil' }, { status: 500 });
  }
}

// PUT /api/users/:id -> atualiza perfil (painel do utilizador)
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();

    const user = await prisma.user.update({
      where: { id },
      data: {
        photoUrl: body.photoUrl ?? undefined,
        bio: body.bio ?? undefined,
        country: body.country ?? undefined,
        language: body.language ?? undefined,
      },
    });
    return NextResponse.json(sanitizeUser(user));
  } catch (error) {
    console.error('PUT /api/users/:id failed', error);
    return NextResponse.json({ error: 'Falha ao atualizar perfil' }, { status: 500 });
  }
}
