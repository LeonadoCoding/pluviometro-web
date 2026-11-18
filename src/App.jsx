import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Trash2 } from 'lucide-react';
import Header from './components/Header';
import IdentityCard from './components/IdentityCard';
import KpiCards from './components/KpiCards';
import ProgressionChart from './components/ProgressionChart';
import HistoricalComparisonChart from './components/HistoricalComparisonChart';
import ConsolidatedTable from './components/ConsolidatedTable';
import DailyRecordsList from './components/DailyRecordsList';
import QuickEntryModal from './components/QuickEntryModal';
import BackupModal from './components/BackupModal';
import NotificationsModal from './components/NotificationsModal';
import UsersModal from './components/UsersModal';
import WindyMapCard from './components/WindyMapCard';
import LoginModal from './components/LoginModal';
import LoginScreen from './components/LoginScreen';
import ChangePasswordModal from './components/ChangePasswordModal';
import PdfReportModal from './components/PdfReportModal';
import MobileBottomNav from './components/MobileBottomNav';
import { useToast, useConfirm } from './components/ui/feedback';

import { getInitialTheme, applyTheme, paintTheme } from './utils/theme';
import { formatDateBR } from './utils/dates';
import { PDF_CAPTURE_EVENT } from './utils/pdfGenerator';
import { getCurrentUser, logoutUser, isAuthenticated, getPermissions, refreshCurrentUserRole } from './services/auth';
import { checkBackendConnection, fetchDashboardData, fetchRecordsList, saveRainRecord, deleteRainRecord } from './services/api';

const IS_TEST = import.meta.env.VITE_TEST_INSTANCE === '1';
const fmt1 = (n) => (Number(n) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

export default function App() {
  const toast = useToast();
  const confirm = useConfirm();

  const [dashboardData, setDashboardData] = useState(null);
  const [records, setRecords] = useState([]);
  const [selectedSafra, setSelectedSafra] = useState('2026/2027');
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const [theme, setTheme] = useState(getInitialTheme());

  const [currentUser, setCurrentUser] = useState(getCurrentUser());
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);

  const [isQuickEntryOpen, setIsQuickEntryOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [isBackupOpen, setIsBackupOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isUsersOpen, setIsUsersOpen] = useState(false);
  const [isPdfOpen, setIsPdfOpen] = useState(false);
  const [mobileTab, setMobileTab] = useState('dashboard');

  useEffect(() => { applyTheme(theme); }, [theme]);

  // Durante a captura do PDF: tema claro temporário (sem gravar a preferência) e gráficos sem animação
  const [isCapturingPdf, setIsCapturingPdf] = useState(false);
  useEffect(() => {
    const onCapture = (e) => {
      const active = Boolean(e.detail);
      setIsCapturingPdf(active);
      paintTheme(active ? 'light' : theme);
    };
    window.addEventListener(PDF_CAPTURE_EVENT, onCapture);
    return () => window.removeEventListener(PDF_CAPTURE_EVENT, onCapture);
  }, [theme]);
  const chartsDark = theme === 'dark' && !isCapturingPdf;

  // Troca de tema com transição curta de cores (só no clique, nunca no carregamento)
  const handleToggleTheme = () => {
    const root = document.documentElement;
    root.classList.add('theme-anim');
    setTimeout(() => root.classList.remove('theme-anim'), 350);
    setTheme(t => (t === 'dark' ? 'light' : 'dark'));
  };

  const loadData = useCallback(async (safraToLoad = null) => {
    setIsLoading(true);
    setLoadError('');
    try {
      await checkBackendConnection();
      const { data } = await fetchDashboardData(safraToLoad || selectedSafra);
      setDashboardData(data);
      if (data?.currentSafra && !safraToLoad) setSelectedSafra(data.currentSafra);
      setRecords(await fetchRecordsList());
    } catch (err) {
      console.error('Erro ao carregar dados:', err);
      setLoadError(err.message || 'Não foi possível carregar os dados.');
      if (/sess[aã]o|expir/i.test(err.message || '')) setIsLoginOpen(true);
    } finally {
      setIsLoading(false);
    }
  }, [selectedSafra]);

  useEffect(() => { if (currentUser) loadData(); }, [currentUser?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Perfil de acesso (admin, alimentador, visualizador): conferido no banco a cada abertura do painel
  const permissions = getPermissions(currentUser);
  useEffect(() => {
    if (!currentUser?.id) return;
    refreshCurrentUserRole()
      .then((updated) => {
        if (!updated) { logoutUser(); setCurrentUser(null); return; }
        if (updated.role !== currentUser.role) setCurrentUser(updated);
      })
      .catch(() => { /* sem conexão: mantém o perfil já conhecido */ });
  }, [currentUser?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const denyForRole = (action) => toast(`Seu perfil (${permissions.roleLabel}) não permite ${action}.`, 'error');

  const requireAuth = (msg) => {
    if (isAuthenticated()) return true;
    toast(msg, 'info');
    setIsLoginOpen(true);
    return false;
  };

  const handleSelectSafra = (safra) => {
    setSelectedSafra(safra);
    loadData(safra);
  };

  const handleOpenQuickEntry = () => {
    if (!requireAuth('Entre de novo para lançar chuvas.')) return;
    if (!permissions.canLaunchRain) return denyForRole('lançar chuvas');
    setEditingRecord(null);
    setIsQuickEntryOpen(true);
  };

  const handleSaveRain = async (recordData) => {
    if (!isAuthenticated()) { setIsLoginOpen(true); throw new Error('Sua sessão terminou. Entre de novo e grave outra vez.'); }
    if (!permissions.canLaunchRain) { denyForRole('lançar chuvas'); throw new Error(`Seu perfil (${permissions.roleLabel}) não permite lançar chuvas.`); }
    try {
      await saveRainRecord(recordData);
    } catch (err) {
      if (/sess[aã]o|autorizado|token/i.test(err.message || '')) setIsLoginOpen(true);
      throw err;
    }
    toast(`${fmt1(recordData.rain_mm)} mm em ${formatDateBR(recordData.date)} gravados.`);
    await loadData(selectedSafra);
  };

  const handleDeleteRain = async (record) => {
    if (!requireAuth('Entre de novo para excluir leituras.')) return;
    if (!permissions.canDeleteRain) return denyForRole('excluir leituras');
    const ok = await confirm({
      title: 'Excluir esta leitura?',
      message: `A leitura de ${fmt1(record.rain_mm)} mm em ${formatDateBR(record.date)} sai do diário e de todos os cálculos.`,
      confirmLabel: 'Excluir leitura',
      danger: true,
      icon: Trash2
    });
    if (!ok) return;
    try {
      await deleteRainRecord(record);
      toast(`Leitura de ${formatDateBR(record.date)} excluída.`);
      await loadData(selectedSafra);
    } catch (err) {
      toast('Não foi possível excluir: ' + err.message, 'error');
    }
  };

  const handleEditRain = (record) => {
    if (!requireAuth('Entre de novo para corrigir leituras.')) return;
    if (!permissions.canLaunchRain) return denyForRole('corrigir leituras');
    setEditingRecord(record);
    setIsQuickEntryOpen(true);
  };

  const handleLogout = () => {
    logoutUser();
    setCurrentUser(null);
    setDashboardData(null);
    setRecords([]);
    toast('Você saiu do Pluviômetro.', 'info');
  };

  const availableSafras = dashboardData?.availableSafras || ['2022/2023', '2023/2024', '2024/2025', '2025/2026', '2026/2027'];
  const lastRecord = useMemo(() => records[0] || null, [records]);

  if (!currentUser) {
    return (
      <LoginScreen
        onLoginSuccess={(user) => {
          setCurrentUser(user);
          toast(`Olá, ${(user.name || user.username || '').split(/[\s@]/)[0]}. Painel liberado.`);
        }}
        theme={theme}
        onToggleTheme={handleToggleTheme}
      />
    );
  }

  // No celular, a barra inferior escolhe a vista; no computador tudo aparece
  const show = (...tabs) => (tabs.includes(mobileTab) ? '' : 'hidden sm:block');

  return (
    <div className="min-h-screen bg-page text-ink flex flex-col pb-24 sm:pb-0">
      {IS_TEST && (
        <div className="no-print bg-oilema-petrol text-white text-[12px] leading-4 text-center px-4 py-1.5 font-semibold tracking-wide">
          INSTÂNCIA DE TESTE<span className="hidden sm:inline"> · dados locais em .test-data, sem o Supabase real</span>
        </div>
      )}

      <Header
        availableSafras={availableSafras}
        selectedSafra={selectedSafra}
        onSelectSafra={handleSelectSafra}
        onOpenQuickEntry={handleOpenQuickEntry}
        onOpenBackup={() => setIsBackupOpen(true)}
        onOpenNotifications={() => setIsNotificationsOpen(true)}
        onOpenUsers={() => setIsUsersOpen(true)}
        permissions={permissions}
        onOpenPdfReport={() => setIsPdfOpen(true)}
        onOpenChangePassword={() => setIsChangePasswordOpen(true)}
        currentUser={currentUser}
        onLogout={handleLogout}
        theme={theme}
        onToggleTheme={handleToggleTheme}
        onRefresh={() => loadData(selectedSafra)}
        isLoading={isLoading}
      />

      <main className="flex-1 max-w-content w-full mx-auto px-4 sm:px-6 lg:px-8 pt-3 sm:pt-6 pb-8 space-y-4 sm:space-y-5">
        {loadError && !dashboardData && (
          <div className="panel panel-pad flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-[rgba(220,38,38,.35)]">
            <div>
              <p className="font-bold text-ink-strong">Não foi possível carregar as leituras</p>
              <p className="t-body-small text-ink-muted mt-0.5">{loadError}</p>
            </div>
            <button type="button" className="btn btn-primary" onClick={() => loadData(selectedSafra)}>Tentar de novo</button>
          </div>
        )}

        <div className={show('dashboard')}>
          <IdentityCard selectedSafra={selectedSafra} lastRecord={lastRecord} mapAnchorId="mapa-chuva" />
        </div>

        <section aria-label="Diário de leituras" className={show('records', 'dashboard')}>
          <DailyRecordsList
            records={records}
            selectedSafra={selectedSafra}
            onEditRecord={handleEditRain}
            onDeleteRecord={handleDeleteRain}
            canEdit={permissions.canLaunchRain}
            canDelete={permissions.canDeleteRain}
          />
        </section>

        <section aria-label="Indicadores" className={show('dashboard')}>
          <KpiCards
            currentSafraMetrics={dashboardData?.currentSafraMetrics}
            kpis={dashboardData?.kpis}
            selectedSafra={selectedSafra}
            safraMetricsMap={dashboardData?.safraMetricsMap || {}}
            availableSafras={availableSafras}
            historicalMonthAvg={dashboardData?.historicalMonthAvg || {}}
          />
        </section>

        <section aria-label="Gráficos" className={`grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5 ${mobileTab === 'charts' || mobileTab === 'dashboard' ? '' : 'hidden sm:grid'}`}>
          {dashboardData ? (
            <>
              <ProgressionChart
                progression={dashboardData?.currentSafraMetrics?.progression}
                selectedSafra={selectedSafra}
                historicalMonthAvg={dashboardData?.historicalMonthAvg || {}}
                isDark={chartsDark}
                animate={!isCapturingPdf}
              />
              <HistoricalComparisonChart
                historicalProgression={dashboardData?.historicalProgression}
                availableSafras={availableSafras}
                currentSafra={selectedSafra}
                isDark={chartsDark}
                animate={!isCapturingPdf}
              />
            </>
          ) : (
            [0, 1].map(i => <div key={i} className="panel panel-pad h-[440px]" aria-hidden="true"><span className="skeleton block h-5 w-1/2" /><span className="skeleton block h-[340px] mt-6" /></div>)
          )}
        </section>

        <section id="mapa-chuva" aria-label="Mapa de chuva" className={`scroll-mt-24 ${show('charts', 'dashboard')}`}>
          <WindyMapCard />
        </section>

        <section aria-label="Tabela consolidada" className={show('table', 'dashboard')}>
          <ConsolidatedTable
            consolidatedMatrix={dashboardData?.consolidatedMatrix}
            availableSafras={availableSafras}
            safraMetricsMap={dashboardData?.safraMetricsMap || {}}
            historicalMonthAvg={dashboardData?.historicalMonthAvg || {}}
            currentSafra={selectedSafra}
          />
        </section>
      </main>

      <footer className="no-print border-t border-line">
        <div className="max-w-content mx-auto px-4 sm:px-6 lg:px-8 py-5 flex flex-col sm:flex-row items-center justify-between gap-1.5 text-[12px] leading-4 text-ink-muted text-center">
          <span>Pluviômetro · UBS Sementes Oilema, Placas · Barreiras/BA</span>
          <span className="font-display font-semibold tracking-wide uppercase text-[12px]">Sementes para o novo campo</span>
        </div>
      </footer>

      <QuickEntryModal
        isOpen={isQuickEntryOpen}
        onClose={() => { setIsQuickEntryOpen(false); setEditingRecord(null); }}
        onSave={handleSaveRain}
        editingRecord={editingRecord}
        records={records}
      />
      <BackupModal isOpen={isBackupOpen} onClose={() => setIsBackupOpen(false)} onDataChanged={() => loadData(selectedSafra)} canImportData={permissions.canImportData} />
      <NotificationsModal isOpen={isNotificationsOpen && permissions.canConfigureAlerts} onClose={() => setIsNotificationsOpen(false)} />
      <LoginModal isOpen={isLoginOpen} onClose={() => setIsLoginOpen(false)} onLoginSuccess={(user) => { setCurrentUser(user); toast('Sessão renovada.'); }} />
      <UsersModal isOpen={isUsersOpen && permissions.canManageUsers} onClose={() => setIsUsersOpen(false)} currentUser={currentUser} />
      <ChangePasswordModal isOpen={isChangePasswordOpen && permissions.canChangePassword} onClose={() => setIsChangePasswordOpen(false)} onSuccess={() => toast('Senha alterada. Use a nova no próximo acesso.')} />
      <PdfReportModal
        isOpen={isPdfOpen}
        onClose={() => setIsPdfOpen(false)}
        selectedSafra={selectedSafra}
        currentSafraMetrics={dashboardData?.currentSafraMetrics}
        kpis={dashboardData?.kpis}
        safraMetricsMap={dashboardData?.safraMetricsMap || {}}
        availableSafras={availableSafras}
        recentRecords={records.slice(0, 10)}
        historicalMonthAvg={dashboardData?.historicalMonthAvg || {}}
      />

      <MobileBottomNav
        activeTab={mobileTab}
        onSelectTab={(t) => { setMobileTab(t); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
        onOpenQuickEntry={handleOpenQuickEntry}
        canLaunchRain={permissions.canLaunchRain}
      />
    </div>
  );
}
