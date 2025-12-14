import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function extractDomain(trackingDomain: string | null | undefined): string {
  if (!trackingDomain) return 'unknown';
  // Strip "inst." prefix if present
  return trackingDomain.replace(/^inst\./, '');
}

export function getScoreStatus(score: number): 'healthy' | 'warning' | 'critical' {
  if (score >= 97) return 'healthy';
  if (score >= 90) return 'warning';
  return 'critical';
}

export function getScoreColor(score: number): string {
  const status = getScoreStatus(score);
  switch (status) {
    case 'healthy':
      return 'text-emerald-400';
    case 'warning':
      return 'text-amber-400';
    case 'critical':
      return 'text-red-400';
  }
}

export function getScoreBgColor(score: number): string {
  const status = getScoreStatus(score);
  switch (status) {
    case 'healthy':
      return 'bg-emerald-500/20 border-emerald-500/30';
    case 'warning':
      return 'bg-amber-500/20 border-amber-500/30';
    case 'critical':
      return 'bg-red-500/20 border-red-500/30';
  }
}

export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return 'Never';
  const d = new Date(date);
  return d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
