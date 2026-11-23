// sharityTriggers.ts — Collects real citizen and city triggers across all 16 Sharity topics

import type { Company, CompanyId } from './companyTypes';
import { DAYS_PER_MONTH } from './constants';
import { formatDelta, formatPrice } from './formatters';
import type { MartState } from './martTypes';
import { simPick, simRand } from './rng';
import { getAffinity } from './sharityAffinity';
import { collectCitizenExtraTriggers } from './sharityStateTriggers';
import type { SharityState, SharityTopicId } from './sharityTypes';
import type { Citizen, CityEvent } from './types';

export interface TriggerCandidate {
  authorId: string;
  topic: SharityTopicId;
  triggerKey: string;
  triggerLabel: string;
  urgency: number;
  isBigEvent: boolean;
  mentionHandle?: string;
  vars: Record<string, string>;
}

function makeVars(c: Citizen, comps: Company[], mart: MartState, sharity: SharityState, citizens: Citizen[]): Record<string, string> {
  const comp = c.employerId ? comps.find((co) => co.id === c.employerId) : simPick(comps);
  const boss = c.bossId ? citizens.find((x) => x.id === c.bossId) : null;
  const peers = citizens.filter((x) => x.alive && x.id !== c.id);
  const peer = peers.length ? simPick(peers) : c;
  const item = mart.stock.length ? simPick(mart.stock) : null;
  return {
    company: comp?.name ?? 'Vij Industries',
    role: c.roleLevel,
    amount: formatDelta(Math.max(c.savings, c.rentArrears, c.lastGrossPay, 120)),
    item: item ? `${item.category}` : 'food',
    price: item ? formatPrice(item.sellPrice) : '∆6',
    name: peer.name,
    mention: sharity.profiles[peer.id]?.handle ?? '@vijmart',
    boss: boss ? (sharity.profiles[boss.id]?.handle ?? boss.name) : 'management',
    days: String(Math.max(1, c.unemployedDays || mart.closedDaysLeft || 3)),
    tier: c.tier,
  };
}

function mapEventToKey(ev: CityEvent): { topic: SharityTopicId; key: string; urgency: number; big: boolean } | null {
  if (ev.type === 'hired') return { topic: 'work_career', key: 'hired', urgency: 56, big: false };
  if (ev.type === 'promoted') return { topic: 'celebrations', key: simRand() < 0.5 ? 'promoted' : 'promo_celebrate', urgency: 68, big: false };
  if (ev.type === 'layoff') return { topic: 'work_career', key: 'laid_off', urgency: 76, big: true };
  if (ev.type === 'fired') return { topic: 'work_career', key: 'fired', urgency: 74, big: true };
  if (ev.type === 'quit') return { topic: 'work_career', key: 'quit', urgency: 58, big: false };
  if (ev.type === 'pay-cut') return { topic: 'work_career', key: 'pay_cut', urgency: 64, big: false };
  if (ev.type === 'late-pay') return { topic: 'work_career', key: 'late_pay', urgency: 70, big: false };
  if (ev.type === 'money' && ev.title === 'Savings Milestone') return { topic: 'celebrations', key: 'milestone', urgency: 64, big: false };
  if (ev.type === 'money' && ev.title === 'Rent Arrears') return { topic: 'housing', key: 'rent_arrears', urgency: 66, big: false };
  if (ev.type === 'money') return { topic: 'money', key: 'broke', urgency: 68, big: false };
  if (ev.type === 'tier' && ev.title === 'Tier Promotion') return { topic: 'status_flex', key: 'tier_up', urgency: 70, big: false };
  if (ev.type === 'stock-out' || ev.type === 'shortage') return { topic: 'vij_mart', key: 'stockout', urgency: 56, big: false };
  if (ev.type === 'price-shock') return { topic: 'vij_mart', key: 'price_shock', urgency: 62, big: false };
  if (ev.type === 'mood-change' && ev.title.includes('Clearance')) return { topic: 'vij_mart', key: 'clearance', urgency: 56, big: false };
  if (ev.type === 'mood-change' && ev.title.includes('Gouging')) return { topic: 'vij_mart', key: 'price_shock', urgency: 62, big: false };
  if (ev.type === 'rationing') return { topic: 'vij_mart', key: 'rationing', urgency: 64, big: false };
  if (ev.type === 'contamination') return { topic: 'vij_mart', key: 'contamination', urgency: 76, big: true };
  if (ev.type === 'late-delivery') return { topic: 'vij_mart', key: 'late_delivery', urgency: 52, big: false };
  if (ev.type === 'death') return { topic: 'city_mood', key: 'city_death', urgency: 85, big: true };
  if (ev.type === 'bankruptcy') return { topic: 'city_mood', key: 'city_bankrupt', urgency: 84, big: true };
  if (ev.type === 'eviction') return { topic: 'loss_hardship', key: 'evicted_vent', urgency: 80, big: true };
  if (ev.type === 'bought-house') return { topic: ev.title.includes('Investment') ? 'status_flex' : 'celebrations', key: ev.title.includes('Investment') ? 'second_property_flex' : 'bought_home_flex', urgency: 72, big: false };
  if (ev.type === 'homeless') return { topic: ev.citizenId ? 'loss_hardship' : 'city_mood', key: ev.citizenId ? 'homeless_post' : 'city_homeless_wave', urgency: 78, big: true };
  if (ev.type === 'moved') return { topic: 'housing', key: 'moved_in', urgency: 54, big: false };
  if (ev.type === 'roommate-conflict') return { topic: 'housing', key: 'roommate_friction', urgency: 50, big: false };
  if (ev.type === 'rent-raise') return { topic: 'housing', key: 'rent_rise_complaint', urgency: 62, big: false };
  if (ev.type === 'sold-house') return { topic: 'loss_hardship', key: 'sold_home_crisis', urgency: 72, big: false };
  if (ev.type === 'simgod') {
    const t = `${ev.title} ${ev.detail}`.toLowerCase();
    if (t.includes('stole') || t.includes('theft')) return { topic: 'crime_conflict', key: simRand() < 0.5 ? 'nat_theft' : 'crime_theft', urgency: 78, big: true };
    if (t.includes('fire') || t.includes('destroyed')) return { topic: 'natural_events', key: 'nat_fire', urgency: 76, big: true };
    if (t.includes('flood')) return { topic: 'natural_events', key: 'nat_flood', urgency: 74, big: true };
    if (t.includes('poison')) return { topic: 'natural_events', key: 'nat_poisoning', urgency: 78, big: true };
    if (t.includes('power')) return { topic: 'natural_events', key: 'nat_power_cut', urgency: 68, big: true };
    if (t.includes('price')) return { topic: 'natural_events', key: 'nat_price_jump', urgency: 70, big: true };
    if (t.includes('closed')) return { topic: 'vij_mart', key: 'mart_closed', urgency: 76, big: true };
  }
  return null;
}

export function collectCitizenTriggers(params: {
  citizens: Citizen[];
  companies: Company[];
  mart: MartState;
  sharity: SharityState;
  dayEvents: CityEvent[];
  officialCompanyIds: CompanyId[];
  day: number;
  totalDays: number;
}): TriggerCandidate[] {
  const { citizens, companies, mart, sharity, dayEvents, officialCompanyIds, day, totalDays } = params;
  const alive = citizens.filter((c) => c.alive);
  const out: TriggerCandidate[] = [];
  const hasMassLayoff = dayEvents.filter((e) => e.type === 'layoff').length >= 2;
  const hasRecentTheft = dayEvents.some((e) => e.type === 'simgod' && /stole|theft/i.test(`${e.title} ${e.detail}`));

  for (const ev of dayEvents) {
    const mapped = mapEventToKey(ev);
    if (!mapped) continue;
    const pool = ev.citizenId ? alive.filter((c) => c.id === ev.citizenId) : alive.filter(() => simRand() < 0.25);
    const chosen = pool.length ? pool : alive.slice(0, 2);
    for (const c of chosen) {
      const vars = makeVars(c, companies, mart, sharity, citizens);
      if (ev.companyId) vars.company = companies.find((co) => co.id === ev.companyId)?.name ?? vars.company;
      if (ev.citizenName) vars.name = ev.citizenName;
      out.push({ authorId: c.id, topic: mapped.topic, triggerKey: mapped.key, triggerLabel: ev.title, urgency: mapped.urgency, isBigEvent: mapped.big, vars });
    }
  }

  for (const c of alive) {
    const vars = makeVars(c, companies, mart, sharity, citizens);
    if (hasMassLayoff && simRand() < 0.25) out.push({ authorId: c.id, topic: 'city_mood', triggerKey: 'city_mass_layoff', triggerLabel: 'Mass layoffs shock', urgency: 78, isBigEvent: true, vars });
    if (c.hunger < 45 || c.thirst < 45) out.push({ authorId: c.id, topic: 'health_survival', triggerKey: 'hungry_thirsty', triggerLabel: 'Low food or water', urgency: 62, isBigEvent: false, vars });
    else if (c.health < 38) out.push({ authorId: c.id, topic: 'loss_hardship', triggerKey: 'close_call', triggerLabel: 'Health close call', urgency: 72, isBigEvent: true, vars });
    else if (c.health < 65) out.push({ authorId: c.id, topic: 'health_survival', triggerKey: 'sick_close_call', triggerLabel: 'Health drop', urgency: 52, isBigEvent: false, vars });
    if (c.rentArrears > 0) out.push({ authorId: c.id, topic: 'housing', triggerKey: 'rent_arrears', triggerLabel: 'Unpaid rent arrears', urgency: 56, isBigEvent: false, vars });
    else if (day >= DAYS_PER_MONTH - 2) out.push({ authorId: c.id, topic: 'housing', triggerKey: 'rent_due', triggerLabel: 'Rent due soon', urgency: 40, isBigEvent: false, vars });
    if (c.roleLevel === 'Unemployed' && c.unemployedDays >= 10) out.push({ authorId: c.id, topic: 'work_career', triggerKey: 'job_hunting', triggerLabel: 'Active job hunt', urgency: 46, isBigEvent: false, vars });
    if (c.bossRelationship < -25 && c.employerId) out.push({ authorId: c.id, topic: 'work_career', triggerKey: 'bad_boss', triggerLabel: 'Friction with manager', urgency: 44, isBigEvent: false, vars });
    if (mart.closedDaysLeft > 0) out.push({ authorId: c.id, topic: 'vij_mart', triggerKey: 'mart_closed', triggerLabel: 'Vij Mart shuttered', urgency: 60, isBigEvent: false, vars });
    if (c.savings >= 10000 && c.traits.greed >= 58) out.push({ authorId: c.id, topic: 'status_flex', triggerKey: 'savings_flex', triggerLabel: 'High savings cushion', urgency: 36, isBigEvent: false, vars });
    if (c.traits.ambition >= 68 && c.mood >= 45) out.push({ authorId: c.id, topic: 'ambition', triggerKey: simRand() < 0.5 ? 'study_goal' : 'apply_better', triggerLabel: 'Career drive', urgency: 34, isBigEvent: false, vars });

    const other = alive.find((o) => o.id !== c.id && (getAffinity(sharity, c.id, o.id) >= 48 || getAffinity(sharity, c.id, o.id) <= -32));
    if (other && simRand() < 0.25) {
      const aff = getAffinity(sharity, c.id, other.id);
      const h = sharity.profiles[other.id]?.handle ?? other.name;
      out.push({ authorId: c.id, topic: 'social_drama', triggerKey: aff >= 48 ? 'drama_support' : 'drama_shade', triggerLabel: aff >= 48 ? `High affinity with ${other.name}` : `Low affinity tension with ${other.name}`, urgency: 45, isBigEvent: false, mentionHandle: h, vars: { ...vars, mention: h, name: other.name } });
    }
    if (simRand() < 0.22) {
      const tk = simPick(['take_prices', 'take_ceo_gap', 'take_taxes', 'take_low_pay', 'take_rent', 'take_city']);
      out.push({ authorId: c.id, topic: 'opinions', triggerKey: tk, triggerLabel: 'City opinion', urgency: 30, isBigEvent: false, vars });
    }
    out.push(...collectCitizenExtraTriggers({ c, companies, mart, officialCompanyIds, day, totalDays, hasRecentTheft, vars }));
    const dailyKey = c.stress > 62 ? 'tired' : c.mood > 72 ? 'small_joy' : simPick(['routine', 'meal', 'bored']);
    out.push({ authorId: c.id, topic: 'daily_life', triggerKey: dailyKey, triggerLabel: 'Daily city routine', urgency: 24, isBigEvent: false, vars });
  }
  return out;
}

export function getCompanyNameMap(companies: Company[]): Record<CompanyId, Company> {
  return Object.fromEntries(companies.map((c) => [c.id, c])) as Record<CompanyId, Company>;
}
