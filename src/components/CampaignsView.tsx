'use client';

import { useState, useMemo } from 'react';
import { Campaign } from '@/lib/types';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  Legend,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

interface CampaignsViewProps {
  campaigns: Campaign[];
  loading: boolean;
}

type SortKey =
  | 'name'
  | 'status'
  | 'emailsSentCount'
  | 'newLeadsContactedCount'
  | 'replyCount'
  | 'replyRate'
  | 'positiveReplyRate'
  | 'bouncedCount'
  | 'bounceRate'
  | 'totalOpportunities'
  | 'totalOpportunityValue';

const STATUS_MAP: Record<number, { label: string; color: string; bg: string }> = {
  0: { label: 'Draft', color: 'text-[var(--muted-text)]', bg: 'bg-[#333]/50' },
  1: { label: 'Active', color: 'text-emerald-400', bg: 'bg-emerald-500/20' },
  2: { label: 'Paused', color: 'text-amber-400', bg: 'bg-amber-500/20' },
  3: { label: 'Completed', color: 'text-[#2869b0]', bg: 'bg-[#2869b0]/20' },
};

const CHART_COLORS = {
  purple: '#2869b0',
  emerald: '#10b981',
  amber: '#f59e0b',
  red: '#ef4444',
  blue: '#3b82f6',
};

export function CampaignsView({ campaigns, loading }: CampaignsViewProps) {
  const [sortKey, setSortKey] = useState<SortKey>('totalOpportunityValue');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<number | 'all'>('all');
  const [expandedChart, setExpandedChart] = useState<string | null>(null);

  // Common chart props
  const commonChartProps = {
    margin: { top: 5, right: 5, left: 5, bottom: 40 },
  };

  const xAxisTickProps = { fill: '#666', fontSize: 10 };
  const expandedXAxisTickProps = { fill: '#666', fontSize: 12 };

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortOrder('desc');
    }
  };

  const filteredAndSortedCampaigns = useMemo(() => {
    return campaigns
      .filter((campaign) => {
        if (statusFilter !== 'all' && campaign.status !== statusFilter) return false;



        if (search) {
          return campaign.name.toLowerCase().includes(search.toLowerCase());
        }
        return true;
      })
      .map((campaign) => ({
        ...campaign,
        replyRate: campaign.contactedCount > 0
          ? (campaign.replyCountUnique / campaign.contactedCount) * 100
          : 0,
        bounceRate: campaign.emailsSentCount > 0
          ? (campaign.bouncedCount / campaign.emailsSentCount) * 100
          : 0,
        positiveReplyRate: campaign.replyCountUnique > 0
          ? (campaign.totalOpportunities / campaign.replyCountUnique) * 100
          : 0,
      }))
      .sort((a, b) => {
        let aVal: string | number;
        let bVal: string | number;

        switch (sortKey) {
          case 'name':
            aVal = a.name;
            bVal = b.name;
            break;
          case 'status':
            aVal = a.status;
            bVal = b.status;
            break;
          case 'replyRate':
            aVal = a.replyRate;
            bVal = b.replyRate;
            break;
          case 'bounceRate':
            aVal = a.bounceRate;
            bVal = b.bounceRate;
            break;
          case 'positiveReplyRate':
            aVal = a.positiveReplyRate;
            bVal = b.positiveReplyRate;
            break;
          default:
            aVal = a[sortKey] as number;
            bVal = b[sortKey] as number;
        }

        if (typeof aVal === 'string') {
          return sortOrder === 'asc'
            ? aVal.localeCompare(bVal as string)
            : (bVal as string).localeCompare(aVal);
        }
        return sortOrder === 'asc' ? aVal - (bVal as number) : (bVal as number) - aVal;
      });
  }, [campaigns, sortKey, sortOrder, search, statusFilter]);

  // Calculate totals
  const totals = useMemo(() => {
    return filteredAndSortedCampaigns.reduce(
      (acc, c) => ({
        emailsSent: acc.emailsSent + c.emailsSentCount,
        leadsContacted: acc.leadsContacted + c.newLeadsContactedCount,
        replies: acc.replies + c.replyCountUnique,
        bounced: acc.bounced + c.bouncedCount,
        opportunities: acc.opportunities + c.totalOpportunities,
        value: acc.value + c.totalOpportunityValue,
      }),
      { emailsSent: 0, leadsContacted: 0, replies: 0, bounced: 0, opportunities: 0, value: 0 }
    );
  }, [filteredAndSortedCampaigns]);

  // Chart data - top campaigns by various metrics
  const chartData = useMemo(() => {
    return filteredAndSortedCampaigns
      .slice(0, 10)
      .map((c) => ({
        name: c.name.length > 20 ? c.name.substring(0, 20) + '...' : c.name,
        fullName: c.name,
        sent: c.emailsSentCount,
        leads: c.newLeadsContactedCount,
        replies: c.replyCountUnique,
        bounced: c.bouncedCount,
        opportunities: c.totalOpportunities,
        value: c.totalOpportunityValue,
        replyRate: c.replyRate,
        positiveReplyRate: c.positiveReplyRate,
      }));
  }, [filteredAndSortedCampaigns]);

  // Status distribution for pie chart
  const statusDistribution = useMemo(() => {
    const counts = { Active: 0, Paused: 0, Completed: 0, Draft: 0 };
    campaigns.forEach((c) => {
      if (c.status === 1) counts.Active++;
      else if (c.status === 2) counts.Paused++;
      else if (c.status === 3) counts.Completed++;
      else counts.Draft++;
    });
    return Object.entries(counts)
      .filter(([, value]) => value > 0)
      .map(([name, value]) => ({ name, value }));
  }, [campaigns]);

  const pieColors = ['#10b981', '#f59e0b', '#2869b0', '#666666'];

  const SortIcon = ({ active, order }: { active: boolean; order: 'asc' | 'desc' }) => (
    <svg
      className={`w-3.5 h-3.5 ml-1 inline-block transition-colors ${active ? 'text-[#8b5cf6]' : 'text-[var(--muted-text)]'}`}
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

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-[var(--card-background)] border border-[var(--border)] rounded-lg p-3 shadow-xl">
          <p className="text-[var(--foreground)] font-medium mb-2">{payload[0]?.payload?.fullName || label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {typeof entry.value === 'number' && entry.value % 1 !== 0
                ? entry.value.toFixed(1) + '%'
                : entry.value.toLocaleString()}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  // Modal for expanded chart
  const ExpandedChartModal = () => {
    if (!expandedChart) return null;

    const renderChart = () => {
      switch (expandedChart) {
        case 'sent-replies':
          return (
            <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 100 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="name" tick={expandedXAxisTickProps} angle={-45} textAnchor="end" height={120} interval={0} />
              <YAxis tick={{ fill: '#666', fontSize: 12 }} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ paddingTop: '0px', paddingBottom: '20px' }} verticalAlign="top" />
              <Bar dataKey="sent" name="Sent" fill={CHART_COLORS.purple} radius={[4, 4, 0, 0]} />
              <Bar dataKey="replies" name="Replies" fill={CHART_COLORS.emerald} radius={[4, 4, 0, 0]} />
            </BarChart>
          );
        case 'reply-rates':
          return (
            <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 100 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="name" tick={expandedXAxisTickProps} angle={-45} textAnchor="end" height={120} interval={0} />
              <YAxis tick={{ fill: '#666', fontSize: 12 }} unit="%" />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ paddingTop: '0px', paddingBottom: '20px' }} verticalAlign="top" />
              <Bar dataKey="replyRate" name="Reply Rate" fill={CHART_COLORS.blue} radius={[4, 4, 0, 0]} />
              <Bar dataKey="positiveReplyRate" name="Positive Reply Rate" fill={CHART_COLORS.amber} radius={[4, 4, 0, 0]} />
            </BarChart>
          );
        case 'opportunities':
          return (
            <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 100 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="name" tick={expandedXAxisTickProps} angle={-45} textAnchor="end" height={120} interval={0} />
              <YAxis yAxisId="left" tick={{ fill: '#666', fontSize: 12 }} />
              <YAxis yAxisId="right" orientation="right" tick={{ fill: '#666', fontSize: 12 }} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ paddingTop: '0px', paddingBottom: '20px' }} verticalAlign="top" />
              <Bar yAxisId="left" dataKey="opportunities" name="Opportunities" fill={CHART_COLORS.amber} radius={[4, 4, 0, 0]} />
              <Bar yAxisId="right" dataKey="value" name="Value ($)" fill={CHART_COLORS.emerald} radius={[4, 4, 0, 0]} />
            </BarChart>
          );
        default:
          return null;
      }
    };

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setExpandedChart(null)}>
        <div className="bg-[var(--card-background)] rounded-2xl w-full max-w-6xl h-[80vh] p-6 shadow-2xl relative flex flex-col" onClick={e => e.stopPropagation()}>
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-semibold text-[var(--foreground)]">
              {expandedChart === 'sent-replies' ? 'Emails Sent vs Replies by Campaign' :
                expandedChart === 'reply-rates' ? 'Reply Rate vs Positive Reply Rate' :
                  'Opportunities & Pipeline Value'}
            </h3>
            <button
              onClick={() => setExpandedChart(null)}
              className="p-2 hover:bg-[var(--secondary-muted)] rounded-lg transition-colors"
            >
              <svg className="w-6 h-6 text-[var(--muted-text)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="flex-1 w-full min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              {renderChart()}
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="rounded-xl border border-[var(--border)] bg-[var(--card-background)] overflow-hidden">
        <div className="p-6 space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 bg-[var(--secondary-muted)] rounded-lg shimmer" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <ExpandedChartModal />
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card-background)] p-4">
          <p className="text-xs text-[var(--muted-text)] uppercase tracking-wider mb-1">Campaigns</p>
          <p className="text-2xl font-semibold text-[var(--foreground)]">{filteredAndSortedCampaigns.length}</p>
        </div>
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card-background)] p-4">
          <p className="text-xs text-[var(--muted-text)] uppercase tracking-wider mb-1">Emails Sent</p>
          <p className="text-2xl font-semibold text-[#2869b0]">{totals.emailsSent.toLocaleString()}</p>
        </div>
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card-background)] p-4">
          <p className="text-xs text-[var(--muted-text)] uppercase tracking-wider mb-1">Leads Contacted</p>
          <p className="text-2xl font-semibold text-blue-400">{totals.leadsContacted.toLocaleString()}</p>
        </div>
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card-background)] p-4">
          <p className="text-xs text-[var(--muted-text)] uppercase tracking-wider mb-1">Total Replies</p>
          <p className="text-2xl font-semibold text-emerald-400">{totals.replies.toLocaleString()}</p>
        </div>
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card-background)] p-4">
          <p className="text-xs text-[var(--muted-text)] uppercase tracking-wider mb-1">Opportunities</p>
          <p className="text-2xl font-semibold text-amber-400">{totals.opportunities.toLocaleString()}</p>
        </div>
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card-background)] p-4">
          <p className="text-xs text-[var(--muted-text)] uppercase tracking-wider mb-1">Pipeline Value</p>
          <p className="text-2xl font-semibold text-emerald-400">${totals.value.toLocaleString()}</p>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Sends & Replies by Campaign */}
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card-background)] p-5 relative group">
          <div className="flex justify-between items-start mb-4">
            <h3 className="text-[var(--foreground)] font-medium">Emails Sent vs Replies by Campaign</h3>
            <button
              onClick={() => setExpandedChart('sent-replies')}
              className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 hover:bg-[var(--secondary-muted)] rounded-md text-[var(--muted-text)] hover:text-[var(--foreground)]"
              title="Expand Chart"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
              </svg>
            </button>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={commonChartProps.margin}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="name" tick={xAxisTickProps} angle={-45} textAnchor="end" height={80} interval={0} />
                <YAxis tick={{ fill: '#666', fontSize: 10 }} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ paddingTop: '0px', paddingBottom: '20px' }} verticalAlign="top" />
                <Bar dataKey="sent" name="Sent" fill={CHART_COLORS.purple} radius={[4, 4, 0, 0]} />
                <Bar dataKey="replies" name="Replies" fill={CHART_COLORS.emerald} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Reply Rate & Positive Reply Rate */}
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card-background)] p-5 relative group">
          <div className="flex justify-between items-start mb-4">
            <h3 className="text-[var(--foreground)] font-medium">Reply Rate vs Positive Reply Rate</h3>
            <button
              onClick={() => setExpandedChart('reply-rates')}
              className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 hover:bg-[var(--secondary-muted)] rounded-md text-[var(--muted-text)] hover:text-[var(--foreground)]"
              title="Expand Chart"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
              </svg>
            </button>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={commonChartProps.margin}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="name" tick={xAxisTickProps} angle={-45} textAnchor="end" height={80} interval={0} />
                <YAxis tick={{ fill: '#666', fontSize: 10 }} unit="%" />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ paddingTop: '0px', paddingBottom: '20px' }} verticalAlign="top" />
                <Bar dataKey="replyRate" name="Reply Rate" fill={CHART_COLORS.blue} radius={[4, 4, 0, 0]} />
                <Bar dataKey="positiveReplyRate" name="Positive Reply Rate" fill={CHART_COLORS.amber} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Opportunities & Value */}
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card-background)] p-5 relative group">
          <div className="flex justify-between items-start mb-4">
            <h3 className="text-[var(--foreground)] font-medium">Opportunities & Pipeline Value</h3>
            <button
              onClick={() => setExpandedChart('opportunities')}
              className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 hover:bg-[var(--secondary-muted)] rounded-md text-[var(--muted-text)] hover:text-[var(--foreground)]"
              title="Expand Chart"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
              </svg>
            </button>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={commonChartProps.margin}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="name" tick={xAxisTickProps} angle={-45} textAnchor="end" height={80} interval={0} />
                <YAxis yAxisId="left" tick={{ fill: '#666', fontSize: 10 }} />
                <YAxis yAxisId="right" orientation="right" tick={{ fill: '#666', fontSize: 10 }} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ paddingTop: '0px', paddingBottom: '20px' }} verticalAlign="top" />
                <Bar yAxisId="left" dataKey="opportunities" name="Opportunities" fill={CHART_COLORS.amber} radius={[4, 4, 0, 0]} />
                <Bar yAxisId="right" dataKey="value" name="Value ($)" fill={CHART_COLORS.emerald} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Status Distribution */}
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card-background)] p-5">
          <h3 className="text-[var(--foreground)] font-medium mb-4">Campaign Status Distribution</h3>
          <div className="h-64 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={5}
                  dataKey="value"
                  label={({ name, value }) => `${name}: ${value}`}
                  labelLine={{ stroke: '#666' }}
                >
                  {statusDistribution.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={pieColors[index % pieColors.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--card-background)',
                    border: '1px solid var(--border)',
                    borderRadius: '8px'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--card-background)] overflow-hidden">
        {/* Search and filters */}
        <div className="p-4 border-b border-[var(--border)] space-y-4">
          {/* Top Row: Search and Status Filter */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted-text)]"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search campaigns..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-[var(--background)] border border-[var(--border)] rounded-lg text-[var(--foreground)] text-sm placeholder-[#666] focus:border-[#2869b0] focus:ring-1 focus:ring-[#2869b0]/30"
              />
            </div>
            <div className="flex gap-1.5 p-1 bg-[var(--background)] rounded-lg border border-[var(--border)]">
              {[
                { value: 'all' as const, label: 'All' },
                { value: 1, label: 'Active' },
                { value: 2, label: 'Paused' },
                { value: 3, label: 'Completed' },
              ].map((f) => (
                <button
                  key={f.value}
                  onClick={() => setStatusFilter(f.value)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200 ${statusFilter === f.value
                    ? 'bg-[#2869b0] text-[var(--foreground)]'
                    : 'text-[var(--muted-text)] hover:text-[var(--foreground)] hover:bg-[var(--secondary-muted)]'
                    }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[var(--border)] bg-[var(--background)]">
              <th
                className="px-4 py-3 text-left text-xs font-medium text-[var(--muted-text)] uppercase tracking-wider cursor-pointer hover:text-[var(--foreground)] transition-colors"
                onClick={() => handleSort('name')}
              >
                Campaign
                <SortIcon active={sortKey === 'name'} order={sortKey === 'name' ? sortOrder : 'asc'} />
              </th>
              <th
                className="px-4 py-3 text-left text-xs font-medium text-[var(--muted-text)] uppercase tracking-wider cursor-pointer hover:text-[var(--foreground)] transition-colors"
                onClick={() => handleSort('status')}
              >
                Status
                <SortIcon active={sortKey === 'status'} order={sortKey === 'status' ? sortOrder : 'asc'} />
              </th>
              <th
                className="px-4 py-3 text-right text-xs font-medium text-[var(--muted-text)] uppercase tracking-wider cursor-pointer hover:text-[var(--foreground)] transition-colors"
                onClick={() => handleSort('emailsSentCount')}
              >
                Sent
                <SortIcon active={sortKey === 'emailsSentCount'} order={sortKey === 'emailsSentCount' ? sortOrder : 'asc'} />
              </th>
              <th
                className="px-4 py-3 text-right text-xs font-medium text-[var(--muted-text)] uppercase tracking-wider cursor-pointer hover:text-[var(--foreground)] transition-colors"
                onClick={() => handleSort('newLeadsContactedCount')}
              >
                Leads
                <SortIcon active={sortKey === 'newLeadsContactedCount'} order={sortKey === 'newLeadsContactedCount' ? sortOrder : 'asc'} />
              </th>
              <th
                className="px-4 py-3 text-right text-xs font-medium text-[var(--muted-text)] uppercase tracking-wider cursor-pointer hover:text-[var(--foreground)] transition-colors"
                onClick={() => handleSort('replyCount')}
              >
                Replies
                <SortIcon active={sortKey === 'replyCount'} order={sortKey === 'replyCount' ? sortOrder : 'asc'} />
              </th>
              <th
                className="px-4 py-3 text-right text-xs font-medium text-[var(--muted-text)] uppercase tracking-wider cursor-pointer hover:text-[var(--foreground)] transition-colors"
                onClick={() => handleSort('replyRate')}
              >
                Reply %
                <SortIcon active={sortKey === 'replyRate'} order={sortKey === 'replyRate' ? sortOrder : 'asc'} />
              </th>
              <th
                className="px-4 py-3 text-right text-xs font-medium text-[var(--muted-text)] uppercase tracking-wider cursor-pointer hover:text-[var(--foreground)] transition-colors"
                onClick={() => handleSort('positiveReplyRate')}
              >
                Positive %
                <SortIcon active={sortKey === 'positiveReplyRate'} order={sortKey === 'positiveReplyRate' ? sortOrder : 'asc'} />
              </th>
              <th
                className="px-4 py-3 text-right text-xs font-medium text-[var(--muted-text)] uppercase tracking-wider cursor-pointer hover:text-[var(--foreground)] transition-colors"
                onClick={() => handleSort('bounceRate')}
              >
                Bounce %
                <SortIcon active={sortKey === 'bounceRate'} order={sortKey === 'bounceRate' ? sortOrder : 'asc'} />
              </th>
              <th
                className="px-4 py-3 text-right text-xs font-medium text-[var(--muted-text)] uppercase tracking-wider cursor-pointer hover:text-[var(--foreground)] transition-colors"
                onClick={() => handleSort('totalOpportunities')}
              >
                Opps
                <SortIcon active={sortKey === 'totalOpportunities'} order={sortKey === 'totalOpportunities' ? sortOrder : 'asc'} />
              </th>
              <th
                className="px-4 py-3 text-right text-xs font-medium text-[var(--muted-text)] uppercase tracking-wider cursor-pointer hover:text-[var(--foreground)] transition-colors"
                onClick={() => handleSort('totalOpportunityValue')}
              >
                Value
                <SortIcon active={sortKey === 'totalOpportunityValue'} order={sortKey === 'totalOpportunityValue' ? sortOrder : 'asc'} />
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {filteredAndSortedCampaigns.length === 0 ? (
              <tr>
                <td colSpan={10} className="px-4 py-12 text-center text-[var(--muted-text)]">
                  <svg className="w-12 h-12 mx-auto mb-3 text-[#333]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  No campaigns found
                </td>
              </tr>
            ) : (
              filteredAndSortedCampaigns.map((campaign) => {
                const statusInfo = STATUS_MAP[campaign.status] || STATUS_MAP[0];
                return (
                  <tr
                    key={campaign.id}
                    className="hover:bg-[#2869b0]/5 transition-colors"
                  >
                    <td className="px-4 py-4">
                      <span className="text-[var(--foreground)] text-sm font-medium">{campaign.name}</span>
                    </td>
                    <td className="px-4 py-4">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium ${statusInfo.bg} ${statusInfo.color}`}>
                        {statusInfo.label}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-right text-[var(--muted-text)] text-sm">
                      {campaign.emailsSentCount.toLocaleString()}
                    </td>
                    <td className="px-4 py-4 text-right text-blue-400 text-sm font-medium">
                      {campaign.newLeadsContactedCount.toLocaleString()}
                    </td>
                    <td className="px-4 py-4 text-right text-sm">
                      <span className="text-emerald-400 font-medium">{campaign.replyCountUnique}</span>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <span className={`text-sm font-medium ${campaign.replyRate >= 2 ? 'text-emerald-400' :
                        campaign.replyRate >= 1 ? 'text-amber-400' : 'text-[var(--muted-text)]'
                        }`}>
                        {campaign.replyRate.toFixed(1)}%
                      </span>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <span className={`text-sm font-medium ${campaign.positiveReplyRate >= 20 ? 'text-emerald-400' :
                        campaign.positiveReplyRate >= 10 ? 'text-amber-400' : 'text-[var(--muted-text)]'
                        }`}>
                        {campaign.positiveReplyRate.toFixed(1)}%
                      </span>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <span className={`text-sm font-medium ${campaign.bounceRate > 5 ? 'text-red-400' :
                        campaign.bounceRate > 2 ? 'text-amber-400' : 'text-[var(--muted-text)]'
                        }`}>
                        {campaign.bounceRate.toFixed(1)}%
                      </span>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <span className={`text-sm font-medium ${campaign.totalOpportunities > 0 ? 'text-amber-400' : 'text-[var(--muted-text)]'}`}>
                        {campaign.totalOpportunities}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <span className={`text-sm font-semibold ${campaign.totalOpportunityValue > 0 ? 'text-emerald-400' : 'text-[var(--muted-text)]'}`}>
                        ${campaign.totalOpportunityValue.toLocaleString()}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-[var(--border)] bg-[var(--background)]">
        <p className="text-xs text-[var(--muted-text)]">
          Showing {filteredAndSortedCampaigns.length} of {campaigns.length} campaigns
        </p>
      </div>
    </div>
  );
}
