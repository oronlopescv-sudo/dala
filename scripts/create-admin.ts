// Cria/promove a conta ADMIN a partir das variáveis de ambiente.
// Uso: ADMIN_EMAIL=... ADMIN_PASSWORD=... npx tsx scripts/create-admin.ts
// Ou define ADMIN_EMAIL e ADMIN_PASSWORD no .env do Easypanel — corre no arranque.

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

export async function ensureAdmin() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;

  if (!email || !password) {
    console.log('> ADMIN_EMAIL/ADMIN_PASSWORD não definidos — skip admin seed');
    return;
  }

  const hashed = await bcrypt.hash(password, 10);

  const existing = await prisma.user.findUnique({ where: { email } });

  if (existing) {
    await prisma.user.update({
      where: { email },
      data: { role: 'ADMIN', banned: false, password: hashed },
    });
    console.log(`> Admin atualizado: ${email}`);
  } else {
    await prisma.user.create({
      data: {
        email,
        username: process.env.ADMIN_USERNAME || 'admin',
        password: hashed,
        role: 'ADMIN',
      },
    });
    console.log(`> Admin criado: ${email}`);
  }
}

// Nota: este módulo é importado pelo server.ts que chama ensureAdmin() no arranque.
