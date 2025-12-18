import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
    try {
        // Fetch all alerts ordered by most recent first
        const allAlerts = await prisma.alert.findMany({
            orderBy: { createdAt: 'desc' },
        });

        // 1. Identify "Incidents" (unique alerts)
        const seenIncidents = new Set<string>();
        const idsToDelete: string[] = [];

        // 2. Fetch all valid account emails and domain names to detect orphaned alerts
        const validEmails = new Set((await prisma.emailAccount.findMany({ select: { email: true } })).map(a => a.email));
        const validDomains = new Set((await prisma.domain.findMany({ select: { name: true } })).map(d => d.name));

        for (const alert of allAlerts) {
            const isBuilderBen = alert.entityId.toLowerCase().includes('builderbenai');
            const isOrphaned = (alert.entityType === 'ACCOUNT' && !validEmails.has(alert.entityId)) ||
                (alert.entityType === 'DOMAIN' && !validDomains.has(alert.entityId));

            // Key consists of the entity (account/domain) + its name
            const key = `${alert.entityType}-${alert.entityId}`;

            if (seenIncidents.has(key) || isBuilderBen || isOrphaned) {
                idsToDelete.push(alert.id);
            } else {
                seenIncidents.add(key);
            }
        }

        // 3. Delete identified accounts/domains that shouldn't be there
        await prisma.emailAccount.deleteMany({
            where: { email: { contains: 'builderbenai', mode: 'insensitive' } }
        });
        await prisma.domain.deleteMany({
            where: { name: { contains: 'builderbenai', mode: 'insensitive' } }
        });

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
