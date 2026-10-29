// /admin/jogos/:gameId — temas de um jogo: busca, ativar/desativar, criar, editar e apagar.
import { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { ChevronRight, FolderOpen, Pencil, Plus, RefreshCw, SearchX, ServerCrash, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  createTheme,
  deleteTheme,
  listAdminGames,
  listThemes,
  updateTheme,
  type AdminGame,
  type AdminTheme,
  type ThemeInput,
} from '../../lib/adminApi';
import { invalidateGames } from '../../lib/useGames';
import { AppIcon, Badge, Button, Card, EmptyState, IconButton, Toggle } from '../../ui';
import { AdminScreen } from './AdminScreen';
import { ConfirmModal } from './components/ConfirmModal';
import { ListSkeleton } from './components/ListSkeleton';
import { SearchInput } from './components/SearchInput';
import { ThemeFormModal } from './components/ThemeFormModal';
import { useAdminQuery } from './useAdminQuery';
import { ITEM_TYPES, errorMessage, plural } from './utils';

interface GameThemes {
  game: AdminGame | undefined;
  themes: AdminTheme[];
}

function normalize(text: string) {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

export default function GameThemesPage() {
  const { gameId = '' } = useParams();
  const query = useAdminQuery<GameThemes>(async (signal) => {
    const [games, themes] = await Promise.all([listAdminGames(signal), listThemes(gameId, signal)]);
    return { game: games.find((g) => g.id === gameId), themes };
  }, `themes:${gameId}`);
  const { data, setData } = query;
  const game = data?.game;
  const many = game?.item_type ? ITEM_TYPES[game.item_type].many : 'itens';

  const [search, setSearch] = useState('');
  const [pending, setPending] = useState<Set<string>>(() => new Set());
  const [form, setForm] = useState<{ theme: AdminTheme | null } | null>(null);
  const [saving, setSaving] = useState(false);
  const [toDelete, setToDelete] = useState<AdminTheme | null>(null);
  const [deleting, setDeleting] = useState(false);

  const visible = useMemo(() => {
    const term = normalize(search.trim());
    const list = data?.themes ?? [];
    return term ? list.filter((t) => normalize(`${t.name} ${t.description ?? ''} ${t.id}`).includes(term)) : list;
  }, [data, search]);

  const patchTheme = (id: string, patch: Partial<AdminTheme>) =>
    setData((d) => ({ ...d, themes: d.themes.map((t) => (t.id === id ? { ...t, ...patch } : t)) }));

  const toggleActive = async (theme: AdminTheme, next: boolean) => {
    setPending((s) => new Set(s).add(theme.id));
    patchTheme(theme.id, { is_active: next });
    try {
      const saved = await updateTheme(theme.id, { is_active: next });
      patchTheme(theme.id, saved);
      invalidateGames();
      toast.success(next ? `Tema “${theme.name}” ativado.` : `Tema “${theme.name}” desativado.`);
    } catch (err) {
      patchTheme(theme.id, { is_active: !next });
      toast.error(errorMessage(err));
    } finally {
      setPending((s) => {
        const copy = new Set(s);
        copy.delete(theme.id);
        return copy;
      });
    }
  };

  const save = async (input: ThemeInput & { name: string }) => {
    if (!form) return;
    setSaving(true);
    try {
      if (form.theme) {
        patchTheme(form.theme.id, await updateTheme(form.theme.id, input));
        toast.success('Tema atualizado.');
      } else {
        const created = await createTheme(gameId, input);
        setData((d) => ({ ...d, themes: [...d.themes, created].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')) }));
        toast.success(`Tema “${created.name}” criado. Agora adicione ${many}.`);
      }
      invalidateGames();
      setForm(null);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await deleteTheme(toDelete.id);
      setData((d) => ({ ...d, themes: d.themes.filter((t) => t.id !== toDelete.id) }));
      invalidateGames();
      toast.success(`Tema “${toDelete.name}” apagado.`);
      setToDelete(null);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setDeleting(false);
    }
  };

  const title = game?.name ?? (query.loading ? 'Carregando…' : 'Temas');

  return (
    <AdminScreen title={title} crumbs={[{ label: 'Jogos', to: '/admin' }]}>
      {!data && query.loading ? (
        <ListSkeleton rows={5} label="Carregando temas…" />
      ) : !data ? (
        <EmptyState
          tone="danger"
          icon={<ServerCrash />}
          title="Não deu para carregar os temas"
          description={query.error ?? undefined}
          action={
            <>
              <Button variant="secondary" to="/admin">
                Voltar aos jogos
              </Button>
              <Button leftIcon={<RefreshCw className="h-4 w-4" />} onClick={query.reload}>
                Tentar de novo
              </Button>
            </>
          }
          className="rounded-2xl border border-line bg-surface"
        />
      ) : !game?.item_type ? (
        <EmptyState icon={<SearchX />} title="Este jogo não tem temas editáveis" action={<Button to="/admin">Voltar aos jogos</Button>} className="rounded-2xl border border-line bg-surface" />
      ) : (
        <>
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
            <SearchInput label="Buscar tema" value={search} onChange={setSearch} className="flex-1" />
            <Button leftIcon={<Plus className="h-4 w-4" />} onClick={() => setForm({ theme: null })}>
              Novo tema
            </Button>
          </div>
          <p className="mb-3 text-sm text-muted" aria-live="polite">
            {search.trim() ? `${plural(visible.length, 'tema encontrado', 'temas encontrados')} de ${data.themes.length}.` : `${plural(data.themes.length, 'tema', 'temas')} · ${plural(data.themes.filter((t) => t.is_active).length, 'ativo', 'ativos')}.`}
          </p>

          {data.themes.length === 0 ? (
            <EmptyState
              icon={<FolderOpen />}
              title="Nenhum tema ainda"
              description={`Crie um tema e adicione ${many} para ${game.name} aparecer para os jogadores.`}
              action={
                <Button leftIcon={<Plus className="h-4 w-4" />} onClick={() => setForm({ theme: null })}>
                  Criar o primeiro tema
                </Button>
              }
              className="rounded-2xl border border-line bg-surface"
            />
          ) : visible.length === 0 ? (
            <EmptyState icon={<SearchX />} title="Nada encontrado" description={`Nenhum tema com “${search.trim()}”.`} action={<Button variant="secondary" onClick={() => setSearch('')}>Limpar busca</Button>} />
          ) : (
            <ul className="space-y-3">
              {visible.map((theme) => (
                <ThemeRow
                  key={theme.id}
                  theme={theme}
                  many={many}
                  pending={pending.has(theme.id)}
                  onToggle={(next) => void toggleActive(theme, next)}
                  onEdit={() => setForm({ theme })}
                  onDelete={() => setToDelete(theme)}
                />
              ))}
            </ul>
          )}
        </>
      )}

      {form && game && (
        <ThemeFormModal theme={form.theme} gameName={game.name} busy={saving} onSave={(d) => void save(d)} onClose={() => !saving && setForm(null)} />
      )}
      <ConfirmModal
        open={toDelete != null}
        title="Apagar tema?"
        description={toDelete ? `“${toDelete.name}” e ${plural(toDelete.item_count, ITEM_TYPES[game?.item_type ?? 'questions'].one, many)} serão apagados para sempre.` : undefined}
        confirmLabel="Apagar tema"
        busy={deleting}
        onConfirm={() => void confirmDelete()}
        onClose={() => !deleting && setToDelete(null)}
      >
        <p className="text-sm text-muted">Se só quer esconder o tema dos jogadores, desative-o em vez de apagar.</p>
      </ConfirmModal>
    </AdminScreen>
  );
}

interface ThemeRowProps {
  theme: AdminTheme;
  many: string;
  pending: boolean;
  onToggle: (next: boolean) => void;
  onEdit: () => void;
  onDelete: () => void;
}

function ThemeRow({ theme, many, pending, onToggle, onEdit, onDelete }: ThemeRowProps) {
  const headingId = `theme-${theme.id}`;
  return (
    <Card as="li" padding="none" aria-labelledby={headingId} className={theme.is_active ? undefined : 'bg-surface-2'}>
      <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:gap-4">
        <div className="flex min-w-0 flex-1 gap-3">
          <div aria-hidden className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-wood/10 text-wood">
            <AppIcon name={theme.icon} className="h-6 w-6" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 id={headingId} className="font-display text-base font-bold leading-tight">
                {theme.name}
              </h2>
              {!theme.is_active && <Badge tone="warning">Inativo</Badge>}
            </div>
            {theme.description && <p className="mt-0.5 line-clamp-2 text-sm text-muted">{theme.description}</p>}
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              <Badge tone="wood">{plural(theme.item_count, 'item', 'itens')}</Badge>
              {theme.item_count === 0 ? (
                <Badge tone="warning">Sem {many}</Badge>
              ) : theme.active_item_count < theme.item_count ? (
                <Badge>{plural(theme.active_item_count, 'ativo', 'ativos')}</Badge>
              ) : null}
            </div>
          </div>
        </div>
        <div className="flex items-center justify-between gap-2 border-t border-line pt-3 sm:justify-end sm:border-0 sm:pt-0">
          <div className="flex items-center gap-2">
            <Toggle checked={theme.is_active} onChange={onToggle} disabled={pending} aria-label={`Tema ${theme.name} ativo`} />
            <span aria-hidden className="w-14 text-xs font-medium text-muted">
              {theme.is_active ? 'Ativo' : 'Inativo'}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <IconButton aria-label={`Editar tema ${theme.name}`} icon={<Pencil />} variant="soft" onClick={onEdit} />
            <IconButton aria-label={`Apagar tema ${theme.name}`} icon={<Trash2 className="text-danger" />} variant="soft" onClick={onDelete} />
            <Button variant="secondary" size="sm" to={`/admin/temas/${encodeURIComponent(theme.id)}`} rightIcon={<ChevronRight className="h-4 w-4" />} aria-label={`Conteúdo do tema ${theme.name}`}>
              Conteúdo
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}
