// CompanySectionNav.tsx — Responsive company sub-tab navigation (PC 5 tabs unchanged; phone 4 scrollable tabs)

export type CompanySubTab = 'companies' | 'mart' | 'gjelectricity' | 'jobs' | 'board' | 'ledger' | 'employee';

interface CompanySectionNavProps {
  selectedTab: CompanySubTab;
  onSelectTab: (tab: CompanySubTab) => void;
  unreadCount: number;
  hasNegativeChat: boolean;
  isPhone?: boolean;
}

const pcTabStyle = (active: boolean) =>
  `px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
    active ? 'bg-amber-500 text-slate-950 font-semibold' : 'bg-[#111827] text-slate-300 hover:text-slate-100 border border-slate-800'
  }`;

const mobileTabStyle = (active: boolean) =>
  `min-h-[44px] px-4 py-2 text-xs font-medium rounded-md whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
    active ? 'bg-amber-500 text-slate-950 font-semibold' : 'bg-[#111827] text-slate-300 border border-slate-800'
  }`;

const MOBILE_TABS: { id: CompanySubTab; label: string }[] = [
  { id: 'companies', label: 'Companies' },
  { id: 'mart', label: 'Vij Mart' },
  { id: 'gjelectricity', label: 'GJ Electricity' },
  { id: 'jobs', label: 'Job Market' },
];

export function CompanySectionNav({ selectedTab, onSelectTab, unreadCount, hasNegativeChat, isPhone = false }: CompanySectionNavProps) {
  if (isPhone) {
    return (
      <div className="overflow-x-auto border-b border-slate-800/90 pb-3 -mx-1 px-1">
        <div role="tablist" aria-label="Company sections" className="flex w-max items-center gap-2">
          {MOBILE_TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={selectedTab === t.id}
              onClick={() => onSelectTab(t.id)}
              className={mobileTabStyle(selectedTab === t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto border-b border-slate-800/90 pb-3">
      <div role="tablist" aria-label="Company sections" className="flex w-max min-w-full items-center gap-2">
        <button type="button" role="tab" aria-selected={selectedTab === 'companies'} onClick={() => onSelectTab('companies')} className={pcTabStyle(selectedTab === 'companies')}>
          All Companies (5)
        </button>
        <button type="button" role="tab" aria-selected={selectedTab === 'gjelectricity'} onClick={() => onSelectTab('gjelectricity')} className={pcTabStyle(selectedTab === 'gjelectricity')}>
          GJ Electricity
        </button>
        <button type="button" role="tab" aria-selected={selectedTab === 'board'} onClick={() => onSelectTab('board')} className={`${pcTabStyle(selectedTab === 'board')} inline-flex items-center gap-2`}>
          <span>Vij Industries Board</span>
          {unreadCount > 0 && (
            <span className={`font-mono text-[10px] px-1.5 py-0.5 rounded ${selectedTab === 'board' ? 'bg-slate-950 text-amber-300' : 'bg-amber-500/20 text-amber-300'}`}>
              {unreadCount} unread
            </span>
          )}
        </button>
        <button type="button" role="tab" aria-selected={selectedTab === 'ledger'} onClick={() => onSelectTab('ledger')} className={pcTabStyle(selectedTab === 'ledger')}>
          Company Full Ledger
        </button>
        <button type="button" role="tab" aria-selected={selectedTab === 'employee'} onClick={() => onSelectTab('employee')} className={`${pcTabStyle(selectedTab === 'employee')} inline-flex items-center gap-2`}>
          <span>VI Employee</span>
          {hasNegativeChat && (
            <>
              <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-rose-400" />
              <span className="sr-only">Recent negative chat message</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
