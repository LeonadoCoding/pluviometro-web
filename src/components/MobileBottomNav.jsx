import React from 'react';
import { LayoutDashboard, NotebookPen, Plus, BarChart3, Table2 } from 'lucide-react';

const TABS = [
  { id: 'dashboard', label: 'Painel', icon: LayoutDashboard },
  { id: 'records', label: 'Diário', icon: NotebookPen },
  { id: 'charts', label: 'Gráficos', icon: BarChart3 },
  { id: 'table', label: 'Tabela', icon: Table2 }
];

function Tab({ tab, active, onSelect }) {
  const Icon = tab.icon;
  return (
    <button
      type="button"
      onClick={() => onSelect(tab.id)}
      aria-current={active ? 'page' : undefined}
      className={`relative flex flex-col items-center justify-center gap-1 flex-1 h-14 rounded-lg transition-colors ${active ? 'text-accent-text' : 'text-ink-muted hover:text-ink-strong'}`}
    >
      <span className={`absolute top-0 h-[3px] rounded-full bg-accent transition-all duration-300 ${active ? 'w-6 opacity-100' : 'w-0 opacity-0'}`} />
      <Icon className="w-[22px] h-[22px]" strokeWidth={active ? 2.4 : 2} />
      <span className={`text-[11px] leading-3 ${active ? 'font-bold' : 'font-medium'}`}>{tab.label}</span>
    </button>
  );
}

// Barra inferior do celular: quatro vistas e o lançamento de chuva no centro
export default function MobileBottomNav({ activeTab, onSelectTab, onOpenQuickEntry, canLaunchRain = true }) {
  const left = TABS.slice(0, 2);
  const right = TABS.slice(2);
  return (
    <nav
      aria-label="Seções do painel"
      className="no-print fixed bottom-0 inset-x-0 z-40 sm:hidden border-t border-line px-2 pt-1 pb-[max(6px,env(safe-area-inset-bottom))] flex items-end shadow-[0_-6px_20px_rgba(17,30,35,.08)]"
      style={{ backgroundColor: 'color-mix(in srgb, var(--surface) 94%, transparent)', backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)' }}
    >
      {left.map(t => <Tab key={t.id} tab={t} active={activeTab === t.id} onSelect={onSelectTab} />)}
      {canLaunchRain && (
        <div className="flex-1 flex justify-center">
          <button
            type="button"
            onClick={onOpenQuickEntry}
            aria-label="Lançar chuva"
            className="-mt-6 w-14 h-14 rounded-full text-white flex items-center justify-center shadow-accent ring-4 ring-[color:var(--surface)] active:scale-95 transition-transform"
            style={{ background: 'linear-gradient(135deg, var(--oilema-orange), var(--oilema-flame))' }}
          >
            <Plus className="w-7 h-7" strokeWidth={2.75} />
          </button>
        </div>
      )}
      {right.map(t => <Tab key={t.id} tab={t} active={activeTab === t.id} onSelect={onSelectTab} />)}
    </nav>
  );
}
