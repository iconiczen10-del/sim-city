// sharityBankMore.ts — Dedicated variants for hardship, crime conflict, low pay takes, ambition, and close calls

import type { VoiceTemplates } from './sharityBankCareerMoney';

export const MORE_TOPIC_BANK: Record<string, VoiceTemplates> = {
  apply_better: {
    hopeful: ['Sent out applications for a higher seat today. Ready for a real step forward.', 'Aiming higher this month — applying where hard skills get valued.'],
    bitter: ['Quietly polishing my resume while watching mediocre bosses fail upward.', 'Time to apply elsewhere before another year slips by in the same seat.'],
    default: ['Applying for stronger openings across Vij this week.', 'Keeping eyes open for better roles that match my experience.'],
  },
  take_low_pay: {
    angry: ['Entry wages barely cover rice, water, and a shared room anymore.', 'How do companies call full-time wages fair when rent eats two-thirds of it?'],
    bitter: ['Working thirty days for Entry pay feels like walking uphill on ice.', 'Base wages across town lag way behind the cost of living.'],
    default: ['Wages feel stretched thin against rising monthly living costs.', 'Entry pay needs room to breathe when store prices jump.'],
  },
  crime_suspicion: {
    anxious: ['Neighbors locking doors before dusk after recent thefts. Tension is thick.', 'Everyone keeps watching who walks down the alley with bags lately.'],
    bitter: ['Hard not to feel suspicious when goods vanish and nobody saw a thing.', 'Rumors flying all over the block since the theft happened.'],
    default: ['Folks on the street still trying to figure out who took missing supplies.', 'Suspicion lingering around the neighborhood after recent losses.'],
  },
  crime_neighbor: {
    angry: ['Caught someone snooping near storage crates tonight. Keep your eyes open.', 'Confrontations on the block getting sharper since thefts started.'],
    default: ['Neighbors arguing near the market lane over missing household stock.', 'High tension on the block tonight after another missing-item report.'],
  },
  job_loss_hardship: {
    anxious: ['Hardest part of losing a job is the quiet morning with nowhere to clock in.', 'Trying to keep routine alive after losing my seat at {company}.'],
    bitter: ['Worse than the lost paycheck is feeling discarded after months of loyalty.', 'Days feel twice as heavy without steady work to anchor them.'],
    default: ['Adjusting to life off the roster is tougher than expected.', 'Taking the job loss one day at a time while resetting.'],
  },
  savings_gone: {
    anxious: ['Watching hard-earned savings vanish down to zero hurts deeply.', 'Started from nothing, saved carefully, and one bad stretch wiped it out.'],
    default: ['Savings completely wiped out after this stretch. Rebuilding from scratch.', 'Tough watching every reserve coin disappear this month.'],
  },
  illness_hardship: {
    humble: ['Being sick while worrying about rent tests every ounce of patience.', 'Hoping for strength back soon — hard losing productive days to illness.'],
    default: ['Long bout of illness taking a toll on mood and work.', 'Exhausted from fighting off sickness this week.'],
  },
  close_call: {
    humble: ['Came far too close to collapsing from exhaustion and empty cupboards. Grateful to still be standing.', 'Scary health wake-up call today. Putting basics first from now on.'],
    anxious: ['That close call scared me badly. Cannot let food or water slip that low again.', 'Barely pulled through a rough health drop today.'],
    default: ['Serious close call with health today — resting and rebuilding carefully.', 'Glad that health scare passed; focusing on steady recovery now.'],
  },
  goal_celebrate: {
    hopeful: ['Hit a personal savings target today! Feels good seeing discipline work.', 'Celebrating hitting {amount} saved — proof that slow habits compound.'],
    show_off: ['Target crushed: {amount} in reserves and climbing fast.', 'Another personal milestone checked off right on schedule.'],
    default: ['Celebrated reaching a personal goal of {amount} tonight.', 'Small celebration tonight after hitting a long-awaited milestone.'],
  },
  tenure_celebrate: {
    kind: ['Proud to celebrate {days} days of growth and good teammates at {company}.', 'Grateful for another milestone year alongside great coworkers at {company}.'],
    default: ['Marking a proud career milestone with {company} today.', 'Celebrating steady tenure and loyal work at {company}.'],
  },
};

export const VOICE_CLOSERS: Record<string, string[]> = {
  humble: ['Taking it step by step.', 'One day at a time.', 'Staying grounded.'],
  show_off: ['Watch this space.', 'Levels above.', 'Keep up.'],
  bitter: ['Same story every month.', 'Nothing changes.', 'Typical.'],
  kind: ['Take care of each other.', 'Wishing everyone steady days.', 'Look out for your neighbors.'],
  funny: ['Send tea.', 'Anyway, back to reality.', 'Could be worse.'],
  anxious: ['Hope tomorrow eases up.', 'Trying to stay steady.', 'Fingers crossed.'],
  angry: ['Enough already.', 'Something has to change.', 'Unbelievable.'],
  hopeful: ['Better days ahead.', 'Keeping faith in the work.', 'Onward.'],
  neutral: ['', ''],
};
