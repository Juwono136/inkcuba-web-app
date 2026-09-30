import type { ParsedUserAgent } from "@/lib/auth/user-agent";

export type LoginHistoryEntry = {
  id: string;
  sessionId: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
  isCurrent: boolean;
  isActive: boolean;
  device: ParsedUserAgent;
};

export type LoginHistoryPage = {
  items: LoginHistoryEntry[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  retentionDays: number;
};
