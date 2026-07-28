import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

// Trava tentativas à força bruta: os códigos são curtos (6 chars),
// sem limite seria possível adivinhá-los em segundos.
const MAX_ATTEMPTS = 10;
const WINDOW_MS = 5 * 60 * 1000; // 5 minutos
const attempts = new Map<string, { count: number; resetAt: number }>();

function tooManyAttempts(key: string): boolean {
  const now = Date.now();
  const entry = attempts.get(key);

  if (!entry || now > entry.resetAt) {
    attempts.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }

  entry.count += 1;
  return entry.count > MAX_ATTEMPTS;
}

// POST /api/channels/verify-code -> valida o código de acesso de uma sala privada
// body: { channelId, code }
export async function POST(req: Request) {
  try {
    const { channelId, code } = await req.json();
    if (!channelId) {
      return NextResponse.json({ error: 'channelId é obrigatório' }, { status: 400 });
    }

    const ip =
      req.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
      req.headers.get('x-real-ip') ??
      'desconhecido';

    if (tooManyAttempts(`${ip}:${channelId}`)) {
      return NextResponse.json(
        { error: 'Demasiadas tentativas. Espera 5 minutos.' },
        { status: 429 }
      );
    }

    const channel = await prisma.channel.findUnique({ where: { id: Number(channelId) } });
    if (!channel) {
      return NextResponse.json({ error: 'Canal não encontrado' }, { status: 404 });
    }

    // Sala sem código configurado — entrada livre
    if (!channel.accessCode) {
      return NextResponse.json({ ok: true });
    }

    const entered = String(code ?? '').trim().toUpperCase();
    const expected = channel.accessCode.trim().toUpperCase();

    if (entered && entered === expected) {
      attempts.delete(`${ip}:${channelId}`); // acertou — limpa o contador
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: 'Código inválido' }, { status: 403 });
  } catch (error) {
    console.error('POST /api/channels/verify-code failed', error);
    return NextResponse.json({ error: 'Erro ao verificar código' }, { status: 500 });
  }
}
