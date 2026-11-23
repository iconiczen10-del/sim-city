// chatSignals.ts — Map city events and employee voices to chat topics and acts
import type { ChatGroupState } from './chatGroups';
import type { ChatAct, ChatArchetype, ChatTopic } from './chatTypes';
import type { SimClock } from './eventFactory';
import { simPick, simRand } from './rng';
import type { CityState } from './types';

const topicPriorities: Partial<Record<ChatTopic, number>> = {
  layoffs: 0,
  payroll: 1,
  board: 2,
  leavings: 3,
  hiring: 4,
  ceo: 5,
  executives: 6,
  vijtech_poaching: 7,
  export_orders: 8,
  factory_floor: 9,
  vij_capital: 10,
  mart_prices: 11,
  office_politics: 12,
  policy: 13,
  general: 14,
};

export function topicFor(text: string): ChatTopic {
  const value = text.toLowerCase();
  if (/pay|salary|wage|payroll|bonus/.test(value)) return 'payroll';
  if (/board|vote|meeting|director/.test(value)) return 'board';
  if (/layoff|redundan|cut staff/.test(value)) return 'layoffs';
  if (/ceo|chief executive/.test(value)) return 'ceo';
  if (/executive|cfo|cto/.test(value)) return 'executives';
  if (/export|order|client/.test(value)) return 'export_orders';
  if (/factory|production|shift|floor/.test(value)) return 'factory_floor';
  if (/mart|price|sharity/.test(value)) return 'mart_prices';
  if (/vijtech|poach/.test(value)) return 'vijtech_poaching';
  if (/vij capital|capital/.test(value)) return 'vij_capital';
  if (/hire|vacan|recruit/.test(value)) return 'hiring';
  if (/quit|resign|leave|fired|bankrupt/.test(value)) return 'leavings';
  if (/policy|rule|office/.test(value)) return 'policy';
  return 'general';
}

export function collectDailyTriggers(group: ChatGroupState, city: CityState, clock: SimClock): Set<ChatTopic> {
  const events = city.events.filter((event) => event.totalDay === clock.totalDays);
  const triggers = new Set(events.map((event) => topicFor(`${event.type} ${event.title} ${event.detail}`)));
  const dateLabel = events[0]?.dateLabel;
  const jobEvents = city.jobEvents.filter((event) =>
    event.companyId === 'vijindustries' && event.dateLabel === dateLabel
  );
  if (jobEvents.some((event) => event.kind === 'hired')) triggers.add('hiring');
  if (jobEvents.some((event) => event.kind === 'layoff' || event.kind === 'fired')) triggers.add('layoffs');
  if (jobEvents.some((event) => event.kind === 'quit')) triggers.add('leavings');

  const lastCeoMention = group.triggerHistory.filter((entry) => entry.topic === 'ceo').at(-1)?.day ?? 0;
  if (clock.totalDays - lastCeoMention > 3) triggers.add('ceo');
  if (clock.day === 1) triggers.add('payroll');
  if (clock.totalDays % 10 === 0 && group.spamUncleId) triggers.add('general');
  return triggers;
}

export function triggerPriority(topic: ChatTopic): number {
  return topicPriorities[topic] ?? 15;
}

export function actFor(topic: ChatTopic, archetype: ChatArchetype): ChatAct {
  if (archetype === 'formal' || archetype === 'executive' || archetype === 'ceo') {
    const formalTopics = ['payroll', 'board', 'layoffs', 'policy', 'hiring', 'general'];
    if (formalTopics.includes(topic) && simRand() < 0.55) return 'announcement';
    if (topic === 'board' || topic === 'ceo') return 'reflection';
  }
  if (archetype === 'anxious') {
    if (topic === 'payroll' || topic === 'layoffs') {
      return simRand() < 0.85 ? 'grievance' : simPick(['question', 'rant', 'aside']);
    }
    if (topic === 'mart_prices' || topic === 'board' || topic === 'ceo') {
      return simPick(['grievance', 'question', 'aside']);
    }
  }
  if (archetype === 'warm' && simRand() < 0.45) return 'support';
  if ((archetype === 'loud' || archetype === 'sarcastic') && (topic === 'general' || topic === 'factory_floor') && simRand() < 0.4) return 'joke';
  if (topic === 'layoffs' && archetype === 'warm') return 'support';
  if (topic === 'board' || topic === 'ceo') return 'speculation';
  if (topic === 'general') return 'aside';
  return 'question';
}
