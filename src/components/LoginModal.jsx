import React, { useEffect, useState } from 'react';
import { LockKeyhole, Eye, EyeOff } from 'lucide-react';
import { loginUser } from '../services/auth';
import Modal from './ui/Modal';
import { Notice, Spinner } from './ui/primitives';

// Usado quando a sessão expira no meio do uso: entra de novo sem perder a tela
export default function LoginModal({ isOpen, onClose, onLoginSuccess }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => { if (isOpen) { setPassword(''); setErrorMsg(''); setIsLoading(false); } }, [isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setIsLoading(true);
    try {
      const res = await loginUser(email.trim(), password);
      if (res.success) { onLoginSuccess(res.user); onClose(); }
    } catch (err) {
      setErrorMsg(err.message || 'E-mail ou senha incorretos.');
      setIsLoading(false);
    }
  };

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      icon={LockKeyhole}
      title="Entre de novo"
      subtitle="Sua sessão terminou. O painel continua aberto."
      size="sm"
      footer={
        <button type="submit" form="relogin" disabled={isLoading} className="btn btn-primary btn-lg w-full">
          {isLoading ? <><Spinner /> Entrando…</> : 'Entrar'}
        </button>
      }
    >
      <form id="relogin" onSubmit={handleSubmit} className="space-y-4">
        {errorMsg && <Notice>{errorMsg}</Notice>}
        <div>
          <label htmlFor="relogin-email" className="field-label">E-mail</label>
          <input id="relogin-email" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required className="input" />
        </div>
        <div>
          <label htmlFor="relogin-pass" className="field-label">Senha</label>
          <div className="relative">
            <input id="relogin-pass" type={show ? 'text' : 'password'} autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required className="input pr-12" />
            <button type="button" onClick={() => setShow(s => !s)} className="absolute right-1.5 top-1/2 -translate-y-1/2 btn btn-icon-sm w-9 h-9" aria-label={show ? 'Esconder senha' : 'Mostrar senha'} aria-pressed={show}>
              {show ? <EyeOff /> : <Eye />}
            </button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
