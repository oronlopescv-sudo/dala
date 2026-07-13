import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { NextRequest, NextResponse } from 'next/server';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this';

// Fallback em memória caso Prisma falhe
const usersMemory = new Map<string, any>();

async function signupWithPrisma(email: string, username: string, password: string) {
  try {
    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();

    const existingUser = await prisma.user.findFirst({
      where: { OR: [{ email }, { username }] },
    });

    if (existingUser) {
      await prisma.$disconnect();
      return { error: 'Email ou username já existem', status: 409 };
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { email, username, password: hashedPassword },
    });

    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, {
      expiresIn: '7d',
    });

    await prisma.$disconnect();

    return {
      message: 'Conta criada com sucesso',
      token,
      user: { id: user.id, email: user.email, username: user.username },
      status: 201,
    };
  } catch (error) {
    console.warn('Prisma failed, using memory fallback:', error instanceof Error ? error.message : error);
    return null;
  }
}

function signupWithMemory(email: string, username: string, password: string) {
  // Verificar duplicatas
  for (const user of usersMemory.values()) {
    if (user.email === email || user.username === username) {
      return { error: 'Email ou username já existem', status: 409 };
    }
  }

  const userId = `user_${Date.now()}_${Math.random()}`;
  const hashedPassword = require('bcryptjs').hashSync(password, 10);

  usersMemory.set(userId, { id: userId, email, username, password: hashedPassword });

  const token = jwt.sign({ id: userId, email }, JWT_SECRET, { expiresIn: '7d' });

  return {
    message: 'Conta criada com sucesso (armazenamento temporário)',
    token,
    user: { id: userId, email, username },
    status: 201,
  };
}

export async function POST(req: NextRequest) {
  try {
    const { email, username, password } = await req.json();

    if (!email || !username || !password) {
      return NextResponse.json(
        { error: 'Email, username, e password são obrigatórios' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password deve ter pelo menos 6 caracteres' },
        { status: 400 }
      );
    }

    // Tentar com Prisma primeiro
    const result = await signupWithPrisma(email, username, password);

    if (result) {
      const { status, ...data } = result;
      return NextResponse.json(data, { status });
    }

    // Fallback para memória
    const memoryResult = signupWithMemory(email, username, password);
    const { status, ...data } = memoryResult;
    return NextResponse.json(data, { status });
  } catch (error) {
    console.error('Signup error:', error);
    return NextResponse.json(
      { error: 'Erro ao criar conta' },
      { status: 500 }
    );
  }
}
