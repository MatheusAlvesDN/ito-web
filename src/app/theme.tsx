// ThemeProvider: aplica data-theme no <html>, persiste a escolha e segue o sistema.
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { ThemeContext, THEME_STORAGE_KEY, type ResolvedTheme, type ThemeMode } from './themeContext';

const THEME_COLORS: Record<ResolvedTheme, string> = { light: '#FBF5EE', dark: '#1C130D' };
const darkQuery = () =>
  typeof window !== 'undefined' && window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;

function readStoredMode(): ThemeMode {
  try {
    const v = localStorage.getItem(THEME_STORAGE_KEY);
    if (v === 'light' || v === 'dark' || v === 'system') return v;
  } catch {
    /* storage indisponível (modo privado etc.) */
  }
  return 'system';
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>(readStoredMode);
  const [systemDark, setSystemDark] = useState<boolean>(() => darkQuery()?.matches ?? false);

  // Acompanha mudanças do tema do sistema.
  useEffect(() => {
    const mq = darkQuery();
    if (!mq) return;
    const onChange = (e: MediaQueryListEvent) => setSystemDark(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  const resolved: ResolvedTheme = mode === 'system' ? (systemDark ? 'dark' : 'light') : mode;

  // Aplica no <html> e na barra do navegador.
  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = mode;
    document.querySelectorAll('meta[name="theme-color"]').forEach((m) => {
      m.setAttribute('content', THEME_COLORS[resolved]);
    });
  }, [mode, resolved]);

  const setMode = useCallback((next: ThemeMode) => {
    setModeState(next);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      /* ignora */
    }
  }, []);

  const value = useMemo(() => ({ mode, resolved, setMode }), [mode, resolved, setMode]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
