import { createServer } from 'http';
import { parse } from 'url';
import { randomUUID } from 'crypto';
import next from 'next';
import { Server as SocketIOServer } from 'socket.io';
import prisma from './src/lib/db';

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

interface Member {
  socketId: string;
  userId: string | null;
  userName: string;
  photoUrl: string | null;
}

console.log('> Starting Next.js compilation... (this may take a minute or two on the first run)');
app.prepare().then(async () => {
  prisma
    .$connect()
    .then(() => console.log('> Successfully connected to Postgres via Prisma'))
    .catch((err) =>
      console.error('> Failed to connect to Postgres (expected locally without DB tunnel):', err.message)
    );

  const httpServer = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url!, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error occurred handling', req.url, err);
      res.statusCode = 500;
      res.end('internal server error');
    }
  });

  const io = new SocketIOServer(httpServer, { cors: { origin: '*' }, maxHttpBufferSize: 1e7 });

  // Só um orador por canal (mutex de voz)
  const channelSpeakers = new Map<string, string>(); // channelIdStr -> socketId
  // Presença: membros online por canal
  const channelMembers = new Map<string, Map<string, Member>>(); // channelIdStr -> socketId -> Member

  const membersList = (channelIdStr: string): Member[] =>
    Array.from(channelMembers.get(channelIdStr)?.values() ?? []);

  const removeFromChannel = (socketId: string, channelIdStr: string) => {
    const members = channelMembers.get(channelIdStr);
    if (members) {
      members.delete(socketId);
      if (members.size === 0) channelMembers.delete(channelIdStr);
    }
    if (channelSpeakers.get(channelIdStr) === socketId) {
      channelSpeakers.delete(channelIdStr);
      io.to(channelIdStr).emit('speaker_ended', { userId: socketId });
    }
  };

  io.on('connection', (socket) => {
    console.log(`> Client connected: ${socket.id}`);

    socket.on('join_channel', async ({ channelName, userName, userId, photoUrl }) => {
      socket.data.userName = userName;
      socket.data.userId = userId ?? null;
      socket.data.photoUrl = photoUrl ?? null;

      try {
        let channel = await prisma.channel.findUnique({ where: { name: channelName } });
        if (!channel) channel = await prisma.channel.create({ data: { name: channelName } });

        const channelIdStr = channel.id.toString();
        socket.data.channelId = channel.id;
        socket.data.channelIdStr = channelIdStr;
        socket.join(channelIdStr);

        const member: Member = {
          socketId: socket.id,
          userId: userId ?? null,
          userName,
          photoUrl: photoUrl ?? null,
        };
        if (!channelMembers.has(channelIdStr)) channelMembers.set(channelIdStr, new Map());
        channelMembers.get(channelIdStr)!.set(socket.id, member);

        // Envia a lista completa a quem entrou
        socket.emit('channel_members', membersList(channelIdStr));
        // Avisa os restantes
        socket.broadcast.to(channelIdStr).emit('user_joined', member);

        console.log(`> ${userName} joined ${channelName} (${channelIdStr})`);
      } catch (err) {
        console.error('Error joining channel:', err);
      }
    });

    // ---- Chat de texto ----
    socket.on('send_message', (payload: { content: string }) => {
      const { channelId, channelIdStr, userId, userName, photoUrl } = socket.data;
      const content = (payload?.content ?? '').trim();
      if (!channelIdStr || !content) return;

      const message = {
        id: randomUUID(),
        content: content.slice(0, 1000),
        createdAt: new Date().toISOString(),
        user: { id: userId, username: userName, photoUrl },
      };

      // Emite já (otimista) para todos, inclusive o autor
      io.to(channelIdStr).emit('new_message', message);

      // Persiste em segundo plano (não bloqueia a UX se a BD falhar)
      if (userId) {
        prisma.message
          .create({ data: { content: message.content, channelId, userId } })
          .catch((err) => console.error('Failed to persist message:', err.message));
      }
    });

    // ---- Reações/emojis efémeros ----
    socket.on('send_reaction', (payload: { emoji: string }) => {
      const { channelIdStr, userName } = socket.data;
      if (!channelIdStr || !payload?.emoji) return;
      io.to(channelIdStr).emit('new_reaction', {
        id: randomUUID(),
        emoji: String(payload.emoji).slice(0, 8),
        userName,
      });
    });

    // ---- Voz PTT ----
    socket.on('request_speak', () => {
      const { channelIdStr, userName } = socket.data;
      if (!channelIdStr) return;

      const currentSpeaker = channelSpeakers.get(channelIdStr);
      if (!currentSpeaker || currentSpeaker === socket.id) {
        channelSpeakers.set(channelIdStr, socket.id);
        socket.data.speakStartTime = Date.now();
        io.to(channelIdStr).emit('speaker_started', { userId: socket.id, userName });
        socket.emit('speak_granted');
      } else {
        socket.emit('speak_denied');
      }
    });

    socket.on('audio_data', (audioChunk) => {
      const { channelIdStr } = socket.data;
      if (!channelIdStr) return;
      if (channelSpeakers.get(channelIdStr) === socket.id) {
        socket.broadcast.to(channelIdStr).emit('audio_data', { userId: socket.id, audioChunk });
      }
    });

    socket.on('release_speak', async () => {
      const { channelId, channelIdStr, userName, userId, speakStartTime } = socket.data;
      if (!channelIdStr) return;

      if (channelSpeakers.get(channelIdStr) === socket.id) {
        channelSpeakers.delete(channelIdStr);
        io.to(channelIdStr).emit('speaker_ended', { userId: socket.id });

        if (speakStartTime && userId) {
          const durationMs = Date.now() - speakStartTime;
          try {
            await prisma.voiceLog.create({
              data: { userId, userName: userName || 'Anonymous', channelId, durationMs },
            });
            console.log(`> Voice logged: ${userName} spoke for ${durationMs}ms in channel ${channelId}`);
          } catch (err) {
            console.error('Failed to log voice to DB', (err as Error).message);
          }
          socket.data.speakStartTime = null;
        }
      }
    });

    socket.on('disconnect', () => {
      const { channelIdStr } = socket.data;
      console.log(`> Client disconnected: ${socket.id}`);
      if (channelIdStr) {
        removeFromChannel(socket.id, channelIdStr);
        io.to(channelIdStr).emit('user_left', { socketId: socket.id });
      }
    });
  });

  httpServer.once('error', (err) => {
    console.error(err);
    process.exit(1);
  });

  httpServer.listen(port, () => {
    console.log(`> Ready on http://${hostname}:${port}`);
  });
});
