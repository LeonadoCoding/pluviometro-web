import React from 'react';
import {
  CloudRain,
  Plus,
  Database,
  Server,
  RefreshCw,
  HardDriveDownload,
  FileText,
  Sun,
  Moon,
  Lock,
  LogOut,
  UserCheck,
  Key
} from 'lucide-react';

export default function Header({
  availableSafras,
  selectedSafra,
  onSelectSafra,
  isLocalMode,
  onOpenQuickEntry,
  onOpenBackup,
  onOpenPdfReport,
  onOpenLogin,
  onOpenChangePassword,
  currentUser,
  onLogout,
  theme,
  onToggleTheme,
  onRefresh,
  isLoading
}) {
  return (
    <header className="sticky top-0 z-30 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20 gap-2 sm:gap-4">
          
          {/* Logo & Identificação */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-tr from-rain-600 to-sky-400 p-0.5 shadow-lg shadow-rain-500/20 flex-shrink-0 flex items-center justify-center">
              <div className="w-full h-full bg-white dark:bg-slate-900 rounded-[10px] flex items-center justify-center">
                <CloudRain className="w-6 h-6 text-rain-500 dark:text-rain-400 animate-pulse" />
              </div>
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-base sm:text-xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-1.5">
                  PLUVIÔMETRO
                  <span className="text-xs px-2 py-0.5 rounded-full bg-rain-500/10 text-rain-600 dark:text-rain-400 border border-rain-500/20 font-semibold">
                    PRO
                  </span>
                </h1>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate hidden sm:block">
                UBS Sementes Oilema • Placas - Barreiras / BA
              </p>
            </div>
          </div>

          {/* Controles centrais e da direita */}
          <div className="flex items-center gap-1.5 sm:gap-2.5">
            
            {/* Seletor de Safra */}
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 rounded-lg p-1 border border-slate-200 dark:border-slate-700/60">
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 pl-2 hidden md:inline">
                Safra:
              </span>
              <select
                value={selectedSafra || ''}
                onChange={(e) => onSelectSafra(e.target.value)}
                className="bg-white dark:bg-slate-900 text-rain-600 dark:text-rain-300 font-bold text-xs sm:text-sm rounded-md px-2 py-1.5 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-rain-500 cursor-pointer"
              >
                {availableSafras.map((s) => (
                  <option key={s} value={s}>
                    Safra {s}
                  </option>
                ))}
              </select>
            </div>

            {/* Alternador de Tema Claro / Escuro */}
            <button
              onClick={onToggleTheme}
              title={theme === 'dark' ? 'Mudar para Tema Claro' : 'Mudar para Tema Escuro'}
              className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-700/60 transition active:scale-95"
            >
              {theme === 'dark' ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4 text-sky-600" />
              )}
            </button>

            {/* Botão Resumo em PDF */}
            <button
              onClick={onOpenPdfReport}
              title="Gerar Resumo em PDF"
              className="p-2 sm:px-3 sm:py-2 rounded-lg bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/60 border border-red-200 dark:border-red-800/50 text-xs font-semibold flex items-center gap-1.5 transition active:scale-95"
            >
              <FileText className="w-4 h-4" />
              <span className="hidden md:inline">PDF</span>
            </button>

            {/* Botão de Backup */}
            <button
              onClick={onOpenBackup}
              title="Backup e Dados"
              className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-700/60 transition active:scale-95 hidden sm:flex"
            >
              <HardDriveDownload className="w-4 h-4" />
            </button>

            {/* Botão de Atualizar */}
            <button
              onClick={onRefresh}
              disabled={isLoading}
              title="Recarregar dados"
              className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-700/60 transition active:scale-95 hidden sm:flex"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-rain-500' : ''}`} />
            </button>

            {/* Botão de Login / Usuário Autenticado */}
            {currentUser ? (
              <div className="flex items-center gap-1.5 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 px-2 sm:px-3 py-1.5 rounded-lg border border-emerald-200 dark:border-emerald-800/50 text-xs font-semibold">
                <UserCheck className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Admin</span>
                <button
                  onClick={onOpenChangePassword}
                  title="Alterar Senha de Acesso"
                  className="ml-1 p-0.5 text-emerald-600 hover:text-amber-500 dark:text-emerald-400 dark:hover:text-amber-400 transition"
                >
                  <Key className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={onLogout}
                  title="Sair do Sistema"
                  className="p-0.5 text-emerald-600 hover:text-red-500 dark:text-emerald-400 dark:hover:text-red-400 transition"
                >
                  <LogOut className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <button
                onClick={onOpenLogin}
                title="Acessar com Login Seguro"
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-700 text-xs font-semibold transition active:scale-95"
              >
                <Lock className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Entrar</span>
              </button>
            )}

            {/* Botão Principal de Lançamento */}
            <button
              onClick={onOpenQuickEntry}
              className="flex items-center gap-1 px-3 sm:px-4 py-2 bg-gradient-to-r from-rain-500 to-sky-500 hover:from-rain-600 hover:to-sky-600 text-white font-semibold text-xs sm:text-sm rounded-lg shadow-lg shadow-rain-500/25 transition active:scale-95"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span className="hidden sm:inline">Lançar Chuva</span>
              <span className="sm:hidden">Lançar</span>
            </button>

          </div>

        </div>
      </div>
    </header>
  );
}
