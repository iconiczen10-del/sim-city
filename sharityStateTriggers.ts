// sharityStateTriggers.ts — Collects month-end, lifestyle, Mart mood, and hardship state triggers for Sharity

import type { Company, CompanyId } from './companyTypes';
import { DAYS_PER_MONTH } from './constants';
import type { MartState } from './martTypes';
import { simRand } from './rng';
import type { TriggerCandidate } from './sharityTriggers';
import { collectUtilitySharityTriggers } from './sharityUtilityTriggers';
import type { Citizen } from './types';

export function collectCitizenExtraTriggers(params: {
  c: Citizen;
  companies: Company[];
  mart: MartState;
  officialCompanyIds: CompanyId[];
  day: number;
  totalDays: number;
  hasRecentTheft: boolean;
  vars: Record<string, string>;
}): TriggerCandidate[] {
  const { c, mart, officialCompanyIds, day, totalDays, hasRecentTheft, vars } = params;
  const out: TriggerCandidate[] = [];
  const push = (topic: TriggerCandidate['topic'], triggerKey: string, triggerLabel: string, urgency: number, isBigEvent = false) => {
    out.push({ authorId: c.id, topic, triggerKey, triggerLabel, urgency, isBigEvent, vars });
  };

  if (day === DAYS_PER_MONTH) {
    if (c.lastGrossPay > 0) push('money', 'payday', 'Monthly payday', 48);
    if (c.employerId) push('work_career', 'perf_review', 'Month-end performance review', 36);
    if (c.lastFixedCosts >= 220) push('money', 'big_expense', 'Heavy monthly expenses', 42);
    if (c.rentArrears === 0 && c.savings > 0 && simRand() < 0.35) push('celebrations', 'survive_month', 'Cleared monthly bills', 38);
    if (c.employerId && c.tenureMonths > 0 && c.tenureMonths % 12 === 0) {
      push('celebrations', simRand() < 0.5 ? 'tenure_celebrate' : 'tenure_anniv', 'Tenure anniversary', 52);
    }
  }

  if (c.employerId && officialCompanyIds.includes(c.employerId) && simRand() < 0.35) {
    push('companies', 'company_reaction', 'Employer posted official update', 46);
  }
  const moods = Object.values(mart.categoryMoods);
  if (moods.some((m) => m.mood === 'clearance') && simRand() < 0.2) push('vij_mart', 'clearance', 'Vij Mart clearance deals', 44);
  else if (moods.some((m) => m.mood === 'generous') && simRand() < 0.16) push('vij_mart', 'good_deal', 'Fair Vij Mart prices', 38);

  if (c.savings === 0 && c.history.length > 0 && c.history[c.history.length - 1].savings >= 100) {
    push('loss_hardship', 'savings_gone', 'Reserves wiped out', 64, true);
  }
  if (c.roleLevel === 'Unemployed' && c.unemployedDays >= 2 && c.unemployedDays <= 10 && simRand() < 0.3) {
    push('loss_hardship', 'job_loss_hardship', 'Recent job loss strain', 54);
  }
  if (c.health < 55) push('loss_hardship', 'illness_hardship', 'Persistent illness', 58);
  else if (c.health >= 65 && c.health < 88 && c.hunger > 60 && c.thirst > 60 && simRand() < 0.2) {
    push('health_survival', 'recovering', 'Recovering steadily', 40);
  }
  if (c.memories.some((m) => m.kind === 'death' && totalDays - m.totalDay <= 3) && simRand() < 0.35) {
    push('loss_hardship', 'grief_death', 'Recent city grief', 66, true);
  }

  for (const ch of c.changeExplanations.filter((x) => totalDays - x.totalDay <= 1)) {
    if (ch.kind === 'standard_downgrade') push('housing', 'std_downgrade', 'Living standard downgraded', 48);
    else if (/cost|unexpected|bill/i.test(ch.summary)) push('money', 'unexpected_cost', 'Unexpected expense hit', 52);
  }
  if (c.decisions.some((d) => totalDays - d.totalDay <= 1 && d.kind === 'downgrade_upgrade' && /upgraded/i.test(d.chosenOption))) {
    push('housing', 'std_upgrade', 'Living standard upgraded', 48);
  }
  if (c.housingHistory?.some((h) => totalDays - h.startDay <= 1 && /upgrad/i.test(h.reason ?? ''))) {
    push('status_flex', 'upgrade_flex', 'Moved to upgraded home', 56);
  }
  if (c.housingHistory?.some((h) => totalDays - h.startDay <= 1 && /downsiz|cheaper|downgrad/i.test(h.reason ?? ''))) {
    push('loss_hardship', 'downgrade_shame', 'Downgraded housing', 54);
  }
  if (c.housingHistory?.some((h) => totalDays - h.startDay <= 1 && /Invited in by friend/i.test(h.reason ?? ''))) {
    push('celebrations', 'friend_shelter_help', 'Taken in by friend', 60);
  }

  if (c.homeType === 'shared_room' && c.mood < 52 && simRand() < 0.1) push('housing', 'cramped_living', 'Cramped shared room', 34);
  else if ((c.homeType === 'villa' || c.homeType === 'mansion') && c.mood >= 65 && simRand() < 0.08) push('housing', 'comfy_living', 'Comfortable living setup', 32);
  if (c.landlordId && c.mood < 56 && simRand() < 0.14) push('housing', 'landlord_shade', 'Frustrated with landlord rent', 46);
  if (c.homeId === null && simRand() < 0.3) push('loss_hardship', 'homeless_post', 'Sleeping without shelter', 68, true);
  if (c.standards.food >= 4 && simRand() < 0.08) push('status_flex', 'luxury_std', 'Luxury living standards', 38);
  if (c.recentPurchases.length > 0 && simRand() < 0.08) push('status_flex', 'big_purchase', 'Fresh retail purchase', 34);
  if (c.savings >= 5000 && c.mood >= 60 && simRand() < 0.06) push('celebrations', 'goal_celebrate', 'Savings target hit', 40);
  if (c.traits.ambition >= 65 && c.employerId && simRand() < 0.14) push('ambition', 'extra_hours', 'Putting in extra effort', 32);
  if (hasRecentTheft && simRand() < 0.25) {
    push('crime_conflict', simRand() < 0.5 ? 'crime_suspicion' : 'crime_neighbor', 'Neighborhood theft tension', 60);
  }
  out.push(...collectUtilitySharityTriggers({ c, totalDays, officialCompanyIds, vars }));
  return out;
}
