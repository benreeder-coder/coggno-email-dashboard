import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const accounts = await prisma.emailAccount.findMany({
      select: { warmupScore: true },
    });

    const total = accounts.length;
    const healthy = accounts.filter(a => a.warmupScore >= 97).length;
    const warning = accounts.filter(a => a.warmupScore >= 90 && a.warmupScore < 97).length;
    const critical = accounts.filter(a => a.warmupScore < 90).length;

    const lastSync = await prisma.syncLog.findFirst({
      where: { success: true },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({
      total,
      healthy,
      warning,
      critical,
      lastSyncAt: lastSync?.createdAt || null,
    });
  } catch (error) {
    console.error('Stats error:', error);
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
  }
}
