import { PrismaClient } from '@prisma/client';

// Fallback em memória para quando Prisma não consegue ligar à BD
class MemoryDb {
  private users = new Map<string, any>();
  private channels = new Map<number, any>();
  private messages = new Map<string, any>();
  private friendships = new Map<string, any>();
  private mutes = new Map<string, any>();
  private reports = new Map<string, any>();
  private voiceLogs = new Map<number, any>();

  private nextChannelId = 1;
  private nextVoiceLogId = 1;

  private matchesWhere(obj: any, where: any): boolean {
    if (!where) return true;

    // Handle OR
    if (where.OR) {
      return where.OR.some((clause: any) => this.matchesWhere(obj, clause));
    }

    for (const [key, value] of Object.entries(where)) {
      if (key === 'OR') continue;

      // Handle nested objects with operators
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        if (value.contains !== undefined) {
          if (typeof obj[key] !== 'string' || !obj[key].toLowerCase().includes(value.contains.toLowerCase())) {
            return false;
          }
        } else if (value.notIn !== undefined) {
          if (value.notIn.includes(obj[key])) return false;
        } else {
          // Nested relation
          if (obj[key] !== value) return false;
        }
      } else {
        if (obj[key] !== value) return false;
      }
    }
    return true;
  }

  user = {
    create: async (data: any) => {
      const id = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const user = {
        id,
        ...data,
        role: data.role || 'USER',
        banned: data.banned ?? false,
        bannedAt: data.bannedAt ?? null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      this.users.set(id, user);
      return user;
    },

    findUnique: async (args: any) => {
      if (args.where.id) {
        return this.users.get(args.where.id) || null;
      }
      if (args.where.email) {
        for (const user of this.users.values()) {
          if (user.email === args.where.email) return user;
        }
      }
      if (args.where.username) {
        for (const user of this.users.values()) {
          if (user.username === args.where.username) return user;
        }
      }
      return null;
    },

    findFirst: async (args: any) => {
      for (const user of this.users.values()) {
        if (this.matchesWhere(user, args.where)) return user;
      }
      return null;
    },

    findMany: async (args?: any) => {
      let results = Array.from(this.users.values()).filter((u) =>
        this.matchesWhere(u, args?.where)
      );

      if (args?.orderBy) {
        const [field, dir] = Object.entries(args.orderBy)[0] as [string, string];
        results.sort((a, b) => {
          const aVal = a[field];
          const bVal = b[field];
          if (aVal < bVal) return dir === 'asc' ? -1 : 1;
          if (aVal > bVal) return dir === 'asc' ? 1 : -1;
          return 0;
        });
      }

      if (args?.take) {
        results = results.slice(0, args.take);
      }
      return results;
    },

    update: async (args: any) => {
      const user = this.users.get(args.where.id);
      if (!user) throw new Error('User not found');
      const updated = { ...user, ...args.data, updatedAt: new Date() };
      this.users.set(args.where.id, updated);
      return updated;
    },

    upsert: async (args: any) => {
      let user = await this.user.findUnique({ where: args.where });
      if (user) {
        return this.user.update({ where: args.where, data: args.update });
      }
      return this.user.create(args.create);
    },

    delete: async (args: any) => {
      const user = this.users.get(args.where.id);
      if (!user) throw new Error('User not found');
      this.users.delete(args.where.id);
      return user;
    },
  };

  channel = {
    create: async (data: any) => {
      const id = this.nextChannelId++;
      const channel = {
        id,
        ...data,
        createdAt: new Date(),
      };
      this.channels.set(id, channel);
      return channel;
    },

    createMany: async (args: any) => {
      let count = 0;
      for (const data of args.data) {
        await this.channel.create(data);
        count++;
      }
      return { count };
    },

    findUnique: async (args: any) => {
      const channel = this.channels.get(args.where.name ?
        Array.from(this.channels.values()).find((c) => c.name === args.where.name)?.id :
        args.where.id
      );

      if (!channel && args.where.name) {
        for (const ch of this.channels.values()) {
          if (ch.name === args.where.name) {
            return args.include ? this.enrichChannel(ch, args.include) : ch;
          }
        }
      }
      return channel ? (args.include ? this.enrichChannel(channel, args.include) : channel) : null;
    },

    findMany: async (args?: any) => {
      let results = Array.from(this.channels.values()).filter((ch) =>
        this.matchesWhere(ch, args?.where)
      );

      if (args?.orderBy) {
        const [field, dir] = Object.entries(args.orderBy)[0] as [string, string];
        results.sort((a, b) => {
          const aVal = a[field];
          const bVal = b[field];
          if (aVal < bVal) return dir === 'asc' ? -1 : 1;
          if (aVal > bVal) return dir === 'asc' ? 1 : -1;
          return 0;
        });
      }

      if (args?.take) {
        results = results.slice(0, args.take);
      }

      return results.map((ch) => args?.include ? this.enrichChannel(ch, args.include) : ch);
    },

    update: async (args: any) => {
      const channel = this.channels.get(args.where.id);
      if (!channel) throw new Error('Channel not found');
      const updated = { ...channel, ...args.data };
      this.channels.set(args.where.id, updated);
      return updated;
    },

    delete: async (args: any) => {
      const channel = this.channels.get(args.where.id);
      if (!channel) throw new Error('Channel not found');
      this.channels.delete(args.where.id);
      return channel;
    },
  };

  private enrichChannel(channel: any, include?: any) {
    if (!include) return channel;

    const result = { ...channel };
    if (include._count?.select?.messages) {
      result._count = { messages: Array.from(this.messages.values()).filter((m) => m.channelId === channel.id).length };
    }
    return result;
  }

  message = {
    create: async (data: any) => {
      const id = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const message = {
        id,
        ...data,
        createdAt: new Date(),
      };
      this.messages.set(id, message);
      return message;
    },

    findMany: async (args?: any) => {
      let results = Array.from(this.messages.values()).filter((msg) =>
        this.matchesWhere(msg, args?.where)
      );

      if (args?.orderBy) {
        const [field, dir] = Object.entries(args.orderBy)[0] as [string, string];
        results.sort((a, b) => {
          const aVal = a[field];
          const bVal = b[field];
          if (aVal < bVal) return dir === 'asc' ? -1 : 1;
          if (aVal > bVal) return dir === 'asc' ? 1 : -1;
          return 0;
        });
      }

      if (args?.take) {
        results = results.slice(0, args.take);
      }

      return results.map((msg) => {
        if (args?.include?.user) {
          return { ...msg, user: this.users.get(msg.userId) || null };
        }
        return msg;
      });
    },

    deleteMany: async (args: any) => {
      const toDelete: string[] = [];
      for (const [id, msg] of this.messages.entries()) {
        if (this.matchesWhere(msg, args.where)) {
          toDelete.push(id);
        }
      }
      toDelete.forEach((id) => this.messages.delete(id));
      return { count: toDelete.length };
    },
  };

  mute = {
    findUnique: async (args: any) => {
      const mutes = Array.from(this.mutes.values());
      return (
        mutes.find(
          (m) =>
            m.muterId === args.where.muterId_mutedId.muterId &&
            m.mutedId === args.where.muterId_mutedId.mutedId
        ) || null
      );
    },

    findMany: async (args?: any) => {
      let results = Array.from(this.mutes.values()).filter((mute) =>
        this.matchesWhere(mute, args?.where)
      );

      return results.map((mute) => {
        if (args?.include?.muted) {
          return {
            ...mute,
            muted: this.users.get(mute.mutedId) || null,
          };
        }
        return mute;
      });
    },

    create: async (data: any) => {
      const id = `mute_${Date.now()}`;
      const mute = {
        id,
        ...data,
        createdAt: new Date(),
      };
      this.mutes.set(id, mute);
      return mute;
    },

    delete: async (args: any) => {
      const mute = Array.from(this.mutes.values()).find(
        (m) =>
          m.muterId === args.where.muterId_mutedId.muterId &&
          m.mutedId === args.where.muterId_mutedId.mutedId
      );
      if (!mute) throw new Error('Mute not found');
      this.mutes.delete(mute.id);
      return mute;
    },
  };

  report = {
    findMany: async (args?: any) => {
      let results = Array.from(this.reports.values()).filter((report) =>
        this.matchesWhere(report, args?.where)
      );

      if (args?.orderBy) {
        const [field, dir] = Object.entries(args.orderBy)[0] as [string, string];
        results.sort((a, b) => {
          const aVal = a[field];
          const bVal = b[field];
          if (aVal < bVal) return dir === 'asc' ? -1 : 1;
          if (aVal > bVal) return dir === 'asc' ? 1 : -1;
          return 0;
        });
      }

      if (args?.take) {
        results = results.slice(0, args.take);
      }

      return results;
    },

    create: async (data: any) => {
      const id = `report_${Date.now()}`;
      const report = {
        id,
        ...data,
        createdAt: new Date(),
      };
      this.reports.set(id, report);
      return report;
    },

    update: async (args: any) => {
      const report = this.reports.get(args.where.id);
      if (!report) throw new Error('Report not found');
      const updated = { ...report, ...args.data };
      this.reports.set(args.where.id, updated);
      return updated;
    },
  };

  voiceLog = {
    findMany: async (args?: any) => {
      let results = Array.from(this.voiceLogs.values()).filter((log) =>
        this.matchesWhere(log, args?.where)
      );

      if (args?.orderBy) {
        const [field, dir] = Object.entries(args.orderBy)[0] as [string, string];
        results.sort((a, b) => {
          const aVal = a[field];
          const bVal = b[field];
          if (aVal < bVal) return dir === 'asc' ? -1 : 1;
          if (aVal > bVal) return dir === 'asc' ? 1 : -1;
          return 0;
        });
      }

      return results;
    },

    create: async (data: any) => {
      const id = this.nextVoiceLogId++;
      const voiceLog = {
        id,
        ...data,
        createdAt: new Date(),
      };
      this.voiceLogs.set(id, voiceLog);
      return voiceLog;
    },

    deleteMany: async (args: any) => {
      const toDelete: number[] = [];
      for (const [id, log] of this.voiceLogs.entries()) {
        if (this.matchesWhere(log, args.where)) {
          toDelete.push(id);
        }
      }
      toDelete.forEach((id) => this.voiceLogs.delete(id));
      return { count: toDelete.length };
    },
  };

  friendship = {
    findMany: async (args?: any) => {
      let results = Array.from(this.friendships.values()).filter((friendship) =>
        this.matchesWhere(friendship, args?.where)
      );

      return results.map((f) => {
        if (args?.include?.a) {
          f = { ...f, a: this.users.get(f.aId) || null };
        }
        if (args?.include?.b) {
          f = { ...f, b: this.users.get(f.bId) || null };
        }
        return f;
      });
    },

    upsert: async (args: any) => {
      let friendship = Array.from(this.friendships.values()).find(
        (f) =>
          (f.aId === args.where.aId_bId.aId && f.bId === args.where.aId_bId.bId)
      );

      if (friendship) {
        return this.friendship.update({
          where: { aId_bId: { aId: friendship.aId, bId: friendship.bId } },
          data: args.update,
        });
      }

      const id = `friendship_${Date.now()}`;
      const newFriendship = {
        id,
        aId: args.create.aId,
        bId: args.create.bId,
        status: args.create.status || 'PENDING',
        createdAt: new Date(),
      };
      this.friendships.set(id, newFriendship);
      return newFriendship;
    },

    update: async (args: any) => {
      const key = `${args.where.aId_bId.aId}_${args.where.aId_bId.bId}`;
      let friendship = Array.from(this.friendships.values()).find(
        (f) =>
          f.aId === args.where.aId_bId.aId && f.bId === args.where.aId_bId.bId
      );

      if (!friendship) throw new Error('Friendship not found');

      const updated = { ...friendship, ...args.data };
      this.friendships.set(friendship.id, updated);
      return updated;
    },
  };
}

let prisma: any = null;
let isUsingFallback = false;

async function initPrisma() {
  try {
    const client = new PrismaClient();
    // Tenta fazer uma query simples para testar a conexão
    await client.$queryRaw`SELECT 1`;
    prisma = client;
    isUsingFallback = false;
    console.log('✓ Prisma conectado à BD');
    return;
  } catch (error) {
    console.warn('⚠ Prisma falhou, usando fallback em memória:', (error as any).message);
    prisma = new MemoryDb();
    isUsingFallback = true;
  }
}

// Inicializar na primeira importação
if (!prisma) {
  initPrisma();
}

export default prisma;
export { isUsingFallback };
