import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Acrescenta RADIO ao enum ChannelType. O `prisma db push` nem sempre
// aplica valores novos de enum, por isso garantimos aqui.
async function migrate() {
  try {
    await prisma.$executeRawUnsafe(
      `ALTER TYPE "ChannelType" ADD VALUE IF NOT EXISTS 'RADIO'`
    );
    console.log('✅ Tipo de canal RADIO disponível');
  } catch (error) {
    console.error('⚠ Migração do tipo RADIO falhou:', (error as Error).message);
  } finally {
    await prisma.$disconnect();
  }
}

migrate();
