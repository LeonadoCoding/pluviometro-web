const THEME_KEY = 'pluviometro_theme_preference';

function safeGetItem(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSetItem(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Ignora: modo privado ou armazenamento cheio
  }
}

// Preferência salva; sem ela, segue o tema do sistema operacional
export function getInitialTheme() {
  const saved = safeGetItem(THEME_KEY);
  if (saved === 'light' || saved === 'dark') return saved;
  const prefersLight = typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: light)').matches;
  return prefersLight ? 'light' : 'dark';
}

// Pinta o documento no tema pedido. persist=false é usado na captura do PDF (sempre claro).
export function paintTheme(theme) {
  const root = document.documentElement;
  root.dataset.theme = theme;
  root.classList.remove(theme === 'light' ? 'dark' : 'light');
  root.classList.add(theme);
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.content = theme === 'dark' ? '#111e23' : '#f5f7f7';
}

export function applyTheme(theme) {
  paintTheme(theme);
  safeSetItem(THEME_KEY, theme);
}
