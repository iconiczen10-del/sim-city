// simWorkerTick.ts — Worker day-stepping clock, catch-up budget, and high-speed UI redraw throttling

import { advanceCityDay } from './advanceCityDay';
import type { BoardMeeting } from './boardTypes';
import type { CityState, SimSpeed } from './types';

export interface WorkerTickRuntime {
  city: CityState | null;
  latestMeeting?: BoardMeeting;
  speed: SimSpeed;
  runningBehind: boolean;
  dirtyCity: boolean;
  accumulatedMs: number;
  lastTickAt: number;
  lastRedrawAt: number;
  daysSinceRedraw: number;
}

export function getRedrawStride(spd: SimSpeed, behind: boolean): { days: number; minMs: number } {
  if (behind) return { days: Math.max(4, spd >= 25 ? 6 : 3), minMs: 420 };
  if (spd >= 40) return { days: 4, minMs: 240 };
  if (spd >= 20) return { days: 3, minMs: 200 };
  return { days: 1, minMs: 0 };
}

export function stepWorkerClock(
  rt: WorkerTickRuntime,
  onMeeting: (meeting: BoardMeeting) => void,
  onEmit: (newMeetings: BoardMeeting[]) => void,
): void {
  const now = performance.now();
  const dt = Math.min(2500, Math.max(0, now - rt.lastTickAt));
  rt.lastTickAt = now;
  if (!rt.city || rt.speed === 0) return;

  const dayMs = 10000 / rt.speed;
  rt.accumulatedMs += dt;
  if (rt.accumulatedMs < dayMs) return;

  const start = performance.now();
  const newMeetings: BoardMeeting[] = [];
  let ranDays = 0;
  while (rt.accumulatedMs >= dayMs) {
    const res = advanceCityDay(rt.city, rt.latestMeeting, rt.speed);
    rt.city = res.state;
    rt.dirtyCity = true;
    ranDays += 1;
    rt.daysSinceRedraw += 1;
    rt.accumulatedMs -= dayMs;
    if (res.newMeeting) {
      rt.latestMeeting = res.newMeeting;
      newMeetings.push(res.newMeeting);
      onMeeting(res.newMeeting);
    }
    if (performance.now() - start >= 140) break;
  }

  rt.runningBehind = rt.accumulatedMs >= dayMs * 1.5;
  const stride = getRedrawStride(rt.speed, rt.runningBehind);
  const dueRedraw = newMeetings.length > 0 || (rt.daysSinceRedraw >= stride.days && now - rt.lastRedrawAt >= stride.minMs);
  if ((ranDays > 0 && dueRedraw) || newMeetings.length > 0) onEmit(newMeetings);
}
