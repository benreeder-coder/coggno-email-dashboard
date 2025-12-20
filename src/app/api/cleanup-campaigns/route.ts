import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// One-time cleanup endpoint - delete after use
// Valid campaign names to keep
const VALID_CAMPAIGNS = [
    'CA SB1343 - UPD Leads',
    'Construction OSHA - UPD Leads',
    'Healthcare HIPPA - UPD Leads',
    'Healthcare HIPPA',
    'Construction OSHA',
    'CA SB1343',
];

export async function POST() {
    try {
        // Delete all campaigns NOT in the valid list
        const result = await prisma.campaign.deleteMany({
            where: {
                name: {
                    notIn: VALID_CAMPAIGNS
                }
            }
        });

        return NextResponse.json({
            success: true,
            deleted: result.count,
            message: `Deleted ${result.count} stale campaigns. You can now remove this endpoint.`
        });
    } catch (error) {
        console.error('Cleanup error:', error);
        return NextResponse.json({ error: 'Cleanup failed' }, { status: 500 });
    }
}

export async function GET() {
    // Preview what would be deleted
    const toDelete = await prisma.campaign.findMany({
        where: {
            name: {
                notIn: VALID_CAMPAIGNS
            }
        },
        select: { name: true, campaignId: true }
    });

    const toKeep = await prisma.campaign.findMany({
        where: {
            name: {
                in: VALID_CAMPAIGNS
            }
        },
        select: { name: true, campaignId: true }
    });

    return NextResponse.json({
        toDelete: toDelete,
        toKeep: toKeep,
        message: 'Send a POST request to this endpoint to delete the stale campaigns'
    });
}
