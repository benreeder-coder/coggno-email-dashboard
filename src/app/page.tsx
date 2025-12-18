'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { StatsCards } from '@/components/StatsCards';
import { AccountsTable } from '@/components/AccountsTable';
import { DomainsView } from '@/components/DomainsView';
import { AlertsLog } from '@/components/AlertsLog';
import { CampaignsView } from '@/components/CampaignsView';
import { Stats, EmailAccount, Domain, Alert, Campaign } from '@/lib/types';

type TabType = 'accounts' | 'domains' | 'campaigns' | 'alerts';

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState<TabType>('accounts');
  const [stats, setStats] = useState<Stats | null>(null);
  const [accounts, setAccounts] = useState<EmailAccount[]>([]);
  const [domains, setDomains] = useState<Domain[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const [statsRes, accountsRes, domainsRes, alertsRes, campaignsRes] = await Promise.all([
        fetch('/api/stats'),
        fetch('/api/accounts'),
        fetch('/api/domains'),
        fetch('/api/alerts'),
        fetch('/api/campaigns'),
      ]);

      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
      }

      if (accountsRes.ok) {
        const accountsData = await accountsRes.json();
        setAccounts(accountsData);
      }

      if (domainsRes.ok) {
        const domainsData = await domainsRes.json();
        setDomains(domainsData);
      }

      if (alertsRes.ok) {
        const alertsData = await alertsRes.json();
        setAlerts(alertsData);
      }

      if (campaignsRes.ok) {
        const campaignsData = await campaignsRes.json();
        setCampaigns(campaignsData);
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const tabs: { id: TabType; label: string; count?: number }[] = [
    { id: 'campaigns', label: 'Campaigns', count: campaigns.length },
    { id: 'accounts', label: 'Email Accounts', count: accounts.length },
    { id: 'domains', label: 'Domains', count: domains.length },
    { id: 'alerts', label: 'Alerts', count: alerts.filter(a => !a.resolvedAt).length },
  ];

  return (
    <div className="min-h-screen bg-[var(--background)] grid-pattern">
      <div className="relative z-10">
        {/* Header */}
        <header className="border-b border-[var(--border)] glass sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                {/* Logo */}
                <div className="w-auto h-11 relative">
                  <Image
                    src="/coggno-logo.svg"
                    alt="Coggno Logo"
                    width={150}
                    height={44}
                    className="object-contain"
                    priority
                  />
                </div>
                <div>
                  <h1 className="text-xl font-semibold text-[var(--foreground)] tracking-tight">
                    Email Core Health
                  </h1>
                  <p className="text-sm text-[var(--muted-text)]">
                    Coggno Email Health Dashboard
                  </p>
                </div>
              </div>

              <button
                onClick={fetchData}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--card-background)] border border-[#262626] text-[var(--muted-text)] hover:text-[#2869b0] hover:border-[#2869b0]/50 transition-all duration-300 disabled:opacity-50"
              >
                <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span className="text-sm font-medium">Refresh</span>
              </button>
            </div>
          </div>
        </header>

        {/* Main content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Stats Cards */}
          <section className="mb-8">
            <StatsCards stats={stats} loading={loading} />
          </section>

          {/* Tabs */}
          <div className="flex items-center gap-1 mb-6 p-1 bg-[var(--card-background)] rounded-xl border border-[#262626] w-fit overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 whitespace-nowrap ${activeTab === tab.id
                  ? 'bg-gradient-to-r from-[#2869b0] to-[#4a8ad4] text-[var(--foreground)] shadow-lg shadow-[#2869b0]/20'
                  : 'text-[var(--muted-text)] hover:text-[var(--foreground)] hover:bg-[#262626]'
                  }`}
              >
                {tab.label}
                {tab.count !== undefined && tab.count > 0 && (
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-medium ${activeTab === tab.id
                      ? 'bg-white/20 text-[var(--foreground)]'
                      : 'bg-[#262626] text-[var(--muted-text)]'
                      }`}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="min-h-[400px]">
            {activeTab === 'accounts' && (
              <AccountsTable accounts={accounts} loading={loading} />
            )}

            {activeTab === 'domains' && (
              <DomainsView domains={domains} loading={loading} />
            )}

            {activeTab === 'campaigns' && (
              <CampaignsView campaigns={campaigns} loading={loading} />
            )}

            {activeTab === 'alerts' && (
              <AlertsLog alerts={alerts} loading={loading} />
            )}
          </div>
        </main>

        {/* Footer */}
        <footer className="border-t border-[#262626] mt-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-[var(--muted-text)]">
              <div className="flex items-center gap-2">
                <div className="w-auto h-5 relative">
                  <Image
                    src="/coggno-logo.svg"
                    alt="Coggno Logo"
                    width={80}
                    height={20}
                    className="object-contain opacity-60"
                  />
                </div>
                <span>Coggno Email Health Dashboard</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[var(--muted-text)]">Webhook:</span>
                <code className="text-[#2869b0] bg-[#2869b0]/10 px-2 py-0.5 rounded text-xs">/api/webhook</code>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
