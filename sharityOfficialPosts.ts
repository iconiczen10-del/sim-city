// sharityOfficialPosts.ts — Emits verified event-driven official company posts on real milestones and disruptions

import type { Company, CompanyId, CompanyVacancy } from './companyTypes';
import type { SimClock } from './eventFactory';
import { makeCityEvent } from './eventFactory';
import type { MartState } from './martTypes';
import { buildOfficialCompanyPostText, type OfficialTrigger } from './sharityBankOfficial';
import { getFollowersOf } from './sharityNetwork';
import type { SharityPost, SharitySentiment, SharityState } from './sharityTypes';
import type { Citizen, CityEvent } from './types';

export function emitOfficialCompanyPosts(params: {
  sharity: SharityState;
  companies: Company[];
  citizens: Citizen[];
  mart: MartState;
  vacancies: CompanyVacancy[];
  dayEvents: CityEvent[];
  clock: SimClock;
  dateLabel: string;
  isMonthEnd: boolean;
  events: CityEvent[];
  recordPost: (sharity: SharityState, post: SharityPost, clock: SimClock, dateLabel: string) => void;
}): CompanyId[] {
  const { sharity, companies, citizens, mart, vacancies, dayEvents, clock, dateLabel, isMonthEnd, events, recordPost } = params;
  const emitted = new Set<string>();
  const postedCompanies = new Set<CompanyId>();
  const recentSet = new Set((sharity.recentTexts ?? []).filter((r) => clock.totalDays - r.day <= 14).map((r) => r.text));

  const addOfficial = (
    comp: Company,
    trigger: OfficialTrigger,
    extra: { detail?: string; amount?: number; role?: string; personName?: string; days?: number; sentiment: SharitySentiment; urgency: number }
  ) => {
    const k = `${comp.id}_${trigger}`;
    if (emitted.has(k)) return;
    emitted.add(k);
    const recentSame = sharity.posts.some((p) => p.authorId === comp.id && p.triggerKey === trigger && clock.totalDays - p.createdDay < 5);
    if (recentSame) return;

    const ceo = citizens.find((c) => c.alive && c.id === comp.ceoId);
    const prof = sharity.profiles[comp.id];
    if (!prof) return;
    let built = buildOfficialCompanyPostText({ company: comp, ceo, trigger, ...extra });
    if (recentSet.has(built.text)) {
      built = { ...built, text: `${built.text} [${dateLabel}]` };
    }
    postedCompanies.add(comp.id);
    const followers = getFollowersOf(sharity, comp.id).length;
    const post: SharityPost = {
      id: `post_co_${clock.totalDays}_${k}_${sharity.posts.length}`,
      authorId: comp.id, handle: prof.handle, createdDay: clock.totalDays, dateLabel,
      topic: 'companies', triggerKey: trigger, voice: 'neutral', sentiment: extra.sentiment,
      text: built.text, hashtags: built.hashtags, mentions: [], urgencyWeight: extra.urgency,
      why: {
        trigger: `Official ${comp.name}: ${trigger.replace(/_/g, ' ')}`,
        gateScores: { sociability: 100, eventStrength: extra.urgency, socialNeed: 50, moodSwing: 0, postWeight: extra.urgency },
        voiceReason: 'Official company page with CEO spin', templateId: `official_${trigger}`, styleNote: 'Official corporate notice',
      },
      likes: 0, dislikes: 0, replies: 0, reposts: 0, score: followers * 3 + extra.urgency * 2,
    };
    recordPost(sharity, post, clock, dateLabel);
    recentSet.add(post.text);
    if (extra.urgency >= 75) {
      events.push(makeCityEvent(clock, `sharity_co_${k}`, { type: 'sharity', companyId: comp.id, title: `${comp.name} Sharity Statement`, detail: built.text }));
    }
  };

  for (const v of vacancies) {
    if (v.openedDate === dateLabel) {
      const comp = companies.find((c) => c.id === v.companyId);
      if (comp) addOfficial(comp, 'vacancy_opened', { role: v.role, sentiment: 'positive', urgency: 54 });
    }
  }

  const martComp = companies.find((c) => c.id === 'vijmart');
  const isMartClosedNow = mart.closedDaysLeft > 0 || mart.closedUntilFunded;
  if (martComp && sharity.lastMartClosed && !isMartClosedNow) {
    addOfficial(martComp, 'mart_reopen', { sentiment: 'positive', urgency: 80 });
  }
  sharity.lastMartClosed = isMartClosedNow;

  for (const ev of dayEvents) {
    const comp = ev.companyId ? companies.find((c) => c.id === ev.companyId) : undefined;
    if (comp && ev.type === 'layoff') addOfficial(comp, 'company_layoffs', { detail: ev.detail, sentiment: 'negative', urgency: 82 });
    if (comp && ev.type === 'board') addOfficial(comp, 'board_decision', { detail: ev.detail, sentiment: 'neutral', urgency: 76 });
    if (comp && ev.type === 'bankruptcy') addOfficial(comp, 'bankruptcy_warning', { amount: comp.cash, sentiment: 'negative', urgency: 88 });
    if (comp && (ev.type === 'promoted' || ev.type === 'hired') && /Executive|CEO/.test(ev.detail)) {
      addOfficial(comp, 'new_executive', { personName: ev.citizenName, role: ev.detail.includes('CEO') ? 'CEO' : 'Executive', sentiment: 'positive', urgency: 72 });
    }
    if (martComp && ev.type === 'rationing') addOfficial(martComp, 'mart_rationing', { detail: ev.detail, sentiment: 'negative', urgency: 70 });
    if (martComp && ev.type === 'late-delivery') addOfficial(martComp, 'mart_delay', { detail: ev.detail, sentiment: 'negative', urgency: 62 });
    if (martComp && ev.type === 'price-shock') addOfficial(martComp, 'mart_price_move', { detail: ev.detail, sentiment: 'negative', urgency: 68 });
    if (martComp && ev.type === 'mood-change' && ev.title.includes('Clearance')) addOfficial(martComp, 'mart_clearance', { detail: ev.detail, sentiment: 'positive', urgency: 58 });
    if (martComp && ev.type === 'mood-change' && ev.title.includes('Gouging')) addOfficial(martComp, 'mart_price_move', { detail: ev.detail, sentiment: 'negative', urgency: 66 });
    if (martComp && ev.type === 'simgod' && ev.title.includes('Price')) addOfficial(martComp, 'mart_price_move', { detail: ev.detail, sentiment: 'negative', urgency: 72 });
    if (martComp && ev.type === 'simgod' && ev.title.includes('Closed')) addOfficial(martComp, 'mart_closure', { days: mart.closedDaysLeft, sentiment: 'negative', urgency: 84 });
  }

  if (isMonthEnd) {
    for (const comp of companies) {
      if (comp.bankrupt) continue;
      if (comp.payFreeze) addOfficial(comp, 'pay_freeze', { sentiment: 'negative', urgency: 64 });
      if (comp.lastMonthProfit >= 9000) addOfficial(comp, 'record_profit', { amount: comp.lastMonthProfit, sentiment: 'positive', urgency: 78 });
      else if (comp.lastMonthProfit > 0) addOfficial(comp, 'monthly_profit', { amount: comp.lastMonthProfit, sentiment: 'positive', urgency: 56 });
      else addOfficial(comp, 'monthly_loss', { amount: comp.lastMonthProfit, sentiment: 'negative', urgency: 68 });
    }
  }
  return Array.from(postedCompanies);
}
