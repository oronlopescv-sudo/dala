import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { sanitizeUser } from '@/lib/auth';

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
