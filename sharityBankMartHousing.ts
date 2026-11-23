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
  evicted_vent: {
    angry: ['Put out on the street with half my things gone. Unforgiving system in this city.', 'Evicted today after trying everything to catch up on arrears.'],
    anxious: ['Lost the lease and packing whatever survived the eviction. Starting the housing search tonight.', 'Locked out of my own home today. Need a safe room urgently.'],
    default: ['Evicted after falling behind on rent. Looking for any open room in Vij.', 'Lost my place today — searching for affordable housing.'],
  },
  bought_home_flex: {
    show_off: ['Paid full cash for my own place today. Zero rent from here on out.', 'Keys in hand, deed signed, zero loans. Feels good owning property in Vij.'],
    hopeful: ['Bought my first home outright today after months of saving!', 'Finally own my roof in Vij. Worth every sacrifice.'],
    default: ['Purchased a home outright today — no more monthly rent.', 'Signed the deed on a place of my own in Vij today.'],
  },
  second_property_flex: {
    show_off: ['Picked up a second property today as a rental investment. Building real wealth.', 'Expanding the portfolio — another house under ownership and ready for tenants.'],
    default: ['Bought an investment property today and listed it for rent.', 'Added a second house to manage for monthly rental income.'],
  },
  homeless_post: {
    anxious: ['Another night without a roof. Exhausted and just looking for an open bed.', 'No home, dropping energy, and trying to stay safe tonight.'],
    default: ['Still homeless in Vij while searching for an affordable vacancy.', 'Without shelter right now — hoping a room opens soon.'],
  },
  landlord_shade: {
    bitter: ['Private landlords keep pushing rent higher while roofs leak. Tired of paying premiums.', 'Paying steep rent to a citizen landlord who watches every coin.'],
    default: ['Wishing private rental rates across Vij were fairer.', 'Rent charged by private owners is squeezing monthly paychecks.'],
  },
  city_homeless_wave: {
    angry: ['Too many neighbors sleeping without shelter across Vij right now. Something has to change.', 'Homelessness is rising fast across the districts and everyone feels the tension.'],
    default: ['Seeing more homeless residents on the streets this week. Tough stretch for Vij.', 'City homelessness is climbing — hoping open rooms get filled fast.'],
  },
  moved_in: {
    hopeful: ['Unpacking in a new place today. Fresh start across town.', 'Settled into a new home today — grateful for the roof.'],
    default: ['Moved into a new place today.', 'Finished moving across Vij today.'],
  },
  roommate_friction: {
    bitter: ['Living with a difficult roommate makes zero space feel even smaller.', 'Noise and tension at home all week. Ready for my own flat.'],
    default: ['Rough patch sharing space with roommates lately.', 'Trying to keep the peace in shared housing this week.'],
  },
  rent_rise_complaint: {
    angry: ['Lease renewal came with another steep rent hike. Already scanning listings across town.', 'Rent jumped overnight with zero upgrades to the roof or plumbing.'],
    bitter: ['Every pay raise in Vij disappears straight into a higher lease rate.', 'Landlord hiked the rent again — time to look at cheaper districts.'],
    default: ['My lease renewed at a higher monthly rent today.', 'Looking at other apartments after a sharp rent increase this week.'],
  },
  sold_home_crisis: {
    anxious: ['Had to sell my house back to the city today to keep cash reserves alive.', 'Painful day signing away the deed, but keeping liquidity came first.'],
    bitter: ['Months of saving into property, sold back at 85% when bills piled up.', 'Tough call selling my place back to the city to survive a cash crunch.'],
    default: ['Sold my property back to the government today to rebuild savings.', 'Let go of home ownership today to cover expenses.'],
  },
  upgrade_flex: {
    show_off: ['Upgraded to a bigger place in a better district today. Hard work pays off.', 'Moving up in Vij — more space, quieter block, much better view.'],
    hopeful: ['Moved into a much nicer place today after saving patiently for months.', 'Finally upgraded our living space — feels great settling in.'],
    default: ['Upgraded to a larger residence in Vij today.', 'Moved into a better home after steady savings growth.'],
  },
  downgrade_shame: {
    bitter: ['Swallowed my pride and downsized to a cheaper place before rent broke me.', 'Had to trade down on housing to protect food and reserves.'],
    humble: ['Downsized to a smaller place today to keep monthly bills manageable.', 'Stepping down to cheaper rent for a while — survival comes first.'],
    default: ['Moved into a smaller, more affordable residence today.', 'Downgraded housing this month to trim fixed costs.'],
  },
  friend_shelter_help: {
    kind: ['A real friend opened their door when I had nowhere left to sleep. Forever grateful.', 'Kindness still lives in Vij — a close friend invited me in out of the cold.'],
    hopeful: ['Got a roof again thanks to a good friend who made room for me.', 'Moving in with a trusted friend until I get back on my feet.'],
    default: ['A friend offered me a room today when I needed shelter.', 'Grateful to have a friend share their home while I rebuild.'],
  },
};
