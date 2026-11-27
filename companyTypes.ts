// companyTypes.ts — Data models for companies, org hierarchy, job market vacancies, and work history

import type { EducationLevel, RoleLevel } from './cityBaseTypes';
import type { GJStaffTitle } from './gjSubsidyTypes';
import type { BankJobTitle } from './vijBankTypes';

export type CompanyId = 'vijtech' | 'vijcapital' | 'vijindustries' | 'vijmart' | 'gjelectricity';
export type CompanyDirection = 'aggressive' | 'conservative';

export interface VacancyApplicant {
  citizenId: string;
  citizenName: string;
  currentRole: RoleLevel;
  currentCompanyId: CompanyId | null;
  score: number;
  qualified: boolean;
}

export interface CompanyVacancy {
  id: string;
  companyId: CompanyId;
  companyName: string;
  role: Exclude<RoleLevel, 'Unemployed' | 'Retired'>;
  minSkill: number;
  minExp: number;
  minEdu: EducationLevel;
  openedDay: number;
  openedDate: string;
  reason: string;
  gjJobTitle?: GJStaffTitle;
  bankJobTitle?: BankJobTitle;
  applicants: VacancyApplicant[];
}

export interface JobMarketEvent {
  id: string;
  dateLabel: string;
  kind: 'hired' | 'fired' | 'quit' | 'promoted' | 'layoff';
  citizenId: string;
  citizenName: string;
  companyId: CompanyId;
  companyName: string;
  role: RoleLevel;
  detail: string;
}

export interface CompanyHistoryPoint {
  label: string;
  revenue: number;
  costs: number;
  profit: number;
  cash: number;
}

export type CompanyLedgerCategory =
  | 'retail'
  | 'wholesale'
  | 'export'
  | 'client_revenue'
  | 'payroll'
  | 'business_tax'
  | 'capital_call'
  | 'employee_investment'
  | 'investment_repayment'
  | 'utility_bill'
  | 'plant_fuel'
  | 'plant_upkeep'
  | 'plant_capex'
  | 'subsidy'
  | 'loan_disbursement'
  | 'loan_repayment'
  | 'loan_writeoff'
  | 'adjustment';

export interface CompanyLedgerEntry {
  id: string;
  totalDay: number;
  day: number;
  month: number;
  year: number;
  dateLabel: string;
  kind: 'inflow' | 'outflow';
  category: CompanyLedgerCategory;
  label: string;
  detail: string;
  amount: number;
  balanceAfter: number;
}

export interface CompanyCriticismIncident {
  id: string;
  dateLabel: string;
  citizenId: string;
  citizenName: string;
  deltaRep: number;
  postId: string;
  summary: string;
}

export interface Company {
  id: CompanyId;
  name: string;
  sector: string;
  industryMultiplier: number;
  cash: number;
  monthlyRevenue: number;
  monthlyPayrollCost: number;
  monthlyOtherCost: number;
  monthlyBusinessTax: number;
  lastMonthRevenue: number;
  lastMonthCosts: number;
  lastMonthProfit: number;
  reputation: number;
  ceoId: string | null;
  direction: CompanyDirection;
  payFreeze: boolean;
  positiveProfitStreak: number;
  negativeProfitStreak: number;
  negativeCashStreak: number;
  bankrupt: boolean;
  history: CompanyHistoryPoint[];
  ledger: CompanyLedgerEntry[];
  sharityCriticismLog?: CompanyCriticismIncident[];
}

export interface WorkHistoryEntry {
  id: string;
  dateLabel: string;
  companyId: CompanyId;
  companyName: string;
  role: RoleLevel;
  kind: 'hired' | 'promoted' | 'fired' | 'quit' | 'layoff' | 'pay-cut' | 'bankrupt';
  note: string;
}
