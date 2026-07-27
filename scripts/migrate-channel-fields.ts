// Script para adicionar campos mode e expiresAt à tabela Channel
import prisma from '../src/lib/db';

async function main() {
  try {
    console.log('Adicionando campos à tabela Channel...');

    // Executar SQL raw para adicionar as colunas se não existirem
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "Channel" ADD COLUMN IF NOT EXISTS "mode" "ChannelMode" DEFAULT 'FREE';
    `);
    console.log('✅ Coluna mode adicionada');

    await prisma.$executeRawUnsafe(`
      ALTER TABLE "Channel" ADD COLUMN IF NOT EXISTS "expiresAt" TIMESTAMP(3);
    `);
    console.log('✅ Coluna expiresAt adicionada');

    // Atualizar canais privados existentes para expirar em 5 dias
    const updated = await prisma.$executeRawUnsafe(`
      UPDATE "Channel"
      SET "expiresAt" = NOW() + INTERVAL '5 days'
      WHERE "type" = 'PRIVATE' AND "expiresAt" IS NULL;
    `);
    console.log(`✅ ${updated} canais privados com expiração definida`);

  } catch (err) {
    console.error('❌ Erro ao migrar:', (err as Error).message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
