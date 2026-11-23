// chatArchetypes.ts — Derive stable employee voices from live citizen traits
import type { Citizen } from './types';
import type { ArchetypeWeight, ChatArchetype } from './chatTypes';
import { simRand } from './rng';
const profile = (...items: [ChatArchetype, number][]): ArchetypeWeight[] => items.map(([archetype, weight]) => ({ archetype, weight }));
export function assignArchetypeProfile(c: Citizen): ArchetypeWeight[] {
  if (c.roleLevel === 'CEO') return profile(['ceo', 1]);
  if (c.roleLevel === 'Executive') return profile(['executive', .7], ['formal', .25], ['lurker', .05]);
  if (c.roleLevel === 'Manager') return profile(['formal', .65], ['warm', .2], ['lurker', .15]);
  const { sociability, discipline, kindness, loyalty, greed } = c.traits;
  const tenureMonths = Math.max(0, c.tenureMonths);
  if (sociability > 60 && discipline < 55) return profile(['loud', .7], ['sarcastic', .2], ['warm', .1]);
  if (c.stress > 55 || c.mood < 45) return profile(['anxious', .7], ['warm', .2], ['lurker', .1]);
  if (kindness > 60 && loyalty > 60) return profile(['warm', .7], ['anxious', .2], ['lurker', .1]);
  if (greed > 55 && sociability > 55) return profile(['sarcastic', .7], ['loud', .2], ['lurker', .1]);
  if (tenureMonths > 24) return profile(['veteran', .6], ['warm', .2], ['lurker', .2]);
  if (tenureMonths < 3) return profile(['newbie', .7], ['lurker', .2], ['warm', .1]);
  return profile(['lurker', .5], ['warm', .3], ['sarcastic', .2]);
}
export function pickArchetype(weights: ArchetypeWeight[]): ChatArchetype {
  const total = weights.reduce((sum, item) => sum + item.weight, 0);
  if (!total) return 'lurker';
  let target = simRand() * total;
  for (const item of weights) { target -= item.weight; if (target <= 0) return item.archetype; }
  return weights[weights.length - 1]?.archetype ?? 'lurker';
}
