// sharityBankCareerMoney.ts — Citizen post templates for work_career, money, celebrations, and ambition

import type { SharityVoice } from './sharityTypes';

export type VoiceTemplates = Partial<Record<SharityVoice, string[]>> & { default: string[] };

export const CAREER_MONEY_BANK: Record<string, VoiceTemplates> = {
  hired: {
    humble: ['Just signed on as {role} at {company}. Grateful for the chance.', 'Starting work as {role} with {company}. Ready to learn fast.', 'Got a seat at {company} as {role}. Taking nothing for granted.'],
    show_off: ['{company} brought me in as {role}. Watch how fast this desk moves.', 'New title unlocked: {role} at {company}.', 'Off the market. {company} knew who to call for {role}.'],
    hopeful: ['First day ahead as {role} at {company}. Feeling hopeful again.', 'New chapter starting at {company} as {role}.', 'Finally back on a roster — {role} at {company}.'],
    default: ['Started a new role as {role} at {company}.', 'Joining {company} as {role} this week.', 'Onboarding at {company} today as {role}.'],
  },
  promoted: {
    humble: ['Stepped up to {role} at {company}. Thanks to {mention} and the floor.', 'Honored to move into {role} at {company}. Lots of work ahead.', 'Never expected {role} this soon at {company}. Back to work.'],
    show_off: ['Promoted to {role} at {company}. Effort always prints.', 'New rank: {role} at {company}, and already eyeing the next rung.', 'Called it months ago — {role} at {company} is official.'],
    kind: ['Promoted to {role} at {company}. Hope I can lift others alongside me.', 'Moving into {role} at {company} — grateful to {mention} for backing me.', 'Big step to {role} at {company}. Looking forward to helping the team.'],
    default: ['Stepping into {role} at {company} starting this month.', 'Moved up to {role} at {company}.', 'Official shift to {role} at {company}.'],
  },
  laid_off: {
    bitter: ['{company} cut my {role} seat today with zero severance. Loyal for nothing.', 'Turned up to work, walked out empty-handed. {company} calls that restructuring.', 'Years at {company} as {role}, and out the door in five minutes.'],
    anxious: ['Lost my {role} role at {company}. Not sure how next month bills look.', 'Laid off at {company}. Trying not to panic while checking savings.', 'Cut from {company} today. Have to stretch every coin from here.'],
    angry: ['Zero severance after {company} axed {role} roles. Absolute mess.', 'Management at {company} bled cash and fired the floor instead.', 'Done with {company}. They cut {role} workers to protect their own comfort.'],
    default: ['My {role} role at {company} ended in today’s layoffs.', 'No longer at {company} after cuts hit the floor.', 'Back on the job hunt after {company} trimmed seats.'],
  },
  fired: {
    bitter: ['{company} let me go from {role}. Funny how {boss} kept quiet until today.', 'Walked out of {company} after a one-sided review from {boss}.', 'Fired as {role} at {company}. Everyone picks favorites in this town.'],
    angry: ['{boss} wanted a scapegoat at {company} and picked me.', 'Done with {company} and {boss}. Better off finding a real workplace.', 'Dismissed from {company} without a fair hearing.'],
    default: ['Let go from {company} today. Back to looking for work.', 'My time as {role} at {company} ended today.', 'Out at {company}. Resetting and looking for a new start.'],
  },
  quit: {
    bitter: ['Walked away from {company}. Life is too short for that floor.', 'Handed in my notice as {role} at {company}. Enough was enough.', 'Left {company} behind today. Better to gamble on myself.'],
    hopeful: ['Quit {company} to chase better prospects. Ready for what comes next.', 'Moving on from {role} at {company}. Time for a fresh start.', 'Stepped away from {company} today with my head clear.'],
    default: ['Left my {role} job at {company}.', 'Resigned from {company} today.', 'Moving on from {company} to look for better ground.'],
  },
  pay_cut: {
    angry: ['{company} trimmed our pay while bills keep climbing. Hard to swallow.', 'Pay cut at {company}. Staff always pay first for bad numbers.', 'Taking home less at {company} for the same hours.'],
    anxious: ['Pay cut hit {company} today. Going to have to tighten food and rent plans.', 'Smaller paycheck ahead at {company}. Watching every single coin.', 'Pay cut at {company} makes next month’s rent look tight.'],
    humble: ['Tough pay cut at {company}, but if it keeps seats open we adapt.', 'Taking a pay trim at {company} to help keep the doors open.', 'Tighter pay at {company} this month. Staying steady.'],
    default: ['{company} enacted a pay cut across staff salaries.', 'Smaller paychecks coming at {company} until margins recover.', 'Pay reduced at {company} after rough recent numbers.'],
  },
  late_pay: {
    angry: ['{company} could not even cover full payroll on payday.', 'Worked thirty days at {company} for a partial check.', 'Shortchanged on payday at {company}. How are we supposed to pay rent?'],
    anxious: ['Partial payroll at {company} leaves me short with rent due.', 'Payday at {company} came in thin. Hope reserves hold.', 'Short check from {company}. Not a good sign for next month.'],
    default: ['{company} issued partial payroll today due to tight cash.', 'Payday came in below normal at {company}.', 'Short paycheck at {company} this month.'],
  },
  bad_boss: {
    bitter: ['Another long shift watching {boss} take credit and hand out blame.', 'Trying to work under {boss} at {company} takes the patience of stone.', 'If {boss} spoke less and listened once, {company} would run twice as smooth.'],
    funny: ['{boss} just held a twenty-minute speech about efficiency that solved nothing.', 'Survived another day of {boss} managing by guesswork at {company}.', 'Note to self: agree politely when {boss} reinvents the wheel.'],
    default: ['Tension on the floor with {boss} at {company} lately.', 'Hard week working under {boss} at {company}.', 'Morale dips whenever {boss} makes surprise changes.'],
  },
  job_hunting: {
    anxious: ['Day {days} without work. Checking every vacancy board before noon.', 'Unemployed for {days} days now. Just need one callback.', 'Watching openings at {company} and hoping something breaks soon.'],
    hopeful: ['Sending applications out again today. Something will stick.', 'Keeping skills sharp while looking for the next {role} opening.', 'Checking vacancies across Vij every morning. Staying ready.'],
    default: ['Still looking for steady work after {days} days off the roster.', 'Applying to open seats across the city this week.', 'Checking the job market daily for a solid fit.'],
  },
  payday: {
    funny: ['Payday hit and half of it already belongs to rent and {item}.', 'Rich for exactly four hours until monthly bills clear.', 'Payday mood: smiling before checking the tax line.'],
    humble: ['Payday cleared at {company} ({amount}). Putting most of it straight into savings.', 'Grateful for a full check of {amount} today.', 'Steady payday at {company}. Bills first, cushion second.'],
    show_off: ['Cleared {amount} this month at {company}. Hard work scales nicely.', 'Solid payday ({amount}) and reserves looking healthy.', 'Another strong month on the books as {role}.'],
    default: ['Monthly payday cleared: {amount} gross from {company}.', 'Payday settled today; keeping bills covered first.', 'Checked off payday and settled monthly essentials.'],
  },
  milestone: {
    humble: ['Quietly crossed {amount} in savings today. Took months of discipline.', 'Never thought I would hold {amount} in reserves. Slow and steady.', 'Hit {amount} saved. Breathing a little easier tonight.'],
    show_off: ['Passed {amount} in personal savings. Discipline pays dividends.', '{amount} stacked in the bank and still climbing.', 'Reached the {amount} savings mark ahead of schedule.'],
    default: ['Crossed {amount} in personal savings today.', 'Savings milestone reached: {amount}.', 'Hit {amount} in reserves after this month’s settlement.'],
  },
  broke: {
    anxious: ['Savings down to zero after monthly bills. Need a quiet month badly.', 'Almost nothing left in the pocket right now. Protecting food and water first.', 'Empty account tonight. One bad price jump away from trouble.'],
    bitter: ['Work all month and rent still eats the whole check.', 'Everything goes up except what stays in my pocket.', 'Zero left after bills. Tired of running in place.'],
    default: ['Money is stretched thin after bills cleared.', 'Down to bare cash reserves for food and water.', 'Tight cash week ahead after monthly expenses.'],
  },
  study_goal: {
    hopeful: ['Putting in extra hours to build skill toward a better seat.', 'Studying late and aiming for a promotion within a few months.', 'Working steadily to qualify for higher {role} openings.'],
    default: ['Focused on sharpening skills and pushing performance higher.', 'Working extra on craft this week to earn the next step up.', 'Setting higher targets for the quarter ahead.'],
  },
  promo_celebrate: {
    kind: ['Still smiling about moving up to {role}. Thank you {mention} for cheering me on.', 'Celebrating a hard-earned promotion at {company} tonight.', 'Grateful to everyone on the floor who made this step possible.'],
    default: ['Celebrating {role} at {company} and surviving a demanding month.', 'Taking a quiet moment to celebrate this milestone.', 'Glad to clear the month healthy and moving upward.'],
  },
  survive_month: {
    humble: ['Made it through another month with bills paid and pantry stocked.', 'Not fancy, just steady: rent paid, food stocked, debt-free.', 'Quiet relief clearing the month in the black.'],
    default: ['Cleared another month in Vij with bills covered.', 'End of month check-in: reserves intact and ready for next month.', 'Survived a choppy month with steady footing.'],
  },
};
