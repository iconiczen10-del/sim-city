// electricityDemand.ts — Daily house/company electricity demand, NPC modifiers, appliances, ±8% noise, and spikes

import type { Company, CompanyId } from './companyTypes';
import {
  COMPANY_BASE_DAILY_UNITS, EVENING_PEAK_MULT, getSeasonDemandMult, getSeasonFromMonth, HOUSE_BASE_DAILY_UNITS,
} from './electricityCatalog';
import { createEmptyElectricLedger } from './electricityCatalog';
import { computeElectronicsDraw } from './electricityStats';
import type { ElectricLedger, ElectricityState } from './electricityTypes';
import type { SimClock } from './eventFactory';
import type { HousingState } from './housingTypes';
import { simPick, simRand, simRandFloat, simRandInt } from './rng';
import type { Citizen } from './types';

const SPIKE_REASONS = [
  { reason: 'Guests staying overnight', extra: [3, 6], days: [2, 4] },
  { reason: 'Heavy AC cooling spell', extra: [4, 8], days: [2, 5] },
  { reason: 'Cold snap electric heater', extra: [4, 7], days: [2, 4] },
  { reason: 'Home work & equipment crunch', extra: [2, 5], days: [2, 4] },
  { reason: 'Faulty appliance surge', extra: [3, 6], days: [1, 3] },
] as const;

function maybeStepSpikes(ledger: ElectricLedger, occCount: number, clock: SimClock, hasPower: boolean): number {
  ledger.activeSpikes = ledger.activeSpikes.filter((s) => clock.totalDays <= s.endDay);
  if (hasPower && occCount > 0 && ledger.activeSpikes.length === 0 && simRand() < 0.022) {
    const pick = simPick(SPIKE_REASONS);
    const dur = simRandInt(pick.days[0], pick.days[1]);
    const spike = {
      id: `spk_${clock.totalDays}_${simRandInt(10, 999)}`,
      startDay: clock.totalDays,
      endDay: clock.totalDays + dur - 1,
      extraUnitsPerDay: simRandInt(pick.extra[0], pick.extra[1]),
      reason: pick.reason,
    };
    ledger.activeSpikes.push(spike);
    ledger.spikeHistory = [spike, ...ledger.spikeHistory].slice(0, 16);
  }
  return ledger.activeSpikes.reduce((s, sp) => s + sp.extraUnitsPerDay, 0);
}

export function stepElectricityDailyDemand(params: {
  electricity: ElectricityState;
  housing: HousingState;
  citizens: Citizen[];
  companies: Company[];
  clock: SimClock;
  dateLabel: string;
}): { houseUnits: Map<string, number>; companyUnits: Map<CompanyId, number> } {
  const { electricity, housing, citizens, companies, clock, dateLabel } = params;
  const byId = new Map(citizens.map((c) => [c.id, c]));
  const season = getSeasonFromMonth(clock.month);
  const seasonMult = getSeasonDemandMult(season);
  const summerCoolingMult = season === 'Summer' ? (simRand() < 0.22 ? 1.52 : 1.05) : 1.0;
  const isWeekend = clock.day % 7 === 6 || clock.day % 7 === 0;
  const houseUnits = new Map<string, number>();
  const companyUnits = new Map<CompanyId, number>();
  const shortDate = `${clock.day} ${dateLabel.split(' ')[1]?.replace(',', '') ?? ''}`;
  let totalCity = 0;

  for (const h of housing.houses) {
    if (!h.electricLedger) h.electricLedger = createEmptyElectricLedger();
    const ledger = h.electricLedger;
    if (clock.day === 1) ledger.monthUnits = 0;
    const occ = h.occupantIds.map((id) => byId.get(id)).filter((c): c is Citizen => Boolean(c && c.alive));
    const districtCut = electricity.manualCutDistricts.includes(h.district);
    if (h.condemned || ledger.powerCut || districtCut || occ.length === 0) {
      ledger.todayUnits = 0;
      ledger.blackedOutToday = districtCut || ledger.powerCut;
      ledger.dailyUnitsHistory = [...ledger.dailyUnitsHistory.slice(-59), { day: clock.totalDays, label: shortDate, units: 0 }];
      houseUnits.set(h.id, 0);
      continue;
    }

    const base = HOUSE_BASE_DAILY_UNITS[h.type];
    const profileMult = h.usageProfile?.profileMult ?? 1;
    const avgStress = occ.reduce((s, c) => s + c.stress, 0) / occ.length;
    const avgMood = occ.reduce((s, c) => s + c.mood, 0) / occ.length;
    const avgIncome = occ.reduce((s, c) => s + c.lastGrossPay, 0) / occ.length;
    const avgThrift = occ.reduce((s, c) => s + c.traits.thriftiness, 0) / occ.length;
    const avgNeat = occ.reduce((s, c) => s + c.traits.neatness, 0) / occ.length;
    const hasIll = occ.some((c) => (c.healthProfile?.illnessDaysLeft ?? 0) > 0);

    let npcMod = 1.0;
    if (avgStress > 60 || avgMood < 42) npcMod += 0.1;
    if (hasIll) npcMod += 0.12;
    if (avgIncome > 2500) npcMod += 0.14;
    if (avgThrift > 65) npcMod -= 0.14;
    if (avgNeat > 68) npcMod += 0.05;
    npcMod *= isWeekend ? 1.1 : 0.96;

    const occFactor = 1.0 + Math.max(0, occ.length - 1) * 0.16;
    const elecLoad = computeElectronicsDraw(occ, season);
    const spikeExtra = maybeStepSpikes(ledger, occ.length, clock, true);
    const noise = simRandFloat(0.92, 1.08);
    const units = Math.round(
      Math.max(1.5, (base * occFactor * profileMult * npcMod * seasonMult * summerCoolingMult + elecLoad) * noise + spikeExtra) * 10
    ) / 10;

    ledger.todayUnits = units;
    ledger.monthUnits = Math.round((ledger.monthUnits + units) * 10) / 10;
    ledger.blackedOutToday = false;
    ledger.dailyUnitsHistory = [...ledger.dailyUnitsHistory.slice(-59), { day: clock.totalDays, label: shortDate, units }];
    houseUnits.set(h.id, units);
    totalCity += units;
  }

  for (const comp of companies) {
    if (!electricity.companyLedgers[comp.id]) electricity.companyLedgers[comp.id] = createEmptyElectricLedger();
    const cLedger = electricity.companyLedgers[comp.id];
    if (clock.day === 1) cLedger.monthUnits = 0;
    const manualCut = electricity.manualCutCompanies.includes(comp.id);
    if (comp.bankrupt || cLedger.powerCut || manualCut) {
      cLedger.todayUnits = 0;
      cLedger.blackedOutToday = manualCut || cLedger.powerCut;
      cLedger.dailyUnitsHistory = [...cLedger.dailyUnitsHistory.slice(-59), { day: clock.totalDays, label: shortDate, units: 0 }];
      companyUnits.set(comp.id, 0);
      continue;
    }
    const base = COMPANY_BASE_DAILY_UNITS[comp.id];
    const mult = electricity.companyProfiles[comp.id]?.profileMult ?? 1;
    const wknd = isWeekend && comp.id !== 'vijmart' && comp.id !== 'gjelectricity' ? 0.85 : 1.04;
    const units = Math.round(base * mult * seasonMult * summerCoolingMult * wknd * simRandFloat(0.92, 1.08) * 10) / 10;
    cLedger.todayUnits = units;
    cLedger.monthUnits = Math.round((cLedger.monthUnits + units) * 10) / 10;
    cLedger.blackedOutToday = false;
    cLedger.dailyUnitsHistory = [...cLedger.dailyUnitsHistory.slice(-59), { day: clock.totalDays, label: shortDate, units }];
    companyUnits.set(comp.id, units);
    totalCity += units;
  }

  electricity.todayCityUnits = Math.round(totalCity * 10) / 10;
  electricity.todayPeakDemandPerHour = Math.round(((totalCity / 24) * EVENING_PEAK_MULT) * 10) / 10;
  return { houseUnits, companyUnits };
}
