// Tela inicial: modos reais do backend (GET /api/v1/games), entrar numa sala e atalhos.
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Languages, RefreshCw, ServerCrash, Shield } from 'lucide-react';
import { useGames } from '../../lib/useGames';
import { Button, EmptyState, Screen, ThemeToggle, cx, focusRing } from '../../ui';
import { BrandMark } from './BrandMark';
import { GameModeCard, GameModeCardSkeleton } from './GameModeCard';
import { JoinRoomCard } from './JoinRoomCard';

export default function HomePage() {
  const { data, loading, error, reload } = useGames();
  const modes = (data ?? []).filter((g) => g.id !== 'translator');

  return (
    <Screen header={<BrandMark />} right={<ThemeToggle />}>
      <div className="space-y-6">
        <section aria-labelledby="modes-title">
          <div className="mb-3 flex items-end justify-between gap-2">
            <div>
              <h1 id="modes-title" className="font-display text-2xl font-extrabold tracking-tight">
                Escolha um jogo
              </h1>
              <p className="text-sm text-muted">Jogue passando o celular ou cada um no seu.</p>
            </div>
          </div>

          <div aria-live="polite" aria-busy={loading && !data}>
            {loading && !data ? (
              <ul className="space-y-3">
                <GameModeCardSkeleton />
                <GameModeCardSkeleton />
                <GameModeCardSkeleton />
                <span className="sr-only">Carregando jogos…</span>
              </ul>
            ) : error && !data ? (
              <EmptyState
                tone="danger"
                icon={<ServerCrash />}
                title="Sem conexão"
                description={error}
                action={
                  <Button variant="secondary" leftIcon={<RefreshCw className="h-4 w-4" />} onClick={reload} loading={loading}>
                    Tentar de novo
                  </Button>
                }
                className="rounded-2xl border border-line bg-surface"
              />
            ) : modes.length === 0 ? (
              <EmptyState
                title="Nenhum jogo ativo"
                description="Um admin pode ativar os jogos na Área do admin."
                className="rounded-2xl border border-line bg-surface"
              />
            ) : (
              <ul className="space-y-3">
                {modes.map((g) => (
                  <GameModeCard key={g.id} game={g} />
                ))}
              </ul>
            )}
          </div>
        </section>

        <JoinRoomCard />

        <nav aria-label="Outros" className="flex flex-wrap items-center justify-center gap-x-1 gap-y-2 pt-2 text-sm">
          <FooterLink to="/tradutor" icon={<Languages className="h-4 w-4" />}>
            Tradutor maluco
          </FooterLink>
          <span aria-hidden className="text-line">
            •
          </span>
          <FooterLink to="/admin" icon={<Shield className="h-4 w-4" />}>
            Área do admin
          </FooterLink>
        </nav>
      </div>
    </Screen>
  );
}

function FooterLink({ to, icon, children }: { to: string; icon: ReactNode; children: ReactNode }) {
  return (
    <Link
      to={to}
      className={cx('inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 font-medium text-muted transition-colors hover:bg-ink/5 hover:text-ink', focusRing)}
    >
      {icon}
      {children}
    </Link>
  );
}
