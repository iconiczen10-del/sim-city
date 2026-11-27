// vijBankTypes.ts — Data types for Vij Bank, 5 personalities, 6 loan products, credit scores, and citizen debt mindset

export type BankPersonality =
  | 'prudent_guardian'
  | 'growth_hunter'
  | 'community_banker'
  | 'predator'
  | 'bureaucrat';

export type BankJobTitle =
  | 'CEO'
  | 'Branch Manager'
  | 'Loan Officer'
  | 'Credit Analyst'
  | 'Collections Officer'
  | 'Teller';

export type LoanType =
  | 'emergency_micro'
  | 'bill_smoothing'
  | 'appliance_collateral'
  | 'housing_loan'
  | 'credit_line'
  | 'business_ceo';

export type LoanStatus = 'active' | 'defaulted' | 'restructured' | 'paid' | 'written_off' | 'refused_heir';

export type RepaymentStrategy = 'full' | 'minimum' | 'smallest_first' | 'skip' | 'borrow_to_repay';

export type CreditBand = 'High Risk' | 'Subprime' | 'Fair' | 'Good' | 'Prime';

export interface LoanPaymentMark {
  day: number;
  dateLabel: string;
  amountDue: number;
  amountPaid: number;
  lateFee: number;
  status: 'on_time' | 'late' | 'missed' | 'restructured' | 'forgiven';
}

export interface BankLoan {
  id: string;
  borrowerId: string;
  originalBorrowerId?: string;
  borrowerName: string;
  type: LoanType;
  principal: number;
  annualRate: number;
  monthlyInterestRate: number;
  originationFee: number;
  balance: number;
  termMonths: number;
  monthsRemaining: number;
  monthlyInstallment: number;
  missedCount: number;
  lateCount: number;
  status: LoanStatus;
  collateralKind?: 'appliance' | 'house' | 'none';
  collateralId?: string;
  collateralLabel?: string;
  inheritedFromId?: string;
  inheritedFromName?: string;
  heirAction?: 'accepted' | 'negotiated' | 'refused';
  originatedDay: number;
  originatedDate: string;
  nextDueDay: number;
  reasonWhy: string;
  termsWhat: string;
  decisionHow: string;
  paymentHistory: LoanPaymentMark[];
}

export interface DebtDecisionEntry {
  id: string;
  day: number;
  dateLabel: string;
  action: 'borrowed' | 'denied' | 'repaid' | 'missed' | 'restructured' | 'defaulted' | 'coping' | 'inherited_choice';
  why: string;
  what: string;
  how: string;
}

export interface CitizenDebtProfile {
  creditScore: number;
  creditBand: CreditBand;
  totalDebt: number;
  monthlyObligation: number;
  dtiRatio: number;
  riskLevel: 'Low' | 'Moderate' | 'Elevated' | 'Critical';
  trustInBank: number;
  perceivedDebt: number;
  shame: number;
  repaymentStrategy: RepaymentStrategy;
  garnishmentPct: number;
  inheritedDebtTotal: number;
  copingNote: string;
  warnings: string[];
  decisionHistory: DebtDecisionEntry[];
}

export interface BankPersonalityShift {
  day: number;
  dateLabel: string;
  from: BankPersonality;
  to: BankPersonality;
  reason: string;
}

export interface VijBankState {
  personality: BankPersonality;
  initialPersonality: BankPersonality;
  reserveRatio: number;
  baseRateAdjust: number;
  branchLevel: number;
  totalLoaned: number;
  totalRepaid: number;
  totalDefaultsLoss: number;
  totalInterestEarned: number;
  activeLoanCount: number;
  defaultedLoanCount: number;
  repossessionsCount: number;
  garnishmentsCount: number;
  bankruptDryMonths: number;
  personalityHistory: BankPersonalityShift[];
  loans: BankLoan[];
}

export interface CitizenDebtFields {
  bankJobTitle?: BankJobTitle;
  debtProfile?: CitizenDebtProfile;
  guardianId?: string | null;
  trustFund?: number;
  inheritedDebtNote?: string;
}
