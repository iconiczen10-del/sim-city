// sharityCommentBankA.ts — Contextual comment templates for support, congratulation, sympathy, offer_help, joke, and agreement

import type { SharityCommentType } from './sharityReactionTypes';

export const COMMENT_TEMPLATES_A: Partial<Record<SharityCommentType, string[]>> = {
  support: [
    'Backing you all the way on {subject}, {author}. Keep your head up.',
    'Respect for speaking plainly about {subject}, {author}. Folks notice real effort.',
    'With you on this {author} — {subject} takes grit, especially this month.',
    'Steady hands win long games, {author}. Rooting for you around {company}.',
    'Glad you shared this, {author}. More voices need to talk honestly about {subject}.',
  ],
  congratulation: [
    'Huge congratulations on {subject}, {author}! Well earned after all those shifts.',
    'Proud to see this milestone on {subject}, {author}. Nobody worked harder for it.',
    'Big cheers {author}! Seeing {subject} happen for you brightens the whole week.',
    'Well deserved, {author} — {subject} was only a matter of time at {company}.',
    'Congratulations {author}! Here is to steady growth after {subject}.',
  ],
  sympathy: [
    'Really sorry hearing about {subject}, {author}. Hope tomorrow eases up on you.',
    'Rough stretch with {subject}, {author}. Please do not shoulder it alone.',
    'Sending strength over {subject}, {author}. This city owes neighbors better support.',
    'Tough reading about {subject}, {author}. Wishing you steadier days very soon.',
    'Hate seeing {author} deal with {subject} right now. Hang in there.',
  ],
  offer_help: [
    'Hey {author}, if {subject} has you short on {item}, message me — I have extra stocked.',
    'Let me know if you need a hand sorting things out after {subject}, {author}.',
    'Seriously {author}, do not skip basics over {subject}. Happy to share {item} this week.',
    'If {company} stays slow after {subject}, {author}, ask around my floor — we can pass your name.',
    'Count on me if {subject} leaves a gap, {author}. Neighbors look out for neighbors.',
  ],
  joke: [
    '{author}, reading about {subject} makes me want to hide under a blanket until next payday.',
    'Wait until management schedules a meeting about {subject} with zero snacks, {author}.',
    'At this rate {subject} deserves its own line on our monthly bills, {author}.',
    'Only in Vij does {subject} turn into a full street debate before lunch, {author}.',
    'Checking my own pantry after reading {author} talk about {subject} — send tea.',
  ],
  agreement: [
    'Spot on, {author}. Anyone living through {subject} sees the exact same squeeze.',
    'Exactly this on {subject}. Thank you for saying what half the block has been thinking, {author}.',
    'Co-signed, {author}. Between rent and {item} prices, {subject} hits every worker.',
    'One hundred percent agreed on {subject}, {author}. Numbers do not lie.',
    'Truth right here from {author} — {subject} has needed fixing all season.',
  ],
};
