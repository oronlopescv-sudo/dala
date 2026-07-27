import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '@/lib/db';
import { sanitizeUser } from '@/lib/auth';

function getJWTSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is not set. This is required for authentication.');
  }
  return secret;
}

export async function POST(req: NextRequest) {
  try {
    const { email, username, password } = await req.json();

    if (!email || !username || !password) {
      return NextResponse.json(
        { error: 'Email, username e password são obrigatórios' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password deve ter pelo menos 6 caracteres' },
        { status: 400 }
      );
    }

    if (!email.includes('@')) {
      return NextResponse.json(
        { error: 'Email inválido' },
        { status: 400 }
      );
    }

    // Normalizar email: trim + lowercase
    const normalizedEmail = email.trim().toLowerCase();

    // Verificar duplicatas com email normalizado
    const existingEmail = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (existingEmail) {
      return NextResponse.json(
        { error: 'Email já existe' },
        { status: 409 }
      );
    }

    const existingUsername = await prisma.user.findUnique({ where: { username } });
    if (existingUsername) {
      return NextResponse.json(
        { error: 'Username já existe' },
        { status: 409 }
      );
    }

    // Hash da password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Criar user com email normalizado
    const user = await prisma.user.create({
      data: {
        email: normalizedEmail,
        username,
        password: hashedPassword,
        role: 'USER',
      },
    });

    // Gerar JWT
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      getJWTSecret(),
      { expiresIn: '7d' }
    );

    return NextResponse.json(
      {
        message: 'Conta criada com sucesso!',
        user: sanitizeUser(user),
        token,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Signup error:', error);
    return NextResponse.json(
      { error: 'Erro ao processar signup' },
      { status: 500 }
    );
  }
}
