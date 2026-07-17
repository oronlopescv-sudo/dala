import prisma from '@/lib/db';

export async function getFilteredMessages(channelId: number, userId: string) {
  // Obter lista de utilizadores que este user tem mutado
  const mutedUsers = await prisma.mute.findMany({
    where: { muterId: userId },
    select: { mutedId: true },
  });

  const mutedIds = mutedUsers.map((m) => m.mutedId);

  // Obter mensagens, mas excluindo as dos mutados
  const messages = await prisma.message.findMany({
    where: {
      channelId,
      userId: {
        notIn: mutedIds,
      },
    },
    include: {
      user: {
        select: {
          id: true,
          username: true,
          photoUrl: true,
          bio: true,
        },
      },
    },
    orderBy: { createdAt: 'asc' },
  });

  return messages;
}

export async function getFilteredVoiceLogs(
  channelId: number,
  userId: string
) {
  // Obter lista de utilizadores que este user tem mutado
  const mutedUsers = await prisma.mute.findMany({
    where: { muterId: userId },
    select: { mutedId: true },
  });

  const mutedIds = mutedUsers.map((m) => m.mutedId);

  // Obter voice logs, mas excluindo os dos mutados
  const voiceLogs = await prisma.voiceLog.findMany({
    where: {
      channelId,
      userId: {
        notIn: mutedIds,
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return voiceLogs;
}
