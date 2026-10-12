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
    // Ignore – private mode or quota exceeded
  }
}

export function getInitialTheme() {
  const saved = safeGetItem(THEME_KEY);
  if (saved === 'light' || saved === 'dark') {
    return saved;
  }
  // Default to dark
  return 'dark';
}

export function applyTheme(theme) {
  const root = document.documentElement;
  if (theme === 'light') {
    root.classList.remove('dark');
    root.classList.add('light');
  } else {
    root.classList.remove('light');
    root.classList.add('dark');
  }
  safeSetItem(THEME_KEY, theme);
}
