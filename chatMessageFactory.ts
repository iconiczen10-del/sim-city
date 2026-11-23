// chatMessageFactory.ts — Create a single employee message from a selected voice and template
import { pickArchetype } from './chatArchetypes';
import type { ChatGroupState } from './chatGroups';
import { pickVariant, recordVariantUse } from './chatAntiRepeat';
import { applyTone } from './chatTones';
import { getChatVariants } from './chatMessageBank';
import { fillSlots } from './chatSlots';
import type { ChatMessage, ChatTopic } from './chatTypes';
import type { SimClock } from './eventFactory';
import { simPick, simRand } from './rng';
import type { CityState, Citizen } from './types';
import { actFor } from './chatSignals';

interface CreateChatMessageParams {
  group: ChatGroupState;
  city: CityState;
  clock: SimClock;
  topic: ChatTopic;
  pool: Citizen[];
  lastSpeakerId: string | null;
  usedIds: Set<string>;
  time: { day: number; minute: number };
}

export function createChatMessage({
  group,
  city,
  clock,
  topic,
  pool,
  lastSpeakerId,
  usedIds,
  time,
}: CreateChatMessageParams): ChatMessage | null {
  const available = pool.filter((citizen) =>
    !usedIds.has(citizen.id) && citizen.id !== lastSpeakerId
  );
  if (!available.length) return null;

  const speaker = simPick(available);
  usedIds.add(speaker.id);
  const archetype = pickArchetype(group.archetypeProfiles[speaker.id] ?? []);
  const act = actFor(topic, archetype);
  const cell = { act, topic, archetype, variants: getChatVariants(topic, archetype, act) };
  const variant = pickVariant(cell, speaker.id, group.phase[topic], group);
  if (!variant) return null;

  const messageDay = time.day;
  const hour = Math.floor(time.minute / 60) % 24;
  const minute = time.minute % 60;
  const rawText = fillSlots(variant.text, {
    speaker,
    group,
    city,
    board: city.boardState,
    clock,
    trigger: topic,
  });
  recordVariantUse(variant.id, speaker.id, cell, group);
  time.minute += 2 + Math.floor(simRand() * 44);
  if (time.minute >= 1440) {
    time.day += Math.floor(time.minute / 1440);
    time.minute %= 1440;
  }

  return {
    id: `chat_${messageDay}_${hour}_${minute}_${speaker.id}_${variant.id}`,
    totalDay: messageDay,
    hour,
    minute,
    speakerId: speaker.id,
    speakerName: speaker.name,
    speakerRole: speaker.roleLevel,
    archetype,
    act,
    topic,
    text: applyTone(rawText, speaker, variant),
    variantId: variant.id,
    seenBy: Math.max(0, group.memberIds.length - 1),
    reactions: [],
  };
}
