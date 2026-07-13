import { NextRequest, NextResponse } from 'next/server';

// Storage simples em memória
const users: { [key: string]: any } = {};

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

    // Verificar duplicatas
    for (const user of Object.values(users)) {
      if (user.email === email || user.username === username) {
        return NextResponse.json(
          { error: 'Email ou username já existem' },
          { status: 409 }
        );
      }
    }

    // Criar user
    const userId = `user_${Date.now()}`;
    users[userId] = { id: userId, email, username, password, createdAt: new Date() };

    const token = `token_${userId}`;

    return NextResponse.json(
      {
        message: 'Conta criada com sucesso!',
        user: { id: userId, email, username },
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
