'use client';

import { Stats } from '@/lib/types';
import { formatDate } from '@/lib/utils';

interface StatsCardsProps {
  stats: Stats | null;
  loading: boolean;
}

export function StatsCards({ stats, loading }: StatsCardsProps) {
  const cards = [
    {
      label: 'Total Accounts',
      value: stats?.total ?? 0,
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      ),
      gradient: 'from-[#2869b0] to-[#4a8ad4]',
      iconBg: 'bg-[#2869b0]/20',
      textColor: 'text-[#2869b0]',
    },
    {
      label: 'Healthy',
      value: stats?.healthy ?? 0,
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      gradient: 'from-emerald-500 to-emerald-600',
      iconBg: 'bg-emerald-500/20',
      textColor: 'text-emerald-400',
    },
    {
      label: 'Warning',
      value: stats?.warning ?? 0,
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      ),
      gradient: 'from-amber-500 to-orange-500',
      iconBg: 'bg-amber-500/20',
      textColor: 'text-amber-400',
    },
    {
      label: 'Critical',
      value: stats?.critical ?? 0,
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      gradient: 'from-red-500 to-red-600',
      iconBg: 'bg-red-500/20',
      textColor: 'text-red-400',
    },
  ];

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="rounded-xl border border-[var(--border)] bg-[var(--card-background)] p-5"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="h-4 w-20 bg-[#262626] rounded shimmer" />
              <div className="h-8 w-8 bg-[#262626] rounded-lg shimmer" />
            </div>
            <div className="h-9 w-16 bg-[#262626] rounded shimmer" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card, index) => (
          <div
            key={card.label}
            className="group relative rounded-xl border border-[var(--border)] bg-[var(--card-background)] p-5 transition-all duration-300 hover:border-[#2869b0]/30 hover:shadow-lg hover:shadow-[#2869b0]/5"
            style={{ animationDelay: `${index * 100}ms` }}
          >
            {/* Gradient accent line */}
            <div className={`absolute top-0 left-4 right-4 h-[2px] bg-gradient-to-r ${card.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-full`} />

            <div className="flex items-center justify-between mb-3">
              <span className="text-[#a1a1aa] text-sm font-medium">{card.label}</span>
              <div className={`${card.iconBg} ${card.textColor} p-2 rounded-lg`}>
                {card.icon}
              </div>
            </div>
            <div className={`text-3xl font-semibold ${card.textColor}`}>
              {card.value.toLocaleString()}
            </div>
          </div>
        ))}
      </div>
      {stats?.lastSyncAt && (
        <p className="text-xs text-[#666] flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          Last synced {formatDate(stats.lastSyncAt)}
        </p>
      )}
    </div>
  );
}
