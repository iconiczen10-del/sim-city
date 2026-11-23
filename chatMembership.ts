// chatMembership.ts — Keep group membership aligned with Vij employment
import { assignArchetypeProfile } from './chatArchetypes';
import type { ChatGroupState } from './chatGroups';
import type { ChatMessage, ChatTopic } from './chatTypes';
import type { SimClock } from './eventFactory';
import { makeSystemMessage } from './chatSystemMessages';
import type { CityState, Citizen } from './types';

export interface MembershipEvent {
  citizen: Citizen;
  kind: 'join' | 'rejoin' | 'leave' | 'fired' | 'quit' | 'layoff' | 'deceased';
}

export function computeMembershipDiff(prevMemberIds: string[], citizens: Citizen[]): MembershipEvent[] {
  const employed = citizens.filter((citizen) =>
    citizen.alive && citizen.employerId === 'vijindustries' && citizen.roleLevel !== 'Unemployed'
  );
  const currentIds = new Set(employed.map((citizen) => citizen.id));
  const previousIds = new Set(prevMemberIds);
  const events: MembershipEvent[] = employed
    .filter((citizen) => !previousIds.has(citizen.id))
    .map((citizen) => ({ citizen, kind: 'join' }));

  for (const id of prevMemberIds) {
    if (currentIds.has(id)) continue;
    const citizen = citizens.find((entry) => entry.id === id);
    if (!citizen) continue;
    events.push({ citizen, kind: membershipExitKind(citizen) });
  }
  return events;
}

function membershipExitKind(citizen: Citizen): MembershipEvent['kind'] {
  const lastVijRole = citizen.workHistory.find((entry) => entry.companyId === 'vijindustries');
  if (lastVijRole?.kind === 'quit') return 'quit';
  if (lastVijRole?.kind === 'fired') return 'fired';
  if (lastVijRole?.kind === 'layoff' || lastVijRole?.kind === 'bankrupt') return 'layoff';
  return citizen.alive ? 'leave' : 'deceased';
}

export function syncMembership(group: ChatGroupState, city: CityState, clock: SimClock): ChatMessage[] {
  const changes = computeMembershipDiff(group.memberIds, city.citizens);
  const messages = changes.map(({ citizen, kind }) => {
    const systemKind = kind === 'join' && group.membersEverJoined.includes(citizen.id) ? 'rejoin' : kind;
    return makeSystemMessage(systemKind, { name: citizen.name, id: citizen.id }, clock);
  });
  const current = city.citizens.filter((citizen) =>
    citizen.alive && citizen.employerId === 'vijindustries' && citizen.roleLevel !== 'Unemployed'
  );

  for (const citizen of current) {
    if (!group.membersEverJoined.includes(citizen.id)) group.membersEverJoined.push(citizen.id);
    if (!group.archetypeProfiles[citizen.id]) {
      group.archetypeProfiles[citizen.id] = assignArchetypeProfile(citizen);
    }
  }
  group.memberIds = current.map((citizen) => citizen.id);

  const company = city.companies.find((entry) => entry.id === 'vijindustries');
  if (company?.ceoId !== group.lastKnownCeoId) {
    const ceo = city.citizens.find((citizen) => citizen.id === company?.ceoId);
    if (ceo) messages.push(makeSystemMessage('ceo_change', { name: ceo.name, id: ceo.id }, clock));
    group.lastKnownCeoId = company?.ceoId ?? null;
  }
  if (!group.spamUncleId) {
    group.spamUncleId = current.find((citizen) =>
      citizen.age >= 45 && citizen.traits.discipline > 55 && citizen.traits.ambition < 60
    )?.id ?? null;
  }
  if (company?.bankrupt && !group.archived) {
    messages.push(makeSystemMessage('archived', {}, clock));
    group.archived = true;
  }
  group.triggerHistory = group.triggerHistory.filter((entry) => clock.totalDays - entry.day < 365);
  return messages;
}

export function recordTrigger(group: ChatGroupState, topic: ChatTopic, day: number): void {
  group.triggerHistory.push({ topic, day });
  group.triggerHistory = group.triggerHistory.filter((entry) => day - entry.day < 365);
}
