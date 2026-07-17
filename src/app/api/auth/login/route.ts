import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { NextRequest, NextResponse } from 'next/server';
import { sanitizeUser } from '@/lib/auth';
import prisma from '@/lib/db';

function getJWTSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is not set. This is required for authentication.');
  }
  return secret;
}

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email e password são obrigatórios' },
        { status: 400 }
      );
    }

    // Procurar user pelo email
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'Email ou password inválidos' },
        { status: 401 }
      );
    }

    // Banido permanentemente
    if (user.banned) {
      return NextResponse.json(
        { error: 'Esta conta foi banida permanentemente' },
        { status: 403 }
      );
    }

    // Verificar password
    const passwordMatch = await bcrypt.compare(password, user.password);

    if (!passwordMatch) {
      return NextResponse.json(
        { error: 'Email ou password inválidos' },
        { status: 401 }
      );
    }

    // Gerar JWT
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      getJWTSecret(),
      { expiresIn: '7d' }
    );

    return NextResponse.json(
      {
        message: 'Login realizado com sucesso',
        token,
        user: sanitizeUser(user),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: 'Erro ao fazer login' },
      { status: 500 }
    );
  }
}
