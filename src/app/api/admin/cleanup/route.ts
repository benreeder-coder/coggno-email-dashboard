import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        // Fetch all alerts ordered by most recent first
        const allAlerts = await prisma.alert.findMany({
            orderBy: { createdAt: 'desc' },
        });

        const seenIncidents = new Set<string>();
        const idsToDelete: string[] = [];

        for (const alert of allAlerts) {
            // Key consists of the entity (account/domain) + its name
            // We also include resolution status because we want to keep the latest unresolved alert
            // AND potentially the latest resolved one? 
            // User said "one record for each alert", which usually means current state.
            // Keeping only the single most recent record per entity is the cleanest "cleanup".
            const key = `${alert.entityType}-${alert.entityId}`;

            if (seenIncidents.has(key)) {
                idsToDelete.push(alert.id);
            } else {
                seenIncidents.add(key);
            }
        }

        // Delete duplicates in batches to avoid potentially large "in" clauses
        // but with cuid it's usually fine up to a few thousand.
        let deletedCount = 0;
        if (idsToDelete.length > 0) {
            const result = await prisma.alert.deleteMany({
                where: {
                    id: { in: idsToDelete },
                },
            });
            deletedCount = result.count;
        }

        return NextResponse.json({
            message: 'Cleanup completed',
            totalBefore: allAlerts.length,
            deleted: deletedCount,
            uniqueRemaining: seenIncidents.size,
        });
    } catch (error) {
        console.error('Cleanup error:', error);
        return NextResponse.json({ error: 'Failed to cleanup alerts' }, { status: 500 });
    }
}
