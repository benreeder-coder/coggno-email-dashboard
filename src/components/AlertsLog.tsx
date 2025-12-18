'use client';

import { Alert } from '@/lib/types';
import { formatDate } from '@/lib/utils';

interface AlertsLogProps {
  alerts: Alert[];
  loading: boolean;
}

export function AlertsLog({ alerts, loading }: AlertsLogProps) {
  if (loading) {
    return (
      <div className="rounded-xl border border-[var(--border)] bg-[var(--card-background)] overflow-hidden">
        <div className="p-6 space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-20 bg-[var(--secondary-muted)] rounded-lg shimmer" />
          ))}
        </div>
      </div>
    );
  }

  if (alerts.length === 0) {
    return (
      <div className="rounded-xl border border-[var(--border)] bg-[var(--card-background)] p-12 text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-emerald-500/20 flex items-center justify-center">
          <svg className="w-8 h-8 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <p className="text-[var(--muted-text)]">No alerts yet. Everything is healthy!</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--card-background)] overflow-hidden">
      <div className="divide-y divide-[#262626]">
        {alerts.map((alert) => (
          <div
            key={alert.id}
            className={`p-5 flex items-start gap-4 hover:bg-[#2869b0]/5 transition-colors ${alert.resolvedAt ? 'opacity-60' : ''
              }`}
          >
            <div
              className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${alert.type === 'CRITICAL'
                ? 'bg-red-500/20 text-red-400'
                : 'bg-amber-500/20 text-amber-400'
                }`}
            >
              {alert.type === 'CRITICAL' ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                <span
                  className={`text-xs font-medium px-2 py-0.5 rounded-md border ${alert.type === 'CRITICAL'
                    ? 'bg-red-500/20 text-red-400 border-red-500/30'
                    : 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                    }`}
                >
                  {alert.type}
                </span>
                <span className="text-xs text-[var(--muted-text)] uppercase font-medium">
                  {alert.entityType}
                </span>
                {alert.emailSent && (
                  <span className="text-xs text-[#2869b0] flex items-center gap-1">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    Email sent
                  </span>
                )}
              </div>

              <p className="text-[var(--foreground)] text-sm font-medium">{alert.message}</p>

              <div className="flex items-center gap-4 mt-2 text-xs text-[var(--muted-text)]">
                <span className="flex items-center gap-1">
                  <span className="text-[var(--muted-text)]">Score:</span>
                  <span className={alert.score < 90 ? 'text-red-400' : alert.score < 97 ? 'text-amber-400' : 'text-emerald-400'}>
                    {alert.score.toFixed(1)}%
                  </span>
                </span>
                <span className="flex items-center gap-1">
                  <span className="text-[var(--muted-text)]">Threshold:</span> {alert.threshold}%
                </span>
                <span>{formatDate(alert.createdAt)}</span>
              </div>
            </div>

            {alert.resolvedAt && (
              <span className="text-xs text-emerald-400 flex items-center gap-1 bg-emerald-500/10 px-2 py-1 rounded-md border border-emerald-500/20">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Resolved
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
