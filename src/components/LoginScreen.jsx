import React, { useEffect, useState } from 'react';
import { Eye, EyeOff, Sun, Moon, ArrowRight, Droplets, CloudRain, FileText } from 'lucide-react';
import { loginUser } from '../services/auth';
import { Logo, Waves, Notice, Spinner } from './ui/primitives';

const IS_TEST = import.meta.env.VITE_TEST_INSTANCE === '1';

// Três recortes do painel, desenhados com os dados de exemplo, que se revezam ao lado do login
const SLIDES = [
  {
    key: 'safra',
    title: 'Acumulado da safra.', tab: 'Safra',
    rest: ' A chuva de cada mês e o total comparado com a média histórica.',
    icon: Droplets
  },
  {
    key: 'previsao',
    title: 'Previsão para a UBS.', tab: 'Previsão',
    rest: ' Quanto deve chover nos próximos dias, com o mapa da região.',
    icon: CloudRain
  },
  {
    key: 'boletim',
    title: 'Boletim em PDF.', tab: 'Boletim',
    rest: ' Indicadores, gráficos e tabela da safra prontos para enviar.',
    icon: FileText
  }
];

const BARS = [38, 72, 118, 164, 142, 96, 41, 8, 0, 0, 0, 0];
const MONTHS = ['OUT', 'NOV', 'DEZ', 'JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET'];

function SlideArt({ which }) {
  if (which === 'safra') {
    let acc = 0;
    const pts = BARS.slice(0, 8).map((b, i) => { acc += b; return [18 + i * 26 + 9, 128 - (acc / 700) * 112]; });
    return (
      <div className="rounded-xl border border-line bg-surface shadow-card p-4 w-full">
        <div className="flex items-center justify-between">
          <span className="lbl text-accent-text">Acumulado da safra</span>
          <span className="chip num">2025/2026</span>
        </div>
        <p className="mt-1 flex items-baseline gap-1.5"><b className="num font-display text-[32px] leading-9 text-ink-strong">679,0</b><span className="font-bold text-accent-text">mm</span><span className="ml-auto text-[12px] font-bold text-success num">+8% vs. média</span></p>
        <svg viewBox="0 0 330 140" className="w-full mt-2" aria-hidden="true">
          {[32, 72, 112].map(y => <line key={y} x1="10" x2="322" y1={y} y2={y} stroke="var(--chart-grid)" strokeDasharray="3 3" />)}
          {BARS.map((b, i) => <rect key={i} x={18 + i * 26} y={128 - b * 0.62} width="18" height={Math.max(0, b * 0.62)} rx="3" fill="var(--chart-1)" style={{ transformOrigin: `${27 + i * 26}px 128px`, animation: `bar-grow .6s ${i * 50}ms cubic-bezier(.2,.8,.2,1) both` }} />)}
          <polyline points={pts.map(p => p.join(',')).join(' ')} fill="none" stroke="var(--chart-2)" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" style={{ strokeDasharray: 400, animation: 'draw-line 1.2s .3s ease both' }} />
          {MONTHS.map((m, i) => <text key={m} x={27 + i * 26} y="139" textAnchor="middle" fontSize="8.5" fill="var(--chart-axis)" fontFamily="Amsi Pro, sans-serif">{m}</text>)}
        </svg>
      </div>
    );
  }
  if (which === 'previsao') {
    const days = [['hoje', 12], ['qui', 24], ['sex', 6], ['sáb', 0], ['dom', 3]];
    return (
      <div className="rounded-xl border border-line bg-surface shadow-card p-4 w-full">
        <div className="flex items-start gap-3">
          <span className="w-10 h-10 rounded-lg bg-orange-50 text-orange-700 dark:bg-orange-500/15 dark:text-orange-400 flex items-center justify-center flex-shrink-0"><CloudRain className="w-5 h-5" /></span>
          <p className="text-[14px] leading-5 text-ink"><b className="text-ink-strong">Chuva moderada prevista: cerca de 40 mm nos próximos 3 dias</b> · mais chuva na quinta-feira, 20/11</p>
        </div>
        <div className="flex items-end justify-between gap-2 mt-5 px-2">
          {days.map(([d, mm], i) => (
            <div key={d} className="flex flex-col items-center gap-1.5 flex-1">
              <span className="num text-[11px] font-semibold text-ink-muted">{mm ? `${mm} mm` : '—'}</span>
              <div className="h-16 flex items-end"><span className={`w-4 rounded-full ${mm ? 'bg-accent' : 'bg-line'}`} style={{ height: Math.max(4, mm * 2.5), animation: `bar-grow .6s ${i * 80}ms cubic-bezier(.2,.8,.2,1) both`, transformOrigin: 'bottom' }} /></div>
              <span className="text-[11px] text-ink-muted">{d}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return (
    <div className="rounded-xl border border-line bg-white shadow-card w-full overflow-hidden text-petrol-900">
      <div className="relative h-14 px-4 flex items-center border-b border-petrol-200">
        <img src={`${import.meta.env.BASE_URL}logo-oilema-cores.png`} alt="" className="h-8 w-auto" />
        <Waves paper className="absolute right-0 top-0 h-full w-20" />
      </div>
      <div className="h-1.5 flex"><span className="flex-[3] bg-[#f28322]" /><span className="flex-1 bg-[#385059]" /></div>
      <div className="p-4">
        <p className="font-display font-bold text-[17px] leading-5 uppercase tracking-wide text-[#385059]">Boletim pluviométrico · Safra 2025/2026</p>
        <div className="grid grid-cols-3 gap-2 mt-3">
          {[['Acumulado', '679,0 mm'], ['Média do mês', '4,12 mm/dia'], ['Recorde', '127,0 mm']].map(([k, v]) => (
            <div key={k} className="rounded border border-petrol-200 bg-petrol-50 px-2 py-1.5"><span className="block text-[9px] font-bold uppercase tracking-wider text-petrol-500">{k}</span><b className="num text-[13px]">{v}</b></div>
          ))}
        </div>
        <div className="mt-3 rounded overflow-hidden border border-petrol-200 text-[10px]">
          <div className="grid grid-cols-3 bg-[#385059] text-white font-bold px-2 py-1"><span>MÊS</span><span className="text-right">TOTAL</span><span className="text-right">MÉDIA/DIA</span></div>
          {[['OUT', '38,0', '1,23'], ['NOV', '72,0', '2,40'], ['DEZ', '118,0', '3,81']].map((r, i) => (
            <div key={r[0]} className={`grid grid-cols-3 px-2 py-1 num ${i % 2 ? 'bg-petrol-50' : ''}`}><span className="font-bold text-[#d2651b]">{r[0]}</span><span className="text-right">{r[1]}</span><span className="text-right">{r[2]}</span></div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Showcase() {
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    const t = setInterval(() => setI(x => (x + 1) % SLIDES.length), 6000);
    return () => clearInterval(t);
  }, [paused]);

  const s = SLIDES[i];
  return (
    <section
      aria-roledescription="carrossel"
      aria-label="O que o Pluviômetro mostra"
      className="relative hidden lg:flex flex-col justify-center overflow-hidden bg-page px-12 xl:px-20"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <Waves full className="absolute top-0 right-0 h-full w-[40%]" />
      <div className="relative max-w-[440px] w-full">
        <div key={s.key} className="[animation:fade-up_.55s_cubic-bezier(.2,.8,.2,1)_both]">
          <p className="text-[28px] leading-[34px] xl:text-[32px] xl:leading-[38px] font-bold text-ink-strong tracking-[-0.01em]">
            {s.title}<span className="text-ink-muted font-semibold">{s.rest}</span>
          </p>
          <div className="mt-8"><SlideArt which={s.key} /></div>
        </div>
        <div className="mt-8 flex gap-2" role="tablist" aria-label="Escolher recurso">
          {SLIDES.map((sl, idx) => (
            <button
              key={sl.key}
              type="button"
              role="tab"
              aria-selected={idx === i}
              onClick={() => setI(idx)}
              className={`group flex-1 text-left rounded-lg px-3 pt-2.5 pb-3 border transition-colors ${idx === i ? 'border-line bg-surface shadow-card' : 'border-transparent hover:bg-surface-control'}`}
            >
              <span className={`flex items-center gap-1.5 text-[13px] font-semibold ${idx === i ? 'text-ink-strong' : 'text-ink-muted'}`}><sl.icon className="w-4 h-4 text-accent-text" />{sl.tab}</span>
              <span className="block mt-2 h-[3px] rounded-full bg-line overflow-hidden">
                <span
                  key={`${i}-${paused}`}
                  className="block h-full bg-accent rounded-full"
                  style={idx === i ? { animation: paused ? 'none' : 'progress 6s linear both', width: paused ? '100%' : undefined } : { width: idx < i ? '100%' : '0%' }}
                />
              </span>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

export default function LoginScreen({ onLoginSuccess, theme, onToggleTheme }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setIsLoading(true);
    try {
      const res = await loginUser(email.trim(), password);
      if (res.success) onLoginSuccess(res.user);
    } catch (err) {
      setErrorMsg(err.message || 'E-mail ou senha incorretos.');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-[minmax(480px,1fr)_1.15fr] bg-surface">
      <div className="relative flex flex-col px-5 sm:px-10 py-6 sm:py-8">
        <div className="flex items-center justify-between">
          <span className="eyebrow">Sementes Oilema · uso interno</span>
          <button type="button" onClick={onToggleTheme} className="btn btn-icon" aria-label={theme === 'dark' ? 'Usar tema claro' : 'Usar tema escuro'} title={theme === 'dark' ? 'Usar tema claro' : 'Usar tema escuro'}>
            {theme === 'dark' ? <Sun /> : <Moon />}
          </button>
        </div>

        <form onSubmit={handleSubmit} className="w-full max-w-[400px] mx-auto my-auto py-10 [animation:fade-up_.6s_cubic-bezier(.2,.8,.2,1)_both]" noValidate={false}>
          <Logo className="h-14 sm:h-16" />
          <h1 className="t-display text-ink-strong uppercase mt-8 text-[38px] leading-[40px] sm:text-[44px] sm:leading-[44px]">Pluviômetro</h1>
          <p className="text-[15px] leading-[22px] text-ink-muted mt-2">
            Chuva diária da UBS Placas, em Barreiras/BA: safra, médias, previsão e boletim em PDF.
          </p>

          <div className="mt-8 space-y-4">
            {errorMsg && <Notice>{errorMsg}</Notice>}
            <div>
              <label htmlFor="login-email" className="field-label">E-mail</label>
              <input id="login-email" type="email" autoComplete="username" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus className="input" placeholder="nome@sementesoilema.com.br" />
            </div>
            <div>
              <label htmlFor="login-pass" className="field-label">Senha</label>
              <div className="relative">
                <input id="login-pass" type={showPassword ? 'text' : 'password'} autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required className="input pr-12" />
                <button type="button" onClick={() => setShowPassword(v => !v)} className="absolute right-1.5 top-1/2 -translate-y-1/2 btn btn-icon-sm w-9 h-9" aria-label={showPassword ? 'Esconder senha' : 'Mostrar senha'} aria-pressed={showPassword}>
                  {showPassword ? <EyeOff /> : <Eye />}
                </button>
              </div>
            </div>
          </div>

          <button type="submit" disabled={isLoading} className="btn btn-primary btn-lg w-full mt-7 h-12">
            {isLoading ? <><Spinner /> Entrando…</> : <>Entrar no painel <ArrowRight className="transition-transform group-hover:translate-x-0.5" /></>}
          </button>

          <p className="text-[13px] leading-[19px] text-ink-muted mt-5">
            Sem acesso? Peça a um administrador do Pluviômetro para cadastrar o seu e-mail.
          </p>

          {IS_TEST && (
            <div className="mt-6 rounded-lg border border-dashed border-[rgba(242,131,34,.5)] bg-orange-50 dark:bg-orange-500/10 px-4 py-3 text-[13px] leading-5 text-orange-800 dark:text-orange-200">
              <b className="block lbl mb-1">Instância de teste</b>
              Dados locais, sem o Supabase real. Entre com <button type="button" className="font-bold underline underline-offset-2" onClick={() => { setEmail('admin@teste.local'); setPassword('teste-oilema-2026'); }}>admin@teste.local</button>,{' '}
              <button type="button" className="font-bold underline underline-offset-2" onClick={() => { setEmail('alimentador@teste.local'); setPassword('teste-oilema-2026'); }}>alimentador</button> ou{' '}
              <button type="button" className="font-bold underline underline-offset-2" onClick={() => { setEmail('visualizador@teste.local'); setPassword('teste-oilema-2026'); }}>visualizador</button> (senha teste-oilema-2026).
            </div>
          )}
        </form>

        <p className="text-[12px] text-ink-muted">Sementes Oilema · Luís Eduardo Magalhães/BA · Sementes para o novo campo</p>
      </div>

      <Showcase />
    </div>
  );
}
