// chatSeedHistory.ts — A one-time, simulated origin story for the employee group
import { pickArchetype } from './chatArchetypes';
import type { ChatGroupState } from './chatGroups';
import type { ChatMessage } from './chatTypes';
import type { SimClock } from './eventFactory';
import { makeSystemMessage } from './chatSystemMessages';
import type { CityState, Citizen } from './types';

export function buildSeedHistory(group: ChatGroupState, city: CityState, clock: SimClock): ChatMessage[] {
  if (group.seedMessagesEmitted || clock.totalDays < 5) return [];
  group.seedMessagesEmitted = true;

  const employees = city.citizens.filter((citizen) =>
    citizen.alive && citizen.employerId === 'vijindustries' && citizen.roleLevel !== 'Unemployed'
  );
  if (!employees.length) return [];

  const manager = employees.find((citizen) => citizen.roleLevel === 'Manager') ?? employees[0];
  const uncle = employees.find((citizen) => citizen.id === group.spamUncleId) ?? employees[0];
  const day = Math.max(1, clock.totalDays - 4);
  const ceoName = city.citizens.find((citizen) => citizen.id === group.lastKnownCeoId)?.name ?? 'the CEO';
  const choose = (archetype: string) => employees.find((citizen) =>
    pickArchetype(group.archetypeProfiles[citizen.id] ?? []) === archetype
  ) ?? employees[0];
  const employeeMessage = (
    speaker: Citizen,
    totalDay: number,
    hour: number,
    minute: number,
    text: string,
    id: string,
  ): ChatMessage => ({
    id,
    totalDay,
    hour,
    minute,
    speakerId: speaker.id,
    speakerName: speaker.name,
    speakerRole: speaker.roleLevel,
    archetype: pickArchetype(group.archetypeProfiles[speaker.id] ?? []),
    act: 'announcement',
    topic: 'general',
    text,
    variantId: id,
    seenBy: 0,
    reactions: [],
  });

  const dayOne = { ...clock, totalDays: day };
  const messages = [
    { ...makeSystemMessage('group_created', { groupName: group.groupName }, dayOne), hour: 9, minute: 15 },
    { ...makeSystemMessage('members_added', { count: Math.max(0, employees.length - 1), adderName: ceoName }, dayOne), hour: 9, minute: 16 },
    employeeMessage(manager, day, 9, 17, 'Dear all, this group is for work-related communication. Please keep it professional.', `seed_${day}_manager`),
    employeeMessage(choose('loud'), day, 9, 18, 'hi', `seed_${day}_hi`),
    employeeMessage(choose('warm'), day, 9, 19, 'hello everyone', `seed_${day}_hello`),
    employeeMessage(choose('anxious'), day, 9, 22, 'hi all', `seed_${day}_anxious`),
    employeeMessage(choose('veteran'), day, 18, 40, 'finally no more email chains', `seed_${day}_email`),
    { ...employeeMessage(uncle, day + 1, 6, 12, 'Good morning 🌺🌺🌺', `seed_${day}_forward`), act: 'forwarded' as const, isForwarded: { forwardCount: 1 } },
    employeeMessage(choose('loud'), day + 2, 22, 44, 'anyone else still working', `seed_${day}_late`),
    employeeMessage(manager, day + 3, 9, 1, 'Reminder: timesheets due today by 6pm.', `seed_${day}_timesheet`),
    { ...makeSystemMessage('ceo_added', { name: ceoName }, dayOne), hour: 9, minute: 20 },
  ];
  return messages.sort((left, right) =>
    left.totalDay - right.totalDay || left.hour - right.hour || left.minute - right.minute
  );
}
