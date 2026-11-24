// sharityTemplateEngine.ts — Voice picker, writing style formatter, 14-day anti-repeat, and template composition

import { simPick, simRand } from './rng';
import { CAREER_MONEY_BANK, type VoiceTemplates } from './sharityBankCareerMoney';
import { CITY_SOCIAL_BANK } from './sharityBankCitySocial';
import { EXTRA_TOPIC_BANK, TRIGGER_HASHTAGS, VOICE_PREFIXES } from './sharityBankExtra';
import { MART_HOUSING_BANK } from './sharityBankMartHousing';
import { MORE_TOPIC_BANK, VOICE_CLOSERS } from './sharityBankMore';
import { UTILITY_SHARITY_BANK } from './sharityBankUtility';
import type { SharitySentiment, SharityState, SharityTopicId, SharityVoice } from './sharityTypes';
import type { Citizen } from './types';

const COMBINED_BANK: Record<string, VoiceTemplates> = {
  ...CAREER_MONEY_BANK,
  ...MART_HOUSING_BANK,
  ...CITY_SOCIAL_BANK,
  ...EXTRA_TOPIC_BANK,
  ...MORE_TOPIC_BANK,
  ...UTILITY_SHARITY_BANK,
};

const NEG_TRIGGERS = new Set([
  'laid_off', 'fired', 'pay_cut', 'late_pay', 'bad_boss', 'broke', 'stockout', 'price_shock',
  'rationing', 'contamination', 'mart_closed', 'rent_arrears', 'hungry_thirsty', 'sick_close_call',
  'drama_shade', 'city_bankrupt', 'city_mass_layoff', 'city_death', 'take_prices', 'take_ceo_gap',
  'take_taxes', 'take_low_pay', 'take_rent', 'nat_fire', 'nat_theft', 'nat_flood', 'nat_poisoning',
  'nat_power_cut', 'nat_price_jump', 'crime_theft', 'crime_suspicion', 'crime_neighbor',
  'job_loss_hardship', 'savings_gone', 'illness_hardship', 'grief_death', 'close_call', 'std_downgrade',
  'power_cut_notice', 'summer_blackout', 'appliance_broken',
]);

export function chooseCitizenVoice(
  c: Citizen,
  triggerKey: string
): { voice: SharityVoice; sentiment: SharitySentiment; reason: string } {
  const neg = NEG_TRIGGERS.has(triggerKey);
  const em = c.emotions;
  if (neg) {
    if ((em?.anger?.value ?? 0) >= 35 || (c.stress >= 72 && c.mood < 38)) return { voice: 'angry', sentiment: 'negative', reason: (em?.anger?.value ?? 0) >= 35 ? 'Elevated anger sharpened tone' : 'High stress and low mood sharpened tone' };
    if (c.traits.greed >= 65 && c.traits.kindness < 45) return { voice: 'bitter', sentiment: 'negative', reason: 'High greed and low kindness leaned bitter' };
    if ((em?.loneliness?.value ?? 0) >= 38 || c.mood < 50 || c.stress >= 52) return { voice: 'anxious', sentiment: 'negative', reason: (em?.loneliness?.value ?? 0) >= 38 ? 'Loneliness drove connection-seeking tone' : 'Elevated stress drove anxious framing' };
    if (c.traits.kindness >= 68) return { voice: 'kind', sentiment: 'negative', reason: 'High kindness softened reaction toward community' };
    if (c.traits.sociability >= 65 && simRand() < 0.35) return { voice: 'funny', sentiment: 'neutral', reason: 'Sociable personality used dry humor' };
    return { voice: 'bitter', sentiment: 'negative', reason: 'Negative trigger shaped skeptical tone' };
  }
  if ((em?.gratitude?.value ?? 0) >= 32) return { voice: 'kind', sentiment: 'positive', reason: 'Strong gratitude colored supportive post' };
  if ((triggerKey === 'tier_up' || triggerKey === 'savings_flex' || triggerKey === 'luxury_std' || triggerKey === 'big_purchase' || triggerKey === 'promoted') && (c.traits.ambition >= 64 || c.traits.greed >= 60)) {
    return { voice: 'show_off', sentiment: 'positive', reason: 'High ambition/greed highlighted status win' };
  }
  if (c.traits.kindness >= 65) return { voice: 'kind', sentiment: 'positive', reason: 'High kindness produced supportive tone' };
  if (c.traits.discipline >= 68 && c.tier !== 'T1') return { voice: 'humble', sentiment: 'positive', reason: 'High discipline grounded the milestone humbly' };
  if (c.traits.sociability >= 68 && c.mood >= 55 && simRand() < 0.45) return { voice: 'funny', sentiment: 'positive', reason: 'Upbeat sociability added light humor' };
  if (c.mood >= 62 || triggerKey === 'hired' || triggerKey === 'study_goal' || triggerKey === 'recovering') {
    return { voice: 'hopeful', sentiment: 'positive', reason: 'Constructive mood created hopeful outlook' };
  }
  return { voice: 'neutral', sentiment: 'neutral', reason: 'Balanced mood and traits favored plain tone' };
}

function pickHashtags(c: Citizen, topic: SharityTopicId, triggerKey: string): string[] {
  const usesTags = c.traits.sociability >= 54 || c.age <= 34 || c.traits.ambition >= 72;
  if (!usesTags || simRand() > (c.traits.sociability >= 70 ? 0.65 : 0.38)) return [];
  const list = TRIGGER_HASHTAGS[triggerKey] ?? [`#${topic.replace(/_/g, '')}`];
  return list.slice(0, simRand() < 0.45 ? 2 : 1);
}

export function renderCitizenTemplate(params: {
  citizen: Citizen;
  topic: SharityTopicId;
  triggerKey: string;
  voice: SharityVoice;
  vars: Record<string, string>;
  sharity: SharityState;
  totalDays: number;
}): { text: string; hashtags: string[]; templateId: string; styleNote: string } {
  const { citizen, topic, triggerKey, voice, vars, sharity, totalDays } = params;
  const bank = COMBINED_BANK[triggerKey] ?? COMBINED_BANK.routine;
  const pool = bank[voice]?.length ? bank[voice]! : bank.default;
  const recentSet = new Set((sharity.recentTexts ?? []).filter((r) => totalDays - r.day <= 14).map((r) => r.text));
  const usedMap = sharity.authorLastTemplateDay?.[citizen.id] ?? {};

  const ordered = pool.map((tpl, i) => ({ tpl, id: `${triggerKey}_${voice}_${i}` })).sort((a, b) => (usedMap[a.id] ?? -99) - (usedMap[b.id] ?? -99));
  let chosen = ordered[0];
  let finalText = '';

  for (const cand of ordered) {
    let body = cand.tpl;
    for (const [k, v] of Object.entries(vars)) body = body.replaceAll(`{${k}}`, v);
    const lowEdu = citizen.education === 'none' || citizen.education === 'school';
    const highStress = citizen.stress >= 68;
    if (!lowEdu && !highStress && simRand() < 0.35 && VOICE_PREFIXES[voice]?.length) {
      body = `${simPick(VOICE_PREFIXES[voice]!)} ${body[0].toLowerCase()}${body.slice(1)}`;
    }
    const closers = VOICE_CLOSERS[voice];
    if (closers?.length && !highStress && simRand() < 0.3) {
      const c = simPick(closers);
      if (c) body = `${body} ${c}`;
    }
    if (lowEdu && highStress) body = body.replace(/\.$/, '').toLowerCase();
    else if (highStress && simRand() < 0.45) body = body.split('.')[0] + '.';
    if (!recentSet.has(body)) { chosen = cand; finalText = body; break; }
  }

  if (!finalText) {
    const altPool = Object.values(bank).flat().filter((t): t is string => Boolean(t));
    for (const alt of altPool) {
      let body = alt;
      for (const [k, v] of Object.entries(vars)) body = body.replaceAll(`{${k}}`, v);
      if (!recentSet.has(body)) { finalText = body; break; }
    }
  }
  if (!finalText) {
    finalText = ordered[0].tpl;
    for (const [k, v] of Object.entries(vars)) finalText = finalText.replaceAll(`{${k}}`, v);
    if (recentSet.has(finalText)) finalText = `${finalText} — Day ${totalDays}`;
  }
  const hashtags = pickHashtags(citizen, topic, triggerKey);
  const styleNote = `${citizen.education} edu · stress ${Math.round(citizen.stress)} · age ${citizen.age} · ${hashtags.length ? `${hashtags.length} tag(s)` : 'no hashtags'}`;
  return { text: finalText.trim(), hashtags, templateId: chosen.id, styleNote };
}
