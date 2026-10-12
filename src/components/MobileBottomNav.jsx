import React from 'react';
import { LayoutDashboard, TrendingUp, Plus, GitCompare, ListFilter } from 'lucide-react';

export default function MobileBottomNav({
  activeTab,
  onSelectTab,
  onOpenQuickEntry
}) {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 sm:hidden bg-white/95 dark:bg-slate-900/95 backdrop-blur-lg border-t border-slate-200 dark:border-slate-800 px-2 py-1.5 flex items-center justify-around safe-area-pb transition-colors shadow-lg">
      
      <button
        onClick={() => onSelectTab('dashboard')}
        className={`flex flex-col items-center justify-center w-14 py-1 rounded-lg transition ${
          activeTab === 'dashboard' ? 'text-rain-600 dark:text-rain-400 font-bold' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'
        }`}
      >
        <LayoutDashboard className="w-5 h-5 mb-0.5" />
        <span className="text-[10px]">Painel</span>
      </button>

      <button
        onClick={() => onSelectTab('records')}
        className={`flex flex-col items-center justify-center w-14 py-1 rounded-lg transition ${
          activeTab === 'records' ? 'text-rain-600 dark:text-rain-400 font-bold' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'
        }`}
      >
        <ListFilter className="w-5 h-5 mb-0.5" />
        <span className="text-[10px]">Diário</span>
      </button>

      {/* Botão de Lançar Chuva em Destaque Central */}
      <button
        onClick={onOpenQuickEntry}
        className="-mt-5 w-12 h-12 rounded-full bg-gradient-to-tr from-rain-600 to-sky-400 text-white flex items-center justify-center shadow-lg shadow-rain-500/40 active:scale-95 transition"
      >
        <Plus className="w-6 h-6 stroke-[3]" />
      </button>

      <button
        onClick={() => onSelectTab('charts')}
        className={`flex flex-col items-center justify-center w-14 py-1 rounded-lg transition ${
          activeTab === 'charts' ? 'text-rain-600 dark:text-rain-400 font-bold' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'
        }`}
      >
        <TrendingUp className="w-5 h-5 mb-0.5" />
        <span className="text-[10px]">Gráficos</span>
      </button>

      <button
        onClick={() => onSelectTab('table')}
        className={`flex flex-col items-center justify-center w-14 py-1 rounded-lg transition ${
          activeTab === 'table' ? 'text-rain-600 dark:text-rain-400 font-bold' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'
        }`}
      >
        <GitCompare className="w-5 h-5 mb-0.5" />
        <span className="text-[10px]">Tabela</span>
      </button>

    </div>
  );
}
