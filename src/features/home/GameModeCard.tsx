// Card de um modo de jogo na tela inicial (ícone, descrição, temas e ações local/online).
import { Smartphone, Wifi } from 'lucide-react';
import type { ApiGame } from '../../lib/api';
import { AppIcon, Badge, Button, Card } from '../../ui';

export function GameModeCard({ game }: { game: ApiGame }) {
  const themeCount = game.themes.length;
  const playable = themeCount > 0;
  const headingId = `mode-${game.id}`;

  return (
    <Card as="li" padding="none" className="overflow-hidden" aria-labelledby={headingId}>
      <div className="flex gap-4 p-4 sm:p-5">
        <div aria-hidden className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-brand/10 text-brand-strong">
          <AppIcon name={game.icon} className="h-7 w-7" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 id={headingId} className="font-display text-lg font-bold leading-tight">
              {game.name}
            </h3>
            {playable ? (
              <Badge tone="wood">
                {themeCount} {themeCount === 1 ? 'tema' : 'temas'}
              </Badge>
            ) : (
              <Badge tone="warning">Sem temas ativos</Badge>
            )}
          </div>
          {game.description && <p className="mt-1 text-sm leading-relaxed text-muted">{game.description}</p>}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 border-t border-line bg-surface-2/60 p-3">
        {playable ? (
          <>
            <Button variant="secondary" to={`/jogar/${game.id}?tipo=local`} leftIcon={<Smartphone className="h-4 w-4" />} aria-label={`${game.name}: jogar no mesmo celular`}>
              Mesmo celular
            </Button>
            <Button variant="primary" to={`/jogar/${game.id}?tipo=online`} leftIcon={<Wifi className="h-4 w-4" />} aria-label={`${game.name}: jogar online`}>
              Online
            </Button>
          </>
        ) : (
          <p className="col-span-2 px-1 py-2 text-center text-xs text-muted">Um admin precisa ativar ou criar temas para este modo.</p>
        )}
      </div>
    </Card>
  );
}

export function GameModeCardSkeleton() {
  return (
    <li className="rounded-2xl border border-line bg-surface p-4 shadow-raised sm:p-5" aria-hidden>
      <div className="flex gap-4">
        <div className="h-14 w-14 shrink-0 animate-pulse-soft rounded-2xl bg-ink/10" />
        <div className="flex-1 space-y-2">
          <div className="h-5 w-1/2 animate-pulse-soft rounded-lg bg-ink/10" />
          <div className="h-3.5 w-full animate-pulse-soft rounded-lg bg-ink/10" />
          <div className="h-3.5 w-4/5 animate-pulse-soft rounded-lg bg-ink/10" />
        </div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <div className="h-11 animate-pulse-soft rounded-xl bg-ink/10" />
        <div className="h-11 animate-pulse-soft rounded-xl bg-ink/10" />
      </div>
    </li>
  );
}
