// simulation.ts — Whole-day cycle integrating seeded RNG, bankrupt supplier fallback, and board meetings

import { runVijIndustriesBoardStep } from './boardEngine';
import type { BoardMeeting } from './boardTypes';
import { stepMoodWithBreakdown } from './citizenBreakdowns';
import { appendChangeExplanation, appendLifeLog } from './citizenLedger';
import { addCitizenMemory } from './citizenMemory';
import { DAYS_PER_MONTH, MONTHS_PER_YEAR } from './constants';
import { processCitizenDailySurvival } from './dailyCitizen';
import { makeCityEvent } from './eventFactory';
import { formatMonthYear, formatSimDate } from './formatters';
import { openVacancy } from './jobScoring';
import { processMartDayEnd, processMartDayStart } from './martEngine';
import { runCityMonthEnd } from './monthlyCycle';
import { getSimRngState, syncSimRng } from './rng';
import type { CityEvent, CityState } from './types';

export function advanceSimulationDayWithBoard(
  prev: CityState,
  lastMeeting?: BoardMeeting
): { state: CityState; newMeeting: BoardMeeting | null } {
  syncSimRng(prev.rngState || prev.seed);

  let day = prev.day + 1;
  let month = prev.month;
  let year = prev.year;
  const totalDays = prev.totalDays + 1;

  if (day > DAYS_PER_MONTH) {
    day = 1;
    month += 1;
    if (month > MONTHS_PER_YEAR) { month = 1; year += 1; }
  }

  const clock = { totalDays, day, month, year };
  const dateLabel = formatSimDate(day, month, year);
  const newEvents: CityEvent[] = [];
  const takePeriodicSnapshot = day !== DAYS_PER_MONTH && totalDays % 5 === 0;
  const resetMonthlyLedger = day === 1;

  const mart = structuredClone(prev.mart);
  const companies = structuredClone(prev.companies);
  const vacancies = structuredClone(prev.vacancies);
  const boardState = structuredClone(prev.boardState);
  let jobEvents = [...prev.jobEvents];

  const vijMartComp = companies.find((co) => co.id === 'vijmart');
  const vijIndComp = companies.find((co) => co.id === 'vijindustries');
  if (vijMartComp) mart.cash = Math.max(0, vijMartComp.cash);

  processMartDayStart(mart, clock, newEvents);

  let treasury = prev.treasury;
  let deathsToday = 0;
  const shortageMap = new Map<string, boolean>();

  let citizens = prev.citizens.map((orig) => {
    if (!orig.alive) return orig;
    const c = structuredClone(orig);
    if (resetMonthlyLedger) c.monthlyLedger = [];
    if (c.roleLevel === 'Unemployed') {
      c.unemployedDays += 1;
      if (c.unemployedDays >= 90 && c.skill > 6) c.skill = Math.round((c.skill - 0.15) * 10) / 10;
    } else c.unemployedDays = 0;

    const res = processCitizenDailySurvival(c, mart, clock, dateLabel, newEvents);
    treasury += res.estateToTreasury;
    if (res.died) {
      deathsToday += 1;
      if (orig.employerId && orig.roleLevel !== 'Unemployed') {
        const comp = companies.find((co) => co.id === orig.employerId);
        if (comp) openVacancy(vacancies, comp, orig.roleLevel, `${orig.name} passed away`, clock, dateLabel);
      }
      c.employerId = null; c.bossId = null;
    }
    shortageMap.set(c.id, res.shortageToday);
    return c;
  });

  citizens = citizens.map((c) => {
    if (!c.alive) return c;
    const grief = deathsToday > 0 ? deathsToday * (2 + ((c.traits.kindness + c.traits.sociability) / 200) * 4) : 0;
    if (deathsToday > 0 && c.traits.kindness + c.traits.sociability >= 90) {
      addCitizenMemory(c, clock, dateLabel, 'death', `Mourned ${deathsToday} citizen death(s) in Vij.`, -Math.min(45, 16 * deathsToday));
    }
    const netPay = c.lastGrossPay - c.lastTax;
    const moodRes = stepMoodWithBreakdown(c, netPay, Boolean(shortageMap.get(c.id)), mart.reputation, grief);
    const nextMood = moodRes.mood;
    if ((nextMood < 25 && !c.moodCrashed) || (c.mood - nextMood >= 8 && nextMood < 35)) {
      appendChangeExplanation(c, totalDays, dateLabel, 'mood_drop', `Mood fell ${Math.round(c.mood)} → ${Math.round(nextMood)} (stress ${Math.round(c.stress)}/100).`, c.decisions[0]?.id);
      newEvents.push(makeCityEvent(clock, `mood_${c.id}`, { type: 'mood', citizenId: c.id, citizenName: c.name, title: 'Mood Crash', detail: `${c.name}'s mood dropped to ${Math.round(nextMood)}/100.` }));
    }
    if (totalDays % 3 === 0 || Math.abs(nextMood - c.mood) >= 6 || c.stress >= 70) {
      appendLifeLog(c, totalDays, dateLabel, 'mood', `Felt mood ${Math.round(nextMood)}/100, stress ${Math.round(c.stress)}/100.`);
    }
    const history = takePeriodicSnapshot
      ? [...c.history.slice(-59), { totalDay: totalDays, label: `D${day} ${formatMonthYear(month, year)}`, savings: c.savings, mood: nextMood, statusScore: c.statusScore }]
      : c.history;
    return { ...c, mood: nextMood, moodBreakdown: moodRes.breakdown, moodCrashed: nextMood < 25, history };
  });

  let { tierMovementsThisMonth, lastMonthTaxCollected, lastTotalPayroll, lastBusinessTaxCollected } = prev;
  let nextVacancies = vacancies;

  if (day === DAYS_PER_MONTH) {
    const monthResult = runCityMonthEnd({ citizens, companies, vacancies, jobEvents, treasury, mart, clock, events: newEvents, boardState });
    citizens = monthResult.citizens;
    nextVacancies = monthResult.vacancies;
    jobEvents = monthResult.jobEvents;
    treasury = monthResult.treasury;
    tierMovementsThisMonth = monthResult.movements;
    lastMonthTaxCollected = monthResult.taxCollected;
    lastTotalPayroll = monthResult.totalPayroll;
    lastBusinessTaxCollected = monthResult.businessTaxCollected;
  }

  const newMeeting = runVijIndustriesBoardStep({
    companies, citizens, board: boardState, vacancies: nextVacancies, jobEvents,
    clock, dateLabel, events: newEvents, isMonthEnd: day === DAYS_PER_MONTH, lastMeeting,
  });

  const outsideSupplierActive = Boolean(vijIndComp?.bankrupt);
  const spendBeforeOrdering = mart.monthlyWholesaleSpend;
  processMartDayEnd(mart, citizens, clock, dateLabel, newEvents, outsideSupplierActive);
  const wholesaleDelta = Math.max(0, mart.monthlyWholesaleSpend - spendBeforeOrdering);
  if (vijIndComp && !vijIndComp.bankrupt && wholesaleDelta > 0) {
    vijIndComp.cash = Math.round((vijIndComp.cash + wholesaleDelta) * 100) / 100;
    vijIndComp.monthlyRevenue = Math.round((vijIndComp.monthlyRevenue + wholesaleDelta) * 100) / 100;
  }
  if (vijMartComp) vijMartComp.cash = mart.cash;

  return {
    newMeeting,
    state: {
      ...prev, rngState: getSimRngState(), day, month, year, totalDays, treasury, citizens, companies,
      vacancies: nextVacancies, jobEvents, mart, boardState,
      events: [...newEvents.reverse(), ...prev.events].slice(0, 600),
      tierMovementsThisMonth, lastMonthTaxCollected, lastTotalPayroll, lastBusinessTaxCollected,
    },
  };
}

export function advanceSimulationDay(prev: CityState): CityState {
  return advanceSimulationDayWithBoard(prev).state;
}
