import React, { useState } from 'react';
import { Table2, Download, Copy, Check } from 'lucide-react';
import { PanelHeader } from './ui/primitives';

const fmt = (n, d = 1) => (Number(n) || 0).toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d });

export default function ConsolidatedTable({ consolidatedMatrix, availableSafras, safraMetricsMap, historicalMonthAvg = {}, currentSafra }) {
  const [copied, setCopied] = useState(false);

  if (!consolidatedMatrix || consolidatedMatrix.length === 0) return null;

  const hist = (code) => historicalMonthAvg[code];

  const handleCopyTable = async () => {
    let text = `MÊS\t${availableSafras.join('\t')}\tMÉDIA HISTÓRICA\n`;
    for (const row of consolidatedMatrix) {
      const values = availableSafras.map(s => `${fmt(row.safras[s]?.total_mm)} mm (${fmt(row.safras[s]?.average_mm_day, 2)} mm/d)`);
      text += `${row.monthCode}\t${values.join('\t')}\t${hist(row.monthCode) != null ? `${fmt(hist(row.monthCode))} mm` : '—'}\n`;
    }
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* área de transferência bloqueada pelo navegador */ }
  };

  const handleExportCSV = () => {
    let csv = `Mes;${availableSafras.map(s => `Safra_${s}_Total_mm;Safra_${s}_Media_mm_dia`).join(';')};Media_Historica_mm\n`;
    for (const row of consolidatedMatrix) {
      const cols = availableSafras.map(s => `${row.safras[s]?.total_mm || 0};${row.safras[s]?.average_mm_day || 0}`);
      csv += `${row.monthName} (${row.monthCode});${cols.join(';')};${hist(row.monthCode) ?? ''}\n`;
    }
    csv += `TOTAL ACUMULADO;${availableSafras.map(s => `${safraMetricsMap[s]?.total_mm || 0};-`).join(';')};-\n`;
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'comparativo_pluviometrico_safras.csv';
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const th = 'px-3.5 py-2.5 lbl text-ink-muted bg-surface-control border-b border-line whitespace-nowrap';
  const td = 'px-3.5 py-2.5 border-b border-line';
  const stickyCell = 'sticky left-0 z-10 border-r border-line';
  const curCol = 'bg-orange-50/70 dark:bg-orange-500/[.07]';

  return (
    <div className="panel panel-pad enter" style={{ '--i': 8 }}>
      <PanelHeader
        icon={Table2}
        title="Mês a mês, todas as safras"
        subtitle="Total do mês e média diária (total ÷ dias do mês) · valores em mm"
        actions={
          <>
            <button type="button" onClick={handleCopyTable} className="btn btn-secondary" aria-live="polite">
              {copied ? <Check className="text-success" /> : <Copy />}
              {copied ? 'Copiada' : 'Copiar tabela'}
            </button>
            <button type="button" onClick={handleExportCSV} className="btn btn-petrol">
              <Download />
              Exportar CSV
            </button>
          </>
        }
      />

      <div className="relative overflow-x-auto rounded-lg border border-line">
        <table className="w-full text-left border-collapse text-[14px] leading-5">
          <thead>
            <tr>
              <th className={`${th} ${stickyCell} min-w-[132px]`}>Mês</th>
              {availableSafras.map((s) => {
                const isCur = s === currentSafra;
                return (
                  <th key={s} className={`${th} text-right min-w-[128px] ${isCur ? '!bg-orange-50 !text-orange-700 dark:!bg-petrol-800 dark:!text-orange-300' : ''}`}>
                    <span className="num">{s}</span>
                    {isCur && <span className="ml-1.5 inline-block align-middle rounded-sm bg-accent text-ink-strong px-1.5 text-[10px] leading-[14px] tracking-wider">ATUAL</span>}
                  </th>
                );
              })}
              <th className={`${th} text-right min-w-[120px]`}>Média hist.</th>
            </tr>
          </thead>
          <tbody>
            {consolidatedMatrix.map((row, idx) => {
              const zebra = idx % 2 === 1 ? 'bg-surface-sunken' : 'bg-surface';
              return (
                <tr key={row.monthCode} className="group">
                  <td className={`${td} ${stickyCell} ${zebra} group-hover:bg-surface-control transition-colors`}>
                    <span className="font-bold text-accent-text mr-2 num">{row.monthCode}</span>
                    <span className="text-ink-muted text-[13px]">{row.monthName}</span>
                  </td>
                  {availableSafras.map((s) => {
                    const data = row.safras[s];
                    const isCur = s === currentSafra;
                    const future = data?.isFuture;
                    const has = data && !future;
                    return (
                      <td key={s} className={`${td} text-right ${isCur ? curCol : zebra} group-hover:bg-surface-control transition-colors`}>
                        {has ? (
                          <>
                            <span className="num block font-semibold text-ink-strong">{fmt(data.total_mm)}</span>
                            <span className="num block text-[11px] leading-[14px] text-ink-muted">{fmt(data.average_mm_day, 2)}/dia · {data.rainy_days} d</span>
                          </>
                        ) : (
                          <span className="text-ink-muted" title={future ? 'Mês ainda não começou' : 'Sem dados'}>—</span>
                        )}
                      </td>
                    );
                  })}
                  <td className={`${td} text-right ${zebra} group-hover:bg-surface-control transition-colors num font-semibold text-ink`}>
                    {hist(row.monthCode) != null ? fmt(hist(row.monthCode)) : '—'}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr>
              <td className={`px-3.5 py-3 ${stickyCell} bg-orange-50 dark:bg-petrol-800 lbl text-orange-700 dark:text-orange-300`}>Total da safra</td>
              {availableSafras.map((s) => (
                <td key={s} className="px-3.5 py-3 text-right bg-orange-50 dark:bg-petrol-800 num font-bold text-[15px] text-orange-700 dark:text-orange-300">
                  {fmt(safraMetricsMap[s]?.total_mm)}
                </td>
              ))}
              <td className="px-3.5 py-3 text-right bg-orange-50 dark:bg-petrol-800 num font-bold text-orange-700 dark:text-orange-300">
                {fmt(Object.values(historicalMonthAvg).reduce((a, b) => a + (b || 0), 0))}
              </td>
            </tr>
            <tr>
              <td className={`px-3.5 py-2.5 ${stickyCell} bg-surface text-[13px] text-ink-muted border-t border-line`}>Dias com chuva</td>
              {availableSafras.map((s) => (
                <td key={s} className="px-3.5 py-2.5 text-right bg-surface num font-semibold text-ink border-t border-line">{safraMetricsMap[s]?.rainy_days || 0}</td>
              ))}
              <td className="px-3.5 py-2.5 text-right bg-surface text-ink-muted border-t border-line">—</td>
            </tr>
            <tr>
              <td className={`px-3.5 py-2.5 ${stickyCell} bg-surface-sunken text-[13px] text-ink-muted border-t border-line`}>Maior dia</td>
              {availableSafras.map((s) => {
                const m = safraMetricsMap[s]?.max_day;
                return (
                  <td key={s} className="px-3.5 py-2.5 text-right bg-surface-sunken border-t border-line">
                    {m?.rain_mm > 0 ? <span className="num font-bold text-warning">{fmt(m.rain_mm)}</span> : <span className="text-ink-muted">—</span>}
                  </td>
                );
              })}
              <td className="px-3.5 py-2.5 text-right bg-surface-sunken text-ink-muted border-t border-line">—</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
