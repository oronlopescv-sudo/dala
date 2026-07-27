import prisma from '@/lib/db';
import { NextResponse } from 'next/server';

// DELETE /api/cleanup/expired-channels — remove canais que expiraram
// Pode ser chamado por cron job ou manualmente
export async function DELETE(req: Request) {
  try {
    const now = new Date();

    // Apagar canais privados que expiraram (>5 dias)
    const deleted = await prisma.channel.deleteMany({
      where: {
        expiresAt: {
          lte: now,
        },
      },
    });

    return NextResponse.json({
      message: `${deleted.count} canais expirados apagados`,
      count: deleted.count,
    });
  } catch (error) {
    console.error('DELETE /api/cleanup/expired-channels failed', error);
    return NextResponse.json({ error: 'Erro ao limpar canais' }, { status: 500 });
  }
}
