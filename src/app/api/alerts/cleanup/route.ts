import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
    try {
        // Fetch all alerts ordered by most recent first
        const allAlerts = await prisma.alert.findMany({
            orderBy: { createdAt: 'desc' },
        });

        const seenIncidents = new Set<string>();
        const idsToDelete: string[] = [];

        for (const alert of allAlerts) {
            // Key consists of the entity (account/domain) + its name
            const key = `${alert.entityType}-${alert.entityId}`;

            if (seenIncidents.has(key)) {
                idsToDelete.push(alert.id);
            } else {
                seenIncidents.add(key);
            }
        }

        let deletedCount = 0;
        if (idsToDelete.length > 0) {
            // Split into chunks of 100 to be safe
            for (let i = 0; i < idsToDelete.length; i += 100) {
                const chunk = idsToDelete.slice(i, i + 100);
                const result = await prisma.alert.deleteMany({
                    where: {
                        id: { in: chunk },
                    },
                });
                deletedCount += result.count;
            }
        }

        return NextResponse.json({
            success: true,
            deleted: deletedCount,
            uniqueRemaining: seenIncidents.size,
        });
    } catch (error) {
        console.error('Cleanup error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
