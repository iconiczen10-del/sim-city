// CompanySectionNav.tsx — Responsive navigation for company sub-tabs
export type CompanySubTab = 'companies' | 'gjelectricity' | 'board' | 'ledger' | 'employee';

interface CompanySectionNavProps {
  selectedTab: CompanySubTab;
  onSelectTab: (tab: CompanySubTab) => void;
  unreadCount: number;
  hasNegativeChat: boolean;
}

const tabStyle = (active: boolean) => {
  const base = 'px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer';
  return `${base} ${active ? 'bg-amber-500 text-slate-950 font-semibold' : 'bg-[#111827] text-slate-300 hover:text-slate-100 border border-slate-800'}`;
};

export function CompanySectionNav({ selectedTab, onSelectTab, unreadCount, hasNegativeChat }: CompanySectionNavProps) {
  return (
    <>
      <div className="hidden overflow-x-auto border-b border-slate-800/90 pb-3 sm:block">
        <div role="tablist" aria-label="Company sections" className="flex w-max min-w-full items-center gap-2">
          <button type="button" role="tab" aria-selected={selectedTab === 'companies'} onClick={() => onSelectTab('companies')} className={tabStyle(selectedTab === 'companies')}>
            All Companies (5)
          </button>
          <button type="button" role="tab" aria-selected={selectedTab === 'gjelectricity'} onClick={() => onSelectTab('gjelectricity')} className={tabStyle(selectedTab === 'gjelectricity')}>
            GJ Electricity
          </button>
          <button type="button" role="tab" aria-selected={selectedTab === 'board'} onClick={() => onSelectTab('board')} className={`${tabStyle(selectedTab === 'board')} inline-flex items-center gap-2`}>
            <span>Vij Industries Board</span>
            {unreadCount > 0 && (
              <span className={`font-mono text-[10px] px-1.5 py-0.5 rounded ${selectedTab === 'board' ? 'bg-slate-950 text-amber-300' : 'bg-amber-500/20 text-amber-300'}`}>
                {unreadCount} unread
              </span>
            )}
          </button>
          <button type="button" role="tab" aria-selected={selectedTab === 'ledger'} onClick={() => onSelectTab('ledger')} className={tabStyle(selectedTab === 'ledger')}>
            Company Full Ledger
          </button>
          <button type="button" role="tab" aria-selected={selectedTab === 'employee'} onClick={() => onSelectTab('employee')} className={`${tabStyle(selectedTab === 'employee')} inline-flex items-center gap-2`}>
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
      <label className="flex items-center gap-3 border-b border-slate-800/90 pb-3 text-xs sm:hidden">
        <span className="text-slate-400">Company section</span>
        <select
          aria-label="Company section"
          value={selectedTab}
          onChange={(event) => onSelectTab(event.target.value as CompanySubTab)}
          className="min-w-0 flex-1 rounded-md border border-slate-700 bg-[#111827] px-3 py-2 text-slate-100"
        >
          <option value="companies">All Companies (5)</option>
          <option value="gjelectricity">GJ Electricity</option>
          <option value="board">Vij Industries Board{unreadCount ? ` (${unreadCount} unread)` : ''}</option>
          <option value="ledger">Company Full Ledger</option>
          <option value="employee">{hasNegativeChat ? 'VI Employee (new)' : 'VI Employee'}</option>
        </select>
      </label>
    </>
  );
}
