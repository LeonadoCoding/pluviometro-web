import React, { useState, useEffect, useCallback } from 'react';
import Header from './components/Header';
import KpiCards from './components/KpiCards';
import ProgressionChart from './components/ProgressionChart';
import HistoricalComparisonChart from './components/HistoricalComparisonChart';
import ConsolidatedTable from './components/ConsolidatedTable';
import DailyRecordsList from './components/DailyRecordsList';
import QuickEntryModal from './components/QuickEntryModal';
import BackupModal from './components/BackupModal';
import NotificationsModal from './components/NotificationsModal';
import UsersModal from './components/UsersModal';
import LoginModal from './components/LoginModal';
import LoginScreen from './components/LoginScreen';
import ChangePasswordModal from './components/ChangePasswordModal';
import PdfReportModal from './components/PdfReportModal';
import MobileBottomNav from './components/MobileBottomNav';

import { getInitialTheme, applyTheme } from './utils/theme';
import { PDF_CAPTURE_EVENT } from './utils/pdfGenerator';
import { getCurrentUser, logoutUser, isAuthenticated, getPermissions, refreshCurrentUserRole } from './services/auth';
import {
  checkBackendConnection,
  fetchDashboardData,
  fetchRecordsList,
  saveRainRecord,
  deleteRainRecord
} from './services/api';

export default function App() {
  const [dashboardData, setDashboardData] = useState(null);
  const [records, setRecords] = useState([]);
  const [selectedSafra, setSelectedSafra] = useState('2026/2027');
  const [isLocalMode, setIsLocalMode] = useState(true);
  const [isLoading, setIsLoading] = useState(true);

  // Tema Claro / Escuro
  const [theme, setTheme] = useState(getInitialTheme());

  // Autenticação Segura
  const [currentUser, setCurrentUser] = useState(getCurrentUser());
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);

  // Modais e Navegação
  const [isQuickEntryOpen, setIsQuickEntryOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [isBackupOpen, setIsBackupOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isUsersOpen, setIsUsersOpen] = useState(false);
  const [isPdfOpen, setIsPdfOpen] = useState(false);
  const [mobileTab, setMobileTab] = useState('dashboard');
  const [toastMsg, setToastMsg] = useState(null);

  // Aplica o tema na inicialização
  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  // Durante a captura do PDF: tema claro temporário (sem salvar a preferência) e gráficos sem animação
  const [isCapturingPdf, setIsCapturingPdf] = useState(false);
  useEffect(() => {
    const onCapture = (e) => {
      const active = Boolean(e.detail);
      setIsCapturingPdf(active);
      const root = document.documentElement;
      if (active) {
        root.classList.remove('dark');
        root.classList.add('light');
      } else {
        applyTheme(theme);
      }
    };
    window.addEventListener(PDF_CAPTURE_EVENT, onCapture);
    return () => window.removeEventListener(PDF_CAPTURE_EVENT, onCapture);
  }, [theme]);
  const chartsDark = theme === 'dark' && !isCapturingPdf;

  const handleToggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    applyTheme(nextTheme);
  };

  const showToast = (text) => {
    setToastMsg(text);
    setTimeout(() => setToastMsg(null), 3500);
  };

  const loadData = useCallback(async (safraToLoad = null) => {
    setIsLoading(true);
    try {
      await checkBackendConnection();
      const currentSafraTarget = safraToLoad || selectedSafra;
      const { data, isLocalMode: local } = await fetchDashboardData(currentSafraTarget);
      
      setIsLocalMode(local);
      setDashboardData(data);
      if (data?.currentSafra && !safraToLoad) {
        setSelectedSafra(data.currentSafra);
      }

      const recs = await fetchRecordsList();
      setRecords(recs);
    } catch (err) {
      console.error('Erro ao carregar dados:', err);
    } finally {
      setIsLoading(false);
    }
  }, [selectedSafra]);

  useEffect(() => {
    if (currentUser) {
      loadData();
    }
  }, [currentUser]);

  // Perfil de acesso (admin, alimentador, visualizador): conferido no banco a cada abertura do painel
  const permissions = getPermissions(currentUser);
  useEffect(() => {
    if (!currentUser?.id) return;
    refreshCurrentUserRole()
      .then((updated) => {
        if (!updated) {
          logoutUser();
          setCurrentUser(null);
          return;
        }
        if (updated.role !== currentUser.role) setCurrentUser(updated);
      })
      .catch(() => { /* sem conexão: mantém o perfil já conhecido */ });
  }, [currentUser?.id]);

  const denyForRole = (action) => {
    showToast(`Seu perfil (${permissions.roleLabel}) não permite ${action}.`);
  };

  const handleSelectSafra = (safra) => {
    setSelectedSafra(safra);
    loadData(safra);
  };

  // Verificação de autenticação antes de qualquer gravação
  const handleOpenQuickEntry = () => {
    if (!isAuthenticated()) {
      showToast('Autentique-se com login e senha para lançar novos registros.');
      setIsLoginOpen(true);
      return;
    }
    if (!permissions.canLaunchRain) {
      denyForRole('lançar chuvas');
      return;
    }
    setEditingRecord(null);
    setIsQuickEntryOpen(true);
  };

  const handleSaveRain = async (recordData) => {
    if (!isAuthenticated()) {
      setIsLoginOpen(true);
      return;
    }
    if (!permissions.canLaunchRain) {
      denyForRole('lançar chuvas');
      return;
    }
    try {
      await saveRainRecord(recordData);
      showToast(`Chuva de ${recordData.rain_mm} mm em ${recordData.date} gravada com sucesso!`);
      await loadData(selectedSafra);
    } catch (err) {
      if (err.message?.includes('autorizado') || err.message?.includes('Token')) {
        setIsLoginOpen(true);
      }
      showToast('Erro ao salvar: ' + err.message);
    }
  };

  const handleDeleteRain = async (record) => {
    if (!isAuthenticated()) {
      showToast('Autentique-se para excluir registros.');
      setIsLoginOpen(true);
      return;
    }
    if (!permissions.canDeleteRain) {
      denyForRole('excluir registros');
      return;
    }
    if (window.confirm(`Deseja excluir o registro de ${record.rain_mm} mm do dia ${record.date}?`)) {
      try {
        await deleteRainRecord(record);
        showToast(`Registro de ${record.date} excluído.`);
        await loadData(selectedSafra);
      } catch (err) {
        showToast('Erro ao excluir: ' + err.message);
      }
    }
  };

  const handleEditRain = (record) => {
    if (!isAuthenticated()) {
      showToast('Autentique-se para editar registros.');
      setIsLoginOpen(true);
      return;
    }
    if (!permissions.canLaunchRain) {
      denyForRole('editar registros');
      return;
    }
    setEditingRecord(record);
    setIsQuickEntryOpen(true);
  };

  const handleLogout = () => {
    logoutUser();
    setCurrentUser(null);
    showToast('Sessão encerrada com sucesso.');
  };

  const availableSafras = dashboardData?.availableSafras || ['2022/2023', '2023/2024', '2024/2025', '2025/2026', '2026/2027'];

  // Portão de Entrada: Se não autenticado, exibe a tela de login diretamente
  if (!currentUser) {
    return (
      <LoginScreen
        onLoginSuccess={(user) => {
          setCurrentUser(user);
          showToast(`Bem-vindo, ${user.name || user.username}! Acesso liberado.`);
          loadData();
        }}
        theme={theme}
        onToggleTheme={handleToggleTheme}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 pb-20 sm:pb-12 flex flex-col transition-colors">
      
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed top-20 right-4 z-50 bg-rain-600 text-white font-medium text-xs sm:text-sm px-4 py-2.5 rounded-xl shadow-xl shadow-rain-500/30 flex items-center gap-2 animate-bounce">
          <span>🌧️ {toastMsg}</span>
        </div>
      )}

      {/* Header Fixo */}
      <Header
        availableSafras={availableSafras}
        selectedSafra={selectedSafra}
        onSelectSafra={handleSelectSafra}
        isLocalMode={isLocalMode}
        onOpenQuickEntry={handleOpenQuickEntry}
        onOpenBackup={() => setIsBackupOpen(true)}
        onOpenNotifications={() => setIsNotificationsOpen(true)}
        onOpenUsers={() => setIsUsersOpen(true)}
        permissions={permissions}
        onOpenPdfReport={() => setIsPdfOpen(true)}
        onOpenLogin={() => setIsLoginOpen(true)}
        onOpenChangePassword={() => setIsChangePasswordOpen(true)}
        currentUser={currentUser}
        onLogout={handleLogout}
        theme={theme}
        onToggleTheme={handleToggleTheme}
        onRefresh={() => loadData(selectedSafra)}
        isLoading={isLoading}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-5">
        
        {/* 1. CABEÇALHO DE IDENTIFICAÇÃO (UBS Sementes Oilema • Placas - Barreiras) */}
        <div className="bg-white dark:bg-slate-900 border-l-4 border-l-rain-500 dark:bg-gradient-to-r dark:from-slate-900 dark:via-slate-900/90 dark:to-rain-950/30 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-6 shadow-xs dark:shadow-none flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-oilema-petrol/10 dark:bg-slate-800 text-oilema-petrol dark:text-slate-200 border border-oilema-petrol/20 dark:border-slate-700">
                PROPRIEDADE AGRÍCOLA
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Região Oeste da Bahia (Cerrado)
              </span>
            </div>
            <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white mt-1">
              UBS Sementes Oilema • Placas - Barreiras
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Ciclo Pluviométrico Hidrológico: Início em <strong>Outubro</strong> até <strong>Setembro</strong> do ano seguinte.
            </p>
          </div>

          <div className="flex items-center gap-2 sm:shrink-0">
            <div className="w-full sm:w-auto bg-slate-100 dark:bg-slate-800/80 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700/60 flex sm:block items-center justify-between sm:text-right">
              <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wide font-semibold block">
                Visualizando
              </span>
              <span className="text-sm sm:text-base font-extrabold text-rain-600 dark:text-rain-400">
                Safra {selectedSafra}
              </span>
            </div>
          </div>
        </div>

        {/* 2. DIÁRIO DE LANÇAMENTOS (Posicionado estrategicamente logo abaixo do cabeçalho de identificação) */}
        <section className={mobileTab !== 'records' && mobileTab !== 'dashboard' ? 'hidden sm:block' : ''}>
          <DailyRecordsList
            records={records}
            selectedSafra={selectedSafra}
            onEditRecord={handleEditRain}
            onDeleteRecord={handleDeleteRain}
            canEdit={permissions.canLaunchRain}
            canDelete={permissions.canDeleteRain}
          />
        </section>

        {/* 3. CARDS DE KPIS (Acumulado, Média Diária do Mês sem seleção manual, Recorde, Extremos) */}
        <section className={mobileTab !== 'dashboard' ? 'hidden sm:block' : ''}>
          <KpiCards
            currentSafraMetrics={dashboardData?.currentSafraMetrics}
            kpis={dashboardData?.kpis}
            selectedSafra={selectedSafra}
            safraMetricsMap={dashboardData?.safraMetricsMap || {}}
            availableSafras={availableSafras}
            historicalMonthAvg={dashboardData?.historicalMonthAvg || {}}
          />
        </section>

        {/* 4. GRÁFICOS: PROGRESSO E HISTÓRICO SOBREPOSTO */}
        <section className={`grid grid-cols-1 lg:grid-cols-2 gap-5 ${mobileTab !== 'charts' && mobileTab !== 'dashboard' ? 'hidden sm:grid' : ''}`}>
          {/* Gráfico 1: Progresso da Safra Selecionada */}
          <ProgressionChart
            progression={dashboardData?.currentSafraMetrics?.progression}
            selectedSafra={selectedSafra}
            isDark={chartsDark}
            animate={!isCapturingPdf}
          />

          {/* Gráfico 2: Comparativo Histórico Sobreposto */}
          <HistoricalComparisonChart
            historicalProgression={dashboardData?.historicalProgression}
            availableSafras={availableSafras}
            currentSafra={selectedSafra}
            isDark={chartsDark}
            animate={!isCapturingPdf}
          />
        </section>

        {/* 5. TABELA CONSOLIDADA LADO A LADO */}
        <section className={mobileTab !== 'table' && mobileTab !== 'dashboard' ? 'hidden sm:block' : ''}>
          <ConsolidatedTable
            consolidatedMatrix={dashboardData?.consolidatedMatrix}
            availableSafras={availableSafras}
            safraMetricsMap={dashboardData?.safraMetricsMap || {}}
            historicalMonthAvg={dashboardData?.historicalMonthAvg || {}}
            currentSafra={selectedSafra}
          />
        </section>

      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-800/80 py-4 text-center text-xs text-slate-500">
        <p>Pluviômetro Web • UBS Sementes Oilema • Barreiras/BA • Hospedado no GitHub Pages • Banco Supabase</p>
      </footer>

      {/* Modal de Entrada Diária Ágil */}
      <QuickEntryModal
        isOpen={isQuickEntryOpen}
        onClose={() => { setIsQuickEntryOpen(false); setEditingRecord(null); }}
        onSave={handleSaveRain}
        initialDate={editingRecord?.date || null}
      />

      {/* Modal de Backup e Restauração */}
      <BackupModal
        isOpen={isBackupOpen}
        onClose={() => setIsBackupOpen(false)}
        onDataChanged={() => loadData(selectedSafra)}
        isLocalMode={isLocalMode}
        canImportData={permissions.canImportData}
      />

      {/* Modal de Avisos por E-mail */}
      <NotificationsModal
        isOpen={isNotificationsOpen && permissions.canConfigureAlerts}
        onClose={() => setIsNotificationsOpen(false)}
      />

      {/* Modal de Login Seguro */}
      <LoginModal
        isOpen={isLoginOpen}
        onClose={() => setIsLoginOpen(false)}
        onLoginSuccess={(user) => {
          setCurrentUser(user);
          showToast(`Bem-vindo, ${user.name || user.username}! Acesso liberado.`);
        }}
      />

      {/* Modal de Alteração de Senha */}
      {/* Modal de Usuários (somente administradores) */}
      <UsersModal
        isOpen={isUsersOpen && permissions.canManageUsers}
        onClose={() => setIsUsersOpen(false)}
        currentUser={currentUser}
      />

      <ChangePasswordModal
        isOpen={isChangePasswordOpen && permissions.canChangePassword}
        onClose={() => setIsChangePasswordOpen(false)}
        onSuccess={() => showToast('Senha de acesso alterada com sucesso!')}
      />

      {/* Modal de Resumo em PDF */}
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

      {/* Barra de Navegação Inferior Mobile */}
      <MobileBottomNav
        activeTab={mobileTab}
        onSelectTab={setMobileTab}
        onOpenQuickEntry={handleOpenQuickEntry}
        canLaunchRain={permissions.canLaunchRain}
      />

    </div>
  );
}
