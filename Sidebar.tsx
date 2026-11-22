// Sidebar.tsx — Navigation sidebar with Overview, Citizens, Companies, Job Market, Vij Mart, and Events

import { Briefcase, Building2, LayoutDashboard, RotateCcw, ScrollText, Store, Users } from 'lucide-react';
import type { NavTab } from './types';

interface SidebarProps {
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  citizenCount: number;
  vacancyCount: number;
  eventCount: number;
  martLowStockCount: number;
  onRequestNewCity: () => void;
}

export function Sidebar({
  activeTab,
  onSelectTab,
  citizenCount,
  vacancyCount,
  eventCount,
  martLowStockCount,
  onRequestNewCity,
}: SidebarProps) {
  const navItems: { id: NavTab; label: string; count?: number; icon: typeof LayoutDashboard }[] = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'citizens', label: 'Citizens', count: citizenCount, icon: Users },
    { id: 'companies', label: 'Companies', count: 4, icon: Building2 },
    { id: 'jobs', label: 'Job Market', count: vacancyCount > 0 ? vacancyCount : undefined, icon: Briefcase },
    { id: 'mart', label: 'Vij Mart', count: martLowStockCount > 0 ? martLowStockCount : undefined, icon: Store },
    { id: 'events', label: 'Event Log', count: eventCount, icon: ScrollText },
  ];

  return (
    <aside className="w-60 shrink-0 border-r border-slate-800/90 bg-[#0c111d] flex flex-col justify-between p-4">
      <nav className="space-y-1" aria-label="Main navigation">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectTab(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-md text-sm font-medium transition-colors whitespace-nowrap cursor-pointer ${
                active
                  ? 'bg-slate-800/90 text-slate-50 border border-slate-700/80'
                  : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/40 border border-transparent'
              }`}
            >
              <span className="flex items-center gap-2.5">
                <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span>{item.label}</span>
              </span>
              {typeof item.count === 'number' && (
                <span className={`font-mono text-xs ${item.id === 'mart' || item.id === 'jobs' ? 'text-amber-300' : 'text-slate-400'}`}>
                  {item.count}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      <div className="pt-4 border-t border-slate-800/80">
        <button
          type="button"
          onClick={onRequestNewCity}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-md text-xs font-medium text-slate-300 bg-slate-900 border border-slate-800 hover:border-slate-700 hover:text-slate-50 hover:bg-slate-800/70 transition-colors whitespace-nowrap cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
          <span>New City</span>
        </button>
      </div>
    </aside>
  );
}
