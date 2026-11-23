// chatTones.ts — Small deterministic voice variations for generated messages
import type { ChatVariant } from './chatTypes';
import type { Citizen } from './types';
import { simRand, simRandInt } from './rng';

export function applyTone(text: string, speaker: Citizen, _variant: ChatVariant): string {
  if (speaker.stress >= 70 && simRand() < 0.15) return text.toUpperCase();

  const hasBasicEducation = speaker.education === 'none' || speaker.education === 'school';
  if (hasBasicEducation && text.length > 2 && simRand() < 0.12) {
    const index = simRandInt(0, text.length - 2);
    return text.slice(0, index) + text[index + 1] + text[index] + text.slice(index + 2);
  }

  if (speaker.traits.discipline < 40 && simRand() < 0.2) return text.toLowerCase();
  return text;
}
