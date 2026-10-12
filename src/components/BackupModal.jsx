import React, { useState, useRef } from 'react';
import { X, HardDriveDownload, Download, Upload, RotateCcw, Check, AlertTriangle } from 'lucide-react';
import { exportAllData, importDataBatch, resetDatabaseToSeed } from '../services/api';

export default function BackupModal({ isOpen, onClose, onDataChanged, isLocalMode }) {
  const [statusMsg, setStatusMsg] = useState(null);
  const [isResetConfirming, setIsResetConfirming] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef(null);

  if (!isOpen) return null;

  const handleDownloadJSON = async () => {
    try {
      const records = await exportAllData();
      const blob = new Blob([JSON.stringify(records, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `backup_pluviometro_oilema_${new Date().toISOString().split('T')[0]}.json`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setStatusMsg({ type: 'success', text: 'Backup JSON baixado com sucesso!' });
    } catch (err) {
      setStatusMsg({ type: 'error', text: 'Falha ao exportar JSON: ' + err.message });
    }
  };

  const handleDownloadCSV = async () => {
    try {
      const records = await exportAllData();
      let csv = 'Data;Chuva_mm;Safra;Propriedade;Observacoes\n';
      for (const r of records) {
        csv += `${r.date};${r.rain_mm};${r.safra};${r.property || ''};${(r.notes || '').replace(/;/g, ',')}\n`;
      }
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `lancamentos_pluviometro_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setStatusMsg({ type: 'success', text: 'Relatório CSV diário baixado com sucesso!' });
    } catch (err) {
      setStatusMsg({ type: 'error', text: 'Falha ao exportar CSV: ' + err.message });
    }
  };

  const handleFileImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setStatusMsg(null);
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      if (!Array.isArray(data)) throw new Error('Arquivo JSON deve conter uma lista de registros.');
      const count = await importDataBatch(data);
      setStatusMsg({ type: 'success', text: `Importação concluída! ${count} registros processados.` });
      onDataChanged();
    } catch (err) {
      setStatusMsg({ type: 'error', text: 'Erro ao importar: ' + err.message });
    } finally {
      setIsProcessing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleResetToSeed = async () => {
    setIsProcessing(true);
    setStatusMsg(null);
    try {
      await resetDatabaseToSeed();
      setStatusMsg({ type: 'success', text: 'Base restaurada com sucesso com os 271 registros da planilha Excel original!' });
      setIsResetConfirming(false);
      onDataChanged();
    } catch (err) {
      setStatusMsg({ type: 'error', text: 'Erro ao restaurar: ' + err.message });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm transition-opacity">
      <div className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl p-6 relative max-h-[90vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-sky-500/10 dark:bg-sky-500/20 text-sky-600 dark:text-sky-400 flex items-center justify-center">
              <HardDriveDownload className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Backup e Gerenciamento</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {isLocalMode ? 'Modo Navegador / Netlify' : 'Modo VPS / SQLite'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-lg transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {statusMsg && (
          <div className={`mt-3 p-3 rounded-xl text-xs flex items-center gap-2 ${
            statusMsg.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300'
              : 'bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300'
          }`}>
            {statusMsg.type === 'success' ? <Check className="w-4 h-4 flex-shrink-0" /> : <AlertTriangle className="w-4 h-4 flex-shrink-0" />}
            <span>{statusMsg.text}</span>
          </div>
        )}

        <div className="mt-5 space-y-4">
          
          {/* Exportar Dados */}
          <div className="bg-slate-50 dark:bg-slate-950/60 rounded-2xl p-4 border border-slate-200 dark:border-slate-800">
            <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
              Exportar Registros
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
              Gere cópia de segurança completa em JSON ou planilha CSV para auditoria.
            </p>
            <div className="flex gap-2">
              <button
                onClick={handleDownloadJSON}
                className="flex-1 py-2 px-3 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-white text-xs font-semibold rounded-lg flex items-center justify-center gap-2 border border-slate-200 dark:border-slate-700 transition"
              >
                <Download className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
                Baixar JSON
              </button>
              <button
                onClick={handleDownloadCSV}
                className="flex-1 py-2 px-3 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-white text-xs font-semibold rounded-lg flex items-center justify-center gap-2 border border-slate-200 dark:border-slate-700 transition"
              >
                <Download className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                Baixar CSV
              </button>
            </div>
          </div>

          {/* Importar Dados */}
          <div className="bg-slate-50 dark:bg-slate-950/60 rounded-2xl p-4 border border-slate-200 dark:border-slate-800">
            <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
              Restaurar de Arquivo JSON
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
              Importe um arquivo JSON salvo anteriormente para sincronizar ou restaurar dados.
            </p>
            <input
              type="file"
              ref={fileInputRef}
              accept=".json"
              onChange={handleFileImport}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isProcessing}
              className="w-full py-2.5 px-3 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-white text-xs font-semibold rounded-lg flex items-center justify-center gap-2 border border-slate-200 dark:border-slate-700 transition"
            >
              <Upload className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              Selecionar Arquivo JSON
            </button>
          </div>

          {/* Restaurar Base da Planilha Excel Original */}
          <div className="bg-amber-50 dark:bg-amber-950/20 rounded-2xl p-4 border border-amber-200 dark:border-amber-900/40">
            <h4 className="text-xs font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <RotateCcw className="w-3.5 h-3.5" />
              Restaurar Dados Originais da Planilha
            </h4>
            <p className="text-xs text-slate-600 dark:text-slate-400 mb-3">
              Restaura exatamente os 271 lançamentos extraídos do arquivo <code className="text-amber-700 dark:text-amber-300 font-mono">PLUVIOMETRSem media.xlsx</code>.
            </p>

            {!isResetConfirming ? (
              <button
                onClick={() => setIsResetConfirming(true)}
                className="py-1.5 px-3 bg-amber-100 dark:bg-amber-900/40 hover:bg-amber-200 dark:hover:bg-amber-800/60 text-amber-800 dark:text-amber-200 text-xs font-semibold rounded-lg border border-amber-300 dark:border-amber-700/50 transition"
              >
                Restaurar Dados da Planilha
              </button>
            ) : (
              <div className="space-y-2">
                <p className="text-xs text-red-600 dark:text-red-300 font-semibold">
                  Confirma a restauração da base para os dados originais da planilha?
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={handleResetToSeed}
                    disabled={isProcessing}
                    className="py-1.5 px-3 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg transition"
                  >
                    Sim, Restaurar
                  </button>
                  <button
                    onClick={() => setIsResetConfirming(false)}
                    className="py-1.5 px-3 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs rounded-lg transition"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  );
}
