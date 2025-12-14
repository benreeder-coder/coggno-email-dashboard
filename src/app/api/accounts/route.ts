import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sortBy = searchParams.get('sortBy') || 'warmupScore';
    const sortOrder = searchParams.get('sortOrder') || 'asc';
    const filter = searchParams.get('filter') || 'all';
    const search = searchParams.get('search') || '';

    const where: Record<string, unknown> = {};

    // Apply status filter
    if (filter === 'healthy') {
      where.warmupScore = { gte: 97 };
    } else if (filter === 'warning') {
      where.warmupScore = { gte: 90, lt: 97 };
    } else if (filter === 'critical') {
      where.warmupScore = { lt: 90 };
    }

    // Apply search filter
    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
      ];
    }

    const orderBy: Record<string, string> = {};
    orderBy[sortBy] = sortOrder;

    const accounts = await prisma.emailAccount.findMany({
      where,
      orderBy,
      include: {
        domain: {
          select: { name: true },
        },
      },
    });

    return NextResponse.json(accounts);
  } catch (error) {
    console.error('Accounts error:', error);
    return NextResponse.json({ error: 'Failed to fetch accounts' }, { status: 500 });
  }
}
