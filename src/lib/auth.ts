import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this';

export interface JWTPayload {
  id: string;
  email: string;
  role?: 'USER' | 'ADMIN';
  iat?: number;
  exp?: number;
}

export interface User {
  id: string;
  email?: string;
  username?: string;
  password?: string;
  role?: string;
  banned?: boolean;
  bannedAt?: Date | null;
  photoUrl?: string | null;
  bio?: string | null;
  country?: string | null;
  language?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export function sanitizeUser(user: User): Omit<User, 'password'> {
  if (!user) return user;
  const { password, ...sanitized } = user;
  return sanitized;
}

export function verifyToken(token: string): JWTPayload | null {
  try {
    const payload = jwt.verify(token, JWT_SECRET) as JWTPayload;
    return payload;
  } catch {
    return null;
  }
}

export function extractToken(authHeader: string | null): string | null {
  if (!authHeader) return null;
  const parts = authHeader.split(' ');
  if (parts.length === 2 && parts[0] === 'Bearer') {
    return parts[1];
  }
  return null;
}
