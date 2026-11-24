// sharityBankUtility.ts — Sharity post templates for GJ Electricity power cuts, blackouts, bills, and electronics

import type { VoiceTemplates } from './sharityBankCareerMoney';

export const UTILITY_SHARITY_BANK: Record<string, VoiceTemplates> = {
  power_cut_notice: {
    angry: [
      'Power cut at home tonight and the fridge is warming up. Sorting out GJ Electricity feels impossible.',
      'No lights, no fan, food spoiling fast — getting cut off hits everything at once.',
    ],
    anxious: [
      'Sitting in the dark hoping we can clear the electric balance and pay the reconnect fee soon.',
      'Power went out at home; trying to keep essentials from spoiling until power returns.',
    ],
    default: [
      'Electricity disconnected at home. Focusing on catching up on the utility bill.',
      'Power cut hit the house today; hoping to settle the reconnect balance soon.',
    ],
  },
  summer_blackout: {
    angry: [
      'Another blackout right during the evening peak! GJ Electricity needs more generation capacity.',
      'Whole block went dark in the heat. Two gas plants are not enough for summer evenings.',
    ],
    anxious: [
      'Grid blackout hit the district this evening. Keeping water cool and phones charged while we wait.',
      'Rolling power ration tonight — hoping the evening peak eases soon.',
    ],
    default: [
      'Evening blackout rolled through Vij tonight after demand passed plant capacity.',
      'Power rationed across parts of the city this evening while grid load peaked.',
    ],
  },
  appliance_flex: {
    show_off: [
      'Picked up a {tier} {item} from @vijmart today. Makes the whole place run smoother.',
      'Upgraded to a brand new {item} from @vijmart — worth every delta.',
    ],
    hopeful: [
      'Brought home a fresh {item} from @vijmart today. One less daily headache.',
      'Settled in a new {item} from @vijmart — nice improvement around the house.',
    ],
    default: [
      'Picked up a {item} from @vijmart today.',
      'Replaced household gear with a new {item} from @vijmart.',
    ],
  },
  appliance_broken: {
    angry: [
      'My {item} broke right when I need it most. Back to @vijmart for another trip.',
      'Cannot believe the {item} quit working today. Everything breaks on the worst week.',
    ],
    anxious: [
      'The {item} stopped working today — hoping savings stretch enough for a replacement at @vijmart.',
      'Lost the {item} today; trying to rearrange the budget before buying a new one.',
    ],
    default: [
      'My {item} finally gave out today. Time to check @vijmart prices.',
      'Had a {item} break down at home today.',
    ],
  },
};
