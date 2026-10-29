// ModePicker: escolha do modo de jogo no lobby (líder) ou exibição (outros).
import { AppIcon, cx, focusRing } from '../../../ui';
import type { ApiGame } from '../../../lib/api';
import type { GameMode } from '../../../lib/room';

export interface ModePickerProps {
  games: (ApiGame & { id: GameMode })[];
  value: GameMode | null;
  editable: boolean;
  onChange: (mode: GameMode) => void;
}

export function ModePicker({ games, value, editable, onChange }: ModePickerProps) {
  if (!editable) {
    const g = games.find((x) => x.id === value);
    return (
      <div className="flex items-center gap-3 rounded-2xl border border-line bg-surface p-3">
        {g ? (
          <>
            <span aria-hidden className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand/10 text-brand-strong">
              <AppIcon name={g.icon} className="h-5 w-5" />
            </span>
            <span className="font-display font-bold">{g.name}</span>
          </>
        ) : (
          <span className="text-sm text-muted">O líder ainda não escolheu o jogo.</span>
        )}
      </div>
    );
  }
  return (
    <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Jogo">
      {games.map((g) => {
        const on = g.id === value;
        return (
          <button
            key={g.id}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => !on && onChange(g.id)}
            className={cx(
              'flex items-center gap-2 rounded-2xl border p-3 text-left transition-colors',
              on ? 'border-brand bg-brand/10' : 'border-line bg-surface hover:bg-surface-2',
              focusRing,
            )}
          >
            <span aria-hidden className={cx('flex h-9 w-9 shrink-0 items-center justify-center rounded-xl', on ? 'bg-brand text-brand-ink' : 'bg-brand/10 text-brand-strong')}>
              <AppIcon name={g.icon} className="h-5 w-5" />
            </span>
            <span className="min-w-0 text-sm font-semibold leading-tight">{g.name}</span>
          </button>
        );
      })}
    </div>
  );
}
