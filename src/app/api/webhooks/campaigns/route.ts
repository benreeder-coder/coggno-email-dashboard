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
            await prisma.campaign.upsert({
                where: { campaignId: campaign.campaign_id },
                update: {
                    name: campaign.campaign_name,
                    status: campaign.campaign_status,
                    isEvergreen: campaign.campaign_is_evergreen,
                    leadsCount: campaign.leads_count,
                    contactedCount: campaign.contacted_count,
                    emailsSentCount: campaign.emails_sent_count,
                    newLeadsContactedCount: campaign.new_leads_contacted_count,
                    openCount: campaign.open_count,
                    replyCount: campaign.reply_count,
                    replyCountUnique: campaign.reply_count_unique,
                    linkClickCount: campaign.link_click_count,
                    bouncedCount: campaign.bounced_count,
                    unsubscribedCount: campaign.unsubscribed_count,
                    completedCount: campaign.completed_count,
                    totalOpportunities: campaign.total_opportunities,
                    totalOpportunityValue: campaign.total_opportunity_value,
                    lastSyncedAt: syncStartTime,
                    createdAt: campaign.timestamp_created ? new Date(campaign.timestamp_created) : undefined,
                },
                create: {
                    campaignId: campaign.campaign_id,
                    name: campaign.campaign_name,
                    status: campaign.campaign_status,
                    isEvergreen: campaign.campaign_is_evergreen,
                    leadsCount: campaign.leads_count,
                    contactedCount: campaign.contacted_count,
                    emailsSentCount: campaign.emails_sent_count,
                    newLeadsContactedCount: campaign.new_leads_contacted_count,
                    openCount: campaign.open_count,
                    replyCount: campaign.reply_count,
                    replyCountUnique: campaign.reply_count_unique,
                    linkClickCount: campaign.link_click_count,
                    bouncedCount: campaign.bounced_count,
                    unsubscribedCount: campaign.unsubscribed_count,
                    completedCount: campaign.completed_count,
                    totalOpportunities: campaign.total_opportunities,
                    totalOpportunityValue: campaign.total_opportunity_value,
                    lastSyncedAt: syncStartTime,
                    createdAt: campaign.timestamp_created ? new Date(campaign.timestamp_created) : undefined,
                },
            });
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
