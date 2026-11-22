// sharityBankExtra.ts — Additional trigger templates, voice openers/closers, and S2 hashtag mappings

import type { VoiceTemplates } from './sharityBankCareerMoney';
import type { SharityTopicId, SharityVoice } from './sharityTypes';

export const EXTRA_TOPIC_BANK: Record<string, VoiceTemplates> = {
  perf_review: {
    show_off: ['Month-end review came back strong at {company}. Numbers do not lie.', 'Top marks on performance again at {company}.'],
    anxious: ['Performance scores posted at {company}. Hoping my numbers stay solid.', 'Rough review cycle — need to lift my score next month.'],
    default: ['Monthly performance check-in wrapped up at {company}.', 'Reviewed monthly targets at {company} today.'],
  },
  tenure_anniv: {
    humble: ['Another full year at {company} in the books. Grateful for steady work.', 'Hit a new tenure milestone at {company}. Time flies on this floor.'],
    default: ['Marking another year working with {company}.', 'Tenure anniversary at {company} today.'],
  },
  big_expense: {
    anxious: ['{amount} gone in fixed bills this month. Checking what is left.', 'Heavy month-end expenses ({amount}) took a big bite out of savings.'],
    default: ['Paid {amount} in monthly living expenses today.', 'Big outflow of {amount} cleared for bills and supplies.'],
  },
  unexpected_cost: {
    bitter: ['Surprise costs always show up the exact day you feel caught up.', 'Another unexpected hit to the wallet this week.'],
    default: ['Had to cover an unexpected cost out of reserves today.', 'Unplanned bill ate into this week’s cushion.'],
  },
  late_delivery: {
    anxious: ['Supply truck delayed again — @vijmart shelves looking sparse.', 'Waiting on a late restock shipment at @vijmart today.'],
    default: ['Delivery delays holding up fresh {item} stock at @vijmart.', 'Late truck pushed restocking back at @vijmart.'],
  },
  cramped_living: {
    bitter: ['Shared room walls are paper-thin tonight. Saving every coin for a real flat.', 'Too cramped in a shared room to get decent rest.'],
    default: ['Tight living space gets wearing after long shifts.', 'Counting days until I can afford a bigger place.'],
  },
  std_upgrade: {
    hopeful: ['Finally stepped up to better daily standards. Feels earned.', 'Small upgrade in groceries and home goods feels huge after lean months.'],
    default: ['Upgraded monthly living standards after steadier pay.', 'Moved up a tier on household standards this month.'],
  },
  std_downgrade: {
    anxious: ['Had to scale back living standards to protect cash.', 'Tightening standards down a notch until savings recover.'],
    default: ['Cut back daily spending standards to balance the budget.', 'Stepping down to simpler supplies for now.'],
  },
  luxury_std: {
    show_off: ['Only picking top-tier {item} from @vijmart lately. Worth every coin.', 'Life is short — might as well enjoy the finest {item} available.'],
    default: ['Picked up top-grade {item} today; quality makes a difference.', 'Treating the household to higher-tier {item} this month.'],
  },
  big_purchase: {
    show_off: ['Replaced worn gear with fresh {item} today — zero hesitation.', 'Dropped {amount} on fresh {item} and feeling sharp.'],
    default: ['Picked up new {item} to refresh the household.', 'Replaced old {item} at @vijmart today.'],
  },
  savings_flex: {
    show_off: ['Sitting comfortably above {amount} saved while others overspend.', 'Healthy reserves ({amount}) make price shocks look small.'],
    default: ['Solid reserves giving real peace of mind right now.', 'Happy seeing {amount} built up after disciplined saving.'],
  },
  extra_hours: {
    hopeful: ['Putting in extra focus to qualify for the next promotion.', 'Staying sharp and taking on extra work to build momentum.'],
    default: ['Logging extra effort this week toward my next career goal.', 'Pushing harder at {company} to stand out on reviews.'],
  },
  take_rent: {
    bitter: ['Rent swallows half the city’s paychecks before anyone buys food.', 'Housing costs keep climbing faster than entry pay.'],
    default: ['Wish rents across Vij gave workers more room to save.', 'Monthly rent pressure is the biggest hurdle for young workers.'],
  },
  take_city: {
    hopeful: ['For all the bumps, Vij keeps moving forward when neighbors help each other.', 'City feels resilient when shops stay stocked and payroll clears.'],
    default: ['Watching how Vij handles another busy economic cycle.', 'Interesting times watching city treasury, wages, and shops balance out.'],
  },
  meal: {
    funny: ['Simple home-cooked meal tonight — nothing fancy, still hits the spot.', 'Best part of the day: hot food and zero alarms for eight hours.'],
    default: ['Good dinner after a long day on my feet.', 'Quiet evening meal at home.'],
  },
  small_joy: {
    kind: ['Shared a good laugh with coworkers at lunch — brightened the whole week.', 'Nice sunset walk past the market tonight.'],
    default: ['Small win today: pantry full, bills clear, steady mood.', 'Good energy around the block today.'],
  },
  bored: {
    neutral: ['Slow afternoon in town. Anyone else staring at the clock?', 'Not much happening on the street today — reading to pass the time.'],
    default: ['Quiet day with zero surprises.', 'Slow evening waiting for tomorrow’s shift.'],
  },
  recovering: {
    hopeful: ['Energy finally coming back after a rough few days.', 'Feeling steadier today — glad health is trending up.'],
    default: ['Feeling better today and getting back to normal pace.', 'Recovery taking hold nicely this week.'],
  },
};

export const VOICE_PREFIXES: Partial<Record<SharityVoice, string[]>> = {
  bitter: ['Honestly,', 'No surprise,', 'Funny enough,'],
  anxious: ['Truthfully,', 'Trying to stay calm,'],
  funny: ['Update from the ground:', 'Plot twist:'],
  angry: ['Seriously:', 'Hard truth:'],
  hopeful: ['Good note today:', 'Looking ahead:'],
};

export const TOPIC_LABELS: Record<SharityTopicId, string> = {
  work_career: 'Work & Career',
  money: 'Money',
  vij_mart: 'Vij Mart',
  housing: 'Housing',
  companies: 'Companies',
  daily_life: 'Daily Life',
  social_drama: 'Social Drama',
  status_flex: 'Status & Flex',
  city_mood: 'City Mood',
  health_survival: 'Health & Survival',
  natural_events: 'City Incidents',
  crime_conflict: 'Crime & Conflict',
  ambition: 'Ambition',
  opinions: 'Opinions & Takes',
  loss_hardship: 'Loss & Hardship',
  celebrations: 'Celebrations',
};

export const TRIGGER_HASHTAGS: Record<string, string[]> = {
  promoted: ['#Promoted', '#CareerMove'],
  hired: ['#Hiring', '#NewRole'],
  laid_off: ['#LayoffSeason', '#JobHunt'],
  fired: ['#Fired', '#WorkLife'],
  pay_cut: ['#PayCut', '#VijWork'],
  late_pay: ['#LatePay', '#Payroll'],
  payday: ['#Payday', '#VijEconomy'],
  milestone: ['#SavingsGoal', '#Milestone'],
  broke: ['#TightBudget', '#RentFirst'],
  stockout: ['#VijMart', '#EmptyShelves'],
  price_shock: ['#PricesUp', '#VijMart'],
  clearance: ['#VijMart', '#ClearanceDeal'],
  rationing: ['#Rationing', '#VijMart'],
  contamination: ['#FoodSafety', '#VijMart'],
  mart_closed: ['#VijMartClosed', '#VijMart'],
  rent_arrears: ['#RentDue', '#Housing'],
  rent_due: ['#RentDue', '#Payday'],
  tier_up: ['#Rising', '#TierUp'],
  city_bankrupt: ['#Bankruptcy', '#VijNews'],
  city_mass_layoff: ['#LayoffSeason', '#VijNews'],
  city_death: ['#InMemory', '#Vij'],
  nat_fire: ['#CityAlert', '#FireLoss'],
  nat_theft: ['#NeighborhoodWatch', '#TheftAlert'],
  nat_price_jump: ['#PricesUp', '#VijMart'],
  crime_theft: ['#NeighborhoodWatch', '#Vij'],
  promo_celebrate: ['#Promoted', '#Celebrate'],
  survive_month: ['#MonthCleared', '#VijLife'],
};
