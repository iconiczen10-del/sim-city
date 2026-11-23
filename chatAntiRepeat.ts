// chatAntiRepeat.ts — Weighted template selection with bounded repetition memory
import type { ChatGroupState } from './chatGroups';
import type { ChatCell, ChatVariant } from './chatTypes';
import { simRand } from './rng';

const remember = (list: string[], id: string, max: number) =>
  [...list.filter((item) => item !== id), id].slice(-max);

export function pickVariant(
  cell: ChatCell,
  speakerId: string,
  phase: 1 | 2 | 3 | 4,
  group: ChatGroupState,
): ChatVariant | null {
  const variants = cell.variants.filter((variant) => !variant.minPhase || phase >= variant.minPhase);
  if (!variants.length) return null;

  const cellKey = `${cell.act}:${cell.topic}:${cell.archetype}`;
  const weights = variants.map((variant) => {
    let weight = variant.weight;
    if (group.rings.global.includes(variant.id)) weight *= 0.15;
    if ((group.rings.perSpeaker[speakerId] ?? []).includes(variant.id)) weight *= 0.05;
    if ((group.rings.perCell[cellKey] ?? []).includes(variant.id)) weight *= 0.08;
    if ((group.rings.perTopic[cell.topic] ?? []).includes(variant.id)) weight *= 0.2;
    return weight;
  });
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
  let target = simRand() * totalWeight;

  for (let index = 0; index < variants.length; index += 1) {
    target -= weights[index];
    if (target <= 0) return variants[index];
  }
  return variants[variants.length - 1] ?? null;
}

export function recordVariantUse(
  variantId: string,
  speakerId: string,
  cell: ChatCell,
  group: ChatGroupState,
): void {
  const cellKey = `${cell.act}:${cell.topic}:${cell.archetype}`;
  group.rings.global = remember(group.rings.global, variantId, 300);
  group.rings.perSpeaker[speakerId] = remember(group.rings.perSpeaker[speakerId] ?? [], variantId, 40);
  group.rings.perCell[cellKey] = remember(group.rings.perCell[cellKey] ?? [], variantId, 5);
  group.rings.perTopic[cell.topic] = remember(group.rings.perTopic[cell.topic] ?? [], variantId, 10);
}
