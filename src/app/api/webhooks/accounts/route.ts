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

        // Recursive function to find items with email
        const findItems = (data: any): any[] => {
            if (Array.isArray(data)) {
                return data.flatMap(findItems);
            }
            if (data && typeof data === 'object') {
                if (data.email) {
                    return [data];
                }
                if (data.items && Array.isArray(data.items)) {
                    return findItems(data.items);
                }
                // Handle case where n8n might wrap in other keys, but mainly look for 'items' or direct array
            }
            return [];
        };

        const items: N8nItem[] = findItems(body);

        if (items.length === 0) {
            console.log('Received payload:', JSON.stringify(body).substring(0, 200) + '...');
            return NextResponse.json({ message: 'No valid account items found' }, { status: 200 });
        }

        const accountAlerts: Array<{ email: string; score: number; previousScore?: number }> = [];
        const domainScores: Map<string, { scores: number[]; domain: string }> = new Map();

        // Process each email account
        for (const item of items) {
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

        // Log the sync
        await prisma.syncLog.create({
            data: {
                accountsCount: items.length,
                success: true,
            },
        });

        // Delete accounts that are not in the payload (Full Sync)
        const payloadEmails = items.map(item => item.email);
        await prisma.emailAccount.deleteMany({
            where: {
                email: {
                    notIn: payloadEmails
                }
            }
        });

        return NextResponse.json({
            success: true,
            processed: items.length,
            alerts: {
                accounts: accountAlerts.length,
                domains: domainAlerts.length,
            },
        });
    } catch (error) {
        console.error('Webhook accounts error:', error);
        await prisma.syncLog.create({
            data: {
                accountsCount: 0,
                success: false,
                errorMessage: error instanceof Error ? error.message : 'Unknown error',
            },
        });
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
