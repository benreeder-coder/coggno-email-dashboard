import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sortBy = searchParams.get('sortBy') || 'averageScore';
    const sortOrder = searchParams.get('sortOrder') || 'asc';

    const orderBy: Record<string, string> = {};
    orderBy[sortBy] = sortOrder;

    const domains = await prisma.domain.findMany({
      orderBy,
      include: {
        accounts: {
          select: {
            email: true,
            warmupScore: true,
          },
        },
      },
    });

    return NextResponse.json(domains);
  } catch (error) {
    console.error('Domains error:', error);
    return NextResponse.json({ error: 'Failed to fetch domains' }, { status: 500 });
  }
}
