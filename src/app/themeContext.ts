// Contexto de tema (claro/escuro/sistema) — o provedor fica em ./theme.tsx.
import { createContext, useContext } from 'react';

export type ThemeMode = 'system' | 'light' | 'dark';
export type ResolvedTheme = 'light' | 'dark';

export interface ThemeContextValue {
  /** Escolha do usuário (persistida). */
  mode: ThemeMode;
  /** Tema efetivamente aplicado agora. */
  resolved: ResolvedTheme;
  setMode: (mode: ThemeMode) => void;
}

export const ThemeContext = createContext<ThemeContextValue | null>(null);

export const THEME_STORAGE_KEY = 'pg.theme';

/** Lê o tema atual; precisa estar dentro de <ThemeProvider>. */
export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme precisa estar dentro de <ThemeProvider>');
  return ctx;
}
