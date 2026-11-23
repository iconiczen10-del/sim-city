// chatEngine.ts — Generate and retain live Vij Industries group conversations
import { createChatMessage } from './chatMessageFactory';
import type { ChatGroupState } from './chatGroups';
import { computePhases } from './chatPhase';
import { recordTrigger, syncMembership } from './chatMembership';
import { buildSeedHistory } from './chatSeedHistory';
import { collectDailyTriggers, triggerPriority } from './chatSignals';
import { retainChatMessages } from './chatRetention';
import type { ChatMessage, ChatTopic } from './chatTypes';
import type { SimClock } from './eventFactory';
import { simRand } from './rng';
import type { CityState, Citizen } from './types';

const employees = (city: CityState, group: ChatGroupState) => city.citizens.filter((citizen) =>
  citizen.alive && group.memberIds.includes(citizen.id)
);

function anxiousEmployees(members: Citizen[], group: ChatGroupState): Citizen[] {
  return members.filter((member) =>
    (group.archetypeProfiles[member.id] ?? []).some((weight) => weight.archetype === 'anxious')
  );
}

export function generateChatMessages(group: ChatGroupState, city: CityState, clock: SimClock): ChatMessage[] {
  if (group.archived) return [];
  const messages = syncMembership(group, city, clock);
  if (group.archived) {
    retainChatMessages(group, messages, clock.totalDays);
    return messages;
  }

  messages.push(...buildSeedHistory(group, city, clock));
  const members = employees(city, group);
  const triggers = collectDailyTriggers(group, city, clock);
  const silenceDay = clock.totalDays % 10 !== 0 && simRand() < 0.11;
  if (silenceDay) group.lastSilenceDay = clock.totalDays;

  const dailyTriggers = [...triggers]
    .sort((left, right) => triggerPriority(left) - triggerPriority(right))
    .slice(0, 1);
  if (!silenceDay) {
    for (const topic of dailyTriggers) recordTrigger(group, topic, clock.totalDays);
  }
  group.phase = computePhases(group, clock);

  const usedIds = new Set<string>();
  const time = { day: clock.totalDays, minute: 9 * 60 + Math.floor(simRand() * 500) };
  const todayMessages: ChatMessage[] = [];
  const forwardDay = clock.totalDays % 10 === 0 && Boolean(group.spamUncleId);
  const regularLimit = forwardDay ? 2 : 3;
  const regularMembers = forwardDay
    ? members.filter((member) => member.id !== group.spamUncleId)
    : members;
  let lastText = messages.at(-1)?.text ?? group.messages[0]?.text;

  const emit = (topic: ChatTopic, count: number, pool: Citizen[] = regularMembers) => {
    for (let index = 0; index < count && todayMessages.length < regularLimit; index += 1) {
      const lastSpeakerId = messages.at(-1)?.speakerId ?? group.messages[0]?.speakerId ?? null;
      const message = createChatMessage({
        group,
        city,
        clock,
        topic,
        pool,
        lastSpeakerId,
        usedIds,
        time,
      });
      if (!message || message.text === lastText) continue;
      messages.push(message);
      todayMessages.push(message);
      lastText = message.text;
    }
  };

  if (members.length && !silenceDay) {
    if (dailyTriggers.length) {
      const topic = dailyTriggers[0];
      const anxiousPool = anxiousEmployees(regularMembers, group);
      const pool = (topic === 'payroll' || topic === 'layoffs') && anxiousPool.length ? anxiousPool : regularMembers;
      emit(topic, 2 + Math.floor(simRand() * 3), pool);
    } else {
      emit('general', 2);
    }
    if (simRand() < 0.3) {
      const idleMembers = regularMembers.filter((member) =>
        (group.archetypeProfiles[member.id] ?? []).some((weight) =>
          weight.archetype === 'lurker' || weight.archetype === 'warm'
        )
      );
      emit('general', Math.floor(simRand() * 3), idleMembers);
    }
    if (forwardDay) emitForwardedMessage(group, city, clock, members, usedIds, time, messages, todayMessages, lastText);
  }

  updateVibe(group, todayMessages);
  retainChatMessages(group, messages, clock.totalDays);
  return messages;
}

function emitForwardedMessage(
  group: ChatGroupState,
  city: CityState,
  clock: SimClock,
  members: Citizen[],
  usedIds: Set<string>,
  time: { day: number; minute: number },
  messages: ChatMessage[],
  todayMessages: ChatMessage[],
  lastText: string | undefined,
): void {
  const uncle = members.find((member) => member.id === group.spamUncleId);
  if (!uncle || todayMessages.length >= 3) return;
  const lastSpeakerId = messages.at(-1)?.speakerId ?? group.messages[0]?.speakerId ?? null;
  const message = createChatMessage({
    group, city, clock, topic: 'general', pool: [uncle], lastSpeakerId, usedIds, time,
  });
  if (!message || message.text === lastText) return;
  message.act = 'forwarded';
  message.isForwarded = { forwardCount: 1 };
  message.text = message.text.replace(/^Forwarded\s*\n*/i, '');
  messages.push(message);
  todayMessages.push(message);
  group.lastForwardedDay = clock.totalDays;
}

function updateVibe(group: ChatGroupState, messages: ChatMessage[]): void {
  const sentiment = messages.reduce((score, message) => {
    if (message.act === 'support' || message.act === 'joke') return score + 1;
    if (message.act === 'grievance' || message.act === 'menace' || message.act === 'rant') return score - 1;
    return score;
  }, 0) / Math.max(1, messages.length);
  const dailySignal = Math.max(-40, Math.min(40, sentiment * 32));
  group.vibeScore = Math.max(-100, Math.min(100, Math.round(group.vibeScore * 0.82 + dailySignal * 0.18)));
}

export function generateVijIndustriesChatDay(params: {
  city: CityState;
  company: CityState['companies'][number];
  clock: SimClock;
  events: CityState['events'];
}): { newMessages: ChatMessage[] } {
  return {
    newMessages: generateChatMessages(params.city.chatGroups.vijindustries, params.city, params.clock),
  };
}
