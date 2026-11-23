// chatSlots.ts — Resolve message templates against current simulation state
import type { CompanyBoardState } from './boardTypes';
import type { ChatGroupState } from './chatGroups';
import type { ChatTopic } from './chatTypes';
import { DAYS_PER_MONTH } from './constants';
import type { SimClock } from './eventFactory';
import { formatDelta } from './formatters';
import { simPick } from './rng';
import type { CityState, Citizen } from './types';

export interface ChatSlotContext { speaker: Citizen; group: ChatGroupState; city: CityState; board: CompanyBoardState; clock: SimClock; trigger: ChatTopic; }

const firstName = (citizen?: Citizen | null) => citizen?.name?.trim().split(/\s+/)[0] || '';
const humanize = (value: number) => Number.isFinite(value) ? formatDelta(Math.round(value)) : 'an unclear amount';

export function fillSlots(template: string, ctx: ChatSlotContext): string {
  const { citizens, companies, events, vacancies } = ctx.city;
  const company = companies.find((item) => item.id === 'vijindustries');
  const ceo = citizens.find((citizen) => citizen.id === company?.ceoId);
  const colleagues = citizens.filter((citizen) => citizen.id !== ctx.speaker.id && citizen.alive);
  const randomColleague = colleagues.length ? simPick(colleagues) : undefined;
  const departed = citizens.find((citizen) => !ctx.group.memberIds.includes(citizen.id) && citizen.workHistory.some((entry) => entry.companyId === 'vijindustries'));
  const manager = citizens.find((citizen) => citizen.employerId === 'vijindustries' && citizen.roleLevel === 'Manager');
  const executive = citizens.find((citizen) => citizen.employerId === 'vijindustries' && citizen.roleLevel === 'Executive');
  const cutPct = ctx.speaker.roleLevel === 'CEO' || ctx.speaker.roleLevel === 'Executive' ? ctx.board.executivePayCutPct : ctx.board.companyPayCutPct;
  const salaryAfter = Math.max(0, ctx.speaker.lastGrossPay);
  const salaryBefore = cutPct > 0 && cutPct < 100 ? salaryAfter / (1 - cutPct / 100) : salaryAfter;
  const monthlyBurn = company ? company.monthlyPayrollCost + company.monthlyOtherCost + company.monthlyBusinessTax : 0;
  const runwayMonths = monthlyBurn > 0 && company ? company.cash / monthlyBurn : 0;
  const lastBoardEvent = [...events].reverse().find((event) => event.type === 'board' && event.totalDay <= ctx.clock.totalDays);
  const examplePrice = randomColleague
    ? Object.entries(randomColleague.lastPaidPrices).find(([, price]) => price > 0)
    : undefined;
  const nextVacancy = vacancies.filter((vacancy) => vacancy.companyId === 'vijindustries').sort((a, b) => a.openedDay - b.openedDay)[0];
  const daysToRent = Math.max(0, DAYS_PER_MONTH - ctx.clock.day);
  const daysSinceMeeting = Math.max(0, ctx.clock.totalDays - ctx.board.lastMeetingDay);
  const values: Record<string, string> = {
    ceoFullName: ceo?.name || '', ceoFirstName: firstName(ceo), ceoMention: ceo ? `@${firstName(ceo)}` : '',
    managerFirstName: firstName(manager), execFirstName: firstName(executive),
    selfFirstName: firstName(ctx.speaker), selfFullName: ctx.speaker.name || '', targetFirstName: firstName(randomColleague),
    spamUncleFirstName: firstName(citizens.find((citizen) => citizen.id === ctx.group.spamUncleId)),
    newlyJoinedName: firstName(citizens.find((citizen) => !ctx.group.membersEverJoined.includes(citizen.id) && citizen.employerId === 'vijindustries')),
    departedName: firstName(departed), memberCount: String(ctx.group.memberIds.length),
    shortAmount: humanize(Math.max(0, salaryBefore - salaryAfter)), salaryBefore: humanize(salaryBefore), salaryAfter: humanize(salaryAfter),
    payCutPct: `${Math.round(cutPct)}%`, daysToRent: String(daysToRent),
    runway: `${Math.max(0, runwayMonths).toFixed(1)} months`, cash: humanize(company?.cash ?? 0),
    reputation: `${Math.round(company?.reputation ?? 0)}/100`, headcount: String(ctx.group.memberIds.length),
    lastMeetingDays: ctx.board.lastMeetingDay > 0 ? String(daysSinceMeeting) : 'since the group began',
    boardVoteOutcome: lastBoardEvent?.detail || lastBoardEvent?.title || 'no confirmed vote yet',
    martPriceExample: examplePrice ? `${examplePrice[0]} ${humanize(examplePrice[1])}` : 'no recent purchase price',
    pickRandomCitizenFirstName: firstName(randomColleague),
    upcomingEvent: nextVacancy ? `${nextVacancy.role} opening` : 'the next board update',
    monthsSinceLastRaise: String(Math.max(0, ctx.speaker.monthsSincePromotion)),
    daysSinceLastBoardMeeting: ctx.board.lastMeetingDay > 0 ? String(daysSinceMeeting) : 'no meeting yet',
  };
  return template.replace(/\{([A-Za-z0-9_]+)\}/g, (_match, key: string) => {
    const value = values[key]?.trim();
    if (value) return value;
    if (key.toLowerCase().includes('ceo')) return 'the CEO';
    if (key.toLowerCase().includes('name')) return 'a colleague';
    if (key.toLowerCase().includes('amount') || key.toLowerCase().includes('salary')) return 'an amount';
    return 'the current update';
  });
}
