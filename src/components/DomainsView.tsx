'use client';

import { useState } from 'react';
import { Domain } from '@/lib/types';
import { getScoreColor, getScoreBgColor } from '@/lib/utils';

interface DomainsViewProps {
  domains: Domain[];
  loading: boolean;
}

export function DomainsView({ domains, loading }: DomainsViewProps) {
  const [expandedDomain, setExpandedDomain] = useState<string | null>(null);

  const sortedDomains = [...domains].sort((a, b) => a.averageScore - b.averageScore);

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(3)].map((_, i) => (
          <div
            key={i}
            className="rounded-xl border border-[var(--border)] bg-[var(--card-background)] p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="h-6 w-32 bg-[#262626] rounded shimmer" />
              <div className="h-6 w-16 bg-[#262626] rounded shimmer" />
            </div>
            <div className="h-10 w-24 bg-[#262626] rounded shimmer" />
          </div>
        ))}
      </div>
    );
  }

  if (domains.length === 0) {
    return (
      <div className="rounded-xl border border-[var(--border)] bg-[var(--card-background)] p-12 text-center">
        <svg className="w-16 h-16 mx-auto text-[#333] mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
        </svg>
        <p className="text-[var(--muted-text)]">No domains found. Data will appear after the first webhook sync.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {sortedDomains.map((domain) => (
        <div
          key={domain.id}
          className="group relative rounded-xl border border-[var(--border)] bg-[var(--card-background)] overflow-hidden transition-all duration-300 cursor-pointer hover:border-[#2869b0]/30 hover:shadow-lg hover:shadow-[#2869b0]/5"
          onClick={() => setExpandedDomain(expandedDomain === domain.id ? null : domain.id)}
        >
          {/* Gradient accent line */}
          <div className={`absolute top-0 left-4 right-4 h-[2px] rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300 ${domain.averageScore >= 97
            ? 'bg-gradient-to-r from-emerald-500 to-emerald-600'
            : domain.averageScore >= 90
              ? 'bg-gradient-to-r from-amber-500 to-orange-500'
              : 'bg-gradient-to-r from-red-500 to-red-600'
            }`} />

          <div className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-[var(--foreground)]">{domain.name}</h3>
                <p className="text-sm text-[var(--muted-text)]">{domain.accountCount} accounts</p>
              </div>
              <span
                className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium border ${getScoreBgColor(domain.averageScore)} ${getScoreColor(domain.averageScore)}`}
              >
                {domain.averageScore >= 97 ? 'Healthy' : domain.averageScore >= 90 ? 'Warning' : 'Critical'}
              </span>
            </div>

            <div className="flex items-end justify-between">
              <div>
                <p className="text-xs text-[var(--muted-text)] uppercase tracking-wider mb-1">Avg Score</p>
                <p className={`text-3xl font-semibold ${getScoreColor(domain.averageScore)}`}>
                  {domain.averageScore.toFixed(1)}%
                </p>
              </div>

              {/* Score distribution bar */}
              <div className="flex-1 ml-6">
                <div className="flex h-2 rounded-full overflow-hidden bg-[#262626]">
                  {domain.accounts.length > 0 && (() => {
                    const healthy = domain.accounts.filter(a => a.warmupScore >= 97).length;
                    const warning = domain.accounts.filter(a => a.warmupScore >= 90 && a.warmupScore < 97).length;
                    const critical = domain.accounts.filter(a => a.warmupScore < 90).length;
                    const total = domain.accounts.length;

                    return (
                      <>
                        {healthy > 0 && (
                          <div
                            className="bg-emerald-500"
                            style={{ width: `${(healthy / total) * 100}%` }}
                          />
                        )}
                        {warning > 0 && (
                          <div
                            className="bg-amber-500"
                            style={{ width: `${(warning / total) * 100}%` }}
                          />
                        )}
                        {critical > 0 && (
                          <div
                            className="bg-red-500"
                            style={{ width: `${(critical / total) * 100}%` }}
                          />
                        )}
                      </>
                    );
                  })()}
                </div>
                <div className="flex justify-between mt-1 text-xs text-[var(--muted-text)]">
                  <span>{domain.accounts.filter(a => a.warmupScore >= 97).length} healthy</span>
                  <span>{domain.accounts.filter(a => a.warmupScore < 97).length} issues</span>
                </div>
              </div>
            </div>

            {/* Expanded view */}
            {expandedDomain === domain.id && (
              <div className="mt-4 pt-4 border-t border-[var(--border)]">
                <p className="text-xs text-[var(--muted-text)] uppercase tracking-wider mb-3">Account Scores</p>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {domain.accounts
                    .sort((a, b) => a.warmupScore - b.warmupScore)
                    .map((account) => (
                      <div
                        key={account.email}
                        className="flex items-center justify-between text-sm py-1.5 px-2 rounded-lg hover:bg-[#262626]/50"
                      >
                        <span className="text-[var(--muted-text)] truncate flex-1 mr-2">{account.email}</span>
                        <span className={`font-medium ${getScoreColor(account.warmupScore)}`}>
                          {account.warmupScore}%
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            )}

            <div className="mt-4 flex items-center justify-center text-[var(--muted-text)] text-xs">
              <svg
                className={`w-4 h-4 transition-transform ${expandedDomain === domain.id ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
              <span className="ml-1">
                {expandedDomain === domain.id ? 'Hide' : 'Show'} accounts
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
