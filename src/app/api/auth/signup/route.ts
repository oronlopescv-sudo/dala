import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { NextRequest, NextResponse } from 'next/server';
import { getClientIp, isIpBanned } from '@/lib/ip';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this';

export async function POST(req: NextRequest) {
  try {
    // Ban por IP: dispositivo banido não cria contas novas
    const ip = getClientIp(req);
    if (await isIpBanned(ip)) {
      return NextResponse.json(
        { error: 'Acesso bloqueado' },
        { status: 403 }
      );
    }

    const { email, username, password } = await req.json();

    if (!email || !username || !password) {
      return NextResponse.json(
        { error: 'Email, username, e password são obrigatórios' },
        { status: 400 }
      );
    }

    // Verificar se email ou username já existem
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ email }, { username }],
      },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'Email ou username já existem' },
        { status: 409 }
      );
    }

    // Hash da password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Criar user
    const user = await prisma.user.create({
      data: {
        email,
        username,
        password: hashedPassword,
        lastIp: ip,
      },
    });

    // Gerar JWT
    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, {
      expiresIn: '7d',
    });

    return NextResponse.json(
      {
        message: 'Conta criada com sucesso',
        token,
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: 'Erro ao criar conta' },
      { status: 500 }
    );
  }
}
