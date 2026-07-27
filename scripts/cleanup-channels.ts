// Script para limpar canais expirados — roda via cron ou job
import prisma from '../src/lib/db';

async function main() {
  try {
    const now = new Date();
    console.log(`[${now.toISOString()}] Limpando canais expirados...`);

    const deleted = await prisma.channel.deleteMany({
      where: {
        expiresAt: {
          lte: now,
        },
      },
    });

    if (deleted.count > 0) {
      console.log(`✅ ${deleted.count} canais expirados apagados`);
    } else {
      console.log('✓ Nenhum canal expirado');
    }
  } catch (err) {
    console.error('❌ Erro ao limpar canais:', (err as Error).message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
