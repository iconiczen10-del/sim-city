// sharityBankCitySocial.ts — Citizen post templates for daily_life, social_drama, city_mood, opinions, natural_events, crime, and loss

import type { VoiceTemplates } from './sharityBankCareerMoney';

export const CITY_SOCIAL_BANK: Record<string, VoiceTemplates> = {
  routine: {
    funny: ['Third cup of tea before nine and still staring at the wall.', 'Whole schedule today: walk, work, check @vijmart, repeat.', 'Tried sleeping early, ended up reorganizing the kitchen shelf at midnight.'],
    hopeful: ['Morning walk felt peaceful today. City looks steady when the sun hits early.', 'Good energy walking into the week. Small wins matter.', 'Taking a breath before errands — feeling optimistic about this month.'],
    neutral: ['Quiet morning across the block. Heading out for errands shortly.', 'Just another weekday routine in Vij.', 'Finished chores early and taking a slow evening at home.'],
    default: ['Wrapping up the day with a simple meal and quiet evening.', 'Long walk home after a steady shift.', 'Nothing dramatic today, and honestly that feels good.'],
  },
  tired: {
    anxious: ['Running on four hours of sleep and stress is sitting right behind my eyes.', 'Cannot seem to shake this exhaustion lately.', 'Long week wearing me down faster than usual.'],
    funny: ['If tiredness paid rent I would own half a mansion by now.', 'My pillow has been calling my name since noon.', 'Brain running at half speed today, forgive slow replies.'],
    default: ['Completely drained after today’s shift.', 'Long day. Going straight to sleep tonight.', 'Feeling worn thin this week; need a quiet rest day.'],
  },
  drama_support: {
    kind: ['Big respect to {mention} — always shows up when folks need a steady hand.', 'People talk fast around here, but {mention} actually backs up their team.', 'Grateful to have neighbors like {mention} around Vij.'],
    hopeful: ['Count me in backing {mention}. Good work speaks louder than gossip.', 'Shoutout to {mention} for handling a tough week with grace.'],
    default: ['Standing behind {mention} on this one — credit where it is due.', 'Not enough appreciation for what {mention} puts in every week.', 'Say what you want, {mention} kept things moving when it counted.'],
  },
  drama_shade: {
    bitter: ['Funny how {mention} talks about teamwork while grabbing every shortcut in sight.', 'Some people like {mention} only notice the floor when cameras or bosses walk by.', 'Quietly watching {mention} rewrite what actually happened last month.'],
    angry: ['Tired of hearing lectures from {mention} when they never carry the weight.', '{mention} keeps blaming everyone else for messes they started.', 'Maybe {mention} should check their own output before judging coworkers.'],
    funny: ['Always entertaining listening to {mention} explain hard work from a cushioned chair.', 'If confidence paid bills, {mention} would run Vij Capital by Tuesday.'],
    default: ['Not buying the story {mention} is telling around the office.', 'Interesting silence from {mention} now that numbers came out.', 'Let’s just say {mention} and I remember last week very differently.'],
  },
  city_bankrupt: {
    anxious: ['Seeing {company} collapse shakes the whole city. Nobody feels totally safe.', 'Bankruptcy at {company} leaves too many neighbors without a paycheck tonight.', 'When an employer like {company} goes under, everyone’s margin shrinks.'],
    angry: ['How did leadership let {company} run right into bankruptcy?!', 'Workers at {company} deserved honesty months before the locks went on.', 'Years of output at {company} wiped out in a single bankruptcy notice.'],
    default: ['Rough day for Vij watching {company} go bankrupt.', 'Sending strength to everyone laid off at {company} today.', 'City feels heavy after the {company} bankruptcy news.'],
  },
  city_mass_layoff: {
    anxious: ['Layoffs rippling through {company} make everyone nervous about next month.', 'Too many empty desks at {company} today. Hard to focus anywhere else.', 'Watching mass cuts at {company} reminds us how thin runway really is.'],
    bitter: ['Funny how cuts at {company} always start at the bottom and stop short of the corner desk.', 'Layoff season hits {company} while executives keep talking about resilience.'],
    default: ['Mass layoffs at {company} left the whole block shaken today.', 'Tough news out of {company} — thinking of everyone let go.', 'Job market is going to feel the shock from {company} cuts.'],
  },
  city_death: {
    kind: ['Heartbroken hearing {name} passed away. Vij feels smaller tonight.', 'Thinking of everyone close to {name}. Please check on your neighbors.', 'Hard loss for the city today — {name} will be missed.'],
    anxious: ['Losing {name} makes the whole city feel fragile. Check on people around you.', 'Another painful loss in Vij ({name}). Wish help had arrived sooner.'],
    default: ['Rest peacefully, {name}. Heavy evening across Vij.', 'Sad news about {name} spreading through the neighborhood.', 'Keeping {name} in memory tonight.'],
  },
  take_prices: {
    angry: ['Prices at @vijmart keep climbing faster than wages can follow.', 'Why does everyday food cost a fortune while pay stays frozen?', 'Someone needs to explain why essentials spiked overnight.'],
    bitter: ['Cost of living up, wages flat, and leadership calls it healthy growth.', 'Payday shrinks every month just standing in the @vijmart checkout line.'],
    default: ['City prices feel out of step with what normal workers earn.', 'Essentials keep creeping up across Vij every single month.', 'Tough balancing groceries, water, and rent at current prices.'],
  },
  take_ceo_gap: {
    bitter: ['Executive suites earn ten times the floor and still lecture staff about tightening belts.', 'Funny how CEO pay rarely misses a beat even when profits wobble.', 'Massive gap between top seats and Entry pay in this city.'],
    angry: ['Explain how CEOs pull huge packages while Entry workers skip rent.', 'Pay gap between leadership and the floor is getting absurd.'],
    default: ['Big gap between executive pay and everyday wages across Vij.', 'Always interesting seeing board pay alongside entry-level paychecks.', 'Hard not to notice how wide the pay ladder is in town.'],
  },
  take_taxes: {
    bitter: ['Five percent business tax, marginal income tax, and shelves still run dry.', 'Every month treasury takes its cut while potholes and prices stay high.'],
    default: ['Tax day hits harder when household expenses are already tight.', 'Hope treasury puts monthly tax collections back into stabilizing city basics.', 'Always watching how city taxes balance against real services.'],
  },
  nat_fire: {
    angry: ['Warehouse blaze wiped out stock today — shelves at @vijmart are going to hurt.', 'Fire damage destroyed supplies overnight. Terrible timing for the whole block.'],
    anxious: ['Heard a sudden fire tore through storage goods today. Check your home stock.', 'Smoke near the storage district — lost {item} supplies before crews stopped it.'],
    default: ['Sudden fire destroyed stored {item} supplies today.', 'Fire incident hit local stock hard; replacements may take a couple days.', 'Scary fire scare in town today, hoping losses stay contained.'],
  },
  nat_theft: {
    angry: ['Someone broke into storage and cleared out {item} stock. Bold daylight theft.', 'Lock up your goods — thefts hit supplies around town today.'],
    anxious: ['Uneasy after hearing {item} went missing overnight. Double-checking locks tonight.', 'Word of theft spreading down the street. Hard to know who to trust.'],
    default: ['Theft reported today with {item} supplies stolen.', 'Missing goods reported across the neighborhood — theft investigations underway.', 'Neighbors comparing notes after {item} went missing overnight.'],
  },
  nat_flood: {
    anxious: ['Flash flooding soaked supplies and ruined stored {item} today.', 'Water damage hit local pantries overnight — salvaging what we can.'],
    default: ['Sudden water leak and flood ruined stored {item} supplies.', 'Cleanup underway after flooding damaged household stock today.'],
  },
  nat_poisoning: {
    angry: ['Spoiled batch gave folks awful food poisoning. Inspect everything before cooking.', 'Terrible stomach bug going around from bad {item} stock.'],
    anxious: ['Nasty bout of food poisoning hit households today. Stick to fresh water and sealed stock.'],
    default: ['Food poisoning cases reported after a bad {item} batch.', 'Watch out for spoiled {item} — several neighbors fell ill today.'],
  },
  nat_power_cut: {
    anxious: ['Sudden outage hit cold storage and spoiled {item} overnight.', 'Power cut knocked out storage coolers across the block.'],
    default: ['Brief power outage spoiled unprotected {item} supplies today.', 'Checking pantry items after last night’s power cut.'],
  },
  nat_price_jump: {
    angry: ['How did {item} jump to {price} overnight without warning?!', 'Woke up to {item} priced out of reach at {price}.'],
    default: ['Prices jumped overnight on {item} ({price}). Catching everyone off guard.', 'Sudden overnight price surge on {item} hitting budgets hard.'],
  },
  crime_theft: {
    bitter: ['Keep noticing neighbors eyeing each other after recent thefts. Trust breaks fast.', 'Stealing from working folks in your own neighborhood is low.'],
    anxious: ['Second theft rumor this week. Keeping doors bolted tonight.', 'Missing supplies got the whole block suspicious.'],
    default: ['Neighborhood tension rising after recent theft reports.', 'Folks demanding answers after goods vanished this week.', 'Suspicion hanging over the street since the theft happened.'],
  },
  grief_death: {
    humble: ['Hard week losing a neighbor. Trying to look out better for folks nearby.', 'Still thinking about {name}. Life goes fast when times turn rough.'],
    default: ['Heavy quiet across our street after recent losses.', 'Hard to shake the sadness around Vij this week.', 'Still processing the recent loss in our neighborhood.'],
  },
  company_reaction: {
    hopeful: ['Good seeing {company} post steady numbers — keeps jobs safer across town.', 'Encouraged by the latest update from {company}.'],
    anxious: ['Watching {company} closely after today’s announcement. Hope payroll stays whole.', 'Mixed feelings reading {company} news tonight.'],
    default: ['Reading {company}’s latest update — wondering what comes next for staff.', 'Everyone at lunch was talking about the news from {company}.'],
  },
};
