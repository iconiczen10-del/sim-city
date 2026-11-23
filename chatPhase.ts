// chatPhase.ts — Topic maturity follows the previous year of chat triggers
import type { ChatGroupState } from './chatGroups';
import type { ChatTopic } from './chatTypes';
import type { SimClock } from './eventFactory';

const topics: ChatTopic[] = [
  'payroll', 'board', 'layoffs', 'ceo', 'executives', 'export_orders',
  'factory_floor', 'mart_prices', 'vijtech_poaching', 'vij_capital',
  'office_politics', 'hiring', 'leavings', 'policy', 'general',
];

export function computePhases(group: ChatGroupState, clock: SimClock): Record<ChatTopic, 1 | 2 | 3 | 4> {
  const recent = group.triggerHistory.filter((entry) => clock.totalDays - entry.day < 365);
  const phases = topics.map((topic) => {
    const count = recent.filter((entry) => entry.topic === topic).length;
    const phase = count >= 16 ? 4 : count >= 8 ? 3 : count >= 3 ? 2 : 1;
    return [topic, phase];
  });
  return Object.fromEntries(phases) as Record<ChatTopic, 1 | 2 | 3 | 4>;
}

