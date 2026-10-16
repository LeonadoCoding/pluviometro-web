import React, { useState } from 'react';
import { Table, Download, Copy, Check } from 'lucide-react';

export default function ConsolidatedTable({
  consolidatedMatrix,
  availableSafras,
  safraMetricsMap,
  historicalMonthAvg = {},
  currentSafra
}) {
  const [copied, setCopied] = useState(false);

  if (!consolidatedMatrix || consolidatedMatrix.length === 0) return null;

  // Calculate historical monthly average across safras with data
  const calculateHistoricalMonthAvg = (monthCode) => historicalMonthAvg[monthCode] || 0;

  const handleCopyTable = () => {
    let text = `MÊS\t${availableSafras.join('\t')}\tMÉDIA HISTÓRICA\n`;
    for (const row of consolidatedMatrix) {
      const values = availableSafras.map(s => `${row.safras[s]?.total_mm || 0} mm (${row.safras[s]?.average_mm_day || 0} mm/d)`);
      const hist = `${calculateHistoricalMonthAvg(row.monthCode)} mm`;
      text += `${row.monthCode}\t${values.join('\t')}\t${hist}\n`;
    }
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExportCSV = () => {
    let csv = `Mes;${availableSafras.map(s => `Safra_${s}_Total_mm;Safra_${s}_Media_mm_dia`).join(';')};Media_Historica_mm\n`;
    for (const row of consolidatedMatrix) {
      const rowCols = availableSafras.map(s => `${row.safras[s]?.total_mm || 0};${row.safras[s]?.average_mm_day || 0}`);
      const hist = calculateHistoricalMonthAvg(row.monthCode);
      csv += `${row.monthName} (${row.monthCode});${rowCols.join(';')};${hist}\n`;
    }
    const totalsCols = availableSafras.map(s => `${safraMetricsMap[s]?.total_mm || 0};-`);
    csv += `TOTAL ACUMULADO;${totalsCols.join(';')};-\n`;

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'comparativo_pluviometrico_safras.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="glass-panel rounded-2xl p-4 sm:p-6 relative transition-colors">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Table className="w-5 h-5 text-rain-600 dark:text-rain-400" />
            Visão Consolidada Lado a Lado (Todas as Safras)
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Total do mês em milímetros e média diária (Total ÷ dias exatos do mês)
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCopyTable}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white rounded-lg text-xs font-semibold border border-slate-200 dark:border-slate-700 transition"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copiado!' : 'Copiar'}</span>
          </button>
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white rounded-lg text-xs font-semibold border border-slate-200 dark:border-slate-700 transition"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Exportar CSV</span>
          </button>
        </div>
      </div>

      {/* Tabela com scroll horizontal suave e primeira coluna sticky */}
      <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/40">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-semibold">
              <th className="p-3 sticky left-0 bg-slate-50 dark:bg-slate-900 z-10 border-r border-slate-200 dark:border-slate-800 min-w-[120px]">
                Mês (Ciclo)
              </th>
              {availableSafras.map((s) => {
                const isCurrent = s === currentSafra;
                return (
                  <th
                    key={s}
                    className={`p-3 text-right min-w-[130px] border-r border-slate-200 dark:border-slate-800 ${
                      isCurrent ? 'bg-rain-50 dark:bg-rain-950/50 text-rain-700 dark:text-rain-300 font-bold' : ''
                    }`}
                  >
                    Safra {s} {isCurrent && <span className="text-[10px] text-rain-600 dark:text-rain-400 block font-normal">(Safra Atual)</span>}
                  </th>
                );
              })}
              <th className="p-3 text-right min-w-[120px] text-sky-600 dark:text-sky-400 font-bold bg-slate-100/60 dark:bg-slate-900/80">
                Média Histórica
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-mono">
            {consolidatedMatrix.map((row) => {
              const histAvg = calculateHistoricalMonthAvg(row.monthCode);
              return (
                <tr key={row.monthCode} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition">
                  <td className="p-3 sticky left-0 bg-white dark:bg-slate-900/95 z-10 border-r border-slate-200 dark:border-slate-800 font-sans font-bold text-slate-800 dark:text-slate-200">
                    <span className="text-rain-600 dark:text-rain-400 mr-2">{row.monthCode}</span>
                    <span className="text-slate-500 dark:text-slate-400 font-normal">{row.monthName}</span>
                  </td>
                  {availableSafras.map((s) => {
                    const data = row.safras[s];
                    const isCurrent = s === currentSafra;
                    const hasRain = data && data.total_mm > 0;
                    return (
                      <td
                        key={s}
                        className={`p-3 text-right border-r border-slate-200 dark:border-slate-800/60 ${
                          isCurrent ? 'bg-rain-50/40 dark:bg-rain-950/20' : ''
                        }`}
                      >
                        {hasRain ? (
                          <div>
                            <span className="text-slate-900 dark:text-white font-bold text-sm block">
                              {data.total_mm.toLocaleString('pt-BR', { minimumFractionDigits: 1 })} mm
                            </span>
                            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-sans block">
                              Ø {data.average_mm_day.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} mm/d • {data.rainy_days}d
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400 dark:text-slate-600 font-sans">-</span>
                        )}
                      </td>
                    );
                  })}
                  <td className="p-3 text-right bg-slate-50/50 dark:bg-slate-900/40 text-sky-700 dark:text-sky-300 font-semibold">
                    {histAvg > 0 ? `${histAvg.toLocaleString('pt-BR')} mm` : '-'}
                  </td>
                </tr>
              );
            })}

            {/* Linha de Totais da Safra */}
            <tr className="bg-slate-100 dark:bg-slate-900/90 font-bold border-t-2 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white">
              <td className="p-3 sticky left-0 bg-slate-100 dark:bg-slate-900 z-10 border-r border-slate-200 dark:border-slate-800 font-sans uppercase tracking-wider text-rain-700 dark:text-rain-400 text-xs">
                TOTAL ACUMULADO
              </td>
              {availableSafras.map((s) => {
                const total = safraMetricsMap[s]?.total_mm || 0;
                const isCurrent = s === currentSafra;
                return (
                  <td
                    key={s}
                    className={`p-3 text-right border-r border-slate-200 dark:border-slate-800 ${
                      isCurrent ? 'bg-rain-100/60 dark:bg-rain-950/60 text-rain-800 dark:text-rain-300' : ''
                    }`}
                  >
                    <span className="text-sm font-extrabold text-slate-900 dark:text-white block">
                      {total.toLocaleString('pt-BR', { minimumFractionDigits: 1 })} mm
                    </span>
                  </td>
                );
              })}
              <td className="p-3 text-right text-sky-700 dark:text-sky-300 font-bold">
                -
              </td>
            </tr>

            {/* Linha de Dias com Chuva */}
            <tr className="bg-slate-50 dark:bg-slate-900/60 text-slate-700 dark:text-slate-300 text-xs">
              <td className="p-3 sticky left-0 bg-slate-50 dark:bg-slate-900 z-10 border-r border-slate-200 dark:border-slate-800 font-sans text-slate-500 dark:text-slate-400">
                Dias c/ Precipitação
              </td>
              {availableSafras.map((s) => {
                const days = safraMetricsMap[s]?.rainy_days || 0;
                return (
                  <td key={s} className="p-3 text-right border-r border-slate-200 dark:border-slate-800">
                    <span className="font-semibold text-slate-800 dark:text-slate-200">{days} dias</span>
                  </td>
                );
              })}
              <td className="p-3 text-right text-slate-400 dark:text-slate-500">-</td>
            </tr>

            {/* Linha de Maior Chuva Diária */}
            <tr className="bg-slate-50 dark:bg-slate-900/60 text-slate-700 dark:text-slate-300 text-xs">
              <td className="p-3 sticky left-0 bg-slate-50 dark:bg-slate-900 z-10 border-r border-slate-200 dark:border-slate-800 font-sans text-slate-500 dark:text-slate-400">
                Pico Diário Máximo
              </td>
              {availableSafras.map((s) => {
                const maxDay = safraMetricsMap[s]?.max_day;
                return (
                  <td key={s} className="p-3 text-right border-r border-slate-200 dark:border-slate-800">
                    {maxDay?.rain_mm > 0 ? (
                      <span className="text-amber-700 dark:text-amber-300 font-bold">
                        {maxDay.rain_mm.toLocaleString('pt-BR')} mm
                      </span>
                    ) : (
                      <span className="text-slate-400 dark:text-slate-600">-</span>
                    )}
                  </td>
                );
              })}
              <td className="p-3 text-right text-slate-400 dark:text-slate-500">-</td>
            </tr>

          </tbody>
        </table>
      </div>
    </div>
  );
}
