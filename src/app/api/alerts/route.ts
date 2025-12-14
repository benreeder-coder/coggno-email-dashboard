import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');

    const alerts = await prisma.alert.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return NextResponse.json(alerts);
  } catch (error) {
    console.error('Alerts error:', error);
    return NextResponse.json({ error: 'Failed to fetch alerts' }, { status: 500 });
  }
}
