import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, extractToken } from '@/lib/auth';
import prisma from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const token = extractToken(req.headers.get('authorization'));
    if (!token) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const payload = verifyToken(token);
    if (!payload) {
      return NextResponse.json(
        { error: 'Token inválido' },
        { status: 401 }
      );
    }

    const { mutedId } = await req.json();

    if (!mutedId) {
      return NextResponse.json(
        { error: 'mutedId é obrigatório' },
        { status: 400 }
      );
    }

    if (payload.id === mutedId) {
      return NextResponse.json(
        { error: 'Não podes mutar a ti próprio' },
        { status: 400 }
      );
    }

    // Verificar se já está mutado
    const existingMute = await prisma.mute.findUnique({
      where: {
        muterId_mutedId: {
          muterId: payload.id,
          mutedId,
        },
      },
    });

    if (existingMute) {
      // Remover mute (unmute)
      await prisma.mute.delete({
        where: {
          muterId_mutedId: {
            muterId: payload.id,
            mutedId,
          },
        },
      });

      return NextResponse.json(
        { message: 'Utilizador desmutado' },
        { status: 200 }
      );
    } else {
      // Criar mute
      await prisma.mute.create({
        data: {
          muterId: payload.id,
          mutedId,
        },
      });

      return NextResponse.json(
        { message: 'Utilizador mutado' },
        { status: 201 }
      );
    }
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: 'Erro ao mutar/desmutar' },
      { status: 500 }
    );
  }
}

// GET lista de utilizadores mutados
export async function GET(req: NextRequest) {
  try {
    const token = extractToken(req.headers.get('authorization'));
    if (!token) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const payload = verifyToken(token);
    if (!payload) {
      return NextResponse.json(
        { error: 'Token inválido' },
        { status: 401 }
      );
    }

    const mutedUsers = await prisma.mute.findMany({
      where: { muterId: payload.id },
      include: {
        muted: {
          select: {
            id: true,
            username: true,
            photoUrl: true,
            bio: true,
          },
        },
      },
    });

    return NextResponse.json(
      {
        muted: mutedUsers.map((m) => m.muted),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: 'Erro ao obter lista de mutados' },
      { status: 500 }
    );
  }
}
