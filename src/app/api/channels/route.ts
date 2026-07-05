import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function GET() {
  try {
    const channels = await prisma.channel.findMany({
      select: { id: true, name: true },
    });
    // If no channels exist, create a few defaults
    if (channels.length === 0) {
      const defaultNames = ['Geral', 'Música', 'Games', 'Idiomas'];
      const created = await Promise.all(
        defaultNames.map((name) =>
          prisma.channel.create({ data: { name, type: 'PUBLIC' } })
        )
      );
      return NextResponse.json(created);
    }
    return NextResponse.json(channels);
  } catch (error) {
    console.error('Error fetching channels', error);
    return NextResponse.json({ error: 'Failed to load channels' }, { status: 500 });
  }
}
