// Capturas da instância de teste (Chrome headless via DevTools, sem dependências).
//   node scripts/shots.mjs [saida] [cenarios...]
// Cenários: login-<tema>-<largura>, painel-<tema>-<largura>[-<perfil>], modal-<nome>-<tema>-<largura>
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const APP = process.env.APP_URL || 'http://127.0.0.1:5173/pluviometro-web/';
const API = process.env.API_URL || 'http://127.0.0.1:54321';
const CHROME = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const OUT = path.resolve(process.argv[2] || 'shots');
const SCENES = process.argv.slice(3);
fs.mkdirSync(OUT, { recursive: true });

const PORT = 9333 + Math.floor(Math.random() * 400);
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'pluv-shots-'));
const chrome = spawn(CHROME, [
  '--headless=new', `--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`,
  '--no-first-run', '--no-default-browser-check', '--hide-scrollbars', '--force-device-scale-factor=1', 'about:blank'
], { stdio: 'ignore' });

const sleep = (ms) => new Promise(r => setTimeout(r, ms));
async function getWs() {
  for (let i = 0; i < 60; i++) {
    try {
      const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
      const page = list.find(t => t.type === 'page');
      if (page) return page.webSocketDebuggerUrl;
    } catch { /* ainda subindo */ }
    await sleep(250);
  }
  throw new Error('Chrome não respondeu');
}

let ws, seq = 0;
const pending = new Map();
const consoleErrors = [];
function cdp(method, params = {}) {
  const id = ++seq;
  ws.send(JSON.stringify({ id, method, params }));
  return new Promise((resolve, reject) => pending.set(id, { resolve, reject }));
}
const evaluate = async (expr) => {
  const r = await cdp('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || 'erro no evaluate');
  return r.result.value;
};

async function setViewport(w, h, mobile) {
  await cdp('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile });
}
async function setTheme(theme) {
  await cdp('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: theme }, { name: 'prefers-reduced-motion', value: 'reduce' }] });
}
async function go(url) {
  await cdp('Page.navigate', { url });
  for (let i = 0; i < 80; i++) {
    await sleep(150);
    if (await evaluate('document.readyState') === 'complete') break;
  }
}
async function login(email, theme) {
  const res = await (await fetch(`${API}/auth/v1/token?grant_type=password`, { method: 'POST', body: JSON.stringify({ email, password: 'teste-oilema-2026' }) })).json();
  const role = await (await fetch(`${API}/rest/v1/rpc/pluviometro_role`, { method: 'POST', headers: { Authorization: `Bearer ${res.access_token}` } })).json();
  const user = { id: res.user.id, email, username: email, name: res.user.user_metadata.name, role, isAdmin: role === 'admin' };
  await go(APP);
  await evaluate(`localStorage.setItem('pluviometro_supabase_session', ${JSON.stringify(JSON.stringify(res))});
    localStorage.setItem('pluviometro_user_info', ${JSON.stringify(JSON.stringify(user))});
    localStorage.setItem('pluviometro_theme_preference', '${theme}'); true`);
}
async function shot(name, full = true) {
  await sleep(250);
  // Página inteira: aumenta a janela até a altura do conteúdo e espera os gráficos
  // (que reiniciam a animação quando o tamanho muda) antes de capturar
  if (full) {
    const metrics = await cdp('Page.getLayoutMetrics');
    const w = metrics.cssLayoutViewport.clientWidth;
    const h = Math.min(12000, Math.ceil(metrics.cssContentSize.height));
    await setViewport(w, h, w < 700);
    await sleep(1600);
  }
  const { data } = await cdp('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(OUT, `${name}.png`), Buffer.from(data, 'base64'));
  console.log('ok', name);
}

const MODALS = {
  lancar: `[...document.querySelectorAll('button')].find(b => /Lançar chuva/.test(b.textContent))?.click()`,
  pdf: `document.querySelector('[aria-label="Gerar boletim em PDF"]').click()`,
  usuarios: `document.querySelector('[aria-haspopup="menu"]').click(); setTimeout(() => [...document.querySelectorAll('[role=menuitem]')].find(b => /Usuários/.test(b.textContent)).click(), 200)`,
  avisos: `document.querySelector('[aria-haspopup="menu"]').click(); setTimeout(() => [...document.querySelectorAll('[role=menuitem]')].find(b => /Avisos/.test(b.textContent)).click(), 200)`,
  backup: `document.querySelector('[aria-haspopup="menu"]').click(); setTimeout(() => [...document.querySelectorAll('[role=menuitem]')].find(b => /Backup|Exportar/.test(b.textContent)).click(), 200)`,
  menu: `document.querySelector('[aria-haspopup="menu"]').click()`,
  avisosfim: `document.querySelector('[aria-haspopup="menu"]').click(); setTimeout(() => [...document.querySelectorAll('[role=menuitem]')].find(b => /Avisos/.test(b.textContent)).click(), 200); setTimeout(() => [...document.querySelectorAll('[role=dialog] *')].filter(e => e.scrollHeight > e.clientHeight + 20 && getComputedStyle(e).overflowY !== 'visible').forEach(e => e.scrollTop = 520), 900)`,
  senha: `document.querySelector('[aria-haspopup="menu"]').click(); setTimeout(() => [...document.querySelectorAll('[role=menuitem]')].find(b => /senha/.test(b.textContent)).click(), 200)`,
  excluir: `document.querySelector('[aria-label^="Excluir leitura"]').click()`,
  editar: `document.querySelector('[aria-label^="Editar leitura"]').click()`
};
const PROFILES = { admin: 'admin@teste.local', alimentador: 'alimentador@teste.local', visualizador: 'visualizador@teste.local' };

try {
  ws = new WebSocket(await getWs());
  await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });
  ws.onmessage = (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.id && pending.has(msg.id)) {
      const p = pending.get(msg.id); pending.delete(msg.id);
      msg.error ? p.reject(new Error(msg.error.message)) : p.resolve(msg.result);
    } else if (msg.method === 'Runtime.exceptionThrown') {
      consoleErrors.push(msg.params.exceptionDetails?.exception?.description || 'exceção');
    } else if (msg.method === 'Runtime.consoleAPICalled' && (msg.params.type === 'error' || msg.params.type === 'warning')) {
      consoleErrors.push(msg.params.args.map(a => a.value ?? a.description).join(' '));
    }
  };
  await cdp('Page.enable');
  await cdp('Runtime.enable');

  for (const scene of SCENES) {
    const parts = scene.split('-');
    const kind = parts[0];
    if (kind === 'login') {
      const [, theme, w] = parts;
      await setViewport(+w, +w < 700 ? 844 : 900, +w < 700);
      await setTheme(theme);
      await go(APP);
      await evaluate(`localStorage.clear(); localStorage.setItem('pluviometro_theme_preference','${theme}'); true`);
      await go(APP);
      await sleep(900);
      await shot(scene, false);
    } else if (kind === 'painel') {
      const [, theme, w, prof = 'admin'] = parts;
      await setViewport(+w, +w < 700 ? 844 : 900, +w < 700);
      await setTheme(theme);
      await login(PROFILES[prof], theme);
      await go(APP);
      await sleep(2600);
      await shot(scene, true);
    } else if (kind === 'topo') {
      const [, theme, w, scroll = '0'] = parts;
      await setViewport(+w, +w < 700 ? 844 : 900, +w < 700);
      await setTheme(theme);
      await login(PROFILES.admin, theme);
      await go(APP);
      await sleep(2200);
      await evaluate(`window.scrollTo(0, ${+scroll}); true`);
      await sleep(1500);
      await shot(scene, false);
    } else if (kind === 'pdf') {
      // Boletim de ponta a ponta: abre o modal, baixa o PDF e mede o tema durante e depois da captura
      const [, theme] = parts;
      const dir = path.join(OUT, 'pdf');
      fs.mkdirSync(dir, { recursive: true });
      for (const f of fs.readdirSync(dir)) fs.rmSync(path.join(dir, f));
      await cdp('Browser.setDownloadBehavior', { behavior: 'allow', downloadPath: dir, eventsEnabled: true });
      await setViewport(1440, 900, false);
      await setTheme(theme);
      await login(PROFILES.admin, theme);
      await go(APP);
      await sleep(2600);
      await evaluate(`${MODALS.pdf}; true`);
      await sleep(900);
      await evaluate(`window.__themes = []; new MutationObserver(() => window.__themes.push(document.documentElement.dataset.theme)).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
        [...document.querySelectorAll('button')].find(b => /Baixar boletim/.test(b.textContent)).click(); true`);
      const t0 = Date.now();
      let file = null;
      while (Date.now() - t0 < 60000) {
        await sleep(500);
        file = fs.readdirSync(dir).find(f => f.endsWith('.pdf'));
        if (file) break;
      }
      await sleep(800);
      console.log('arquivo:', file || 'NENHUM', file ? `${fs.statSync(path.join(dir, file)).size} bytes em ${Date.now() - t0} ms` : '');
      console.log('temas durante a captura:', await evaluate('JSON.stringify(window.__themes)'), '· tema final:', await evaluate('document.documentElement.dataset.theme'), '· preferência:', await evaluate(`localStorage.getItem('pluviometro_theme_preference')`));
      console.log('aviso no modal:', await evaluate(`[...document.querySelectorAll('[role=dialog] .notice-ok, [role=dialog] .notice-error')].map(n => n.textContent).join(' | ') || '(nenhum)'`));
      await shot(scene, false);
    } else if (kind === 'cal') {
      // Calendário de chuvas: abre, captura, volta um mês e captura de novo (cal-tema-largura[-altura])
      const [, theme, w, h] = parts;
      await setViewport(+w, h ? +h : +w < 700 ? 844 : 900, +w < 700);
      await setTheme(theme);
      await login(PROFILES.admin, theme);
      await go(APP);
      await sleep(2400);
      await evaluate(`document.querySelector('[aria-label="Abrir o calendário de chuvas"]').click(); true`);
      await sleep(1100);
      await shot(`${scene}-a`, false);
      await evaluate(`document.querySelector('[aria-label="Mês anterior"]').click(); true`);
      await sleep(250);
      await evaluate(`[...document.querySelectorAll('[role=grid] button')].find(b => /chuva (forte|moderada)/.test(b.getAttribute('aria-label') || ''))?.click(); true`);
      await sleep(900);
      await shot(`${scene}-b`, false);
    } else if (kind === 'acesso') {
      const [, theme, w] = parts;
      await setViewport(+w, +w < 700 ? 844 : 900, +w < 700);
      await setTheme(theme);
      await go(APP);
      await evaluate(`localStorage.clear(); localStorage.setItem('pluviometro_theme_preference','${theme}'); true`);
      await go(APP);
      await sleep(800);
      for (let i = 0; i < 40 && !(await evaluate(`Boolean(document.querySelector('#login-email'))`)); i++) await sleep(250);
      await evaluate(`document.querySelector('#login-email').focus(); true`);
      await cdp('Input.insertText', { text: 'maria.campo@sementesoilema.com.br' });
      await evaluate(`[...document.querySelectorAll('button')].find(b => /Peça a um administrador/.test(b.textContent)).click(); true`);
      await sleep(1100);
      console.log('links:', await evaluate(`JSON.stringify([...document.querySelectorAll('[role=dialog] a')].map(a => decodeURIComponent(a.href)))`));
      await shot(scene, false);
    } else if (kind === 'troca') {
      // Carrossel do login: mede a opacidade dos slides e a altura do painel durante a troca, e a pausa com o mouse
      const [, theme] = parts;
      await setViewport(1440, 900, false);
      await go(APP);
      await evaluate(`localStorage.clear(); localStorage.setItem('pluviometro_theme_preference','${theme}'); true`);
      await go(APP);
      for (let i = 0; i < 40 && !(await evaluate(`Boolean(document.querySelector('#login-email'))`)); i++) await sleep(250);
      const t0 = Date.now();
      const probe = `JSON.stringify({ op: [...document.querySelectorAll('[aria-roledescription=carrossel] .grid > div')].map(d => (+getComputedStyle(d).opacity).toFixed(2)), h: Math.round(document.querySelector('[aria-roledescription=carrossel] .grid').getBoundingClientRect().height), sel: [...document.querySelectorAll('[role=tab]')].findIndex(b => b.getAttribute('aria-selected') === 'true') })`;
      while (Date.now() - t0 < 5600) await sleep(100);
      let mid = false;
      while (Date.now() - t0 < 7400) {
        console.log(`${((Date.now() - t0) / 1000).toFixed(1)}s`, await evaluate(probe));
        if (!mid && Date.now() - t0 > 6150) { mid = true; await shot(`${scene}-meio`, false); }
        await sleep(120);
      }
      await shot(`${scene}-depois`, false);
      // Pausa: mouse sobre o painel, a barra não pode andar
      await cdp('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 1100, y: 450 });
      await sleep(300);
      const bar = `Math.round(document.querySelector('[role=tab][aria-selected=true] span.block.h-full').getBoundingClientRect().width)`;
      const b1 = await evaluate(bar); await sleep(1500); const b2 = await evaluate(bar);
      await cdp('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 200, y: 450 });
      await sleep(1500); const b3 = await evaluate(bar);
      console.log(`barra com o mouse em cima: ${b1} → ${b2} px; depois de sair: ${b3} px`);
    } else if (kind === 'mensal') {
      // Boletim mensal automático: liga a opção, entra como alimentador e espera o envio
      const [, prof = 'alimentador'] = parts;
      const tok = await (await fetch(`${API}/auth/v1/token?grant_type=password`, { method: 'POST', body: JSON.stringify({ email: PROFILES.admin, password: 'teste-oilema-2026' }) })).json();
      await fetch(`${API}/rest/v1/notification_settings?id=eq.1`, { method: 'PATCH', headers: { Authorization: `Bearer ${tok.access_token}` }, body: JSON.stringify({ monthly_report: true }) });
      await setViewport(1440, 900, false);
      await setTheme('light');
      await login(PROFILES[prof], 'light');
      await go(APP);
      for (let i = 0; i < 30; i++) {
        await sleep(1000);
        const toasts = await evaluate(`[...document.querySelectorAll('[role=status], [role=alert]')].map(t => t.textContent).join(' | ')`);
        if (/enviado para|não foi enviado/.test(toasts)) { console.log('aviso:', toasts); break; }
        if (i === 29) console.log('sem aviso de envio; avisos na tela:', toasts || '(nenhum)');
      }
      await shot(scene, false);
    } else if (kind === 'probe') {
      const [, theme] = parts;
      await setViewport(1440, 900, false); await setTheme(theme);
      await login(PROFILES.admin, theme); await go(APP);
      for (const t of [1500, 3000, 6000]) {
        await sleep(t === 1500 ? 1500 : 1500 * (t / 3000));
        console.log(t, await evaluate(`JSON.stringify({
          bars: document.querySelectorAll('.recharts-bar-rectangle path').length,
          lines: [...document.querySelectorAll('.recharts-line-curve')].map(p => (p.getAttribute('d') || '').length),
          dash: [...document.querySelectorAll('.recharts-line-curve')].map(p => p.getAttribute('stroke-dasharray')).slice(0, 3),
          w: [...document.querySelectorAll('.recharts-surface')].map(s => s.getAttribute('width'))
        })`));
      }
    } else if (kind === 'modal') {
      const [, name, theme, w] = parts;
      await setViewport(+w, +w < 700 ? 844 : 900, +w < 700);
      await setTheme(theme);
      await login(PROFILES.admin, theme);
      await go(APP);
      await sleep(2200);
      await evaluate(`${MODALS[name]}; true`);
      await sleep(1100);
      await shot(scene, false);
    }
  }
  if (consoleErrors.length) console.log('ERROS NO CONSOLE:\n' + [...new Set(consoleErrors)].join('\n'));
} catch (err) {
  console.error('falhou:', err.message);
  process.exitCode = 1;
} finally {
  try { ws?.close(); } catch { /* */ }
  chrome.kill();
  setTimeout(() => { try { fs.rmSync(profile, { recursive: true, force: true }); } catch { /* */ } }, 800);
}
