// Raiz do app: tema + rotas + toasts.
import { RouterProvider } from 'react-router-dom';
import { Toaster } from 'sonner';
import type { CSSProperties } from 'react';
import { ThemeProvider } from './theme';
import { useTheme } from './themeContext';
import { router } from './routes';

// Variáveis do sonner apontando para os tokens do tema.
const TOAST_STYLE = {
  '--normal-bg': 'rgb(var(--c-surface))',
  '--normal-text': 'rgb(var(--c-ink))',
  '--normal-border': 'rgb(var(--c-line))',
  '--success-bg': 'rgb(var(--c-surface))',
  '--success-text': 'rgb(var(--c-success))',
  '--success-border': 'rgb(var(--c-success) / 0.4)',
  '--error-bg': 'rgb(var(--c-surface))',
  '--error-text': 'rgb(var(--c-danger))',
  '--error-border': 'rgb(var(--c-danger) / 0.4)',
  '--warning-bg': 'rgb(var(--c-surface))',
  '--warning-text': 'rgb(var(--c-warning))',
  '--warning-border': 'rgb(var(--c-warning) / 0.4)',
  '--info-bg': 'rgb(var(--c-surface))',
  '--info-text': 'rgb(var(--c-ink))',
  '--info-border': 'rgb(var(--c-line))',
  fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
} as CSSProperties;

function ThemedToaster() {
  const { resolved } = useTheme();
  return <Toaster theme={resolved} position="top-center" richColors closeButton style={TOAST_STYLE} offset={{ top: 'max(12px, env(safe-area-inset-top))' }} mobileOffset={{ top: 'max(12px, env(safe-area-inset-top))' }} />;
}

export default function App() {
  return (
    <ThemeProvider>
      <RouterProvider router={router} />
      <ThemedToaster />
    </ThemeProvider>
  );
}
