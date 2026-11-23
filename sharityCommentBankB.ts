// sharityCommentBankB.ts — Sharp/critical comment templates and contextual thread renderer avoiding duplicate lines

import type { Company } from './companyTypes';
import { simPick } from './rng';
import { COMMENT_TEMPLATES_A } from './sharityCommentBankA';
import type { SharityCommentType } from './sharityReactionTypes';
import type { SharityPost, SharityState } from './sharityTypes';
import type { Citizen } from './types';

export const COMMENT_TEMPLATES_B: Partial<Record<SharityCommentType, string[]>> = {
  disagreement: [
    'Not quite seeing {subject} the same way, {author} — the full numbers tell a calmer story.',
    'Think that misses context on {subject}, {author}. Margins at {company} are tighter than folks assume.',
    'Hard disagree here, {author}. Blaming everything on {subject} skips real costs.',
    'That take on {subject} sounds easy from the outside, {author}, not when payroll clears.',
    'Wait, {author} — framing {subject} like that leaves out half of what actually happened.',
  ],
  shade: [
    'Funny hearing {author} lecture everyone about {subject} given how quiet they stayed last month.',
    'Sure, {author}, {subject} sounds noble once you leave out your own side of the story.',
    'Interesting timing for {author} to bring up {subject} right after payday.',
    'Some people turn {subject} into a stage play every single month, right {author}?',
    'Oh look, {author} discovered {subject} again — right on schedule for attention.',
  ],
  question: [
    'Wait {author}, how did {subject} play out with {company} leadership afterward?',
    'Serious question {author}: did {subject} hit everyone on your floor or just a few seats?',
    'How much did {subject} actually run you out of pocket, {author}?',
    'Do you think {subject} eases up next month, {author}, or is this the new normal?',
    'Anyone else seeing {subject} today too, or mostly around {author}’s block?',
  ],
  envy: [
    'Must be nice casually posting about {subject} when half of town is rationing {item}, {author}.',
    'Must feel great flaunting {subject} while Entry desks scrape by for rent, {author}.',
    'Funny how easy {subject} looks from a comfortable cushion, {author}.',
    'Read the room before flexing {subject} right now, {author}. People are skipping meals.',
    'Not all of us get cushioned landings for {subject}, {author}.',
  ],
  defense: [
    'Leave {author} some grace here — anyone dealing with {company} and {subject} did what they could.',
    'Easy piling on {author}, yet {company} kept jobs afloat through rough {subject}.',
    'Defending {author} on this: {subject} hit without warning and they handled it straight.',
    'Wait before attacking {author} over {subject} — look at their actual track record.',
    'People jump fast on {author}, but {subject} was out of their hands.',
  ],
  callout: [
    'Say the whole truth about {subject}, {author} — folks on the floor saw what really went down.',
    'Cannot let {author} rewrite {subject} like nobody remembers last week at {company}.',
    'You pushed for this exact mess around {subject}, {author}. Own your share.',
    'Stop spinning {subject} for sympathy, {author}. Everyone checks the same ledger.',
    'Calling this out straight, {author}: {subject} happened because shortcuts were taken.',
  ],
};

const SUBJECT_MAP: Record<string, string> = {
  hired: 'the new role', promoted: 'this promotion', laid_off: 'these layoffs', fired: 'the dismissal',
  pay_cut: 'the pay cut', late_pay: 'partial payroll', broke: 'tight cash', payday: 'payday',
  stockout: 'empty shelves', price_shock: 'Vij Mart prices', rationing: 'purchase rationing',
  contamination: 'the spoiled batch', mart_closed: 'Vij Mart closing', rent_arrears: 'rent arrears',
  tier_up: 'moving up a tier', savings_flex: 'savings reserves', city_death: 'this city loss',
  city_bankrupt: 'company bankruptcy', take_prices: 'rising prices', take_low_pay: 'entry pay',
  take_ceo_gap: 'executive pay gaps', nat_fire: 'the warehouse fire', nat_theft: 'recent thefts',
};

export function renderCommentText(params: {
  type: SharityCommentType;
  post: SharityPost;
  sharity: SharityState;
  viewer: Citizen;
  companies: Company[];
  usedInThread: Set<string>;
}): string {
  const { type, post, sharity, companies, usedInThread } = params;
  const pool = [...(COMMENT_TEMPLATES_A[type] ?? []), ...(COMMENT_TEMPLATES_B[type] ?? [])];
  const compMatch = companies.find((co) => post.text.includes(co.name) || post.authorId === co.id);
  const authorCit = sharity.profiles[post.authorId];
  const vars: Record<string, string> = {
    author: authorCit?.handle ?? post.handle,
    company: compMatch?.name ?? 'Vij Industries',
    subject: SUBJECT_MAP[post.triggerKey] ?? (post.why.trigger.toLowerCase().replace(/^official [^:]+:\s*/i, '').slice(0, 34) || 'this'),
    item: /water|clothes|household/.exec(post.text)?.[0] ?? 'food',
    amount: /∆[\d,]+/.exec(post.text)?.[0] ?? '∆500',
  };
  const candidates = pool.map((tpl) => {
    let s = tpl;
    for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, v);
    return s;
  }).filter((line) => !usedInThread.has(line));

  let picked = candidates.length > 0 ? simPick(candidates) : '';
  if (!picked || usedInThread.has(picked)) {
    const extras = [
      `${vars.author}, still thinking about ${vars.subject} around ${vars.company}.`,
      `Worth watching how ${vars.subject} plays out for folks like ${vars.author}.`,
      `Keeping an eye on ${vars.subject} after seeing ${vars.author} bring it up.`,
    ];
    picked = extras.find((e) => !usedInThread.has(e)) ?? `${vars.author}, same view on ${vars.subject}.`;
    let n = 2;
    while (usedInThread.has(picked)) {
      picked = `${vars.author}, watching ${vars.subject} closely (#${n}).`;
      n += 1;
    }
  }
  usedInThread.add(picked);
  return picked;
}
