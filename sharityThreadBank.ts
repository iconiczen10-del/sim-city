// sharityThreadBank.ts — Reply, argument escalation/de-escalation, friend defense, and share note templates

import { simPick } from './rng';

export const POSTER_THANK_LINES = [
  'Appreciate you saying that, {target}. Means a lot right now.',
  'Thanks {target} — good having steady people in my corner.',
  'Needed that today, {target}. Wishing you a solid week ahead.',
  'Thank you {target}. Trying to keep moving forward one step at a time.',
];

export const POSTER_DEFEND_LINES = [
  'Hold on {target}, look at the full context before jumping to conclusions.',
  'Wait a second {target} — my post was about what actually hit our floor.',
  'Fair to question it {target}, though you did not see the numbers we saw.',
  'Hear you {target}, still standing by what I wrote.',
];

export const POSTER_SNAP_LINES = [
  'Stay out of my mentions if you have nothing honest to add, {target}.',
  'Easy talking loud from across town, {target}. Check your own desk first.',
  'Do not twist my words into drama, {target}. Nobody asked for your spin.',
  'Rich coming from you, {target}. Everyone remembers how you handled last month.',
];

export const ESCALATE_LINES = [
  'Oh, so now we are pretending you did nothing wrong, {target}? Unreal.',
  'Keep talking {target} — every reply just proves my exact point.',
  'Do not lecture me about standards, {target}, when half the street knows better.',
  'Drop the polite act, {target}. Say what you actually mean.',
  'Amazing how fast {target} dodges straight facts whenever it gets uncomfortable.',
];

export const DEESCALATE_LINES = [
  'Alright {target}, let us cool it down — we are neighbors at the end of the day.',
  'Fair enough, {target}. Maybe both of us are running hot from a rough week.',
  'Not worth turning this whole thread sideways, {target}. Leaving it here.',
  'Hear your side, {target}. Let us agree to disagree and move on.',
  'Stepping back from arguing here, {target}. Wishing everyone a calmer week.',
];

export const FRIEND_INTERVENE_LINES = [
  'Stepping in for {ally} here — {target}, you are way out of line on this.',
  'Back off {target}. I work near {ally} and that take is completely unfair.',
  'Can vouch for {ally} all month long, {target}. Find someone else to target.',
  '{ally} has had everyone’s back when things got tight, {target}. Give it a rest.',
];

export const SHARE_NOTE_LINES = [
  'Everyone across Vij needs to read what {author} posted here.',
  'Passing this along so folks see what is happening.',
  'Worth checking this update from {author}.',
  'Sharing this — too many neighbors miss it otherwise.',
  'Important look at how things are moving right now.',
];

export function renderThreadLine(pool: string[], targetHandle: string, allyHandle: string | undefined, used: Set<string>): string {
  const rendered = pool
    .map((t) => t.replaceAll('{target}', targetHandle).replaceAll('{ally}', allyHandle ?? targetHandle))
    .filter((line) => !used.has(line));
  let picked = rendered.length ? simPick(rendered) : `${targetHandle}, standing by my previous reply.`;
  let n = 2;
  while (used.has(picked)) {
    picked = `${targetHandle}, noting this again for the thread (#${n}).`;
    n += 1;
  }
  used.add(picked);
  return picked;
}
