// CompaniesView.tsx — Company cards plus responsive sub-tabs (PC: Board/Ledger/Employee/GJ; Mobile: Companies/Mart/GJ/Jobs)

import { Building2 } from 'lucide-react';
import { useState } from 'react';
import { BoardTabView } from './BoardTabView';
import type { BoardMeeting } from './boardTypes';
import { CompanyDetailModal } from './CompanyDetailModal';
import { CompanyFullLedgerView } from './CompanyFullLedgerView';
import { CompanySectionNav, type CompanySubTab } from './CompanySectionNav';
import type { CompanyId } from './companyTypes';
import { EmployeeChatView } from './EmployeeChatView';
import { formatDelta, formatSignedDelta } from './formatters';
import { GJElectricityView } from './GJElectricityView';
import { JobMarketView } from './JobMarketView';
import { MartView } from './MartView';
import type { CityState } from './types';

interface CompaniesViewProps {
  city: CityState;
  meetings: BoardMeeting[];
  onMarkMeetingRead: (meetingId: string) => void;
  onSelectCitizen: (citizenId: string) => void;
  onUpdateCity: (updater: (prev: CityState) => CityState) => void;
  isPhone?: boolean;
}

const MOBILE_VALID = new Set<CompanySubTab>(['companies', 'mart', 'gjelectricity', 'jobs']);
const PC_VALID = new Set<CompanySubTab>(['companies', 'gjelectricity', 'board', 'ledger', 'employee']);

export function CompaniesView({ city, meetings, onMarkMeetingRead, onSelectCitizen, onUpdateCity, isPhone = false }: CompaniesViewProps) {
  const [subTab, setSubTab] = useState<CompanySubTab>('companies');
  const [selectedId, setSelectedId] = useState<CompanyId | null>(null);
  const activeTab: CompanySubTab = (isPhone ? MOBILE_VALID : PC_VALID).has(subTab) ? subTab : 'companies';
  const selectedCompany = city.companies.find((c) => c.id === selectedId) ?? null;
  const unreadCount = meetings.filter((m) => !m.read).length;
  const hasNegativeChat = city.chatGroups.vijindustries.messages.some((message) => city.totalDays - message.totalDay <= 1 && ['grievance', 'menace', 'rant'].includes(message.act));
  const listedCompanies = isPhone ? city.companies.filter((c) => c.id !== 'gjelectricity') : city.companies;

  return (
    <div className="space-y-5">
      <CompanySectionNav selectedTab={activeTab} onSelectTab={setSubTab} unreadCount={unreadCount} hasNegativeChat={hasNegativeChat} isPhone={isPhone} />

      {activeTab === 'gjelectricity' ? (
        <GJElectricityView city={city} onUpdateCity={onUpdateCity} onSelectCitizen={onSelectCitizen} />
      ) : activeTab === 'mart' && isPhone ? (
        <MartView city={city} onUpdateCity={onUpdateCity} onSelectCitizen={onSelectCitizen} />
      ) : activeTab === 'jobs' && isPhone ? (
        <JobMarketView city={city} onSelectCitizen={onSelectCitizen} />
      ) : activeTab === 'board' && !isPhone ? (
        <BoardTabView city={city} meetings={meetings} onMarkMeetingRead={onMarkMeetingRead} onSelectCitizen={onSelectCitizen} />
      ) : activeTab === 'ledger' && !isPhone ? (
        <CompanyFullLedgerView city={city} />
      ) : activeTab === 'employee' && !isPhone ? (
        <EmployeeChatView city={city} group={city.chatGroups.vijindustries} onUpdateCity={onUpdateCity} onSelectCitizen={onSelectCitizen} />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {listedCompanies.map((comp) => {
            const employees = city.citizens.filter((c) => c.alive && c.employerId === comp.id);
            const ceo = employees.find((c) => c.id === comp.ceoId) ?? employees.find((c) => c.roleLevel === 'CEO');
            const monthlyEstPayroll = employees.reduce((s, e) => s + e.lastGrossPay, 0);

            return (
              <button
                key={comp.id}
                type="button"
                onClick={() => setSelectedId(comp.id)}
                className="text-left bg-[#111827] border border-slate-800/90 hover:border-amber-500/50 rounded-lg p-5 space-y-4 transition-colors cursor-pointer"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="p-2 rounded-md bg-slate-900 border border-slate-800 text-amber-300 shrink-0">
                      <Building2 className="w-5 h-5" aria-hidden="true" />
                    </div>
                    <div className="min-w-0">
                      <div className="font-display text-base font-semibold text-slate-50 truncate">{comp.name}</div>
                      <div className="text-xs text-slate-400 truncate">{comp.sector} · Pay {comp.industryMultiplier.toFixed(2)}x</div>
                    </div>
                  </div>
                  <span className={`font-mono text-xs px-2 py-0.5 rounded border shrink-0 ${comp.bankrupt ? 'border-rose-500/40 text-rose-300 bg-rose-500/10' : 'border-emerald-500/30 text-emerald-300 bg-emerald-500/10'}`}>
                    {comp.bankrupt ? 'Bankrupt' : `Rep ${comp.reputation.toFixed(0)}/100`}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2 text-xs sm:grid-cols-4 border-t border-slate-800/70">
                  <div>
                    <div className="text-slate-400">Cash</div>
                    <div className={`font-mono font-semibold mt-0.5 ${comp.cash < 0 ? 'text-rose-300' : 'text-amber-300'}`}>{formatDelta(comp.cash)}</div>
                  </div>
                  <div>
                    <div className="text-slate-400">Last Revenue</div>
                    <div className="font-mono text-slate-100 mt-0.5">{formatDelta(comp.lastMonthRevenue)}</div>
                  </div>
                  <div>
                    <div className="text-slate-400">Last Costs</div>
                    <div className="font-mono text-slate-200 mt-0.5">{formatDelta(comp.lastMonthCosts || monthlyEstPayroll)}</div>
                  </div>
                  <div>
                    <div className="text-slate-400">Last Profit</div>
                    <div className={`font-mono font-semibold mt-0.5 ${comp.lastMonthProfit >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
                      {formatSignedDelta(comp.lastMonthProfit)}
                    </div>
                  </div>
                </div>

                <div className="flex flex-col items-start justify-between gap-2 pt-2 text-xs text-slate-400 sm:flex-row sm:items-center border-t border-slate-800/70">
                  <span>CEO: <span className="text-slate-200 font-medium">{ceo ? ceo.name : 'Vacant'}</span></span>
                  <span className="font-mono">Headcount: <span className="text-slate-100 font-semibold">{employees.length}</span> · Payroll {formatDelta(monthlyEstPayroll)}/mo</span>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {selectedCompany && (
        <CompanyDetailModal company={selectedCompany} citizens={city.citizens} events={city.events} bank={city.bank} electricity={city.electricity} onSelectCitizen={onSelectCitizen} onClose={() => setSelectedId(null)} />
      )}
    </div>
  );
}
