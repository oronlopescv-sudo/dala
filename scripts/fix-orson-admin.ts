import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixOrson() {
  try {
    const user = await prisma.user.findUnique({
      where: { email: 'orson@hotmail.fr' },
    });

    if (!user) {
      console.log('❌ Utilizador orson@hotmail.fr não encontrado');
      return;
    }

    if (user.role === 'ADMIN') {
      console.log('✓ orson@hotmail.fr já é admin');
      return;
    }

    await prisma.user.update({
      where: { email: 'orson@hotmail.fr' },
      data: { role: 'ADMIN' },
    });

    console.log('✅ orson@hotmail.fr promovido a admin');
  } catch (err) {
    console.error('❌ Erro:', err);
  } finally {
    await prisma.$disconnect();
  }
}

fixOrson();
