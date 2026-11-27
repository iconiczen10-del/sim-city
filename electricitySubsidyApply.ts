// electricitySubsidyApply.ts — Applies lifeline band, bill waiver, income cap, payment plan, and income-share splitting

import type { Company } from './companyTypes';
import type { ElectricBillRecord, ElectricLedger, TariffState } from './electricityTypes';
import type { HouseSubsidyPackage } from './gjSubsidyTypes';
import type { Citizen } from './types';

export interface SubsidyBillOutcome {
  bill: ElectricBillRecord;
  absorbed: number;
  totalOwedAfterSubsidy: number;
  shares: Map<string, number>;
  planInstallmentAdded: number;
}

export function applySubsidyToHouseBill(params: {
  rawBill: ElectricBillRecord;
  tariff: TariffState;
  pkg: HouseSubsidyPackage | null;
  occ: Citizen[];
  ledger: ElectricLedger;
  gj?: Company;
  reconnectNeed: number;
}): SubsidyBillOutcome {
  const { rawBill, tariff, pkg, occ, ledger, gj, reconnectNeed } = params;
  const bill = { ...rawBill };
  const shares = new Map<string, number>();

  if (!pkg || !pkg.enrolled || !gj || gj.bankrupt || gj.cash <= 0) {
    const totalOwed = Math.round((ledger.arrearsBalance + bill.totalDue + reconnectNeed) * 100) / 100;
    const each = occ.length > 0 ? totalOwed / occ.length : 0;
    for (const c of occ) shares.set(c.id, Math.round(each * 100) / 100);
    return { bill, absorbed: 0, totalOwedAfterSubsidy: totalOwed, shares, planInstallmentAdded: 0 };
  }

  // 1. Lifeline band on first 60 units
  if (pkg.lifelineMode !== 'none' && bill.units <= pkg.lifelineUnitLimit * 1.3) {
    if (pkg.lifelineMode === 'free_0') {
      bill.band1Charge = 0;
    } else if (pkg.lifelineMode === 'low_020') {
      bill.band1Charge = Math.round(bill.band1Units * 0.20 * 100) / 100;
    } else {
      const ratio = bill.units <= pkg.lifelineUnitLimit ? 0.55 : 0.8;
      bill.band1Charge = Math.round(bill.band1Units * tariff.band1Rate * tariff.multiplier * ratio * 100) / 100;
    }
  }

  // 2. Late fee waiver
  if (pkg.lateFeeWaived || pkg.waiverPct >= 100) bill.lateFee = 0;

  let afterLifeline = Math.round((bill.connectionFee + bill.band1Charge + bill.band2Charge + bill.band3Charge + bill.lateFee) * 100) / 100;

  // 3. Cold-snap relief
  if (pkg.coldSnapRelief > 0) {
    afterLifeline = Math.max(0, Math.round((afterLifeline - pkg.coldSnapRelief) * 100) / 100);
  }

  // 4. Income-based bill cap
  const totalPay = occ.reduce((s, c) => s + Math.max(0, c.lastGrossPay || 0), 0);
  if (pkg.incomeCapPct !== null && totalPay > 0) {
    const capAmt = Math.max(8, Math.round(((totalPay * pkg.incomeCapPct) / 100) * 100) / 100);
    if (afterLifeline > capAmt) {
      afterLifeline = capAmt;
      bill.incomeCapApplied = capAmt;
    }
  }

  // 5. Percentage / Full free-bill waiver
  if (pkg.waiverPct > 0) {
    afterLifeline = pkg.waiverPct >= 100 ? 0 : Math.round(afterLifeline * (1 - pkg.waiverPct / 100) * 100) / 100;
  }

  // Cap total subsidy by GJ available cash (no reserve floor; stops only when GJ has no cash left)
  const rawSubsidy = Math.max(0, Math.round((rawBill.totalDue - afterLifeline) * 100) / 100);
  const absorbed = Math.min(rawSubsidy, Math.max(0, Math.round(gj.cash * 100) / 100));
  bill.totalDue = Math.max(0, Math.round((rawBill.totalDue - absorbed) * 100) / 100);
  bill.subsidyAbsorbed = absorbed;
  pkg.monthlyAbsorbed = absorbed;

  const parts: string[] = [];
  if (pkg.waiverPct >= 100) parts.push('Free bill');
  else if (pkg.waiverPct > 0) parts.push(`${pkg.waiverPct}% waiver`);
  if (pkg.lifelineMode !== 'none') parts.push(`Lifeline (${pkg.lifelineMode === 'free_0' ? '∆0' : pkg.lifelineMode === 'low_020' ? '∆0.20' : 'taper'})`);
  if (bill.incomeCapApplied !== undefined) parts.push(`${pkg.incomeCapPct}% cap`);
  if (pkg.coldSnapRelief > 0) parts.push(`Cold relief`);
  if (pkg.lateFeeWaived) parts.push('No late fee');
  bill.subsidySummary = parts.join(' + ') || pkg.reasonSummary;

  // 6. Payment plan deferral if enabled & balance remains
  let planAdded = 0;
  let dueNow = Math.round((ledger.arrearsBalance + bill.totalDue + (pkg.waiverPct >= 100 ? 0 : reconnectNeed)) * 100) / 100;
  if (pkg.paymentPlanMonths >= 2 && dueNow > 12) {
    const inst = Math.round((dueNow / pkg.paymentPlanMonths) * 100) / 100;
    planAdded = Math.round((dueNow - inst) * 100) / 100;
    ledger.paymentPlanBalance = Math.round(((ledger.paymentPlanBalance ?? 0) + planAdded) * 100) / 100;
    ledger.paymentPlanMonthsLeft = Math.max(ledger.paymentPlanMonthsLeft ?? 0, pkg.paymentPlanMonths - 1);
    bill.paymentPlanUsed = pkg.paymentPlanMonths;
    dueNow = inst;
  }

  // 7. Split net bill by income share among roommates when subsidized
  if (occ.length <= 1) {
    if (occ[0]) shares.set(occ[0].id, dueNow);
  } else if (totalPay > 0) {
    for (const c of occ) {
      const weight = Math.max(0, c.lastGrossPay || 0) / totalPay;
      shares.set(c.id, Math.round(dueNow * weight * 100) / 100);
    }
  } else {
    const bySav = occ.reduce((s, c) => s + Math.max(1, c.savings), 0);
    for (const c of occ) {
      shares.set(c.id, Math.round((dueNow * Math.max(1, c.savings) / bySav) * 100) / 100);
    }
  }

  return { bill, absorbed, totalOwedAfterSubsidy: dueNow, shares, planInstallmentAdded: planAdded };
}
