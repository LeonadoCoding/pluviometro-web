import React, { useState } from 'react';
import { X, FileText, Download, Printer, Check, Image as ImageIcon } from 'lucide-react';
import { generatePluviometroPDF } from '../utils/pdfGenerator';

export default function PdfReportModal({
  isOpen,
  onClose,
  selectedSafra,
  currentSafraMetrics,
  kpis,
  safraMetricsMap,
  availableSafras,
  recentRecords
}) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  if (!isOpen) return null;

  const handleDownloadPdf = async () => {
    setIsGenerating(true);
    try {
      const doc = await generatePluviometroPDF({
        selectedSafra,
        currentSafraMetrics,
        kpis,
        safraMetricsMap,
        availableSafras,
        recentRecords
      });
      const safeSafra = selectedSafra.replace('/', '_');
      doc.save(`Boletim_Pluviometrico_Oilema_Safra_${safeSafra}.pdf`);
      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 3500);
    } catch (err) {
      alert('Erro ao gerar PDF: ' + err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleBrowserPrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm transition-opacity">
      <div className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl p-6 relative max-h-[90vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-rain-500/10 dark:bg-rain-500/20 text-rain-600 dark:text-rain-400 flex items-center justify-center">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Resumo Executivo em PDF</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Boletim Pluviométrico Oficial • Safra {selectedSafra}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Resumo dos dados e visuais inclusos no PDF */}
        <div className="mt-4 space-y-3">
          <div className="bg-slate-50 dark:bg-slate-950/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
              Conteúdo Incluso no Documento
            </span>
            <ul className="text-xs space-y-2 text-slate-700 dark:text-slate-300">
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-rain-500 flex-shrink-0"></span>
                <span><strong>Identificação:</strong> UBS Sementes Oilema - Placas - Barreiras/BA</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-rain-500 flex-shrink-0"></span>
                <span><strong>Cards de Indicadores:</strong> Acumulado, Média Diária, Pico Máximo e Recorde</span>
              </li>
              <li className="flex items-center gap-2 text-rain-700 dark:text-rain-300 font-semibold bg-rain-50 dark:bg-rain-950/50 p-2 rounded-xl border border-rain-200 dark:border-rain-800/60">
                <ImageIcon className="w-4 h-4 text-rain-500 flex-shrink-0" />
                <span><strong>Gráficos Visuais Inclusos:</strong> Progresso Pluviométrico Mensal + Comparativo Histórico Sobreposto em alta resolução</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-rain-500 flex-shrink-0"></span>
                <span><strong>Tabela do Ciclo Agrícola:</strong> Outubro a Setembro com totais, médias diárias e acumulado</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-rain-500 flex-shrink-0"></span>
                <span><strong>Comparativo de Todas as Safras:</strong> Visão consolidada de safras anteriores</span>
              </li>
            </ul>
          </div>

          {downloadSuccess && (
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 rounded-xl text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2">
              <Check className="w-4 h-4 flex-shrink-0" />
              <span>PDF gerado com gráficos e métricas baixado com sucesso!</span>
            </div>
          )}

          {/* Botões de Ação */}
          <div className="pt-2 space-y-2">
            <button
              onClick={handleDownloadPdf}
              disabled={isGenerating}
              className="w-full py-3 bg-gradient-to-r from-rain-500 to-oilema-flame hover:from-rain-600 hover:to-rain-600 active:scale-[0.98] text-white font-bold text-sm rounded-xl shadow-lg shadow-rain-500/25 flex items-center justify-center gap-2 transition disabled:opacity-50"
            >
              <Download className="w-4 h-4 stroke-[2.5]" />
              <span>{isGenerating ? 'Capturando Gráficos e Gerando PDF...' : 'Baixar Boletim em PDF (c/ Gráficos)'}</span>
            </button>

            <button
              onClick={handleBrowserPrint}
              className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-xs rounded-xl flex items-center justify-center gap-2 border border-slate-200 dark:border-slate-700 transition"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimir / Salvar via Navegador</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
