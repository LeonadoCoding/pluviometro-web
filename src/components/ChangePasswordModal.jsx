import React, { useEffect, useState } from 'react';
import { KeyRound, Eye, EyeOff, Check } from 'lucide-react';
import { changePassword } from '../services/auth';
import Modal from './ui/Modal';
import { Notice, Spinner } from './ui/primitives';

function strengthOf(pass) {
  if (!pass) return null;
  let score = 0;
  if (pass.length >= 8) score++;
  if (pass.length >= 12) score++;
  if (/[A-Z]/.test(pass) && /[a-z]/.test(pass)) score++;
  if (/[0-9]/.test(pass)) score++;
  if (/[^A-Za-z0-9]/.test(pass)) score++;
  if (pass.length < 8) return { level: 1, label: 'Curta: use 8 caracteres ou mais', tone: 'bg-danger', text: 'text-danger' };
  if (score <= 3) return { level: 2, label: 'Média', tone: 'bg-warning', text: 'text-warning' };
  return { level: 3, label: 'Forte', tone: 'bg-success', text: 'text-success' };
}

function PasswordField({ id, label, value, onChange, autoComplete, show, onToggle }) {
  return (
    <div>
      <label htmlFor={id} className="field-label">{label}</label>
      <div className="relative">
        <input id={id} type={show ? 'text' : 'password'} autoComplete={autoComplete} value={value} onChange={(e) => onChange(e.target.value)} required className="input pr-12" />
        {onToggle && (
          <button type="button" onClick={onToggle} className="absolute right-1.5 top-1/2 -translate-y-1/2 btn btn-icon-sm w-9 h-9" aria-label={show ? 'Esconder senha' : 'Mostrar senha'} aria-pressed={show}>
            {show ? <EyeOff /> : <Eye />}
          </button>
        )}
      </div>
    </div>
  );
}

export default function ChangePasswordModal({ isOpen, onClose, onSuccess }) {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (isOpen) { setCurrent(''); setNext(''); setConfirm(''); setErrorMsg(''); setShow(false); setIsLoading(false); }
  }, [isOpen]);

  const strength = strengthOf(next);
  const mismatch = confirm && next !== confirm;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    if (next.length < 8) return setErrorMsg('A nova senha precisa ter 8 caracteres ou mais.');
    if (next !== confirm) return setErrorMsg('A confirmação não é igual à nova senha.');
    if (current === next) return setErrorMsg('A nova senha precisa ser diferente da atual.');
    setIsLoading(true);
    try {
      await changePassword(current, next);
      onSuccess?.();
      onClose();
    } catch (err) {
      setErrorMsg(err.message?.includes('incorretos') ? 'A senha atual não confere.' : err.message || 'Não foi possível alterar a senha.');
      setIsLoading(false);
    }
  };

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      icon={KeyRound}
      title="Alterar senha"
      subtitle="Vale para o próximo acesso, em qualquer aparelho"
      size="sm"
      footer={
        <>
          <button type="button" onClick={onClose} className="btn btn-secondary btn-lg">Cancelar</button>
          <button type="submit" form="change-pass" disabled={isLoading} className="btn btn-primary btn-lg">
            {isLoading ? <><Spinner /> Alterando…</> : <><Check strokeWidth={2.5} /> Alterar senha</>}
          </button>
        </>
      }
    >
      <form id="change-pass" onSubmit={handleSubmit} className="space-y-4" noValidate>
        {errorMsg && <Notice>{errorMsg}</Notice>}
        <PasswordField id="pass-current" label="Senha atual" value={current} onChange={setCurrent} autoComplete="current-password" show={show} onToggle={() => setShow(s => !s)} />
        <div>
          <PasswordField id="pass-new" label="Nova senha" value={next} onChange={setNext} autoComplete="new-password" show={show} />
          {strength && (
            <div className="mt-2">
              <div className="flex gap-1">
                {[1, 2, 3].map(n => <span key={n} className={`h-1 flex-1 rounded-full transition-colors duration-300 ${n <= strength.level ? strength.tone : 'bg-surface-control'}`} />)}
              </div>
              <p className={`text-[12px] font-semibold mt-1 ${strength.text}`}>{strength.label}</p>
            </div>
          )}
        </div>
        <div>
          <PasswordField id="pass-confirm" label="Repita a nova senha" value={confirm} onChange={setConfirm} autoComplete="new-password" show={show} />
          {mismatch && <p className="text-[12px] font-semibold text-danger mt-1.5">As senhas não são iguais.</p>}
        </div>
      </form>
    </Modal>
  );
}
