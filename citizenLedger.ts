// citizenLedger.ts — Monthly money ledger, unlimited citizen diary records, and change explanations

import type {
  ChangeExplanation,
  LedgerEntry,
  LifeLogCategory,
} from './citizenInspectorTypes';
import { recordSimEvent } from './recordsStore';
import { simIdSuffix } from './rng';
import type { Citizen } from './types';

export function appendLifeLog(
  citizen: Citizen,
  totalDay: number,
  dateLabel: string,
  category: LifeLogCategory,
  summary: string
): void {
  recordSimEvent({
    simDay: totalDay,
    dateLabel,
    category: 'citizens',
    subType: 'diary',
    subjectId: citizen.id,
    subjectKind: 'citizen',
    subjectName: citizen.name,
    summary,
    detail: { diaryCategory: category, summary },
  });
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
