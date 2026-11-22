// sharityBankMartHousing.ts — Citizen post templates for vij_mart, housing, status_flex, and health_survival

import type { VoiceTemplates } from './sharityBankCareerMoney';

export const MART_HOUSING_BANK: Record<string, VoiceTemplates> = {
  stockout: {
    angry: ['Walked into Vij Mart for {item} and found empty shelves again.', 'Sold out of {item} before noon. Someone needs to fix ordering at @vijmart.', 'Empty bins for {item} two trips in a row. Ridiculous.'],
    anxious: ['No {item} left on the shelves at @vijmart today. Hope a truck arrives soon.', 'Went looking for {item} and left empty-handed. Getting nervous about supplies.', 'Shelves looked thin at @vijmart — {item} completely gone.'],
    funny: ['If anyone sees {item} in stock at @vijmart, guard it with your life.', 'Visited @vijmart for {item} and got a tour of empty shelves instead.', 'Today’s @vijmart special: air where {item} used to be.'],
    default: ['{item} was out of stock at @vijmart today.', 'Empty shelf for {item} at @vijmart this morning.', 'Tried buying {item} at @vijmart, nothing left.'],
  },
  price_shock: {
    angry: ['{price} for {item} at @vijmart?! Someone is squeezing the whole city.', 'Prices jumped hard on {item} ({price}). How do ordinary workers afford this?', 'Sticker shock at @vijmart today — {item} surged to {price}.'],
    bitter: ['Pay stays flat while {item} shoots up to {price}. Classic.', 'Left half my basket behind at @vijmart after seeing {item} at {price}.', 'Gouging on {item} at {price} makes every trip sting.'],
    default: ['{item} is up to {price} at @vijmart right now.', 'Paying {price} for {item} stings the weekly budget.', 'Sharp price jump on {item} at @vijmart today.'],
  },
  clearance: {
    funny: ['Clearance prices on {item} at @vijmart — practically sprinting down the aisle.', 'Never seen people move as fast as today’s @vijmart clearance on {item}.', 'Stocked up on {item} at {price} before the markdown disappears.'],
    hopeful: ['Grabbed {item} on clearance for {price} at @vijmart. Helps the budget breathe.', 'Nice break today: {item} marked down to {price} at @vijmart.', 'Clearance rack at @vijmart came through with {item} at {price}.'],
    default: ['Found {item} marked down to {price} at @vijmart.', 'Good markdowns on {item} at @vijmart today.', 'Clearance deal on {item} helped stretch grocery cash.'],
  },
  rationing: {
    anxious: ['Rationing caps on {item} at @vijmart today. City feels tense.', 'Limited to small {item} buys at @vijmart under rationing rules.', 'Waiting in line under rationing at @vijmart makes everyone uneasy.'],
    default: ['@vijmart put rationing limits on {item} today.', 'Strict purchase caps on {item} at @vijmart right now.', 'Rationing in effect at @vijmart to stretch stock.'],
  },
  contamination: {
    angry: ['Bad batch of {item} pulled after folks got sick. Check your pantry.', 'Unacceptable quality slip on {item} at @vijmart. People fell ill.', 'Throwing out {item} after contamination warnings hit the street.'],
    anxious: ['Heard a contaminated {item} batch went out recently. Checking everything twice.', 'Stomach has been off since picking up {item}. Hope it passes fast.', 'Spoiled {item} scare making folks nervous about tonight’s meal.'],
    default: ['Contamination alert on {item} batches today.', 'People reporting illness tied to tainted {item}.', 'Tossed questionable {item} out of caution tonight.'],
  },
  mart_closed: {
    angry: ['Shutters down at @vijmart for {days} days. Where are we supposed to shop?', 'Closed doors at @vijmart right when pantries are low.', 'Zero warning before @vijmart locked the gates.'],
    anxious: ['@vijmart is closed. Counting every meal and liter left at home.', 'Locked doors at @vijmart — hoping reserves last until reopening.', 'Store closure has everyone rationing what is left in the kitchen.'],
    default: ['@vijmart closed its doors today; hoping it reopens fast.', 'City shoppers turned away at @vijmart shutters.', 'Checking home supplies while @vijmart stays shut.'],
  },
  good_deal: {
    kind: ['Fair pricing on {item} ({price}) at @vijmart today. Glad everyone can afford quality.', 'Nice to see @vijmart keeping {item} affordable at {price}.', 'Good value on {item} today — left extra on the shelf for neighbors.'],
    default: ['Picked up {item} at a fair {price} from @vijmart.', 'Smooth trip to @vijmart — good prices on {item}.', 'Reasonable prices on {item} made shopping easy today.'],
  },
  rent_arrears: {
    anxious: ['Had to hold back rent ({amount} arrears) just to keep food and water on the table.', 'Rent arrears sitting at {amount}. Stress goes up every time I check the calendar.', 'Food first, rent in arrears ({amount}). Hate carrying debt into next month.'],
    bitter: ['Even cutting standards, rent arrears hit {amount}. Housing eats everything.', 'Falling {amount} behind on rent while working full weeks.', 'Landlord knocking about {amount} arrears — not sure where it comes from.'],
    default: ['Rent went into {amount} arrears this month after essentials.', 'Carrying {amount} in unpaid rent while protecting daily food.', 'Behind by {amount} on rent right now.'],
  },
  rent_due: {
    anxious: ['Rent check coming up in {days} days. Counting down every coin.', 'End-of-month rent always makes the last week tight.', 'Checking savings before rent and utilities clear.'],
    default: ['Rent and fixed bills due soon — keeping cash ready.', 'Quiet weekend in before monthly rent hits.', 'Settling up housing costs as month-end approaches.'],
  },
  comfy_living: {
    show_off: ['Settling into the new pace at home. Good housing changes your whole mindset.', 'Nothing beats coming home to quiet space and solid standards.', 'Upgraded comforts around the house and feeling every bit of it.'],
    kind: ['Grateful for a warm roof and a stocked kitchen tonight.', 'Feeling lucky to have a comfortable home after long shifts.', 'Peaceful evening at home; wishing the same for every neighbor.'],
    default: ['Comfortable evening at home with everything stocked.', 'Settling into a steady routine around the house.', 'Home feels peaceful and well-kept this week.'],
  },
  tier_up: {
    show_off: ['Moved up to {tier} today. Earned every single point of that score.', '{tier} unlocked. Remember when folks doubted the climb?', 'Rising to {tier} — watch the badge appear.'],
    humble: ['Stepped into {tier} today. Slow progress adds up over months.', 'Reached {tier} after steady saving and hard work.', 'Grateful to move up to {tier} this month.'],
    default: ['Climbed into {tier} status this month.', 'Moved up a tier to {tier} after month-end review.', 'Crossed into {tier} today.'],
  },
  hungry_thirsty: {
    anxious: ['Skipped another meal today waiting for a payday or restock. Exhausted.', 'Running low on water and food at home. Stomach feels hollow.', 'Counting hours until I can buy decent food and clean water.'],
    bitter: ['Going to bed hungry in a city full of warehouses makes zero sense.', 'Empty kitchen again. Hard to focus on anything else when thirsty.', 'Trying to stretch stale leftovers one more day.'],
    default: ['Struggling to keep food and water stocked right now.', 'Running dangerously low on meals and clean water.', 'Skipping meals to save cash until payday.'],
  },
  sick_close_call: {
    anxious: ['Fever and exhaustion hit hard today. Need rest and clean supplies.', 'Health dropped sharply this week — hoping recovery comes quickly.', 'Scary close call with health today. Taking things slow from here.'],
    hopeful: ['Finally feeling strength come back after being sick all week.', 'On the mend today. Never taking basic health for granted again.', 'Rough patch behind me — recovering steadily now.'],
    default: ['Under the weather today and resting up at home.', 'Taking it easy while health recovers.', 'Rough week physically, focused on getting back on my feet.'],
  },
};
