// advanceCityDay.ts — Advance simulation, attach chat, and persist seeded RNG state
import type { BoardMeeting } from './boardTypes';
import { generateVijIndustriesChatDay } from './chatEngine';
import { getSimRngState, syncSimRng } from './rng';
import { advanceSimulationDayWithBoard } from './simulation';
import type { CityState, SimSpeed } from './types';

export function advanceCityDay(previous: CityState, latestMeeting: BoardMeeting | undefined, speed: SimSpeed) {
  const { state: simulationState, newMeeting } = advanceSimulationDayWithBoard(
    previous,
    latestMeeting,
    speed,
  );
  const state = {
    ...simulationState,
    chatGroups: structuredClone(simulationState.chatGroups),
  };
  syncSimRng(state.rngState || state.seed);

  const company = state.companies.find((item) => item.id === 'vijindustries');
  if (company) {
    const { newMessages } = generateVijIndustriesChatDay({
      city: state,
      company,
      clock: {
        totalDays: state.totalDays,
        day: state.day,
        month: state.month,
        year: state.year,
      },
      events: state.events,
    });
    const spoken = new Set(newMessages.filter((m) => m.totalDay === state.totalDays && m.speakerId).map((m) => m.speakerId!));
    for (const c of state.citizens) {
      if (c.alive && c.needs?.social && spoken.has(c.id)) {
        c.needs.social.value = Math.min(100, Math.round((c.needs.social.value + 4) * 10) / 10);
        c.needs.social.lastRestoredDay = state.totalDays;
      }
    }
  }

  state.rngState = getSimRngState();
  return { state, newMeeting };
}
