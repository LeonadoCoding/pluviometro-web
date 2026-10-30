import React, { useState, useEffect } from 'react';
import { X, Users, UserPlus, Trash2, KeyRound, Check, AlertTriangle, Mail } from 'lucide-react';
import { listUsers, createUser, updateUserRole, setUserPassword, removeUser } from '../services/users';

const inputClass = 'w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rain-500 transition';
const sectionClass = 'bg-slate-50 dark:bg-slate-950/60 rounded-2xl p-4 border border-slate-200 dark:border-slate-800';
const sectionTitleClass = 'text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5';

const ROLE_OPTIONS = [
  { value: 'visualizador', label: 'Visualizador', description: 'Vê todos os indicadores e gera o PDF.' },
  { value: 'alimentador', label: 'Alimentador', description: 'Igual ao visualizador, e também lança chuvas.' },
  { value: 'admin', label: 'Administrador', description: 'Acesso completo, incluindo usuários, importação e avisos.' }
];

const EMPTY_FORM = { name: '', email: '', password: '', role: 'visualizador' };

export default function UsersModal({ isOpen, onClose, currentUser }) {
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [statusMsg, setStatusMsg] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [passwordFor, setPasswordFor] = useState(null);
  const [newPassword, setNewPassword] = useState('');

  const reload = () => listUsers().then(setUsers);

  useEffect(() => {
    if (!isOpen) return;
    setStatusMsg(null);
    setPasswordFor(null);
    setIsLoading(true);
    reload()
      .catch(err => setStatusMsg({ type: 'error', text: err.message }))
      .finally(() => setIsLoading(false));
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCreate = async (e) => {
    e.preventDefault();
    setIsCreating(true);
    setStatusMsg(null);
    try {
      const res = await createUser(form);
      setStatusMsg({
        type: 'success',
        text: res.existed
          ? `${form.email} já tinha conta no Supabase e recebeu acesso como ${ROLE_OPTIONS.find(r => r.value === form.role)?.label}. A senha dele não foi alterada.`
          : `Usuário ${form.email} criado. Envie a ele o e-mail e a senha para o primeiro acesso.`
      });
      setForm(EMPTY_FORM);
      await reload();
    } catch (err) {
      setStatusMsg({ type: 'error', text: err.message });
    } finally {
      setIsCreating(false);
    }
  };

  const handleRoleChange = async (user, role) => {
    setBusyId(user.user_id);
    setStatusMsg(null);
    try {
      await updateUserRole(user.user_id, role);
      setStatusMsg({ type: 'success', text: `Perfil de ${user.email} alterado para ${ROLE_OPTIONS.find(r => r.value === role)?.label}.` });
      await reload();
    } catch (err) {
      setStatusMsg({ type: 'error', text: err.message });
    } finally {
      setBusyId(null);
    }
  };

  const handleSetPassword = async (user) => {
    setBusyId(user.user_id);
    setStatusMsg(null);
    try {
      await setUserPassword(user.user_id, newPassword);
      setStatusMsg({ type: 'success', text: `Nova senha definida para ${user.email}.` });
      setPasswordFor(null);
      setNewPassword('');
    } catch (err) {
      setStatusMsg({ type: 'error', text: err.message });
    } finally {
      setBusyId(null);
    }
  };

  const handleRemove = async (user) => {
    if (!window.confirm(`Remover o acesso de ${user.email}? A conta de login também será excluída.`)) return;
    setBusyId(user.user_id);
    setStatusMsg(null);
    try {
      await removeUser(user.user_id);
      setStatusMsg({ type: 'success', text: `Usuário ${user.email} removido.` });
      await reload();
    } catch (err) {
      setStatusMsg({ type: 'error', text: err.message });
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm transition-opacity">
      <div className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl p-6 relative max-h-[90vh] overflow-y-auto">

        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-rain-500/10 dark:bg-rain-500/20 text-rain-600 dark:text-rain-400 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Usuários do Pluviômetro</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Quem acessa o painel e o que cada um pode fazer</p>
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

          {/* Novo usuário */}
          <form onSubmit={handleCreate} className={`${sectionClass} space-y-3`}>
            <h4 className={sectionTitleClass}>Novo usuário</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="block">
                <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">Nome</span>
                <input id="new-user-name" type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Nome da pessoa" className={`${inputClass} mt-1`} />
              </label>
              <label className="block">
                <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">E-mail</span>
                <input id="new-user-email" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="nome@empresa.com.br" className={`${inputClass} mt-1`} />
              </label>
              <label className="block">
                <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">Senha inicial</span>
                <input id="new-user-password" type="text" required minLength={8} autoComplete="new-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Mínimo 8 caracteres" className={`${inputClass} mt-1`} />
              </label>
              <label className="block">
                <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">Perfil</span>
                <select id="new-user-role" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className={`${inputClass} mt-1 cursor-pointer`}>
                  {ROLE_OPTIONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
              </label>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              {ROLE_OPTIONS.find(r => r.value === form.role)?.description}
            </p>
            <button
              type="submit"
              disabled={isCreating}
              className="w-full py-3 bg-gradient-to-r from-rain-500 to-oilema-flame hover:from-rain-600 hover:to-rain-600 text-white font-bold text-sm rounded-xl shadow-lg shadow-rain-500/25 flex items-center justify-center gap-2 transition disabled:opacity-50"
            >
              <UserPlus className="w-4 h-4" />
              {isCreating ? 'Criando...' : 'Criar usuário'}
            </button>
          </form>

          {/* Lista */}
          <div className={sectionClass}>
            <h4 className={sectionTitleClass}>Usuários cadastrados ({users.length})</h4>
            {isLoading && <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">Carregando usuários...</p>}
            <ul className="mt-2 space-y-2">
              {users.map(user => {
                const isMe = user.user_id === currentUser?.id;
                const busy = busyId === user.user_id;
                return (
                  <li key={user.user_id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2.5 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <span className="text-sm font-semibold text-slate-800 dark:text-slate-100 block truncate">
                          {user.name || user.email}{isMe && <span className="text-[11px] font-normal text-slate-400"> (você)</span>}
                        </span>
                        <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 truncate">
                          <Mail className="w-3 h-3 flex-shrink-0" />{user.email}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <select
                          aria-label={`Perfil de ${user.email}`}
                          value={user.role}
                          disabled={isMe || busy}
                          onChange={(e) => handleRoleChange(user, e.target.value)}
                          className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-xs font-semibold text-rain-700 dark:text-rain-300 focus:outline-none focus:ring-2 focus:ring-rain-500 disabled:opacity-60 cursor-pointer"
                        >
                          {ROLE_OPTIONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                        </select>
                        <button
                          onClick={() => { setPasswordFor(passwordFor === user.user_id ? null : user.user_id); setNewPassword(''); }}
                          disabled={busy}
                          title="Definir nova senha"
                          className="p-1.5 text-slate-400 hover:text-rain-600 dark:hover:text-rain-400 transition disabled:opacity-50"
                        >
                          <KeyRound className="w-4 h-4" />
                        </button>
                        {!isMe && (
                          <button
                            onClick={() => handleRemove(user)}
                            disabled={busy}
                            title="Remover usuário"
                            className="p-1.5 text-slate-400 hover:text-red-500 transition disabled:opacity-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                    {passwordFor === user.user_id && (
                      <div className="flex gap-2">
                        <input
                          id={`password-${user.user_id}`}
                          type="text"
                          minLength={8}
                          autoComplete="new-password"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="Nova senha (mínimo 8 caracteres)"
                          className={inputClass}
                        />
                        <button
                          onClick={() => handleSetPassword(user)}
                          disabled={busy || newPassword.length < 8}
                          className="px-3 rounded-lg bg-rain-500 hover:bg-rain-600 text-white text-xs font-semibold transition flex-shrink-0 disabled:opacity-50"
                        >
                          Salvar
                        </button>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Perfis */}
          <div className={sectionClass}>
            <h4 className={sectionTitleClass}>O que cada perfil pode fazer</h4>
            <ul className="mt-2 space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
              {ROLE_OPTIONS.map(r => (
                <li key={r.value}><strong className="text-slate-800 dark:text-slate-100">{r.label}:</strong> {r.description}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
