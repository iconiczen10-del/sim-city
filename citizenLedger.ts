// citizenLedger.ts — Monthly money ledger, 60-day searchable life log, and change explanations

import type {
  ChangeExplanation,
  LedgerEntry,
  LifeLogCategory,
  LifeLogEntry,
} from './citizenInspectorTypes';
import { LIFE_LOG_RETENTION_DAYS } from './constants';
import { simIdSuffix } from './rng';
import type { Citizen } from './types';

export function appendLifeLog(
  citizen: Citizen,
  totalDay: number,
  dateLabel: string,
  category: LifeLogCategory,
  summary: string
): void {
  const entry: LifeLogEntry = {
    id: `life_${totalDay}_${citizen.id}_${category}_${simIdSuffix()}`,
    totalDay,
    dateLabel,
    category,
    summary,
  };
  const cutoff = totalDay - LIFE_LOG_RETENTION_DAYS;
  citizen.lifeLog = [entry, ...citizen.lifeLog]
    .filter((e) => e.totalDay >= cutoff)
    .slice(0, 320);
}

export function appendLedgerEntry(
  citizen: Citizen,
  totalDay: number,
  dateLabel: string,
  kind: 'income' | 'expense',
  category: string,
  label: string,
  amount: number
): void {
  if (amount <= 0) return;
  const entry: LedgerEntry = {
    id: `led_${totalDay}_${citizen.id}_${simIdSuffix()}`,
    totalDay,
    dateLabel,
    kind,
    category,
    label,
    amount: Math.round(amount * 100) / 100,
  };
  citizen.monthlyLedger = [entry, ...citizen.monthlyLedger].slice(0, 140);
}

export function appendChangeExplanation(
  citizen: Citizen,
  totalDay: number,
  dateLabel: string,
  kind: ChangeExplanation['kind'],
  summary: string,
  decisionId?: string,
  postId?: string
): void {
  const item: ChangeExplanation = {
    id: `chg_${totalDay}_${citizen.id}_${kind}_${simIdSuffix()}`,
    totalDay,
    dateLabel,
    kind,
    summary,
    decisionId,
    postId,
  };
  citizen.changeExplanations = [item, ...citizen.changeExplanations].slice(0, 30);
}
