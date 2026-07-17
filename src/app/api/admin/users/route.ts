import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, extractToken } from '@/lib/auth';
import prisma from '@/lib/db';

async function requireAdmin(req: NextRequest) {
  const token = extractToken(req.headers.get('authorization'));
  if (!token) return null;
  const payload = verifyToken(token);
  if (!payload) return null;
  const user = await prisma.user.findUnique({ where: { id: payload.id } });
  if (!user || user.role !== 'ADMIN' || user.banned) return null;
  return user;
}

// GET /api/admin/users — lista utilizadores + denúncias pendentes
export async function GET(req: NextRequest) {
  try {
    const admin = await requireAdmin(req);
    if (!admin) {
      return NextResponse.json({ error: 'Acesso negado — só admins' }, { status: 403 });
    }

    const [users, reports] = await Promise.all([
      prisma.user.findMany({
        select: {
          id: true,
          username: true,
          email: true,
          role: true,
          banned: true,
          bannedAt: true,
          country: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 200,
      }),
      prisma.report.findMany({
        where: { resolved: false },
        orderBy: { createdAt: 'desc' },
        take: 100,
      }),
    ]);

    return NextResponse.json({ users, reports });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Erro ao listar' }, { status: 500 });
  }
}

// POST /api/admin/users — resolver denúncia
// body: { resolveReportId: string }
export async function POST(req: NextRequest) {
  try {
    const admin = await requireAdmin(req);
    if (!admin) {
      return NextResponse.json({ error: 'Acesso negado — só admins' }, { status: 403 });
    }

    const { resolveReportId } = await req.json();
    if (resolveReportId) {
      await prisma.report.update({
        where: { id: resolveReportId },
        data: { resolved: true },
      });
      return NextResponse.json({ message: 'Denúncia resolvida' });
    }
    return NextResponse.json({ error: 'Nada para fazer' }, { status: 400 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Erro' }, { status: 500 });
  }
}
