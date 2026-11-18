import React, { useState, useEffect } from 'react';
import { Users, UserPlus, Trash2, KeyRound, Check, X } from 'lucide-react';
import { listUsers, createUser, updateUserRole, setUserPassword, removeUser } from '../services/users';
import Modal from './ui/Modal';
import { Notice, Spinner } from './ui/primitives';
import { useConfirm } from './ui/feedback';

const ROLE_OPTIONS = [
  { value: 'visualizador', label: 'Visualizador', description: 'Vê todos os indicadores e gera o PDF.' },
  { value: 'alimentador', label: 'Alimentador', description: 'Tudo do visualizador e também lança e corrige chuvas.' },
  { value: 'admin', label: 'Administrador', description: 'Acesso completo: usuários, importação e avisos por e-mail.' }
];
const roleLabel = (v) => ROLE_OPTIONS.find(r => r.value === v)?.label || v;
const EMPTY_FORM = { name: '', email: '', password: '', role: 'visualizador' };

function initials(name = '') {
  const parts = name.replace(/\(.*?\)/g, '').trim().split(/[\s@._-]+/).filter(Boolean);
  return ((parts[0]?.[0] || '') + (parts[1]?.[0] || '')).toUpperCase() || 'U';
}

export default function UsersModal({ isOpen, onClose, currentUser }) {
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [status, setStatus] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [passwordFor, setPasswordFor] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const confirm = useConfirm();

  const reload = () => listUsers().then(setUsers);

  useEffect(() => {
    if (!isOpen) return;
    setStatus(null);
    setPasswordFor(null);
    setIsLoading(true);
    reload().catch(err => setStatus({ type: 'error', text: err.message })).finally(() => setIsLoading(false));
  }, [isOpen]);

  const act = async (id, fn, ok) => {
    setBusyId(id);
    setStatus(null);
    try { await fn(); if (ok) setStatus({ type: 'ok', text: ok }); await reload(); }
    catch (err) { setStatus({ type: 'error', text: err.message }); }
    finally { setBusyId(null); }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setIsCreating(true);
    setStatus(null);
    try {
      const res = await createUser(form);
      setStatus({
        type: 'ok',
        text: res.existed
          ? `${form.email} já tinha conta e recebeu acesso como ${roleLabel(form.role)}. A senha não mudou.`
          : `${form.email} criado. Envie o e-mail e a senha para o primeiro acesso.`
      });
      setForm(EMPTY_FORM);
      await reload();
    } catch (err) {
      setStatus({ type: 'error', text: err.message });
    } finally {
      setIsCreating(false);
    }
  };

  const handleRemove = async (user) => {
    const ok = await confirm({
      title: 'Remover este usuário?',
      message: `${user.email} perde o acesso ao Pluviômetro e a conta de login é excluída.`,
      confirmLabel: 'Remover usuário',
      danger: true,
      icon: Trash2
    });
    if (ok) act(user.user_id, () => removeUser(user.user_id), `${user.email} removido.`);
  };

  return (
    <Modal open={isOpen} onClose={onClose} icon={Users} title="Usuários do Pluviômetro" subtitle="Quem entra no painel e o que cada um pode fazer" size="lg">
      <div className="space-y-4">
        {status && <Notice type={status.type}>{status.text}</Notice>}

        <section>
          <div className="flex items-center justify-between mb-2.5">
            <h3 className="lbl text-ink-strong">Cadastrados ({users.length})</h3>
          </div>
          {isLoading && !users.length ? (
            <div className="space-y-2" aria-hidden="true">{[0, 1, 2].map(i => <div key={i} className="skeleton h-[60px] rounded-lg" />)}</div>
          ) : (
            <ul className="rounded-lg border border-line divide-y divide-[color:var(--line)] overflow-hidden">
              {users.map(user => {
                const isMe = user.user_id === currentUser?.id;
                const busy = busyId === user.user_id;
                return (
                  <li key={user.user_id} className="bg-surface px-3.5 py-3">
                    <div className="flex items-center gap-3">
                      <span className="w-9 h-9 rounded-md bg-petrol-100 text-oilema-petrol dark:bg-petrol-800 dark:text-petrol-200 flex items-center justify-center text-[13px] font-bold flex-shrink-0">{initials(user.name || user.email)}</span>
                      <div className="min-w-0 flex-1">
                        <p className="text-[14px] leading-5 font-semibold text-ink-strong truncate">
                          {user.name || user.email}{isMe && <span className="font-normal text-ink-muted"> (você)</span>}
                        </p>
                        <p className="text-[12px] leading-4 text-ink-muted truncate">{user.email}</p>
                      </div>
                      <select
                        aria-label={`Perfil de ${user.email}`}
                        value={user.role}
                        disabled={isMe || busy}
                        onChange={(e) => act(user.user_id, () => updateUserRole(user.user_id, e.target.value), `Perfil de ${user.email}: ${roleLabel(e.target.value)}.`)}
                        className="input input-sm w-auto h-8 text-[13px] font-semibold disabled:opacity-60"
                      >
                        {ROLE_OPTIONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                      </select>
                      <button type="button" onClick={() => { setPasswordFor(passwordFor === user.user_id ? null : user.user_id); setNewPassword(''); }} disabled={busy} className="btn btn-icon-sm" title="Definir nova senha" aria-label={`Definir nova senha para ${user.email}`} aria-expanded={passwordFor === user.user_id}>
                        {busy ? <Spinner /> : <KeyRound />}
                      </button>
                      {!isMe && (
                        <button type="button" onClick={() => handleRemove(user)} disabled={busy} className="btn btn-icon-sm is-danger" title="Remover usuário" aria-label={`Remover ${user.email}`}>
                          <Trash2 />
                        </button>
                      )}
                    </div>
                    {passwordFor === user.user_id && (
                      <form
                        className="flex gap-2 mt-3 pl-12 [animation:drop-in_.2s_ease_both]"
                        onSubmit={(e) => { e.preventDefault(); act(user.user_id, () => setUserPassword(user.user_id, newPassword), `Nova senha definida para ${user.email}.`).then(() => { setPasswordFor(null); setNewPassword(''); }); }}
                      >
                        <label htmlFor={`pw-${user.user_id}`} className="sr-only">Nova senha</label>
                        <input id={`pw-${user.user_id}`} type="text" minLength={8} autoComplete="new-password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Nova senha, 8 caracteres ou mais" className="input input-sm" autoFocus />
                        <button type="submit" disabled={busy || newPassword.length < 8} className="btn btn-primary flex-shrink-0"><Check /> Gravar</button>
                        <button type="button" onClick={() => setPasswordFor(null)} className="btn btn-icon-sm flex-shrink-0 h-control w-9" aria-label="Cancelar"><X /></button>
                      </form>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <form onSubmit={handleCreate} className="well p-4">
          <h3 className="lbl text-ink-strong mb-3">Novo usuário</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="nu-name" className="field-label">Nome</label>
              <input id="nu-name" type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Nome da pessoa" className="input input-sm" />
            </div>
            <div>
              <label htmlFor="nu-email" className="field-label">E-mail</label>
              <input id="nu-email" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="nome@sementesoilema.com.br" className="input input-sm" />
            </div>
            <div>
              <label htmlFor="nu-pass" className="field-label">Senha inicial</label>
              <input id="nu-pass" type="text" required minLength={8} autoComplete="new-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="8 caracteres ou mais" className="input input-sm" />
            </div>
            <div>
              <label htmlFor="nu-role" className="field-label">Perfil</label>
              <select id="nu-role" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className="input input-sm">
                {ROLE_OPTIONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>
          </div>
          <p className="hint">{ROLE_OPTIONS.find(r => r.value === form.role)?.description}</p>
          <button type="submit" disabled={isCreating} className="btn btn-primary btn-lg w-full mt-4">
            {isCreating ? <><Spinner /> Criando…</> : <><UserPlus /> Criar usuário</>}
          </button>
        </form>

        <section className="grid sm:grid-cols-3 gap-2">
          {ROLE_OPTIONS.map(r => (
            <div key={r.value} className="rounded-lg border border-line px-3.5 py-3">
              <b className="block text-[13px] leading-[18px] text-ink-strong">{r.label}</b>
              <span className="block text-[12px] leading-4 text-ink-muted mt-0.5">{r.description}</span>
            </div>
          ))}
        </section>
      </div>
    </Modal>
  );
}
