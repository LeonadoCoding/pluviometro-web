import React, { useState, useRef, useEffect } from 'react';
import { HardDriveDownload, FileJson, FileSpreadsheet, Upload, RotateCcw, AlertTriangle } from 'lucide-react';
import { exportAllData, importDataBatch, resetDatabaseToSeed } from '../services/api';
import Modal from './ui/Modal';
import { Notice, Spinner } from './ui/primitives';
import { useConfirm } from './ui/feedback';

function download(blob, name) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const today = () => new Date().toISOString().split('T')[0];

function Section({ title, text, children, tone }) {
  return (
    <section className={`well p-4 ${tone === 'warn' ? 'border-[rgba(217,119,6,.35)]' : ''}`}>
      <h3 className={`lbl flex items-center gap-1.5 ${tone === 'warn' ? 'text-warning' : 'text-ink-strong'}`}>
        {tone === 'warn' && <AlertTriangle className="w-4 h-4" />}{title}
      </h3>
      <p className="text-[13px] leading-[19px] text-ink-muted mt-1 mb-3">{text}</p>
      {children}
    </section>
  );
}

export default function BackupModal({ isOpen, onClose, onDataChanged, canImportData = true }) {
  const [status, setStatus] = useState(null);
  const [busy, setBusy] = useState(null);
  const fileInputRef = useRef(null);
  const confirm = useConfirm();

  useEffect(() => { if (isOpen) { setStatus(null); setBusy(null); } }, [isOpen]);

  const run = async (key, fn) => {
    setBusy(key);
    setStatus(null);
    try { await fn(); } catch (err) { setStatus({ type: 'error', text: err.message }); } finally { setBusy(null); }
  };

  const handleJSON = () => run('json', async () => {
    const records = await exportAllData();
    download(new Blob([JSON.stringify(records, null, 2)], { type: 'application/json' }), `backup_pluviometro_oilema_${today()}.json`);
    setStatus({ type: 'ok', text: `Backup com ${records.length.toLocaleString('pt-BR')} leituras baixado.` });
  });

  const handleCSV = () => run('csv', async () => {
    const records = await exportAllData();
    let csv = 'Data;Chuva_mm;Safra;Propriedade;Observacoes\n';
    for (const r of records) csv += `${r.date};${String(r.rain_mm).replace('.', ',')};${r.safra};${r.property || ''};${(r.notes || '').replace(/;/g, ',')}\n`;
    download(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' }), `leituras_pluviometro_${today()}.csv`);
    setStatus({ type: 'ok', text: `Planilha com ${records.length.toLocaleString('pt-BR')} leituras baixada.` });
  });

  const handleFileImport = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    run('import', async () => {
      try {
        const data = JSON.parse(await file.text());
        if (!Array.isArray(data)) throw new Error('O arquivo precisa ser um backup JSON do Pluviômetro (uma lista de leituras).');
        const count = await importDataBatch(data);
        setStatus({ type: 'ok', text: `${count.toLocaleString('pt-BR')} leituras importadas. As datas que já existiam foram atualizadas.` });
        onDataChanged();
      } finally {
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    });
  };

  const handleReset = async () => {
    const ok = await confirm({
      title: 'Restaurar a base original?',
      message: 'Todas as leituras atuais serão apagadas e a base volta aos registros históricos da planilha original. Baixe um backup antes, se precisar.',
      confirmLabel: 'Apagar e restaurar',
      danger: true,
      icon: RotateCcw
    });
    if (!ok) return;
    run('reset', async () => {
      await resetDatabaseToSeed();
      setStatus({ type: 'ok', text: 'Base restaurada com os registros históricos da planilha original.' });
      onDataChanged();
    });
  };

  return (
    <Modal open={isOpen} onClose={onClose} icon={HardDriveDownload} title={canImportData ? 'Backup e restauração' : 'Exportar dados'} subtitle="Leituras guardadas no Supabase">
      <div className="space-y-3">
        {status && <Notice type={status.type}>{status.text}</Notice>}

        <Section title="Exportar" text="Todas as leituras de todas as safras, para guardar ou abrir no Excel.">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <button type="button" onClick={handleJSON} disabled={Boolean(busy)} className="btn btn-secondary btn-lg">
              {busy === 'json' ? <Spinner /> : <FileJson />} Backup JSON
            </button>
            <button type="button" onClick={handleCSV} disabled={Boolean(busy)} className="btn btn-secondary btn-lg">
              {busy === 'csv' ? <Spinner /> : <FileSpreadsheet />} Planilha CSV
            </button>
          </div>
        </Section>

        {canImportData && (
          <>
            <Section title="Importar backup" text="Envie um JSON exportado aqui. Leituras de datas que já existem são substituídas pelas do arquivo.">
              <input type="file" accept=".json,application/json" ref={fileInputRef} onChange={handleFileImport} className="hidden" />
              <button type="button" onClick={() => fileInputRef.current?.click()} disabled={Boolean(busy)} className="btn btn-petrol btn-lg w-full">
                {busy === 'import' ? <Spinner /> : <Upload />} Escolher arquivo JSON
              </button>
            </Section>

            <Section tone="warn" title="Restaurar a base original" text="Apaga as leituras atuais e recarrega os registros históricos da planilha. Use só para recomeçar do zero.">
              <button type="button" onClick={handleReset} disabled={Boolean(busy)} className="btn btn-danger btn-lg w-full">
                {busy === 'reset' ? <Spinner /> : <RotateCcw />} Restaurar a base
              </button>
            </Section>
          </>
        )}
      </div>
    </Modal>
  );
}
