import React, { useState } from 'react';
import { FileText, Download, Printer, Check, BarChart3, Table2, Gauge, GitCompareArrows } from 'lucide-react';
import { generatePluviometroPDF } from '../utils/pdfGenerator';
import Modal from './ui/Modal';
import { Notice, Spinner } from './ui/primitives';

const CONTENT = [
  { icon: Gauge, title: 'Indicadores', text: 'Acumulado, média diária do mês, maior dia e recorde.' },
  { icon: BarChart3, title: 'Gráficos', text: 'Chuva mês a mês e safras comparadas, em alta resolução.' },
  { icon: Table2, title: 'Ciclo da safra', text: 'Outubro a setembro com total, média e desvio da média histórica.' },
  { icon: GitCompareArrows, title: 'Safras anteriores', text: 'Total de cada safra e as últimas leituras.' }
];

export default function PdfReportModal({ isOpen, onClose, selectedSafra, currentSafraMetrics, kpis, safraMetricsMap, availableSafras, recentRecords, historicalMonthAvg }) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  const handleDownloadPdf = async () => {
    setIsGenerating(true);
    setError('');
    setDone(false);
    try {
      const doc = await generatePluviometroPDF({ selectedSafra, currentSafraMetrics, kpis, safraMetricsMap, availableSafras, recentRecords, historicalMonthAvg });
      doc.save(`Boletim_Pluviometrico_Oilema_Safra_${selectedSafra.replace('/', '_')}.pdf`);
      setDone(true);
    } catch (err) {
      setError('Não foi possível gerar o PDF: ' + err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      icon={FileText}
      title="Boletim pluviométrico em PDF"
      subtitle={`Safra ${selectedSafra} · A4, tema claro, com a logo Oilema`}
      footer={
        <>
          <button type="button" onClick={() => window.print()} className="btn btn-secondary btn-lg">
            <Printer /> Imprimir a tela
          </button>
          <button type="button" onClick={handleDownloadPdf} disabled={isGenerating || !currentSafraMetrics} className="btn btn-primary btn-lg sm:min-w-[200px]">
            {isGenerating ? <><Spinner /> Gerando o PDF…</> : <><Download strokeWidth={2.5} /> Baixar boletim</>}
          </button>
        </>
      }
    >
      <p className="eyebrow mb-3">O que vai no documento</p>
      <ul className="grid sm:grid-cols-2 gap-2.5">
        {CONTENT.map(({ icon: Icon, title, text }) => (
          <li key={title} className="well p-3.5 flex gap-3">
            <span className="w-8 h-8 rounded-md bg-surface border border-line flex items-center justify-center flex-shrink-0 text-accent-text"><Icon className="w-4 h-4" /></span>
            <span>
              <b className="block text-[14px] leading-5 text-ink-strong">{title}</b>
              <span className="block text-[13px] leading-[18px] text-ink-muted mt-0.5">{text}</span>
            </span>
          </li>
        ))}
      </ul>
      <div className="mt-4 space-y-2">
        {done && <Notice type="ok">Boletim gerado. Confira a pasta de downloads.</Notice>}
        {error && <Notice>{error}</Notice>}
      </div>
    </Modal>
  );
}
