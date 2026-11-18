import React, { useState, useEffect } from 'react';
import { Bell, Plus, X, Send, Save, Mail } from 'lucide-react';
import { fetchNotificationSettings, saveNotificationSettings, fetchNotificationLog, sendTestEmail, isValidEmail } from '../services/notifications';
import { formatDateBR } from '../utils/dates';
import Modal from './ui/Modal';
import { Notice, Spinner, Toggle } from './ui/primitives';

function Section({ title, children, aside }) {
  return (
    <section className="well p-4">
      {title && <div className="flex items-center justify-between gap-2 mb-3"><h3 className="lbl text-ink-strong">{title}</h3>{aside}</div>}
      {children}
    </section>
  );
}

export default function NotificationsModal({ isOpen, onClose }) {
  const [settings, setSettings] = useState(null);
  const [log, setLog] = useState([]);
  const [newEmail, setNewEmail] = useState('');
  const [status, setStatus] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setStatus(null);
    setIsDirty(false);
    setIsLoading(true);
    Promise.all([fetchNotificationSettings(), fetchNotificationLog().catch(() => [])])
      .then(([s, l]) => { setSettings(s); setLog(l); })
      .catch(err => setStatus({ type: 'error', text: err.message }))
      .finally(() => setIsLoading(false));
  }, [isOpen]);

  const update = (patch) => { setSettings(prev => ({ ...prev, ...patch })); setIsDirty(true); };

  const handleAddEmail = (e) => {
    e.preventDefault();
    const email = newEmail.trim().toLowerCase();
    if (!isValidEmail(email)) return setStatus({ type: 'error', text: 'Digite um e-mail válido.' });
    if (settings.recipients.includes(email)) return setStatus({ type: 'error', text: 'Este e-mail já está na lista.' });
    update({ recipients: [...settings.recipients, email] });
    setNewEmail('');
    setStatus(null);
  };

  const handleSave = async () => {
    setIsSaving(true);
    setStatus(null);
    try {
      const saved = await saveNotificationSettings(settings);
      if (saved) setSettings(saved);
      setIsDirty(false);
      setStatus({ type: 'ok', text: 'Configurações de aviso gravadas.' });
    } catch (err) {
      setStatus({ type: 'error', text: 'Não foi possível gravar: ' + err.message });
    } finally {
      setIsSaving(false);
    }
  };

  const handleTest = async () => {
    setIsTesting(true);
    setStatus(null);
    try {
      const res = await sendTestEmail();
      setStatus({ type: 'ok', text: `E-mail de teste enviado para ${res.sent} ${res.sent === 1 ? 'destinatário' : 'destinatários'}.` });
    } catch (err) {
      setStatus({ type: 'error', text: err.message });
    } finally {
      setIsTesting(false);
      fetchNotificationLog().then(setLog).catch(() => {});
    }
  };

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      icon={Bell}
      title="Avisos de chuva por e-mail"
      subtitle="Enviados pelo Brevo a cada leitura nova"
      footer={settings && (
        <>
          <button type="button" onClick={handleTest} disabled={isTesting || isDirty || !settings.recipients.length} title={isDirty ? 'Grave antes de testar' : 'Envia um e-mail de teste aos destinatários gravados'} className="btn btn-secondary btn-lg">
            {isTesting ? <Spinner /> : <Send />} Enviar teste
          </button>
          <button type="button" onClick={handleSave} disabled={isSaving || !isDirty} className="btn btn-primary btn-lg sm:min-w-[160px]">
            {isSaving ? <><Spinner /> Gravando…</> : <><Save /> Gravar</>}
          </button>
        </>
      )}
    >
      <div className="space-y-3">
        {status && <Notice type={status.type}>{status.text}</Notice>}
        {isLoading && (
          <div className="space-y-3" aria-hidden="true">
            {[0, 1, 2].map(i => <div key={i} className="skeleton h-20 rounded-lg" />)}
          </div>
        )}

        {settings && (
          <>
            <Section>
              <Toggle checked={settings.enabled} onChange={(v) => update({ enabled: v })} label="Enviar avisos de chuva" description="Um e-mail sai assim que uma leitura é gravada." />
            </Section>

            <Section title={`Destinatários (${settings.recipients.length})`}>
              <form onSubmit={handleAddEmail} className="flex gap-2">
                <label htmlFor="notify-email" className="sr-only">Novo destinatário</label>
                <input id="notify-email" type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="nome@sementesoilema.com.br" className="input input-sm" />
                <button type="submit" className="btn btn-petrol flex-shrink-0"><Plus /> Incluir</button>
              </form>
              {settings.recipients.length === 0 ? (
                <p className="text-[13px] text-ink-muted mt-3">Ninguém recebe avisos ainda.</p>
              ) : (
                <ul className="mt-3 flex flex-wrap gap-1.5">
                  {settings.recipients.map(email => (
                    <li key={email} className="inline-flex items-center gap-1.5 h-8 pl-3 pr-1 rounded-full border border-line bg-surface text-[13px] text-ink-strong [animation:drop-in_.2s_ease_both]">
                      <Mail className="w-3.5 h-3.5 text-ink-muted" />
                      <span className="max-w-[220px] truncate">{email}</span>
                      <button type="button" onClick={() => update({ recipients: settings.recipients.filter(e => e !== email) })} className="w-6 h-6 rounded-full flex items-center justify-center text-ink-muted hover:bg-surface-control hover:text-danger transition-colors" aria-label={`Remover ${email}`}>
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </Section>

            <Section title="Regras de envio">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="notify-min" className="field-label">Avisar a partir de (mm)</label>
                  <input id="notify-min" type="number" min="0" step="0.1" inputMode="decimal" value={settings.min_rain_mm} onChange={(e) => update({ min_rain_mm: e.target.value })} className="input input-sm num" />
                </div>
                <div>
                  <label htmlFor="notify-age" className="field-label">Leituras de até (dias)</label>
                  <input id="notify-age" type="number" min="0" max="60" step="1" inputMode="numeric" value={settings.max_age_days} onChange={(e) => update({ max_age_days: e.target.value })} className="input input-sm num" />
                </div>
              </div>
              <p className="hint">Leituras mais antigas que esse prazo não geram aviso, o que evita uma enxurrada de e-mails ao importar um backup.</p>
              <div className="h-px bg-line my-4" />
              <Toggle checked={settings.notify_on_update} onChange={(v) => update({ notify_on_update: v })} label="Avisar também correções" description="Envia um e-mail quando o volume de uma leitura existente muda." />
            </Section>

            {log.length > 0 && (
              <Section title="Últimos envios">
                <ul className="divide-y divide-[color:var(--line)] -my-1">
                  {log.map(item => (
                    <li key={item.id} className="py-2.5 flex items-center justify-between gap-3">
                      <span className="min-w-0">
                        <b className="block text-[14px] leading-5 font-semibold text-ink-strong num">
                          {item.kind === 'test' ? 'E-mail de teste' : `${Number(item.rain_mm).toLocaleString('pt-BR')} mm em ${formatDateBR(item.record_date)}`}
                        </b>
                        <span className="block text-[12px] leading-4 text-ink-muted truncate num" title={item.error || ''}>
                          {new Date(item.created_at).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })} · {item.recipients?.length || 0} {item.recipients?.length === 1 ? 'destinatário' : 'destinatários'}{item.error ? ` · ${item.error}` : ''}
                        </span>
                      </span>
                      <span className={`chip ${item.status === 'sent' ? 'text-success' : 'text-danger'}`}>{item.status === 'sent' ? 'Enviado' : 'Falhou'}</span>
                    </li>
                  ))}
                </ul>
              </Section>
            )}
          </>
        )}
      </div>
    </Modal>
  );
}
