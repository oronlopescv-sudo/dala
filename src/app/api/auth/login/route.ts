import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { NextRequest, NextResponse } from 'next/server';
import { getClientIp, isIpBanned } from '@/lib/ip';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this';

export async function POST(req: NextRequest) {
  try {
    // Ban por IP: dispositivo banido não entra
    const ip = getClientIp(req);
    if (await isIpBanned(ip)) {
      return NextResponse.json(
        { error: 'Acesso bloqueado' },
        { status: 403 }
      );
    }

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

    // Guardar o IP para possibilitar ban por IP
    if (ip) {
      prisma.user
        .update({ where: { id: user.id }, data: { lastIp: ip } })
        .catch(() => {});
    }

    // Gerar JWT
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return NextResponse.json(
      {
        message: 'Login realizado com sucesso',
        token,
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          role: user.role,
          photoUrl: user.photoUrl,
          bio: user.bio,
          country: user.country,
          language: user.language,
        },
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
