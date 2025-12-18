import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { sendAlertEmail } from '@/lib/email';
import { extractDomain } from '@/lib/utils';

const THRESHOLD = 97;

interface N8nItem {
  email: string;
  timestamp_created?: string;
  timestamp_updated?: string;
  first_name?: string;
  last_name?: string;
  tracking_domain_name?: string;
  tracking_domain_status?: string;
  status?: number;
  stat_warmup_score?: number;
}

interface CampaignItem {
  campaign_name: string;
  campaign_id: string;
  campaign_status: number;
  campaign_is_evergreen: boolean;
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

interface N8nPayload {
  items?: N8nItem[];
  campaigns?: CampaignItem[];
}

export async function POST(request: NextRequest) {
  try {
    // Optional webhook secret verification
    const webhookSecret = process.env.WEBHOOK_SECRET;
    if (webhookSecret) {
      const authHeader = request.headers.get('authorization');
      if (authHeader !== `Bearer ${webhookSecret}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    const body = await request.json();

    // Handle both array format and single object format
    const payloads: N8nPayload[] = Array.isArray(body) ? body : [body];

    // Flatten all items from all payloads
    const allItems: N8nItem[] = payloads.flatMap(p => p.items || []);

    // Flatten all campaigns from all payloads
    const allCampaigns: CampaignItem[] = payloads.flatMap(p => p.campaigns || []);

    // Check if we have either items or campaigns
    if (allItems.length === 0 && allCampaigns.length === 0) {
      return NextResponse.json({ error: 'No items or campaigns in payload' }, { status: 400 });
    }

    const accountAlerts: Array<{ email: string; score: number; previousScore?: number }> = [];
    const domainScores: Map<string, { scores: number[]; domain: string }> = new Map();

    // Process each email account
    for (const item of allItems) {
      if (!item.email) continue;

      const domainName = extractDomain(item.tracking_domain_name);
      const warmupScore = item.stat_warmup_score ?? 100;

      // Find or create domain
      let domain = await prisma.domain.findUnique({
        where: { name: domainName },
      });

      if (!domain) {
        domain = await prisma.domain.create({
          data: { name: domainName },
        });
      }

      // Find existing account to get previous score
      const existingAccount = await prisma.emailAccount.findUnique({
        where: { email: item.email },
      });

      const previousScore = existingAccount?.warmupScore;

      // Upsert email account
      await prisma.emailAccount.upsert({
        where: { email: item.email },
        update: {
          firstName: item.first_name,
          lastName: item.last_name,
          trackingDomainName: item.tracking_domain_name,
          trackingDomainStatus: item.tracking_domain_status,
          status: item.status ?? 1,
          warmupScore,
          previousScore: previousScore ?? warmupScore,
          timestampCreated: item.timestamp_created ? new Date(item.timestamp_created) : undefined,
          timestampUpdated: item.timestamp_updated ? new Date(item.timestamp_updated) : undefined,
          lastSyncedAt: new Date(),
          domainId: domain.id,
        },
        create: {
          email: item.email,
          firstName: item.first_name,
          lastName: item.last_name,
          trackingDomainName: item.tracking_domain_name,
          trackingDomainStatus: item.tracking_domain_status,
          status: item.status ?? 1,
          warmupScore,
          timestampCreated: item.timestamp_created ? new Date(item.timestamp_created) : undefined,
          timestampUpdated: item.timestamp_updated ? new Date(item.timestamp_updated) : undefined,
          domainId: domain.id,
        },
      });

      // Track for alerts
      if (warmupScore < THRESHOLD) {
        accountAlerts.push({
          email: item.email,
          score: warmupScore,
          previousScore,
        });

        // Create alert record
        await prisma.alert.create({
          data: {
            type: warmupScore < 90 ? 'CRITICAL' : 'WARNING',
            entityType: 'ACCOUNT',
            entityId: item.email,
            entityName: item.email,
            score: warmupScore,
            threshold: THRESHOLD,
            message: `Email account ${item.email} warmup score dropped to ${warmupScore}%`,
          },
        });
      }

      // Aggregate domain scores
      if (!domainScores.has(domainName)) {
        domainScores.set(domainName, { scores: [], domain: domainName });
      }
      domainScores.get(domainName)!.scores.push(warmupScore);
    }

    // Update domain aggregates and check for alerts
    const domainAlerts: Array<{ domain: string; averageScore: number; accountCount: number }> = [];

    for (const [domainName, data] of domainScores) {
      const averageScore = data.scores.reduce((a, b) => a + b, 0) / data.scores.length;
      const accountCount = data.scores.length;

      await prisma.domain.update({
        where: { name: domainName },
        data: {
          averageScore,
          accountCount,
        },
      });

      if (averageScore < THRESHOLD) {
        domainAlerts.push({
          domain: domainName,
          averageScore,
          accountCount,
        });

        // Create domain alert
        await prisma.alert.create({
          data: {
            type: averageScore < 90 ? 'CRITICAL' : 'WARNING',
            entityType: 'DOMAIN',
            entityId: domainName,
            entityName: domainName,
            score: averageScore,
            threshold: THRESHOLD,
            message: `Domain ${domainName} average warmup score dropped to ${averageScore.toFixed(1)}%`,
          },
        });
      }
    }

    // Send alert email if there are any issues
    if (accountAlerts.length > 0 || domainAlerts.length > 0) {
      const emailSent = await sendAlertEmail({
        accountAlerts,
        domainAlerts,
        timestamp: new Date().toISOString(),
      });

      // Update alerts with email sent status
      if (emailSent) {
        await prisma.alert.updateMany({
          where: {
            emailSent: false,
            createdAt: {
              gte: new Date(Date.now() - 60000), // Last minute
            },
          },
          data: {
            emailSent: true,
          },
        });
      }
    }

    // Process campaigns
    for (const campaign of allCampaigns) {
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
          lastSyncedAt: new Date(),
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
        },
      });
    }

    // Log the sync
    await prisma.syncLog.create({
      data: {
        accountsCount: allItems.length,
        success: true,
      },
    });

    return NextResponse.json({
      success: true,
      processed: {
        accounts: allItems.length,
        campaigns: allCampaigns.length,
      },
      alerts: {
        accounts: accountAlerts.length,
        domains: domainAlerts.length,
      },
    });
  } catch (error) {
    console.error('Webhook error:', error);

    // Log failed sync
    await prisma.syncLog.create({
      data: {
        accountsCount: 0,
        success: false,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      },
    });

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Health check endpoint
export async function GET() {
  return NextResponse.json({ status: 'ok', timestamp: new Date().toISOString() });
}
