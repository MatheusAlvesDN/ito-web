// ThemePicker: seleção múltipla de temas do modo (líder) ou lista dos escolhidos (outros).
import { Check } from 'lucide-react';
import type { ApiGame } from '../../../lib/api';
import type { GameMode } from '../../../lib/room';
import { AppIcon, Badge, Button, cx, focusRing } from '../../../ui';
import { isFreeTheme } from '../../games/modes';
import { themeSelectable } from '../lobbyHelpers';

export interface ThemePickerProps {
  mode: GameMode;
  game: ApiGame | undefined;
  selected: string[];
  editable: boolean;
  onChange: (ids: string[]) => void;
}

export function ThemePicker({ mode, game, selected, editable, onChange }: ThemePickerProps) {
  const themes = game?.themes ?? [];
  const sel = new Set(selected);
  const selectable = themes.filter((t) => themeSelectable(mode, t) && !isFreeTheme(mode, t.id));

  if (!editable) {
    const names = themes.filter((t) => sel.has(t.id)).map((t) => (isFreeTheme(mode, t.id) ? 'Modo livre' : t.name));
    return names.length === 0 ? (
      <p className="text-sm text-muted">Nenhum tema escolhido ainda.</p>
    ) : (
      <ul className="flex flex-wrap gap-1.5">
        {names.map((n) => (
          <li key={n}>
            <Badge tone="wood" size="md">
              {n}
            </Badge>
          </li>
        ))}
      </ul>
    );
  }

  const toggle = (id: string) => onChange(sel.has(id) ? selected.filter((x) => x !== id) : [...selected, id]);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-muted">
          {selected.length} {selected.length === 1 ? 'tema escolhido' : 'temas escolhidos'}
        </p>
        <div className="flex gap-1">
          <Button variant="ghost" size="sm" onClick={() => onChange(selectable.map((t) => t.id))}>
            Todos
          </Button>
          <Button variant="ghost" size="sm" onClick={() => onChange([])} disabled={selected.length === 0}>
            Nenhum
          </Button>
        </div>
      </div>
      <ul className="space-y-2">
        {themes.map((t) => {
          const free = isFreeTheme(mode, t.id);
          const enabled = themeSelectable(mode, t);
          const on = sel.has(t.id);
          return (
            <li key={t.id}>
              <button
                type="button"
                role="checkbox"
                aria-checked={on}
                disabled={!enabled}
                onClick={() => toggle(t.id)}
                className={cx(
                  'flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-50',
                  on ? 'border-brand/60 bg-brand/10' : 'border-line bg-surface enabled:hover:bg-surface-2',
                  focusRing,
                )}
              >
                <span aria-hidden className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-wood/10 text-wood">
                  <AppIcon name={t.icon} className="h-5 w-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-1.5">
                    <span className="font-semibold">{free ? 'Modo livre' : t.name}</span>
                    {!free && t.item_count != null && (
                      <Badge tone={t.item_count > 0 ? 'neutral' : 'warning'}>{t.item_count > 0 ? `${t.item_count} itens` : 'sem itens'}</Badge>
                    )}
                  </span>
                  <span className="block text-xs text-muted">
                    {free ? 'Vocês inventam o tema na hora, sem perguntas prontas.' : t.description || ' '}
                  </span>
                </span>
                <span
                  aria-hidden
                  className={cx(
                    'flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-2',
                    on ? 'border-brand bg-brand text-brand-ink' : 'border-line text-transparent',
                  )}
                >
                  <Check className="h-3.5 w-3.5" strokeWidth={3} />
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
