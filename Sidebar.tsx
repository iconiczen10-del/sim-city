// Sidebar.tsx — Responsive navigation and simulation utilities
import { AtSign, Briefcase, Building2, Home, LayoutDashboard, RotateCcw, ScrollText, Store, Upload, Users } from 'lucide-react';
import { useRef } from 'react';
import { ExportMenu } from './ExportMenu';
import type { NavTab } from './types';

interface SidebarProps {
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  citizenCount: number;
  vacancyCount: number;
  eventCount: number;
  martLowStockCount: number;
  homelessCount: number;
  boardUnreadCount: number;
  sharityPostCount: number;
  sharityUnreadCount: number;
  onExportCity: (mode: 'download' | 'upload') => void;
  onImportJson: (file: File) => void;
  onRequestNewCity: () => void;
}

export function Sidebar({ activeTab, onSelectTab, citizenCount, vacancyCount, eventCount, martLowStockCount, homelessCount, boardUnreadCount, sharityPostCount, sharityUnreadCount, onExportCity, onImportJson, onRequestNewCity }: SidebarProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const navItems: { id: NavTab; label: string; count?: number; icon: typeof LayoutDashboard }[] = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'citizens', label: 'Citizens', count: citizenCount, icon: Users },
    { id: 'housing', label: 'Housing', count: homelessCount || undefined, icon: Home },
    { id: 'companies', label: 'Companies', count: 5, icon: Building2 },
    { id: 'jobs', label: 'Job Market', count: vacancyCount || undefined, icon: Briefcase },
    { id: 'mart', label: 'Vij Mart', count: martLowStockCount || undefined, icon: Store },
    { id: 'sharity', label: 'Sharity', count: sharityPostCount || undefined, icon: AtSign },
    { id: 'events', label: 'Event Log', count: eventCount, icon: ScrollText },
  ];
  const showUnread = (id: NavTab) => (id === 'companies' && boardUnreadCount > 0) || (id === 'sharity' && sharityPostCount > 0 && sharityUnreadCount > 0);
  const unreadCount = (id: NavTab) => id === 'sharity' ? sharityUnreadCount : boardUnreadCount;
  const renderUtilities = (mobile: boolean) => (
    <>
      <ExportMenu onDownload={() => onExportCity('download')} onUpload={() => onExportCity('upload')} mobile={mobile} />
      <button type="button" onClick={() => fileRef.current?.click()} className="flex items-center justify-center gap-1.5 rounded-md border border-slate-800 bg-slate-900 px-2 py-1.5 text-[11px] font-medium text-slate-300 hover:text-slate-50 cursor-pointer" aria-label="Import city data"><Upload className="size-3" aria-hidden="true" /><span>Import</span></button>
      <button type="button" onClick={onRequestNewCity} className="flex items-center justify-center gap-1.5 rounded-md border border-slate-800 bg-slate-900 px-2 py-1.5 text-[11px] font-medium text-slate-300 hover:text-slate-50 cursor-pointer"><RotateCcw className="size-3" aria-hidden="true" /><span>New City</span></button>
    </>
  );
  return (
    <>
      <aside className="hidden w-60 shrink-0 flex-col justify-between border-r border-slate-800/90 bg-[#0c111d] p-4 sm:flex">
        <nav className="flex flex-col gap-1" aria-label="Main navigation">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.id;
            return <button key={item.id} type="button" onClick={() => onSelectTab(item.id)} aria-current={active ? 'page' : undefined} className={`flex w-full items-center justify-between rounded-md border px-3 py-2.5 text-sm font-medium transition-colors ${active ? 'border-slate-700/80 bg-slate-800/90 text-slate-50' : 'border-transparent text-slate-400 hover:bg-slate-800/40 hover:text-slate-100'}`}>
              <span className="flex items-center gap-2.5"><Icon className="size-4 shrink-0" aria-hidden="true" /><span>{item.label}</span></span>
              <span className="flex items-center gap-2 font-mono text-xs tabular-nums">{showUnread(item.id) && <span className="rounded bg-amber-500 px-1.5 py-0.5 text-[10px] font-semibold text-slate-950">{unreadCount(item.id)} new</span>}{typeof item.count === 'number' && <span className={item.id === 'mart' || item.id === 'jobs' || item.id === 'housing' ? 'text-amber-300' : 'text-slate-400'}>{item.count}</span>}</span>
            </button>;
          })}
        </nav>
        <div className="flex flex-col gap-2 border-t border-slate-800/80 pt-4">
          <div className="grid grid-cols-2 gap-2">{renderUtilities(false)}</div>
        </div>
      </aside>
      <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={(event) => { const file = event.target.files?.[0]; if (file) onImportJson(file); event.target.value = ''; }} />
      <nav className="fixed inset-x-0 bottom-0 z-40 flex flex-col border-t border-slate-800/90 bg-[#0c111d]/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_24px_rgba(0,0,0,0.25)] backdrop-blur sm:hidden" aria-label="Mobile navigation">
        <div className="grid grid-cols-8 px-1 pt-1.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.id;
            return <button key={item.id} type="button" onClick={() => onSelectTab(item.id)} aria-label={item.label} aria-current={active ? 'page' : undefined} title={item.label} className={`relative flex min-w-0 flex-col items-center justify-center gap-0.5 rounded-md py-1.5 ${active ? 'text-amber-300' : 'text-slate-400'}`}>
              <Icon className="size-[18px]" aria-hidden="true" />
              <span className="max-w-full truncate text-[8px] leading-3">{item.label}</span>
              {showUnread(item.id) && <span className="absolute right-1 top-0 size-1.5 rounded-full bg-amber-400" aria-label={`${unreadCount(item.id)} unread`} />}
            </button>;
          })}
        </div>
        <div className="flex items-center justify-center gap-2 border-t border-slate-800/70 px-2 py-1.5">{renderUtilities(true)}</div>
      </nav>
    </>
  );
}
