// vijBankPersonality.ts — Monthly personality drift driven by CEO traits, cash reserves, profits, and default losses

import type { Company } from './companyTypes';
import { clamp } from './economy';
import type { SimClock } from './eventFactory';
import { makeCityEvent } from './eventFactory';
import { recordSimEvent } from './recordsStore';
import { simRand } from './rng';
import type { Citizen, CityEvent } from './types';
import { BANK_PERSONALITIES } from './vijBankCatalog';
import type { BankPersonality, VijBankState } from './vijBankTypes';

export function stepVijBankPersonalityDrift(params: {
  bank: VijBankState;
  vijCapital: Company | undefined;
  citizens: Citizen[];
  clock: SimClock;
  dateLabel: string;
  events: CityEvent[];
}): void {
  const { bank, vijCapital, citizens, clock, dateLabel, events } = params;
  if (!vijCapital || vijCapital.bankrupt) return;

  const ceo = citizens.find((c) => c.alive && c.employerId === 'vijcapital' && c.roleLevel === 'CEO');
  const activeCount = Math.max(1, bank.loans.filter((l) => l.status === 'active' || l.status === 'restructured' || l.status === 'defaulted').length);
  const defaultRatio = bank.loans.filter((l) => l.status === 'defaulted' || l.status === 'written_off').length / Math.max(1, bank.loans.length);
  const lowCash = vijCapital.cash < 12000;
  const highCash = vijCapital.cash > 48000;

  // Drift reserve ratio & rate adjust slightly each month based on bank conditions
  const spec = BANK_PERSONALITIES[bank.personality];
  const cashStressOffset = lowCash ? 0.04 : highCash ? -0.02 : 0;
  bank.reserveRatio = Math.round(clamp(spec.reserveRatio + cashStressOffset + defaultRatio * 0.12, 0.1, 0.45) * 100) / 100;
  bank.baseRateAdjust = Math.round(clamp(bank.baseRateAdjust + (lowCash ? 0.006 : highCash ? -0.004 : 0) + (defaultRatio > 0.25 ? 0.008 : -0.002), -0.03, 0.06) * 1000) / 1000;
  bank.branchLevel = vijCapital.cash > 65000 && activeCount >= 12 ? 3 : vijCapital.cash > 45000 && activeCount >= 6 ? 2 : 1;

  // Decide if personality shifts
  let next: BankPersonality = bank.personality;
  let reason = '';

  if (lowCash && defaultRatio > 0.22 && bank.personality !== 'prudent_guardian' && simRand() < 0.35) {
    next = 'prudent_guardian';
    reason = `High defaults (${Math.round(defaultRatio * 100)}%) and low cash forced strict underwriting.`;
  } else if (ceo) {
    if (ceo.traits.greed >= 76 && ceo.traits.kindness < 38 && vijCapital.negativeProfitStreak >= 1 && bank.personality !== 'predator' && simRand() < 0.25) {
      next = 'predator';
      reason = `CEO ${ceo.name}'s high greed and profit pressure hardened bank terms.`;
    } else if (ceo.traits.kindness >= 72 && ceo.traits.greed < 42 && vijCapital.cash > 26000 && bank.personality !== 'community_banker' && simRand() < 0.24) {
      next = 'community_banker';
      reason = `CEO ${ceo.name}'s community focus softened lending rates and grace rules.`;
    } else if (ceo.traits.ambition >= 74 && highCash && defaultRatio < 0.14 && bank.personality !== 'growth_hunter' && simRand() < 0.22) {
      next = 'growth_hunter';
      reason = `Strong cash reserves and CEO ${ceo.name}'s ambition shifted policy toward rapid loan growth.`;
    } else if (ceo.traits.discipline >= 78 && Math.abs(ceo.traits.greed - 50) < 20 && bank.personality !== 'bureaucrat' && simRand() < 0.18) {
      next = 'bureaucrat';
      reason = `CEO ${ceo.name} enforced rigid rulebook lending standards.`;
    }
  }

  if (next !== bank.personality) {
    const prevLabel = BANK_PERSONALITIES[bank.personality].label;
    const nextLabel = BANK_PERSONALITIES[next].label;
    bank.personalityHistory = [{ day: clock.totalDays, dateLabel, from: bank.personality, to: next, reason }, ...bank.personalityHistory].slice(0, 20);
    bank.personality = next;
    bank.reserveRatio = BANK_PERSONALITIES[next].reserveRatio;
    events.push(makeCityEvent(clock, `bank_pers_${clock.totalDays}`, {
      type: 'loan', companyId: 'vijcapital',
      title: `Vij Bank Shifted to ${nextLabel}`,
      detail: `Vij Bank shifted from ${prevLabel} to ${nextLabel}: ${reason}`,
    }));
    recordSimEvent({
      simDay: clock.totalDays, dateLabel, category: 'companies', subType: 'bank_personality',
      subjectId: 'vijcapital', subjectKind: 'company', subjectName: 'Vij Capital (Vij Bank)',
      summary: `Vij Bank personality shifted ${prevLabel} → ${nextLabel}: ${reason}`,
      detail: { from: bank.personality, to: next, reason, cash: vijCapital.cash, defaultRatio },
    });
  }
}
