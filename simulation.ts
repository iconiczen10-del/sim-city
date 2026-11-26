// simulation.ts — Whole-day cycle integrating seeded RNG, housing, Mart, board, and Sharity
import { runVijIndustriesBoardStep } from './boardEngine';
import type { BoardMeeting } from './boardTypes';
import { stepMoodWithBreakdown } from './citizenBreakdowns';
import { appendChangeExplanation, appendLifeLog } from './citizenLedger';
import { addCitizenMemory } from './citizenMemory';
import { recordMartRetailLedger, recordWholesaleLedgers } from './companyLedger';
import { DAYS_PER_MONTH, MONTHS_PER_YEAR } from './constants';
import { processCitizenDailySurvival } from './dailyCitizen';
import { stepElectricityDailyDemand } from './electricityDemand';
import { stepElectricityGridDaily } from './electricityGrid';
import { createInitialElectricityState } from './electricitySetup';
import { stepElectricityTappingDaily } from './electricityTapping';
import { makeCityEvent } from './eventFactory';
import { handleSurvivalDeathFamilyEffects, stepFamilyAndAgingDaily, stepFamilyAndAgingMonthEnd } from './familySimulationStep';
import { createInitialFamilyState } from './familyTreeEngine';
import { formatMonthYear, formatSimDate } from './formatters';
import { stepHousingDailyEffects } from './housingDaily';
import { stepHousingMarketDaily } from './housingMarket';
import { openVacancy } from './jobScoring';
import { processMartDayEnd, processMartDayStart } from './martEngine';
import { runCityMonthEnd } from './monthlyCycle';
import { getSimRngState, syncSimRng } from './rng';
import { stepSharityDay } from './sharityEngine';
import type { CityEvent, CityState, SimSpeed } from './types';

export function advanceSimulationDayWithBoard(prev: CityState, lastMeeting?: BoardMeeting, speed: SimSpeed = 1): { state: CityState; newMeeting: BoardMeeting | null } {
  syncSimRng(prev.rngState || prev.seed);
  let day = prev.day + 1, month = prev.month, year = prev.year;
  const totalDays = prev.totalDays + 1;
  if (day > DAYS_PER_MONTH) { day = 1; month += 1; if (month > MONTHS_PER_YEAR) { month = 1; year += 1; } }
  const clock = { totalDays, day, month, year };
  const dateLabel = formatSimDate(day, month, year);
  const newEvents: CityEvent[] = [];
  const takePeriodicSnapshot = day !== DAYS_PER_MONTH && totalDays % 5 === 0;
  const mart = structuredClone(prev.mart);
  const companies = structuredClone(prev.companies);
  const vacancies = structuredClone(prev.vacancies);
  const boardState = structuredClone(prev.boardState);
  const housing = structuredClone(prev.housing);
  const electricity = prev.electricity ? structuredClone(prev.electricity) : createInitialElectricityState(housing, prev.citizens);
  const sharity = {
    ...prev.sharity, profiles: structuredClone(prev.sharity.profiles), follows: structuredClone(prev.sharity.follows),
    affinities: day === DAYS_PER_MONTH ? { ...prev.sharity.affinities } : prev.sharity.affinities,
  };
  let jobEvents = [...prev.jobEvents];
  const vijMartComp = companies.find((co) => co.id === 'vijmart');
  const vijIndComp = companies.find((co) => co.id === 'vijindustries');
  if (vijMartComp) mart.cash = Math.max(0, vijMartComp.cash);
  processMartDayStart(mart, clock, newEvents);

  const family = prev.family ? structuredClone(prev.family) : createInitialFamilyState(prev.citizens);
  let treasury = prev.treasury, deathsToday = 0;
  const shortageMap = new Map<string, boolean>();
  let citizens = prev.citizens.map((orig) => (orig.alive ? structuredClone(orig) : orig));
  const cityDraft: CityState = { ...prev, day, month, year, totalDays, treasury, citizens, companies, vacancies, jobEvents, mart, boardState, sharity, housing, electricity, family };
  const homelessCount = stepHousingDailyEffects({ citizens, housing, sharity, clock, dateLabel, events: newEvents });

  for (const c of citizens) {
    if (!c.alive) continue;
    if (day === 1) c.monthlyLedger = [];
    if (c.roleLevel === 'Unemployed' && c.age >= 25) {
      c.unemployedDays += 1;
      if (c.unemployedDays >= 90 && c.skill > 6) c.skill = Math.round((c.skill - 0.15) * 10) / 10;
    } else c.unemployedDays = 0;
    const prevEmployer = c.employerId, prevRole = c.roleLevel;
    const res = processCitizenDailySurvival(c, mart, clock, dateLabel, newEvents, citizens, sharity);
    if (res.died) {
      deathsToday += 1;
      if (prevEmployer && prevRole !== 'Unemployed' && prevRole !== 'Retired') {
        const comp = companies.find((co) => co.id === prevEmployer);
        if (comp) openVacancy(vacancies, comp, prevRole, `${c.name} passed away`, clock, dateLabel);
      }
      c.employerId = null; c.bossId = null;
      treasury += handleSurvivalDeathFamilyEffects({ deceased: c, estate: res.estateToTreasury, city: cityDraft, clock, dateLabel, events: newEvents });
    }
    shortageMap.set(c.id, res.shortageToday);
  }
  stepFamilyAndAgingDaily({ city: cityDraft, clock, dateLabel, events: newEvents });
  citizens = cityDraft.citizens;
  treasury = stepHousingMarketDaily({ citizens, housing, sharity, treasury, clock, dateLabel, events: newEvents });
  stepElectricityDailyDemand({ electricity, housing, citizens, companies, clock, dateLabel });
  stepElectricityGridDaily({ electricity, housing, citizens, companies, clock, dateLabel, events: newEvents });
  stepElectricityTappingDaily({ electricity, housing, citizens, clock, dateLabel, events: newEvents });

  citizens = citizens.map((c) => {
    if (!c.alive) return c;
    const grief = (deathsToday > 0 ? deathsToday * (2 + ((c.traits.kindness + c.traits.sociability) / 200) * 4) : 0) + homelessCount * 0.5;
    if (deathsToday > 0 && c.traits.kindness + c.traits.sociability >= 90) {
      addCitizenMemory(c, clock, dateLabel, 'death', `Mourned ${deathsToday} citizen death(s) in Vij.`, -Math.min(45, 16 * deathsToday));
    }
    const netPay = c.lastGrossPay - c.lastTax;
    const moodRes = stepMoodWithBreakdown(c, netPay, Boolean(shortageMap.get(c.id)), mart.reputation, grief, clock, dateLabel, newEvents);
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

  recordMartRetailLedger(vijMartComp, mart.todayRevenue, mart.customersTodayIds.length, mart.cash, clock, dateLabel);
  let { tierMovementsThisMonth, lastMonthTaxCollected, lastTotalPayroll, lastBusinessTaxCollected } = prev;
  let nextVacancies = vacancies;

  if (day === DAYS_PER_MONTH) {
    const mr = runCityMonthEnd({ citizens, companies, vacancies: nextVacancies, jobEvents, treasury, mart, clock, events: newEvents, boardState, housing, sharity, electricity });
    citizens = mr.citizens; nextVacancies = mr.vacancies; jobEvents = mr.jobEvents; treasury = mr.treasury;
    tierMovementsThisMonth = mr.movements; lastMonthTaxCollected = mr.taxCollected; lastTotalPayroll = mr.totalPayroll; lastBusinessTaxCollected = mr.businessTaxCollected;
    cityDraft.citizens = citizens; cityDraft.vacancies = nextVacancies; cityDraft.jobEvents = jobEvents;
    treasury += stepFamilyAndAgingMonthEnd({ city: cityDraft, clock, dateLabel, events: newEvents });
  }

  const newMeeting = runVijIndustriesBoardStep({ companies, citizens, board: boardState, vacancies: nextVacancies, jobEvents, clock, dateLabel, events: newEvents, isMonthEnd: day === DAYS_PER_MONTH, lastMeeting });
  const outsideSupplierActive = Boolean(vijIndComp?.bankrupt);
  const spendBeforeOrdering = mart.monthlyWholesaleSpend;
  processMartDayEnd(mart, citizens, clock, dateLabel, newEvents, outsideSupplierActive);
  const wholesaleDelta = Math.max(0, mart.monthlyWholesaleSpend - spendBeforeOrdering);
  if (vijIndComp && !vijIndComp.bankrupt && wholesaleDelta > 0) {
    vijIndComp.cash = Math.round((vijIndComp.cash + wholesaleDelta) * 100) / 100;
    vijIndComp.monthlyRevenue = Math.round((vijIndComp.monthlyRevenue + wholesaleDelta) * 100) / 100;
  }
  recordWholesaleLedgers({ vijMart: vijMartComp, vijInd: vijIndComp, wholesaleDelta, martCash: mart.cash, outsideSupplierActive, clock, dateLabel });
  if (vijMartComp) vijMartComp.cash = mart.cash;
  stepSharityDay({
    sharity, citizens, companies, mart, vacancies: nextVacancies, dayEvents: [...newEvents], prevEvents: prev.events,
    events: newEvents, movements: day === DAYS_PER_MONTH ? tierMovementsThisMonth : [], clock, isMonthEnd: day === DAYS_PER_MONTH, speed,
  });

  return {
    newMeeting,
    state: {
      ...prev, rngState: getSimRngState(), day, month, year, totalDays, treasury, citizens, companies,
      vacancies: nextVacancies, jobEvents, mart, boardState, sharity, housing, electricity, family,
      events: [...newEvents.reverse(), ...prev.events].slice(0, 600),
      tierMovementsThisMonth, lastMonthTaxCollected, lastTotalPayroll, lastBusinessTaxCollected,
    },
  };
}
export function advanceSimulationDay(prev: CityState): CityState { return advanceSimulationDayWithBoard(prev).state; }
