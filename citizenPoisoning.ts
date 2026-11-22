// citizenPoisoning.ts — Contamination sickness medical bills, memory, ledger, and diary updates

import { appendLedgerEntry, appendLifeLog } from './citizenLedger';
import { addCitizenMemory } from './citizenMemory';
import { clamp } from './economy';
import { makeCityEvent, type SimClock } from './eventFactory';
import { formatDelta } from './formatters';
import type { MartState } from './martTypes';
import type { Citizen, CityEvent } from './types';

export function applyContaminationPoisoning(
  citizen: Citizen,
  mart: MartState,
  clock: SimClock,
  dateLabel: string,
  events: CityEvent[],
  sourceLabel: string
): void {
  const medBill = Math.min(citizen.savings, 50 + Math.floor(Math.random() * 101));
  citizen.savings = Math.max(0, Math.round(citizen.savings - medBill));
  const hit = citizen.age > 55 ? 26 : 20;
  citizen.health = clamp(citizen.health - hit, 0, 100);
  citizen.mood = clamp(citizen.mood - 15, 0, 100);
  mart.reputation = Math.max(0, Math.round((mart.reputation - 2) * 10) / 10);

  if (medBill > 0) {
    appendLedgerEntry(citizen, clock.totalDays, dateLabel, 'expense', 'Medical', `Tainted ${sourceLabel} treatment`, medBill);
  }
  addCitizenMemory(
    citizen,
    clock,
    dateLabel,
    'illness',
    `Got sick from tainted ${sourceLabel} (medical bill ${formatDelta(medBill)}).`,
    -42
  );
  appendLifeLog(
    citizen,
    clock.totalDays,
    dateLabel,
    'health',
    `Food poisoning from tainted ${sourceLabel}; health -${hit}, medical cost ${formatDelta(medBill)}.`
  );

  events.push(
    makeCityEvent(clock, `contam_${citizen.id}_${sourceLabel}`, {
      type: 'contamination',
      citizenId: citizen.id,
      citizenName: citizen.name,
      title: 'Food Poisoning',
      detail: `${citizen.name} fell sick from tainted ${sourceLabel} (medical bill ${formatDelta(medBill)}).`,
    })
  );
}
