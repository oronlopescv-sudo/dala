import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function migrate() {
  console.log('Criando tabelas de playlists...');

  try {
    // Criar tabela Playlist
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "Playlist" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "name" TEXT NOT NULL,
        "description" TEXT,
        "isPublic" BOOLEAN NOT NULL DEFAULT false,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "creatorId" TEXT NOT NULL,
        FOREIGN KEY ("creatorId") REFERENCES "User"("id") ON DELETE CASCADE,
        UNIQUE ("creatorId", "name")
      )
    `);
    console.log('✅ Tabela Playlist criada');

    // Criar tabela Music
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "Music" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "title" TEXT NOT NULL,
        "artist" TEXT,
        "duration" INTEGER NOT NULL,
        "fileUrl" TEXT NOT NULL,
        "order" INTEGER NOT NULL,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "playlistId" TEXT NOT NULL,
        FOREIGN KEY ("playlistId") REFERENCES "Playlist"("id") ON DELETE CASCADE
      )
    `);
    console.log('✅ Tabela Music criada');

    // Criar índice em playlistId
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "Music_playlistId_idx" ON "Music"("playlistId")
    `);
    console.log('✅ Índice Music_playlistId criado');

    // Criar tabela PlaylistListener
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "PlaylistListener" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "userId" TEXT NOT NULL,
        "playlistId" TEXT NOT NULL,
        "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE,
        FOREIGN KEY ("playlistId") REFERENCES "Playlist"("id") ON DELETE CASCADE,
        UNIQUE ("userId", "playlistId")
      )
    `);
    console.log('✅ Tabela PlaylistListener criada');

    console.log('✅ Todas as tabelas foram criadas com sucesso!');
  } catch (error) {
    console.error('❌ Erro durante migração:', error);
  } finally {
    await prisma.$disconnect();
  }
}

migrate();
