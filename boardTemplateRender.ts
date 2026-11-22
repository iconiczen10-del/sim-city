// boardTemplateRender.ts — Deterministic render-time composer and anti-repeat fragment picker

import { CLAIM_BANK } from './boardBankClaims';
import { CLOSER_BANK } from './boardBankClosers';
import { OPENER_BANK } from './boardBankOpeners';
import { PUSH_BANK } from './boardBankPushes';
import { THOUGHT_BANK } from './boardBankThoughts';
import { TOPIC_BANK } from './boardBankTopics';
import type {
  LineActId,
  MeetingTopicId,
  TranscriptLineRecord,
  TranscriptLineType,
  VoiceStyle,
} from './boardTypes';
import { createSeededRng } from './rng';
import type { Citizen } from './types';

export function pickCitizenVoice(c: Citizen): VoiceStyle {
  const { greed, kindness, discipline, ambition, sociability } = c.traits;
  if (c.stress >= 68 || (c.mood < 35 && discipline < 55)) return 'anxious';
  if (greed >= 72 && kindness < 45) return 'cold';
  if (kindness >= 68 && sociability >= 55) return 'warm';
  if (c.education === 'masters' || c.education === 'professional' || (discipline >= 72 && c.age >= 45)) return 'formal';
  if (kindness >= 60 && ambition >= 60) return 'idealistic';
  if (greed >= 60 && sociability >= 60 && c.mood < 58) return 'sarcastic';
  if (discipline < 45 && ambition >= 55) return 'evasive';
  return 'blunt';
}

export function pickWeightedFragmentId<T extends { id: string }>(
  pool: T[],
  speakerRing: string[],
  globalRing: string[],
  randFn: () => number
): string {
  if (pool.length === 0) return '';
  const sSet = new Set(speakerRing.slice(-30));
  const gSet = new Set(globalRing.slice(-100));
  const weights = pool.map((f) => {
    let w = 1;
    if (sSet.has(f.id)) w *= 0.04;
    if (gSet.has(f.id)) w *= 0.18;
    return w;
  });
  const total = weights.reduce((a, b) => a + b, 0);
  let r = randFn() * total;
  for (let i = 0; i < pool.length; i++) {
    r -= weights[i];
    if (r <= 0) return pool[i].id;
  }
  return pool[pool.length - 1].id;
}

export function selectFragmentCombo(params: {
  voice: VoiceStyle;
  lineType: TranscriptLineType;
  act: LineActId;
  topic: MeetingTopicId;
  speakerRing: string[];
  globalRing: string[];
  randFn: () => number;
}): { openerId: string; claimId: string; evidenceId: string; pushId: string; closerId: string } {
  const { voice, lineType, act, topic, speakerRing, globalRing, randFn } = params;
  const openers = OPENER_BANK.filter((f) => f.lineType === lineType && (f.voice === voice || f.voice === 'any'));
  const claims = lineType === 'thought'
    ? THOUGHT_BANK.filter((f) => f.act === act)
    : lineType === 'narration'
      ? PUSH_BANK.filter((f) => f.act === 'narration')
      : CLAIM_BANK.filter((f) => f.act === act);
  const topics = TOPIC_BANK.filter((f) => f.topic === topic);
  const pushes = PUSH_BANK.filter((f) => f.act === act);
  const closers = CLOSER_BANK.filter((f) => f.lineType === lineType && (f.voice === voice || f.voice === 'any'));

  const pick = <T extends { id: string }>(arr: T[], fallback: T[]) =>
    pickWeightedFragmentId(arr.length > 0 ? arr : fallback, speakerRing, globalRing, randFn);

  return {
    openerId: pick(openers, OPENER_BANK),
    claimId: pick(claims, CLAIM_BANK),
    evidenceId: pick(topics, TOPIC_BANK),
    pushId: pick(pushes, PUSH_BANK),
    closerId: pick(closers, CLOSER_BANK),
  };
}

function fillSlots(template: string, slots: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, k) => (slots[k] !== undefined ? String(slots[k]) : `{${k}}`));
}

const OPENER_MAP = new Map(OPENER_BANK.map((f) => [f.id, f.text]));
const CLAIM_MAP = new Map([...CLAIM_BANK, ...THOUGHT_BANK, ...PUSH_BANK].map((f) => [f.id, f.text]));
const TOPIC_MAP = new Map(TOPIC_BANK.map((f) => [f.id, f.text]));
const PUSH_MAP = new Map(PUSH_BANK.map((f) => [f.id, f.text]));
const CLOSER_MAP = new Map(CLOSER_BANK.map((f) => [f.id, f.text]));

export function renderTranscriptLine(line: TranscriptLineRecord): string {
  const r = createSeededRng(line.seed);
  const op = OPENER_MAP.get(line.openerId) ?? '';
  const cl = CLAIM_MAP.get(line.claimId) ?? '';
  const ev = TOPIC_MAP.get(line.evidenceId) ?? '';
  const pu = PUSH_MAP.get(line.pushId) ?? '';
  const kl = CLOSER_MAP.get(line.closerId) ?? '';

  if (line.lineType === 'narration') {
    const raw = r() < 0.55 ? `${op} ${pu} ${kl}` : `${op} ${pu}`;
    return fillSlots(raw.trim(), line.slots);
  }
  if (line.act === 'silence') {
    return fillSlots(cl, line.slots);
  }

  const includeEvidence = r() < (line.lineType === 'thought' ? 0.55 : 0.72);
  const includePush = r() < 0.78;
  const includeCloser = r() < (line.lineType === 'thought' ? 0.55 : 0.68);
  const parts = [op, cl];
  if (includeEvidence && ev) parts.push(ev);
  if (includePush && pu) parts.push(pu);
  if (includeCloser && kl) parts.push(kl);
  return fillSlots(parts.filter(Boolean).join(' '), line.slots);
}
