import React, { useState, useEffect } from 'react';
import { X, Bell, Plus, Trash2, Send, Check, AlertTriangle, Save, Mail } from 'lucide-react';
import {
  fetchNotificationSettings,
  saveNotificationSettings,
  fetchNotificationLog,
  sendTestEmail,
  isValidEmail
} from '../services/notifications';
import { formatDateBR } from '../utils/dates';

const inputClass = 'w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rain-500 transition';
const sectionClass = 'bg-slate-50 dark:bg-slate-950/60 rounded-2xl p-4 border border-slate-200 dark:border-slate-800';
const sectionTitleClass = 'text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5';

function Toggle({ checked, onChange, label, description }) {
  return (
    <label className="flex items-start justify-between gap-3 cursor-pointer">
      <span>
        <span className="text-sm font-semibold text-slate-800 dark:text-slate-100 block">{label}</span>
        {description && <span className="text-xs text-slate-500 dark:text-slate-400">{description}</span>}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative mt-0.5 w-10 h-6 rounded-full flex-shrink-0 transition ${checked ? 'bg-rain-500' : 'bg-slate-300 dark:bg-slate-700'}`}
      >
        <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-4' : ''}`}></span>
      </button>
    </label>
  );
}

export default function NotificationsModal({ isOpen, onClose }) {
  const [settings, setSettings] = useState(null);
  const [log, setLog] = useState([]);
  const [newEmail, setNewEmail] = useState('');
  const [statusMsg, setStatusMsg] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setStatusMsg(null);
    setIsDirty(false);
    setIsLoading(true);
    Promise.all([fetchNotificationSettings(), fetchNotificationLog().catch(() => [])])
      .then(([s, l]) => { setSettings(s); setLog(l); })
      .catch(err => setStatusMsg({ type: 'error', text: err.message }))
      .finally(() => setIsLoading(false));
  }, [isOpen]);

  if (!isOpen) return null;

  const update = (patch) => {
    setSettings(prev => ({ ...prev, ...patch }));
    setIsDirty(true);
  };

  const handleAddEmail = (e) => {
    e.preventDefault();
    const email = newEmail.trim().toLowerCase();
    if (!isValidEmail(email)) {
      setStatusMsg({ type: 'error', text: 'Digite um e-mail válido.' });
      return;
    }
    if (settings.recipients.includes(email)) {
      setStatusMsg({ type: 'error', text: 'Este e-mail já está na lista.' });
      return;
    }
    update({ recipients: [...settings.recipients, email] });
    setNewEmail('');
    setStatusMsg(null);
  };

  const handleSave = async () => {
    setIsSaving(true);
    setStatusMsg(null);
    try {
      const saved = await saveNotificationSettings(settings);
      if (saved) setSettings(saved);
      setIsDirty(false);
      setStatusMsg({ type: 'success', text: 'Configurações de aviso salvas.' });
    } catch (err) {
      setStatusMsg({ type: 'error', text: 'Erro ao salvar: ' + err.message });
    } finally {
      setIsSaving(false);
    }
  };

  const handleTest = async () => {
    setIsTesting(true);
    setStatusMsg(null);
    try {
      const res = await sendTestEmail();
      setStatusMsg({ type: 'success', text: `E-mail de teste enviado para ${res.sent} destinatário(s).` });
    } catch (err) {
      setStatusMsg({ type: 'error', text: err.message });
    } finally {
      setIsTesting(false);
      fetchNotificationLog().then(setLog).catch(() => {});
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm transition-opacity">
      <div className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl p-6 relative max-h-[90vh] overflow-y-auto">

        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-rain-500/10 dark:bg-rain-500/20 text-rain-600 dark:text-rain-400 flex items-center justify-center">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Avisos de Chuva por E-mail</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Enviados pelo Brevo a cada novo registro</p>
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

        {isLoading && <p className="mt-5 text-xs text-slate-500 dark:text-slate-400">Carregando configurações...</p>}

        {settings && (
          <div className="mt-5 space-y-4">

            {/* Liga/desliga */}
            <div className={sectionClass}>
              <Toggle
                checked={settings.enabled}
                onChange={(v) => update({ enabled: v })}
                label="Enviar avisos de chuva"
                description="Um e-mail é enviado assim que uma leitura é registrada."
              />
            </div>

            {/* Destinatários */}
            <div className={sectionClass}>
              <h4 className={sectionTitleClass}>Destinatários ({settings.recipients.length})</h4>
              <form onSubmit={handleAddEmail} className="flex gap-2 mt-2">
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="nome@empresa.com.br"
                  className={inputClass}
                />
                <button type="submit" className="px-3 rounded-lg bg-rain-500 hover:bg-rain-600 text-white text-xs font-semibold flex items-center gap-1 transition flex-shrink-0">
                  <Plus className="w-4 h-4" />
                  Adicionar
                </button>
              </form>
              {settings.recipients.length === 0 ? (
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-3">Nenhum destinatário cadastrado.</p>
              ) : (
                <ul className="mt-3 space-y-1.5">
                  {settings.recipients.map(email => (
                    <li key={email} className="flex items-center justify-between gap-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2">
                      <span className="text-sm text-slate-800 dark:text-slate-100 flex items-center gap-2 min-w-0">
                        <Mail className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                        <span className="truncate">{email}</span>
                      </span>
                      <button
                        onClick={() => update({ recipients: settings.recipients.filter(e => e !== email) })}
                        title="Remover"
                        className="p-1 text-slate-400 hover:text-red-500 transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Regras */}
            <div className={`${sectionClass} space-y-4`}>
              <h4 className={sectionTitleClass}>Regras de envio</h4>
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">Avisar a partir de (mm)</span>
                  <input
                    type="number" min="0" step="0.1" inputMode="decimal"
                    value={settings.min_rain_mm}
                    onChange={(e) => update({ min_rain_mm: e.target.value })}
                    className={`${inputClass} mt-1`}
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">Leituras dos últimos (dias)</span>
                  <input
                    type="number" min="0" max="60" step="1" inputMode="numeric"
                    value={settings.max_age_days}
                    onChange={(e) => update({ max_age_days: e.target.value })}
                    className={`${inputClass} mt-1`}
                  />
                </label>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 -mt-2">
                Leituras mais antigas que esse prazo não geram aviso, o que evita uma enxurrada de e-mails ao importar um backup.
              </p>
              <Toggle
                checked={settings.notify_on_update}
                onChange={(v) => update({ notify_on_update: v })}
                label="Avisar também correções"
                description="Envia um e-mail quando o volume de um registro existente for alterado."
              />
            </div>

            {/* Ações */}
            <div className="flex gap-2">
              <button
                onClick={handleSave}
                disabled={isSaving || !isDirty}
                className="flex-1 py-3 bg-gradient-to-r from-rain-500 to-oilema-flame hover:from-rain-600 hover:to-rain-600 text-white font-bold text-sm rounded-xl shadow-lg shadow-rain-500/25 flex items-center justify-center gap-2 transition disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {isSaving ? 'Salvando...' : 'Salvar'}
              </button>
              <button
                onClick={handleTest}
                disabled={isTesting || isDirty || settings.recipients.length === 0}
                title={isDirty ? 'Salve antes de testar' : 'Enviar e-mail de teste aos destinatários salvos'}
                className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-sm rounded-xl flex items-center justify-center gap-2 border border-slate-200 dark:border-slate-700 transition disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
                {isTesting ? 'Enviando...' : 'Enviar teste'}
              </button>
            </div>

            {/* Histórico */}
            {log.length > 0 && (
              <div className={sectionClass}>
                <h4 className={sectionTitleClass}>Últimos envios</h4>
                <ul className="mt-2 divide-y divide-slate-200 dark:divide-slate-800">
                  {log.map(item => (
                    <li key={item.id} className="py-2 flex items-center justify-between gap-2 text-xs">
                      <span className="text-slate-700 dark:text-slate-200 min-w-0">
                        <span className="font-semibold">
                          {item.kind === 'test' ? 'Teste' : `${Number(item.rain_mm).toLocaleString('pt-BR')} mm em ${formatDateBR(item.record_date)}`}
                        </span>
                        <span className="text-slate-400 block truncate" title={item.error || ''}>
                          {new Date(item.created_at).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
                          {' • '}{item.recipients?.length || 0} destinatário(s)
                          {item.error ? ` • ${item.error}` : ''}
                        </span>
                      </span>
                      <span className={`px-2 py-0.5 rounded-full font-bold whitespace-nowrap ${
                        item.status === 'sent'
                          ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                          : 'bg-red-50 dark:bg-red-950/60 text-red-700 dark:text-red-300'
                      }`}>
                        {item.status === 'sent' ? 'Enviado' : 'Falhou'}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
