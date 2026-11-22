// sharityBankOfficial.ts — Event-driven company official page posts with CEO trait-based spin

import type { Company } from './companyTypes';
import { formatDelta, formatPrice } from './formatters';
import { simPick } from './rng';
import type { Citizen } from './types';

function ceoSpin(ceo: Citizen | undefined, kind: 'bad' | 'good'): string {
  if (!ceo) return kind === 'bad' ? 'Management is reviewing corrective steps.' : 'We thank our teams and customers across Vij.';
  if (kind === 'bad') {
    if (ceo.traits.greed >= 62) return 'External market headwinds and outside cost pressures drove this adjustment.';
    if (ceo.traits.kindness >= 62) return 'We take full responsibility and remain committed to supporting our staff and neighbors.';
    return 'Disciplined adjustments are underway to restore sustainable footing.';
  }
  if (ceo.traits.greed >= 62) return 'Strong execution and pricing discipline delivered standout margins.';
  if (ceo.traits.kindness >= 62) return 'Shared effort across every floor made this steady result possible.';
  return 'Operational consistency kept results on track this period.';
}

export type OfficialTrigger =
  | 'vacancy_opened' | 'company_layoffs' | 'pay_freeze' | 'monthly_profit'
  | 'monthly_loss' | 'record_profit' | 'bankruptcy_warning' | 'new_executive'
  | 'board_decision' | 'mart_closure' | 'mart_reopen' | 'mart_rationing'
  | 'mart_clearance' | 'mart_delay' | 'mart_price_move';

export function buildOfficialCompanyPostText(params: {
  company: Company;
  ceo?: Citizen;
  trigger: OfficialTrigger;
  detail?: string;
  amount?: number;
  role?: string;
  personName?: string;
  days?: number;
}): { text: string; hashtags: string[] } {
  const { company, ceo, trigger, detail, amount = 0, role = 'Staff', personName = 'Leadership', days = 2 } = params;

  if (trigger === 'vacancy_opened') {
    const text = simPick([
      `Now hiring: ${company.name} opened a ${role} seat. Qualified applicants across Vij are welcome to apply.`,
      `Career notice: a ${role} opening is live at ${company.name}. Internal and city-wide candidates invited.`,
      `Hiring update: ${company.name} is reviewing applicants for an open ${role} position today.`,
    ]);
    return { text, hashtags: ['#Hiring', `#${company.name.replace(/\s+/g, '')}`] };
  }
  if (trigger === 'company_layoffs') {
    return { text: `${company.name} reduced headcount today (${detail || 'operational cuts'}). ${ceoSpin(ceo, 'bad')}`, hashtags: ['#LayoffSeason', `#${company.name.replace(/\s+/g, '')}`] };
  }
  if (trigger === 'pay_freeze') {
    const text = simPick([
      `${company.name} placed a temporary freeze on raises to protect cash runway. ${ceoSpin(ceo, 'bad')}`,
      `Compensation notice: salaries at ${company.name} remain frozen this month while liquidity stabilizes. ${ceoSpin(ceo, 'bad')}`,
    ]);
    return { text, hashtags: ['#PayFreeze', `#${company.name.replace(/\s+/g, '')}`] };
  }
  if (trigger === 'record_profit') {
    return { text: `${company.name} posted a standout monthly profit of ${formatDelta(amount)}. ${ceoSpin(ceo, 'good')}`, hashtags: ['#RecordProfit', `#${company.name.replace(/\s+/g, '')}`] };
  }
  if (trigger === 'monthly_profit') {
    return { text: `Monthly update: ${company.name} closed the month in profit (+${formatDelta(amount)}). ${ceoSpin(ceo, 'good')}`, hashtags: ['#MonthlyResults', `#${company.name.replace(/\s+/g, '')}`] };
  }
  if (trigger === 'monthly_loss') {
    return { text: `Monthly notice: ${company.name} recorded a net loss of ${formatDelta(Math.abs(amount))}. ${ceoSpin(ceo, 'bad')}`, hashtags: ['#MonthlyResults', `#${company.name.replace(/\s+/g, '')}`] };
  }
  if (trigger === 'bankruptcy_warning') {
    const text = simPick([
      `Liquidity notice: ${company.name} cash stands at ${formatDelta(amount)}. Urgent stabilization measures are active.`,
      `Solvency update: ${company.name} is operating with negative reserves (${formatDelta(amount)}). ${ceoSpin(ceo, 'bad')}`,
    ]);
    return { text, hashtags: ['#SolvencyAlert', `#${company.name.replace(/\s+/g, '')}`] };
  }
  if (trigger === 'new_executive') {
    return { text: `Leadership update: ${personName} has stepped into ${role} at ${company.name}. ${ceoSpin(ceo, 'good')}`, hashtags: ['#Leadership', `#${company.name.replace(/\s+/g, '')}`] };
  }
  if (trigger === 'board_decision') {
    return { text: `Board resolution at ${company.name}: ${detail || 'approved solvency measures.'} ${ceoSpin(ceo, 'bad')}`, hashtags: ['#BoardUpdate', '#VijIndustries'] };
  }
  if (trigger === 'mart_closure') {
    return { text: `Store notice: Vij Mart is temporarily closed (${days} days remaining). ${ceoSpin(ceo, 'bad')}`, hashtags: ['#VijMart', '#VijMartClosed'] };
  }
  if (trigger === 'mart_reopen') {
    const text = simPick([
      `Vij Mart has reopened its doors to all neighborhoods today. ${ceoSpin(ceo, 'good')}`,
      `Doors are open again at Vij Mart across all aisles today. ${ceoSpin(ceo, 'good')}`,
    ]);
    return { text, hashtags: ['#VijMart', '#OpenNow'] };
  }
  if (trigger === 'mart_rationing') {
    const text = simPick([
      `Supply notice: Vij Mart activated purchase caps today to stretch essential shelves fairly across households.`,
      `Rationing alert: quantity limits are active at Vij Mart while inventory rebuilds (${detail || 'food reserves low'}).`,
      `Store update: Vij Mart placed temporary item caps on essentials until incoming wholesale deliveries clear.`,
    ]);
    return { text, hashtags: ['#VijMart', '#Rationing'] };
  }
  if (trigger === 'mart_clearance') {
    const text = simPick([
      `Clearance notice: select shelves at Vij Mart are marked down today while excess inventory clears (${detail || 'storewide markdown'}).`,
      `Fresh markdowns posted at Vij Mart today on surplus goods (${detail || 'clearance active'}).`,
    ]);
    return { text, hashtags: ['#VijMart', '#ClearanceDeal'] };
  }
  if (trigger === 'mart_delay') {
    const text = simPick([
      `Delivery update: incoming freight to Vij Mart is delayed (${detail || 'restocks en route'}).`,
      `Supply notice: wholesale arrival slipped behind schedule today (${detail || 'expect restocks shortly'}).`,
    ]);
    return { text, hashtags: ['#VijMart', '#SupplyUpdate'] };
  }
  return {
    text: `Pricing update at Vij Mart: ${detail || `shelf margins adjusted (${formatPrice(amount)})`}. ${ceoSpin(ceo, 'bad')}`,
    hashtags: ['#VijMart', '#PricesUp'],
  };
}
