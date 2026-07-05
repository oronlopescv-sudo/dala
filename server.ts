import { createServer } from 'http';
import { parse } from 'url';
import next from 'next';
import { Server as SocketIOServer } from 'socket.io';
import prisma from './src/lib/db.ts';

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

// Initialize Next.js app
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

console.log('> Starting Next.js compilation... (this may take a minute or two on the first run)');
app.prepare().then(async () => {
  // Test Prisma Connection without blocking
  prisma.$connect()
    .then(() => console.log('> Successfully connected to Postgres via Prisma'))
    .catch((err) => console.error('> Failed to connect to Postgres (expected if running locally without DB tunnel):', err.message));

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

  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: '*',
    },
  });

  // Concurrency state (Mutex) per channel to ensure only one speaker
  const channelSpeakers = new Map<string, string>(); // channelId -> socketId

  io.on('connection', (socket) => {
    console.log(`> Client connected: ${socket.id}`);

    socket.on('join_channel', async ({ channelName, userName }) => {
      socket.data.userName = userName;
      
      try {
        // Upsert channel
        let channel = await prisma.channel.findUnique({ where: { name: channelName } });
        if (!channel) {
          channel = await prisma.channel.create({ data: { name: channelName } });
        }
        
        const channelIdStr = channel.id.toString();
        socket.data.channelId = channel.id;
        socket.data.channelIdStr = channelIdStr;
        
        socket.join(channelIdStr);
        
        // Broadcast user joined
        io.to(channelIdStr).emit('user_joined', { userName, id: socket.id });
        
        console.log(`> ${userName} joined channel ${channelName} (${channelIdStr})`);
      } catch (err) {
        console.error('Error joining channel:', err);
      }
    });

    socket.on('request_speak', () => {
      const { channelIdStr, userName } = socket.data;
      if (!channelIdStr) return;

      const currentSpeaker = channelSpeakers.get(channelIdStr);
      if (!currentSpeaker || currentSpeaker === socket.id) {
        // Grant permission to speak
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

      // Only broadcast if they are the current speaker
      if (channelSpeakers.get(channelIdStr) === socket.id) {
        // Broadcast audio chunk to all other clients in the channel
        socket.broadcast.to(channelIdStr).emit('audio_data', {
          userId: socket.id,
          audioChunk,
        });
      }
    });

    socket.on('release_speak', async () => {
      const { channelId, channelIdStr, userName, speakStartTime } = socket.data;
      if (!channelIdStr) return;

      if (channelSpeakers.get(channelIdStr) === socket.id) {
        channelSpeakers.delete(channelIdStr);
        io.to(channelIdStr).emit('speaker_ended', { userId: socket.id });
        
        // Log to database
        if (speakStartTime) {
          const durationMs = Date.now() - speakStartTime;
          try {
            await prisma.voiceLog.create({
              data: {
                userId: socket.id,
                userName: userName || 'Anonymous',
                channelId: channelId,
                durationMs,
              }
            });
          } catch (err) {
            console.error('Failed to log voice to DB', err);
          }
          socket.data.speakStartTime = null;
        }
      }
    });

    socket.on('disconnect', () => {
      const { channelIdStr } = socket.data;
      console.log(`> Client disconnected: ${socket.id}`);
      
      if (channelIdStr) {
        if (channelSpeakers.get(channelIdStr) === socket.id) {
          channelSpeakers.delete(channelIdStr);
          io.to(channelIdStr).emit('speaker_ended', { userId: socket.id });
        }
        io.to(channelIdStr).emit('user_left', { id: socket.id });
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
