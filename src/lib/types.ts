export interface EmailAccount {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  trackingDomainName: string | null;
  trackingDomainStatus: string | null;
  status: number;
  warmupScore: number;
  previousScore: number | null;
  timestampCreated: string | null;
  timestampUpdated: string | null;
  lastSyncedAt: string;
  createdAt: string;
  updatedAt: string;
  domainId: string | null;
  domain: {
    name: string;
  } | null;
}

export interface Domain {
  id: string;
  name: string;
  averageScore: number;
  accountCount: number;
  createdAt: string;
  updatedAt: string;
  accounts: Array<{
    email: string;
    warmupScore: number;
  }>;
}

export interface Alert {
  id: string;
  type: 'WARNING' | 'CRITICAL';
  entityType: 'ACCOUNT' | 'DOMAIN';
  entityId: string;
  entityName: string;
  score: number;
  threshold: number;
  message: string;
  emailSent: boolean;
  resolvedAt: string | null;
  createdAt: string;
}

export interface Stats {
  total: number;
  healthy: number;
  warning: number;
  critical: number;
  lastSyncAt: string | null;
}
