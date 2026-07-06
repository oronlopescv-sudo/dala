import { PrismaClient } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, extractToken } from '@/lib/auth';

const prisma = new PrismaClient();

// POST /api/report — denunciar um utilizador
// body: { reportedId, reportedName, reason }
export async function POST(req: NextRequest) {
  try {
    const token = extractToken(req.headers.get('authorization'));
    const payload = token ? verifyToken(token) : null;
    if (!payload) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { reportedId, reportedName, reason } = await req.json();
    if (!reportedId || !reason) {
      return NextResponse.json({ error: 'reportedId e reason são obrigatórios' }, { status: 400 });
    }

    const reporter = await prisma.user.findUnique({ where: { id: payload.id } });
    if (!reporter) return NextResponse.json({ error: 'Utilizador inválido' }, { status: 401 });

    await prisma.report.create({
      data: {
        reporterId: reporter.id,
        reporterName: reporter.username,
        reportedId,
        reportedName: reportedName || 'desconhecido',
        reason: String(reason).slice(0, 500),
      },
    });

    return NextResponse.json({ message: 'Denúncia enviada. Obrigado.' }, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Erro ao enviar denúncia' }, { status: 500 });
  }
}
