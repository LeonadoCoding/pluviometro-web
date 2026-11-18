import React, { useEffect, useRef, useState } from 'react';
import {
  Plus, RefreshCw, FileText, Sun, Moon, LogOut, KeyRound, Bell, Users,
  HardDriveDownload, ChevronDown, ShieldCheck
} from 'lucide-react';
import { Logo, Symbol } from './ui/primitives';

function initials(name = '') {
  const parts = name.replace(/\(.*?\)/g, '').trim().split(/[\s@._-]+/).filter(Boolean);
  return ((parts[0]?.[0] || '') + (parts[1]?.[0] || '')).toUpperCase() || 'U';
}

// Menu do usuário: perfil, ferramentas de administração e sair
function UserMenu({ currentUser, permissions, onOpenNotifications, onOpenUsers, onOpenBackup, onOpenChangePassword, onLogout }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e) => { if (!ref.current?.contains(e.target)) setOpen(false); };
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey); };
  }, [open]);

  const name = currentUser?.name || currentUser?.email || 'Usuário';
  const run = (fn) => () => { setOpen(false); fn?.(); };
  const item = 'w-full flex items-center gap-3 px-3 h-10 rounded-lg text-[14px] font-medium text-ink hover:bg-surface-control hover:text-ink-strong transition-colors text-left';

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="h-control flex items-center gap-2 pl-1 pr-1.5 sm:pr-2.5 rounded-md border border-line bg-surface-control hover:border-petrol-400 transition-colors"
      >
        <span className="w-7 h-7 rounded-[6px] bg-oilema-petrol text-white dark:bg-orange-500 dark:text-petrol-950 flex items-center justify-center text-[12px] font-bold tracking-wide">
          {initials(name)}
        </span>
        <span className="hidden lg:block text-[13px] font-semibold text-ink max-w-[140px] truncate">{permissions.roleLabel}</span>
        <ChevronDown className={`w-4 h-4 text-ink-muted transition-transform duration-200 hidden sm:block ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div role="menu" className="absolute right-0 top-[calc(100%+8px)] w-[272px] rounded-xl border border-line bg-surface shadow-modal p-1.5 z-40 [animation:drop-in_.18s_cubic-bezier(.2,.8,.2,1)_both] origin-top-right">
          <div className="px-3 pt-2.5 pb-3 mb-1 border-b border-line">
            <p className="text-[14px] font-bold text-ink-strong truncate">{name}</p>
            <p className="text-[12px] text-ink-muted truncate">{currentUser?.email}</p>
            <span className="chip chip-petrol mt-2"><ShieldCheck className="w-3.5 h-3.5" />{permissions.roleLabel}</span>
          </div>
          {permissions.canConfigureAlerts && <button role="menuitem" className={item} onClick={run(onOpenNotifications)}><Bell className="w-4 h-4 text-accent-text" />Avisos por e-mail</button>}
          {permissions.canManageUsers && <button role="menuitem" className={item} onClick={run(onOpenUsers)}><Users className="w-4 h-4 text-accent-text" />Usuários</button>}
          <button role="menuitem" className={item} onClick={run(onOpenBackup)}><HardDriveDownload className="w-4 h-4 text-accent-text" />{permissions.canImportData ? 'Backup e restauração' : 'Exportar dados'}</button>
          {permissions.canChangePassword && <button role="menuitem" className={item} onClick={run(onOpenChangePassword)}><KeyRound className="w-4 h-4 text-accent-text" />Alterar senha</button>}
          <div className="h-px bg-line my-1.5" />
          <button role="menuitem" className={`${item} hover:!text-danger`} onClick={run(onLogout)}><LogOut className="w-4 h-4" />Sair</button>
        </div>
      )}
    </div>
  );
}

export default function Header({
  availableSafras,
  selectedSafra,
  onSelectSafra,
  onOpenQuickEntry,
  onOpenBackup,
  onOpenNotifications,
  onOpenUsers,
  permissions = {},
  onOpenPdfReport,
  onOpenChangePassword,
  currentUser,
  onLogout,
  theme,
  onToggleTheme,
  onRefresh,
  isLoading
}) {
  const [spinKey, setSpinKey] = useState(0);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className={`no-print sticky top-0 z-30 border-b transition-[background-color,border-color,box-shadow] duration-300 backdrop-blur-md ${scrolled ? 'border-line shadow-card' : 'border-transparent'}`}
      style={{ backgroundColor: scrolled ? 'color-mix(in srgb, var(--surface) 90%, transparent)' : 'var(--page)' }}
    >
      <div className="max-w-content mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-[72px] gap-3">

          <a href="#topo" className="flex items-center gap-3 min-w-0 rounded-md" aria-label="Pluviômetro Oilema, início">
            <Symbol className="h-9 w-9 sm:hidden flex-shrink-0" />
            <span className="hidden sm:flex items-center"><Logo className="h-11" /></span>
            <span className="hidden min-[440px]:block min-w-0 sm:pl-3 sm:border-l border-line">
              <span className="block t-brand-title text-ink-strong uppercase leading-none text-[19px] sm:text-[22px]">Pluviômetro</span>
              <span className="block text-[12px] sm:text-[13px] leading-4 text-ink-muted truncate mt-1">UBS Placas · Barreiras/BA</span>
            </span>
          </a>

          <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
            <label className="h-control flex items-center gap-1 rounded-md border border-line bg-surface-control p-[3px]">
              <span className="text-[12px] font-semibold text-ink-muted pl-1.5 hidden md:inline">Safra</span>
              <select
                value={selectedSafra || ''}
                onChange={(e) => onSelectSafra(e.target.value)}
                aria-label="Safra exibida"
                className="num h-full rounded-[6px] border border-line bg-surface pl-2.5 pr-7 text-[13px] sm:text-[14px] font-bold text-accent-text appearance-none bg-no-repeat bg-[right_6px_center] focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--focus)]"
                style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='%23f28322' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")" }}
              >
                {availableSafras.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </label>

            <button
              type="button"
              onClick={() => { setSpinKey((k) => k + 1); onRefresh(); }}
              disabled={isLoading}
              title="Atualizar dados"
              aria-label="Atualizar dados"
              className="btn btn-icon hidden sm:inline-flex"
            >
              <RefreshCw key={spinKey} className={isLoading ? 'animate-spin text-accent-text' : ''} />
            </button>

            <button
              type="button"
              onClick={onToggleTheme}
              title={theme === 'dark' ? 'Usar tema claro' : 'Usar tema escuro'}
              aria-label={theme === 'dark' ? 'Usar tema claro' : 'Usar tema escuro'}
              className="btn btn-icon"
            >
              <span key={theme} className="flex [animation:fade-in_.3s_ease_both]">{theme === 'dark' ? <Sun /> : <Moon />}</span>
            </button>

            <button type="button" onClick={onOpenPdfReport} title="Gerar boletim em PDF" aria-label="Gerar boletim em PDF" className="btn btn-petrol px-2.5 md:px-3.5">
              <FileText />
              <span className="hidden md:inline">PDF</span>
            </button>

            <UserMenu
              currentUser={currentUser}
              permissions={permissions}
              onOpenNotifications={onOpenNotifications}
              onOpenUsers={onOpenUsers}
              onOpenBackup={onOpenBackup}
              onOpenChangePassword={onOpenChangePassword}
              onLogout={onLogout}
            />

            {permissions.canLaunchRain && (
              <button type="button" onClick={onOpenQuickEntry} className="btn btn-primary hidden sm:inline-flex">
                <Plus strokeWidth={2.5} />
                Lançar chuva
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
