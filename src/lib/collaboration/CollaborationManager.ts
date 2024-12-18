import { Server as SocketServer } from 'socket.io';
import { Server as HTTPServer } from 'http';
import { EventEmitter } from 'events';
import { PrismaClient, User } from '@prisma/client';

interface CollaborationSession {
  id: string;
  assetId: string;
  users: {
    id: string;
    name: string;
    cursor?: { x: number; y: number };
    selection?: { start: number; end: number };
  }[];
  lastModified: Date;
  locked?: {
    userId: string;
    until: Date;
  };
}

interface Operation {
  type: 'insert' | 'delete' | 'replace' | 'move';
  position: number;
  content?: string;
  length?: number;
  newPosition?: number;
  userId: string;
  timestamp: Date;
}

export class CollaborationManager extends EventEmitter {
  private io: SocketServer;
  private prisma: PrismaClient;
  private sessions: Map<string, CollaborationSession>;
  private operations: Map<string, Operation[]>;
  private readonly LOCK_DURATION = 5 * 60 * 1000; // 5 minutes

  constructor(server: HTTPServer) {
    super();
    this.io = new SocketServer(server, {
      cors: {
        origin: process.env.NEXT_PUBLIC_APP_URL,
        methods: ['GET', 'POST'],
        credentials: true,
      },
    });
    this.prisma = new PrismaClient();
    this.sessions = new Map();
    this.operations = new Map();

    this.setupSocketHandlers();
  }

  private setupSocketHandlers() {
    this.io.on('connection', (socket) => {
      let userId: string;
      let sessionId: string;

      socket.on('join', async (data: { userId: string; assetId: string }) => {
        userId = data.userId;
        sessionId = data.assetId;

        const user = await this.prisma.user.findUnique({
          where: { id: userId },
        });

        if (!user) {
          socket.emit('error', { message: 'User not found' });
          return;
        }

        await this.joinSession(sessionId, {
          id: user.id,
          name: user.name || 'Anonymous',
        });

        socket.join(sessionId);
        socket.emit('session-state', this.getSessionState(sessionId));
        this.broadcastUserList(sessionId);
      });

      socket.on('cursor-move', (data: { x: number; y: number }) => {
        if (!sessionId || !userId) return;
        this.updateUserCursor(sessionId, userId, data);
        socket.to(sessionId).emit('cursor-update', { userId, cursor: data });
      });

      socket.on('selection-change', (data: { start: number; end: number }) => {
        if (!sessionId || !userId) return;
        this.updateUserSelection(sessionId, userId, data);
        socket.to(sessionId).emit('selection-update', { userId, selection: data });
      });

      socket.on('operation', async (data: Operation) => {
        if (!sessionId || !userId) return;
        
        try {
          if (!this.canUserEdit(sessionId, userId)) {
            socket.emit('error', { message: 'Asset is locked by another user' });
            return;
          }

          const operation = {
            ...data,
            userId,
            timestamp: new Date(),
          };

          await this.applyOperation(sessionId, operation);
          this.broadcastOperation(sessionId, operation);
        } catch (error) {
          socket.emit('error', { message: error.message });
        }
      });

      socket.on('request-lock', async () => {
        if (!sessionId || !userId) return;
        
        try {
          await this.lockAsset(sessionId, userId);
          this.broadcastLockState(sessionId);
        } catch (error) {
          socket.emit('error', { message: error.message });
        }
      });

      socket.on('release-lock', async () => {
        if (!sessionId || !userId) return;
        
        try {
          await this.releaseLock(sessionId, userId);
          this.broadcastLockState(sessionId);
        } catch (error) {
          socket.emit('error', { message: error.message });
        }
      });

      socket.on('disconnect', () => {
        if (sessionId && userId) {
          this.leaveSession(sessionId, userId);
          this.broadcastUserList(sessionId);
        }
      });
    });
  }

  private async joinSession(sessionId: string, user: { id: string; name: string }) {
    let session = this.sessions.get(sessionId);
    
    if (!session) {
      session = {
        id: sessionId,
        assetId: sessionId,
        users: [],
        lastModified: new Date(),
      };
      this.sessions.set(sessionId, session);
      this.operations.set(sessionId, []);
    }

    if (!session.users.find(u => u.id === user.id)) {
      session.users.push({
        id: user.id,
        name: user.name,
      });
    }
  }

  private leaveSession(sessionId: string, userId: string) {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    session.users = session.users.filter(u => u.id !== userId);
    
    if (session.users.length === 0) {
      this.sessions.delete(sessionId);
      this.operations.delete(sessionId);
    }
  }

  private getSessionState(sessionId: string) {
    const session = this.sessions.get(sessionId);
    const operations = this.operations.get(sessionId) || [];
    
    return {
      session,
      operations,
    };
  }

  private updateUserCursor(sessionId: string, userId: string, cursor: { x: number; y: number }) {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    const user = session.users.find(u => u.id === userId);
    if (user) {
      user.cursor = cursor;
    }
  }

  private updateUserSelection(
    sessionId: string,
    userId: string,
    selection: { start: number; end: number }
  ) {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    const user = session.users.find(u => u.id === userId);
    if (user) {
      user.selection = selection;
    }
  }

  private async applyOperation(sessionId: string, operation: Operation) {
    const operations = this.operations.get(sessionId);
    if (!operations) return;

    operations.push(operation);
    
    const session = this.sessions.get(sessionId);
    if (session) {
      session.lastModified = operation.timestamp;
    }

    // Persist operation to database
    await this.prisma.assetHistory.create({
      data: {
        assetId: sessionId,
        userId: operation.userId,
        operation: operation.type,
        data: JSON.stringify(operation),
        timestamp: operation.timestamp,
      },
    });
  }

  private broadcastOperation(sessionId: string, operation: Operation) {
    this.io.to(sessionId).emit('operation', operation);
  }

  private broadcastUserList(sessionId: string) {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    this.io.to(sessionId).emit('users', session.users);
  }

  private async lockAsset(sessionId: string, userId: string) {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error('Session not found');

    if (session.locked && session.locked.until > new Date()) {
      if (session.locked.userId !== userId) {
        throw new Error('Asset is locked by another user');
      }
      return;
    }

    session.locked = {
      userId,
      until: new Date(Date.now() + this.LOCK_DURATION),
    };

    // Persist lock to database
    await this.prisma.assetLock.upsert({
      where: { assetId: sessionId },
      update: {
        userId,
        expiresAt: session.locked.until,
      },
      create: {
        assetId: sessionId,
        userId,
        expiresAt: session.locked.until,
      },
    });
  }

  private async releaseLock(sessionId: string, userId: string) {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error('Session not found');

    if (!session.locked || session.locked.userId !== userId) {
      throw new Error('Cannot release lock: not the lock owner');
    }

    delete session.locked;

    // Remove lock from database
    await this.prisma.assetLock.delete({
      where: { assetId: sessionId },
    });
  }

  private canUserEdit(sessionId: string, userId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) return false;

    if (!session.locked) return true;
    if (session.locked.until <= new Date()) {
      delete session.locked;
      return true;
    }

    return session.locked.userId === userId;
  }

  private broadcastLockState(sessionId: string) {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    this.io.to(sessionId).emit('lock-state', session.locked);
  }

  async getAssetHistory(assetId: string): Promise<Operation[]> {
    const history = await this.prisma.assetHistory.findMany({
      where: { assetId },
      orderBy: { timestamp: 'asc' },
    });

    return history.map(h => JSON.parse(h.data));
  }

  async getActiveUsers(assetId: string) {
    const session = this.sessions.get(assetId);
    return session?.users || [];
  }

  async cleanup() {
    // Remove expired locks
    await this.prisma.assetLock.deleteMany({
      where: {
        expiresAt: {
          lt: new Date(),
        },
      },
    });

    // Clear empty sessions
    for (const [sessionId, session] of this.sessions.entries()) {
      if (session.users.length === 0) {
        this.sessions.delete(sessionId);
        this.operations.delete(sessionId);
      }
    }
  }
}
