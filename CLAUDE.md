# Coggno Email Dashboard

## Project Overview
Next.js 16 dashboard for monitoring email account warmup health scores. Data comes from Instantly via n8n workflows that run every 6 hours.

## Tech Stack
- **Frontend**: Next.js (App Router), React 19, TypeScript, Tailwind CSS, Recharts
- **Backend**: Next.js API routes
- **Database**: PostgreSQL via Neon (serverless) with Prisma ORM
- **Hosting**: Vercel (https://coggno-instantly-health.vercel.app)

## Key Endpoints

### Webhooks (receive data from n8n)
- `POST /api/webhooks/accounts` - Syncs email account data from Instantly
- `POST /api/webhooks/campaigns` - Syncs campaign data from Instantly

### Data APIs (frontend consumption)
- `GET /api/campaigns` - Returns all campaigns
- `GET /api/accounts` - Returns all accounts
- `GET /api/domains` - Returns domain aggregations
- `GET /api/stats` - Returns aggregated statistics
- `GET /api/alerts` - Returns alerts

## Important Behavior

### Campaign Webhook Cleanup Logic
The `/api/webhooks/campaigns` endpoint has automatic cleanup:
1. Sets `syncStartTime` at the beginning of the request
2. Upserts all campaigns in the payload with `lastSyncedAt = syncStartTime`
3. Deletes all campaigns where `lastSyncedAt < syncStartTime`

This ensures only campaigns in the current sync remain in the database.

### Filtering
- Both webhooks filter out anything containing "builderbenai" (test data)
- Account webhook creates alerts when warmup scores drop below 97

## Valid Campaigns (as of Dec 2024)
1. CA SB1343 - UPD Leads
2. Construction OSHA - UPD Leads
3. Healthcare HIPPA - UPD Leads
4. Healthcare HIPPA
5. Construction OSHA
6. CA SB1343

## Database
- Hosted on Neon (serverless Postgres)
- DATABASE_URL is configured in Vercel environment variables
- Schema defined in `prisma/schema.prisma`

## n8n Workflow
- Runs every 6 hours
- Pulls data from Instantly API
- Sends to webhook endpoints

## Common Issues
- If extra campaigns appear, check the n8n workflow to ensure it's only fetching the correct campaigns
- The cleanup logic should remove stale campaigns on each sync
