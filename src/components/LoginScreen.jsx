import React, { useState } from 'react';
import { CloudRain, Lock, User, KeyRound, Check, Eye, EyeOff, ShieldAlert, Sun, Moon } from 'lucide-react';
import { loginUser } from '../services/auth';

export default function LoginScreen({ onLoginSuccess, theme, onToggleTheme }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setIsLoading(true);

    try {
      const res = await loginUser(username.trim(), password);
      if (res.success) {
        onLoginSuccess(res.user);
      }
    } catch (err) {
      setErrorMsg(err.message || 'Credenciais inválidas. Verifique usuário e senha.');
    } finally {
      setIsLoading(false);
    }
  };


  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0b1329] text-slate-800 dark:text-slate-100 flex flex-col justify-between p-4 sm:p-6 relative transition-colors selection:bg-rain-500 selection:text-white">
      
      {/* Botão de Tema no Topo */}
      <div className="max-w-md w-full mx-auto flex justify-end">
        <button
          onClick={onToggleTheme}
          title={theme === 'dark' ? 'Mudar para Tema Claro' : 'Mudar para Tema Escuro'}
          className="p-2.5 rounded-xl bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-700/60 shadow-xs transition active:scale-95"
        >
          {theme === 'dark' ? (
            <Sun className="w-4 h-4 text-amber-400" />
          ) : (
            <Moon className="w-4 h-4 text-sky-600" />
          )}
        </button>
      </div>

      {/* Card Central de Login */}
      <div className="max-w-md w-full mx-auto my-auto">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl p-6 sm:p-8 relative overflow-hidden transition-colors">
          
          {/* Efeito Glow decorativo */}
          <div className="absolute top-0 right-0 w-40 h-40 bg-rain-500/10 dark:bg-rain-500/20 rounded-full blur-3xl pointer-events-none"></div>

          {/* Logo & Cabeçalho */}
          <div className="flex flex-col items-center text-center mb-6">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-rain-600 to-sky-400 p-0.5 shadow-xl shadow-rain-500/25 mb-3 flex items-center justify-center">
              <div className="w-full h-full bg-white dark:bg-slate-900 rounded-[14px] flex items-center justify-center">
                <CloudRain className="w-7 h-7 text-rain-500 dark:text-rain-400 animate-pulse" />
              </div>
            </div>
            
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
              PLUVIÔMETRO
              <span className="text-xs px-2 py-0.5 rounded-full bg-rain-500/10 text-rain-600 dark:text-rain-400 border border-rain-500/20 font-bold">
                PRO
              </span>
            </h1>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-0.5">
              UBS Sementes Oilema • Placas - Barreiras / BA
            </p>
            <div className="mt-2.5 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-[11px] font-medium text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
              <Lock className="w-3 h-3 text-rain-500" />
              <span>Acesso Seguro • Identifique-se para acessar</span>
            </div>
          </div>

          {/* Mensagem de Erro */}
          {errorMsg && (
            <div className="mb-4 p-3.5 rounded-xl bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Formulário de Login */}
          <form onSubmit={handleSubmit} className="space-y-4">
            
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-rain-500" />
                E-mail
              </label>
              <input
                type="email"
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                autoFocus
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-rain-500 transition"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5 text-rain-500" />
                Senha de Acesso
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="Sua senha"
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-rain-500 pr-10 transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3.5 bg-gradient-to-r from-rain-500 to-sky-500 hover:from-rain-600 hover:to-sky-600 active:scale-[0.98] text-white font-bold text-sm rounded-xl shadow-lg shadow-rain-500/25 flex items-center justify-center gap-2 transition disabled:opacity-50"
              >
                {isLoading ? (
                  <span>Autenticando no servidor...</span>
                ) : (
                  <>
                    <Check className="w-4 h-4 stroke-[2.5]" />
                    <span>Acessar o Painel Pluviométrico</span>
                  </>
                )}
              </button>
            </div>

          </form>

        </div>
      </div>

      {/* Footer */}
      <footer className="text-center text-xs text-slate-400 dark:text-slate-600 py-2">
        UBS Sementes Oilema • Sistema Protegido por Autenticação JWT
      </footer>

    </div>
  );
}
