// /admin — lista de jogos: ativar/desativar, editar nome/descrição/ícone e ir para os temas.
import { useState } from 'react';
import { ChevronRight, Gamepad2, Pencil, RefreshCw, ServerCrash } from 'lucide-react';
import { toast } from 'sonner';
import { listAdminGames, updateAdminGame, type AdminGame, type GameUpdate } from '../../lib/adminApi';
import { invalidateGames } from '../../lib/useGames';
import { AppIcon, Badge, Button, Card, EmptyState, IconButton, Toggle } from '../../ui';
import { AdminScreen } from './AdminScreen';
import { GameFormModal } from './components/GameFormModal';
import { ListSkeleton } from './components/ListSkeleton';
import { usePending } from './usePending';
import { useAdminQuery } from './useAdminQuery';
import { ITEM_TYPES, errorMessage, plural } from './utils';

export default function GamesPage() {
  const games = useAdminQuery(listAdminGames, 'games');
  const pending = usePending<string>();
  const [editing, setEditing] = useState<AdminGame | null>(null);
  const [saving, setSaving] = useState(false);

  const replace = (g: AdminGame) => games.setData((list) => list.map((x) => (x.id === g.id ? g : x)));

  const toggle = async (game: AdminGame, next: boolean) => {
    pending.start(game.id);
    games.setData((list) => list.map((x) => (x.id === game.id ? { ...x, is_active: next } : x)));
    try {
      replace(await updateAdminGame(game.id, { is_active: next }));
      invalidateGames();
      toast.success(`${game.name} ${next ? 'ativado' : 'desativado'}.`);
    } catch (err) {
      games.setData((list) => list.map((x) => (x.id === game.id ? { ...x, is_active: !next } : x)));
      toast.error(errorMessage(err));
    } finally {
      pending.done(game.id);
    }
  };

  const save = async (game: AdminGame, data: GameUpdate) => {
    setSaving(true);
    try {
      replace(await updateAdminGame(game.id, data));
      invalidateGames();
      toast.success('Jogo salvo.');
      setEditing(null);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminScreen title="Jogos" back="/">
      {!games.data && games.loading ? (
        <ListSkeleton rows={5} label="Carregando jogos…" />
      ) : !games.data ? (
        <EmptyState
          tone="danger"
          icon={<ServerCrash />}
          title="Não deu para carregar os jogos"
          description={games.error ?? undefined}
          action={<Button variant="secondary" leftIcon={<RefreshCw className="h-4 w-4" />} onClick={games.reload}>Tentar de novo</Button>}
          className="rounded-2xl border border-line bg-surface"
        />
      ) : games.data.length === 0 ? (
        <EmptyState icon={<Gamepad2 />} title="Nenhum jogo no banco" description="Rode ./run.sh seed para popular o banco." className="rounded-2xl border border-line bg-surface" />
      ) : (
        <ul className="space-y-3">
          {games.data.map((g) => (
            <Card as="li" key={g.id} padding="none" className="overflow-hidden">
              <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:gap-4 sm:p-5">
                <div className="flex min-w-0 flex-1 gap-4">
                  <div aria-hidden className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand/10 text-brand-strong">
                    <AppIcon name={g.icon} className="h-6 w-6" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-display text-lg font-bold leading-tight">{g.name}</h2>
                      {!g.is_active && <Badge tone="warning">Inativo</Badge>}
                    </div>
                    {g.description && <p className="mt-1 text-sm leading-relaxed text-muted">{g.description}</p>}
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {g.item_type ? (
                        <>
                          <Badge tone="wood">{plural(g.theme_count, 'tema', 'temas')}</Badge>
                          <Badge tone={g.active_theme_count > 0 ? 'success' : 'warning'}>{plural(g.active_theme_count, 'ativo', 'ativos')}</Badge>
                          <Badge>{ITEM_TYPES[g.item_type].many}</Badge>
                        </>
                      ) : (
                        <Badge>Sem conteúdo editável</Badge>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between gap-2 border-t border-line pt-3 sm:justify-end sm:border-0 sm:pt-0">
                  <div className="flex items-center gap-2">
                    <Toggle
                      aria-label={`${g.name} ativo`}
                      checked={g.is_active}
                      disabled={pending.isPending(g.id)}
                      onChange={(v) => void toggle(g, v)}
                    />
                    <IconButton aria-label={`Editar ${g.name}`} icon={<Pencil />} variant="soft" onClick={() => setEditing(g)} />
                  </div>
                  {g.item_type && (
                    <Button variant="secondary" size="sm" to={`/admin/jogos/${g.id}`} rightIcon={<ChevronRight className="h-4 w-4" />} aria-label={`Temas de ${g.name}`}>
                      Temas
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </ul>
      )}

      {editing && <GameFormModal game={editing} busy={saving} onSave={(d) => void save(editing, d)} onClose={() => !saving && setEditing(null)} />}
    </AdminScreen>
  );
}
