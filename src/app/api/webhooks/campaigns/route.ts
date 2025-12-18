import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

interface CampaignItem {
    campaign_name: string;
    campaign_id: string;
    campaign_status: number;
    campaign_is_evergreen: boolean;
    timestamp_created?: string;
    leads_count: number;
    contacted_count: number;
    emails_sent_count: number;
    new_leads_contacted_count: number;
    open_count: number;
    reply_count: number;
    reply_count_unique: number;
    link_click_count: number;
    bounced_count: number;
    unsubscribed_count: number;
    completed_count: number;
    total_opportunities: number;
    total_opportunity_value: number;
}

export async function POST(request: NextRequest) {
    try {
        const webhookSecret = process.env.WEBHOOK_SECRET;
        if (webhookSecret) {
            const authHeader = request.headers.get('authorization');
            if (authHeader !== `Bearer ${webhookSecret}`) {
                return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
            }
        }

        const body = await request.json();
        const syncStartTime = new Date();

        // Recursive function to find campaigns
        const findCampaigns = (data: any): any[] => {
            if (Array.isArray(data)) {
                return data.flatMap(findCampaigns);
            }
            if (data && typeof data === 'object') {
                if (data.campaign_id) {
                    return [data];
                }
                if (data.campaigns && Array.isArray(data.campaigns)) {
                    return findCampaigns(data.campaigns);
                }
                if (data.items && Array.isArray(data.items)) {
                    return findCampaigns(data.items);
                }
            }
            return [];
        };

        const campaigns: CampaignItem[] = findCampaigns(body);

        if (campaigns.length === 0) {
            console.log('Received payload:', JSON.stringify(body).substring(0, 200) + '...');
            return NextResponse.json({ message: 'No valid campaign items found' }, { status: 200 });
        }

        for (const campaign of campaigns) {
            try {
                // Sanitize numeric fields to defaults to prevent crashes
                const sanitizeNum = (val: any) => typeof val === 'number' ? val : 0;

                await prisma.campaign.upsert({
                    where: { campaignId: campaign.campaign_id },
                    update: {
                        name: campaign.campaign_name || 'Untitled Campaign',
                        status: typeof campaign.campaign_status === 'number' ? campaign.campaign_status : 0,
                        isEvergreen: !!campaign.campaign_is_evergreen,
                        leadsCount: sanitizeNum(campaign.leads_count),
                        contactedCount: sanitizeNum(campaign.contacted_count),
                        emailsSentCount: sanitizeNum(campaign.emails_sent_count),
                        newLeadsContactedCount: sanitizeNum(campaign.new_leads_contacted_count),
                        openCount: sanitizeNum(campaign.open_count),
                        replyCount: sanitizeNum(campaign.reply_count),
                        replyCountUnique: sanitizeNum(campaign.reply_count_unique),
                        linkClickCount: sanitizeNum(campaign.link_click_count),
                        bouncedCount: sanitizeNum(campaign.bounced_count),
                        unsubscribedCount: sanitizeNum(campaign.unsubscribed_count),
                        completedCount: sanitizeNum(campaign.completed_count),
                        totalOpportunities: sanitizeNum(campaign.total_opportunities),
                        totalOpportunityValue: sanitizeNum(campaign.total_opportunity_value),
                        lastSyncedAt: syncStartTime,
                        createdAt: campaign.timestamp_created ? new Date(campaign.timestamp_created) : undefined,
                    },
                    create: {
                        campaignId: campaign.campaign_id,
                        name: campaign.campaign_name || 'Untitled Campaign',
                        status: typeof campaign.campaign_status === 'number' ? campaign.campaign_status : 0,
                        isEvergreen: !!campaign.campaign_is_evergreen,
                        leadsCount: sanitizeNum(campaign.leads_count),
                        contactedCount: sanitizeNum(campaign.contacted_count),
                        emailsSentCount: sanitizeNum(campaign.emails_sent_count),
                        newLeadsContactedCount: sanitizeNum(campaign.new_leads_contacted_count),
                        openCount: sanitizeNum(campaign.open_count),
                        replyCount: sanitizeNum(campaign.reply_count),
                        replyCountUnique: sanitizeNum(campaign.reply_count_unique),
                        linkClickCount: sanitizeNum(campaign.link_click_count),
                        bouncedCount: sanitizeNum(campaign.bounced_count),
                        unsubscribedCount: sanitizeNum(campaign.unsubscribed_count),
                        completedCount: sanitizeNum(campaign.completed_count),
                        totalOpportunities: sanitizeNum(campaign.total_opportunities),
                        totalOpportunityValue: sanitizeNum(campaign.total_opportunity_value),
                        lastSyncedAt: syncStartTime,
                        createdAt: campaign.timestamp_created ? new Date(campaign.timestamp_created) : undefined,
                    },
                });
            } catch (itemError) {
                console.error(`Failed to sync campaign ${campaign.campaign_id}:`, itemError);
                // Continue processing other items so the sync doesn't fail completely
            }
        }

        // ---------------------------------------------------------
        // CLEANUP: Timestamp-based deletion
        // ---------------------------------------------------------
        await prisma.campaign.deleteMany({
            where: {
                lastSyncedAt: {
                    lt: syncStartTime
                }
            }
        });

        return NextResponse.json({
            success: true,
            processed: campaigns.length,
        });
    } catch (error) {
        console.error('Webhook campaigns error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
