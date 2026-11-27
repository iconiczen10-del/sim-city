// CitizenFamilyAchievements.tsx — Family line achievement badges and chronological unlock log

import type { FamilyAchievement, FamilyAchievementCategory } from './familyTypes';

const CAT_BADGE: Record<FamilyAchievementCategory, string> = {
  Economic: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  Social: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
  Education: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  Survival: 'bg-teal-500/15 text-teal-300 border-teal-500/30',
  Dark: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
};

export function CitizenFamilyAchievements({ achievements }: { achievements: FamilyAchievement[] }) {
  return (
    <div className="bg-[#0c1220] border border-slate-800/80 rounded-md p-3.5 space-y-2">
      <div className="font-semibold text-slate-200">Family Achievements ({achievements.length})</div>
      {achievements.length === 0 ? (
        <div className="text-slate-500 text-[11px]">No family achievements unlocked yet.</div>
      ) : (
        <div className="space-y-1.5 max-h-48 overflow-y-auto">
          {achievements.map((a) => (
            <div key={a.id} className="flex flex-wrap items-center justify-between gap-2 bg-[#090d16] rounded px-2.5 py-1.5">
              <div className="flex items-center gap-2 min-w-0">
                <span className={`px-1.5 py-0.5 rounded border text-[10px] font-semibold ${CAT_BADGE[a.category]}`}>{a.category}</span>
                <span className="text-slate-100 font-medium">{a.title}</span>
                <span className="text-slate-400 truncate">— {a.memberName}</span>
              </div>
              <span className="font-mono text-[10px] text-slate-500">Day {a.day} · {a.dateLabel}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
