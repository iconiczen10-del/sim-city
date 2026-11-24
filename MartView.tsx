// MartView.tsx — Full Vij Mart control view with AI manager, charts, deliveries, and SimGod powers

import { useState } from 'react';
import { ConfirmModal } from './ConfirmModal';
import { formatDelta, formatPrice, formatSignedDelta } from './formatters';
import { MartDeliveryPanel } from './MartDeliveryPanel';
import { MartElectronicsPanel } from './MartElectronicsPanel';
import { MartLogsPanel } from './MartLogsPanel';
import { fireMartManagerSimGod, getMartFloorManager } from './martManager';
import { MartManagerPanel } from './MartManagerPanel';
import { MartPriceMoodChart } from './MartPriceMoodChart';
import { MartSabotagePanel } from './MartSabotagePanel';
import { MartStockTable } from './MartStockTable';
import { buildSabotageHandlers } from './martViewActions';
import { applyDeliverySchedule, applyOrderIntervention } from './simgodDeliveries';
import { SparkChart } from './SparkChart';
import type { CityState } from './types';

interface MartViewProps {
  city: CityState;
  onUpdateCity: (updater: (prev: CityState) => CityState) => void;
  onSelectCitizen: (citizenId: string) => void;
}

type MartTab = 'manager' | 'stock' | 'deliveries' | 'simgod';

export function MartView({ city, onUpdateCity, onSelectCitizen }: MartViewProps) {
  const [subTab, setSubTab] = useState<MartTab>('manager');
  const [pendingAction, setPendingAction] = useState<{
    title: string;
    message: string;
    run: () => void;
  } | null>(null);

  const mart = city.mart;
  const stockValue = mart.stock.reduce((sum, item) => sum + item.quantity * item.buyCost, 0);
  const revenuePts = mart.history.map((h) => ({ label: h.label, value: h.revenue }));
  const isClosed = mart.closedDaysLeft > 0 || mart.closedUntilFunded;

  const manager = getMartFloorManager(city.citizens);
  const confirm = (title: string, message: string, fn: (prev: CityState) => CityState) => {
    setPendingAction({ title, message, run: () => onUpdateCity(fn) });
  };
  const sabotageHandlers = buildSabotageHandlers(confirm);

  const kpis = [
    { label: 'Mart Cash', value: formatDelta(mart.cash), sub: isClosed ? 'SHOP CLOSED' : mart.rationingActive ? 'Rationing active' : 'Operating normally' },
    { label: "Today's Revenue", value: formatPrice(mart.todayRevenue), sub: `${mart.customersTodayIds.length} customers today` },
    { label: 'Monthly Revenue', value: formatDelta(mart.monthlyRevenue), sub: 'Current 30d cycle' },
    { label: 'Last Month Profit', value: formatSignedDelta(mart.lastMonthProfit), sub: 'After payroll & wholesale' },
    { label: 'Stock Value (Cost)', value: formatDelta(stockValue), sub: `${mart.deliveries.length} orders in transit` },
  ];

  return (
    <div className="space-y-5">
      {isClosed && (
        <div className="bg-rose-500/10 border border-rose-500/40 rounded-lg px-4 py-2.5 text-xs text-rose-200">
          Vij Mart is closed ({mart.closedUntilFunded ? 'Insolvent — add ∆1,500+ cash to reopen' : `${mart.closedDaysLeft} days remaining`}).
        </div>
      )}

      <div className="grid grid-cols-5 gap-4">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="bg-[#111827] border border-slate-800/90 rounded-lg p-4">
            <div className="text-xs text-slate-400 mb-2">{kpi.label}</div>
            <div className="font-mono text-2xl font-semibold text-slate-50 tracking-tight">{kpi.value}</div>
            <div className="text-xs text-slate-500 mt-1.5 font-mono">{kpi.sub}</div>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-1 p-1 bg-[#111827] border border-slate-800/90 rounded-lg w-fit">
        {([
          { id: 'manager', label: 'AI Manager & Charts' },
          { id: 'stock', label: 'Stock & Logs' },
          { id: 'deliveries', label: `Deliveries (${mart.deliveries.length})` },
          { id: 'simgod', label: 'SimGod Powers' },
        ] as const).map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setSubTab(t.id)}
            className={`px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
              subTab === t.id ? 'bg-slate-800 text-amber-300' : 'text-slate-400 hover:text-slate-100'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {subTab === 'manager' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <SparkChart title="Daily Sales Revenue" points={revenuePts} strokeColor="#fbbf24" formatValue={(v) => formatPrice(v)} />
            <MartPriceMoodChart history={mart.history} />
          </div>
          <MartManagerPanel
            mart={mart}
            manager={manager}
            onSelectCitizen={onSelectCitizen}
            onFireManager={() =>
              manager && confirm(
                'Fire Vij Mart Manager?',
                `Dismiss ${manager.name} immediately? Vij Mart will use Fallback AI until the Job Market hires a new Team Lead.`,
                fireMartManagerSimGod
              )
            }
          />
        </div>
      )}

      {subTab === 'stock' && (
        <div className="space-y-4">
          <MartStockTable stock={mart.stock} deliveries={mart.deliveries} martCash={mart.cash} />
          <MartElectronicsPanel stock={mart.electronicsStock} mood={mart.electronicsMood} deliveries={mart.electronicsDeliveries} />
          <MartLogsPanel mart={mart} />
        </div>
      )}

      {subTab === 'deliveries' && (
        <MartDeliveryPanel
          mart={mart}
          onUpdateSchedule={(cat, mode, gap, target) => onUpdateCity((p) => applyDeliverySchedule(p, cat, mode, gap, target))}
          onOrderAction={(id, act, days) =>
            confirm(`${act.toUpperCase()} Delivery?`, `Confirm SimGod ${act} on this wholesale order?`, (p) => applyOrderIntervention(p, id, act, days))
          }
        />
      )}

      {subTab === 'simgod' && <MartSabotagePanel mart={mart} handlers={sabotageHandlers} />}

      {pendingAction && (
        <ConfirmModal
          title={pendingAction.title}
          message={pendingAction.message}
          confirmLabel="Execute SimGod Action"
          onConfirm={() => { pendingAction.run(); setPendingAction(null); }}
          onCancel={() => setPendingAction(null)}
        />
      )}
    </div>
  );
}
