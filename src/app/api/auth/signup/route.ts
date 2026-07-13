import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { NextRequest, NextResponse } from 'next/server';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this';

// Mock storage em memória (para fallback se Prisma falhar)
const users = new Map<string, any>();

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

    // Verificar duplicatas em memória
    for (const user of users.values()) {
      if (user.email === email || user.username === username) {
        return NextResponse.json(
          { error: 'Email ou username já existem' },
          { status: 409 }
        );
      }
    }

    // Hash da password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Criar user em memória
    const userId = `user_${Date.now()}`;
    const newUser = {
      id: userId,
      email,
      username,
      password: hashedPassword,
      createdAt: new Date().toISOString(),
    };

    users.set(userId, newUser);

    // Gerar JWT
    const token = jwt.sign({ id: userId, email }, JWT_SECRET, {
      expiresIn: '7d',
    });

    return NextResponse.json(
      {
        message: 'Conta criada com sucesso',
        token,
        user: {
          id: userId,
          email,
          username,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Signup error:', error);
    return NextResponse.json(
      { error: 'Erro ao criar conta' },
      { status: 500 }
    );
  }
}
