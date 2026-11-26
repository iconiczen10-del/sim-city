// recordsQuota.ts — Browser storage quota monitor warning near capacity without ever deleting records

import type { StorageQuotaStatus } from './recordTypes';

export const STORAGE_QUOTA_WARN_PCT = 80;

let forcedTestUsagePct: number | null = null;

export function setTestStorageUsagePct(pct: number | null): void {
  forcedTestUsagePct = pct;
}

export function evaluateQuotaStatus(usageBytes: number, quotaBytes: number, warnPct: number = STORAGE_QUOTA_WARN_PCT): StorageQuotaStatus {
  const safeQuota = quotaBytes > 0 ? quotaBytes : 1;
  const usagePct = Math.min(100, Math.round((usageBytes / safeQuota) * 1000) / 10);
  return {
    usageBytes,
    quotaBytes,
    usagePct,
    warning: usagePct >= warnPct,
  };
}

export async function checkStorageQuotaStatus(): Promise<StorageQuotaStatus | null> {
  if (forcedTestUsagePct !== null) {
    return {
      usageBytes: Math.round(forcedTestUsagePct * 1024 * 1024),
      quotaBytes: 100 * 1024 * 1024,
      usagePct: forcedTestUsagePct,
      warning: forcedTestUsagePct >= STORAGE_QUOTA_WARN_PCT,
    };
  }
  if (typeof navigator === 'undefined' || !navigator.storage?.estimate) return null;
  try {
    const est = await navigator.storage.estimate();
    const usage = est.usage ?? 0;
    const quota = est.quota ?? 0;
    if (quota <= 0) return null;
    return evaluateQuotaStatus(usage, quota);
  } catch {
    return null;
  }
}
