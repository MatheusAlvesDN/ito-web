// ThemeToggle: alterna Sistema → Claro → Escuro (ícone mostra o modo atual).
import { Monitor, Moon, Sun } from 'lucide-react';
import { useTheme, type ThemeMode } from '../app/themeContext';
import { IconButton } from './IconButton';

const ORDER: ThemeMode[] = ['system', 'light', 'dark'];
const LABEL: Record<ThemeMode, string> = { system: 'do sistema', light: 'claro', dark: 'escuro' };
const ICON = { system: <Monitor />, light: <Sun />, dark: <Moon /> };

export function ThemeToggle({ className }: { className?: string }) {
  const { mode, setMode } = useTheme();
  const next = ORDER[(ORDER.indexOf(mode) + 1) % ORDER.length];
  return (
    <IconButton
      aria-label={`Tema ${LABEL[mode]}. Mudar para tema ${LABEL[next]}`}
      title={`Tema: ${LABEL[mode]}`}
      icon={ICON[mode]}
      onClick={() => setMode(next)}
      className={className}
    />
  );
}
