'use client';

import { useState } from 'react';
import { EmailAccount } from '@/lib/types';
import { getScoreColor, getScoreBgColor, formatDate, extractDomain } from '@/lib/utils';

interface AccountsTableProps {
  accounts: EmailAccount[];
  loading: boolean;
}

type SortKey = 'email' | 'warmupScore' | 'lastSyncedAt' | 'domain';
type FilterType = 'all' | 'healthy' | 'warning' | 'critical';

export function AccountsTable({ accounts, loading }: AccountsTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>('warmupScore');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [filter, setFilter] = useState<FilterType>('all');
  const [search, setSearch] = useState('');

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortOrder('asc');
    }
  };

  const filteredAccounts = accounts
    .filter((account) => {
      if (filter === 'healthy' && account.warmupScore < 97) return false;
      if (filter === 'warning' && (account.warmupScore < 90 || account.warmupScore >= 97)) return false;
      if (filter === 'critical' && account.warmupScore >= 90) return false;
      if (search) {
        const searchLower = search.toLowerCase();
        return (
          account.email.toLowerCase().includes(searchLower) ||
          account.firstName?.toLowerCase().includes(searchLower) ||
          account.lastName?.toLowerCase().includes(searchLower) ||
          account.domain?.name.toLowerCase().includes(searchLower)
        );
      }
      return true;
    })
    .sort((a, b) => {
      let aVal: string | number;
      let bVal: string | number;

      switch (sortKey) {
        case 'email':
          aVal = a.email;
          bVal = b.email;
          break;
        case 'warmupScore':
          aVal = a.warmupScore;
          bVal = b.warmupScore;
          break;
        case 'lastSyncedAt':
          aVal = new Date(a.lastSyncedAt).getTime();
          bVal = new Date(b.lastSyncedAt).getTime();
          break;
        case 'domain':
          aVal = a.domain?.name ?? '';
          bVal = b.domain?.name ?? '';
          break;
        default:
          return 0;
      }

      if (typeof aVal === 'string') {
        return sortOrder === 'asc' ? aVal.localeCompare(bVal as string) : (bVal as string).localeCompare(aVal);
      }
      return sortOrder === 'asc' ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number);
    });

  const SortIcon = ({ active, order }: { active: boolean; order: 'asc' | 'desc' }) => (
    <svg
      className={`w-3.5 h-3.5 ml-1 inline-block transition-colors ${active ? 'text-[#8b5cf6]' : 'text-[#666]'}`}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      {order === 'asc' ? (
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
      ) : (
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      )}
    </svg>
  );

  if (loading) {
    return (
      <div className="rounded-xl border border-[#262626] bg-[#1a1a1a] overflow-hidden">
        <div className="p-6 space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-14 bg-[#262626] rounded-lg shimmer" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-[#262626] bg-[#1a1a1a] overflow-hidden">
      {/* Search and filters */}
      <div className="p-4 border-b border-[#262626]">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#666]"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search accounts..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-[#0a0a0a] border border-[#262626] rounded-lg text-white text-sm placeholder-[#666] focus:border-[#8b5cf6] focus:ring-1 focus:ring-[#8b5cf6]/30"
            />
          </div>
          <div className="flex gap-1.5 p-1 bg-[#0a0a0a] rounded-lg border border-[#262626]">
            {(['all', 'healthy', 'warning', 'critical'] as FilterType[]).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200 ${
                  filter === f
                    ? f === 'all'
                      ? 'bg-[#8b5cf6] text-white'
                      : f === 'healthy'
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : f === 'warning'
                      ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                      : 'bg-red-500/20 text-red-400 border border-red-500/30'
                    : 'text-[#a1a1aa] hover:text-white hover:bg-[#262626]'
                }`}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[#262626] bg-[#0a0a0a]">
              <th
                className="px-5 py-3 text-left text-xs font-medium text-[#a1a1aa] uppercase tracking-wider cursor-pointer hover:text-white transition-colors"
                onClick={() => handleSort('email')}
              >
                Email
                <SortIcon active={sortKey === 'email'} order={sortKey === 'email' ? sortOrder : 'asc'} />
              </th>
              <th className="px-5 py-3 text-left text-xs font-medium text-[#a1a1aa] uppercase tracking-wider">
                Name
              </th>
              <th
                className="px-5 py-3 text-left text-xs font-medium text-[#a1a1aa] uppercase tracking-wider cursor-pointer hover:text-white transition-colors"
                onClick={() => handleSort('domain')}
              >
                Domain
                <SortIcon active={sortKey === 'domain'} order={sortKey === 'domain' ? sortOrder : 'asc'} />
              </th>
              <th
                className="px-5 py-3 text-left text-xs font-medium text-[#a1a1aa] uppercase tracking-wider cursor-pointer hover:text-white transition-colors"
                onClick={() => handleSort('warmupScore')}
              >
                Score
                <SortIcon active={sortKey === 'warmupScore'} order={sortKey === 'warmupScore' ? sortOrder : 'asc'} />
              </th>
              <th className="px-5 py-3 text-left text-xs font-medium text-[#a1a1aa] uppercase tracking-wider">
                Status
              </th>
              <th
                className="px-5 py-3 text-left text-xs font-medium text-[#a1a1aa] uppercase tracking-wider cursor-pointer hover:text-white transition-colors"
                onClick={() => handleSort('lastSyncedAt')}
              >
                Updated
                <SortIcon active={sortKey === 'lastSyncedAt'} order={sortKey === 'lastSyncedAt' ? sortOrder : 'asc'} />
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#262626]">
            {filteredAccounts.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-5 py-12 text-center text-[#666]">
                  <svg className="w-12 h-12 mx-auto mb-3 text-[#333]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  No accounts found
                </td>
              </tr>
            ) : (
              filteredAccounts.map((account) => (
                <tr
                  key={account.id}
                  className="hover:bg-[#8b5cf6]/5 transition-colors"
                >
                  <td className="px-5 py-4">
                    <span className="text-white text-sm font-medium">{account.email}</span>
                  </td>
                  <td className="px-5 py-4 text-[#a1a1aa] text-sm">
                    {[account.firstName, account.lastName].filter(Boolean).join(' ') || '—'}
                  </td>
                  <td className="px-5 py-4">
                    <span className="text-[#a1a1aa] text-sm">
                      {account.domain?.name ?? extractDomain(account.trackingDomainName)}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2">
                      <span className={`text-xl font-semibold ${getScoreColor(account.warmupScore)}`}>
                        {account.warmupScore}%
                      </span>
                      {account.previousScore !== null && account.previousScore !== account.warmupScore && (
                        <span className={`text-xs font-medium ${account.warmupScore > account.previousScore ? 'text-emerald-400' : 'text-red-400'}`}>
                          {account.warmupScore > account.previousScore ? '↑' : '↓'}
                          {Math.abs(account.warmupScore - account.previousScore)}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <span
                      className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium border ${getScoreBgColor(account.warmupScore)} ${getScoreColor(account.warmupScore)}`}
                    >
                      {account.warmupScore >= 97 ? 'Healthy' : account.warmupScore >= 90 ? 'Warning' : 'Critical'}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-[#666] text-sm">
                    {formatDate(account.lastSyncedAt)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="px-5 py-3 border-t border-[#262626] bg-[#0a0a0a]">
        <p className="text-xs text-[#666]">
          Showing {filteredAccounts.length} of {accounts.length} accounts
        </p>
      </div>
    </div>
  );
}
