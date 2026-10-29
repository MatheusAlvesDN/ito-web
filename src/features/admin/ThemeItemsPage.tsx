// /admin/temas/:themeId — conteúdo de um tema: busca, paginação, edição inline, ativar, apagar, adicionar e importar em lote.
import { useEffect, useState, type FormEvent } from 'react';
import { useParams } from 'react-router-dom';
import { ChevronLeft, ChevronRight, FileUp, Inbox, Plus, RefreshCw, SearchX, ServerCrash } from 'lucide-react';
import { toast } from 'sonner';
import {
  createItem,
  deleteItem,
  findTheme,
  listItems,
  updateItem,
  type AdminItem,
  type ItemFields,
  type ItemPage,
  type ItemType,
} from '../../lib/adminApi';
import { invalidateGames } from '../../lib/useGames';
import { AppIcon, Badge, Button, Card, EmptyState, IconButton, Skeleton } from '../../ui';
import { AdminScreen } from './AdminScreen';
import { BulkImportModal } from './components/BulkImportModal';
import { ConfirmModal } from './components/ConfirmModal';
import { ItemFieldInputs } from './components/ItemFieldInputs';
import { ItemRow } from './components/ItemRow';
import { EMPTY_DRAFT, draftToFields, type ItemDraft } from './components/itemDraft';
import { ListSkeleton } from './components/ListSkeleton';
import { SearchInput } from './components/SearchInput';
import { usePending } from './usePending';
import { useAdminQuery } from './useAdminQuery';
import { ITEM_TYPES, countWith, errorMessage, itemLabel, plural } from './utils';

const PAGE_SIZE = 25;

export default function ThemeItemsPage() {
  const { themeId = '' } = useParams();
  const themeQ = useAdminQuery((signal) => findTheme(themeId, signal), `theme:${themeId}`);

  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [offset, setOffset] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  const itemsQ = useAdminQuery(
    (signal) => listItems(themeId, { search: debounced, offset, limit: PAGE_SIZE }, signal),
    `items:${themeId}:${debounced}:${offset}`,
  );
  const page = itemsQ.data;
  const type = page?.type ?? themeQ.data?.game.item_type ?? null;
  const info = type ? ITEM_TYPES[type] : null;
  const theme = themeQ.data?.theme;
  const game = themeQ.data?.game;

  const pending = usePending<number>();
  const [toDelete, setToDelete] = useState<AdminItem | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [draft, setDraft] = useState<ItemDraft>(EMPTY_DRAFT);
  const [draftError, setDraftError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  /** Algo mudou o total/ativos: atualiza o cabeçalho e a tela inicial. */
  const countsChanged = () => {
    themeQ.reload();
    invalidateGames();
  };

  const patchItem = (id: number, patch: Partial<AdminItem>) =>
    itemsQ.setData((p: ItemPage) => ({ ...p, items: p.items.map((i) => (i.id === id ? ({ ...i, ...patch } as AdminItem) : i)) }));

  const toggle = async (item: AdminItem, next: boolean) => {
    if (!type) return;
    pending.start(item.id);
    patchItem(item.id, { is_active: next });
    try {
      patchItem(item.id, await updateItem(type, item.id, { is_active: next }));
      countsChanged();
    } catch (err) {
      patchItem(item.id, { is_active: !next });
      toast.error(errorMessage(err));
    } finally {
      pending.done(item.id);
    }
  };

  const save = async (item: AdminItem, fields: ItemFields): Promise<boolean> => {
    if (!type) return false;
    try {
      patchItem(item.id, await updateItem(type, item.id, fields));
      toast.success(oneDone(type, 'salv'));
      return true;
    } catch (err) {
      toast.error(errorMessage(err));
      return false;
    }
  };

  const confirmDelete = async () => {
    if (!toDelete || !type) return;
    setDeleting(true);
    try {
      await deleteItem(type, toDelete.id);
      toast.success(oneDone(type, 'apagad'));
      setToDelete(null);
      // Último item da página: volta uma página.
      if (page && page.items.length === 1 && offset > 0) setOffset(Math.max(0, offset - PAGE_SIZE));
      else itemsQ.reload();
      countsChanged();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setDeleting(false);
    }
  };

  const add = async (e: FormEvent) => {
    e.preventDefault();
    if (!type) return;
    const fields = draftToFields(type, draft);
    if (typeof fields === 'string') {
      setDraftError(fields);
      return;
    }
    setAdding(true);
    try {
      await createItem(themeId, fields);
      toast.success(oneDone(type, 'adicionad'));
      setDraft(EMPTY_DRAFT);
      setDraftError(null);
      // Itens vêm em ordem de criação: mostra a última página, onde o novo aparece.
      const total = (page?.total ?? 0) + 1;
      const last = Math.floor((total - 1) / PAGE_SIZE) * PAGE_SIZE;
      if (!debounced && last !== offset) setOffset(last);
      else itemsQ.reload();
      countsChanged();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setAdding(false);
    }
  };

  const crumbs = [{ label: 'Jogos', to: '/admin' }, ...(game ? [{ label: game.name, to: `/admin/jogos/${game.id}` }] : [])];
  const title = theme?.name ?? (themeQ.loading ? 'Carregando…' : 'Tema');

  // Tema inexistente (ou erro ao carregar).
  if (!themeQ.loading && !theme) {
    return (
      <AdminScreen title={title} crumbs={crumbs}>
        <EmptyState
          tone="danger"
          icon={themeQ.error ? <ServerCrash /> : <SearchX />}
          title={themeQ.error ? 'Não deu para carregar o tema' : 'Tema não encontrado'}
          description={themeQ.error ?? `Não existe um tema com o código “${themeId}”. Ele pode ter sido apagado.`}
          action={
            <>
              <Button variant="secondary" to="/admin">Voltar aos jogos</Button>
              {themeQ.error && <Button leftIcon={<RefreshCw className="h-4 w-4" />} onClick={themeQ.reload}>Tentar de novo</Button>}
            </>
          }
          className="rounded-2xl border border-line bg-surface"
        />
      </AdminScreen>
    );
  }

  const total = page?.total ?? 0;
  const pageNum = Math.floor(offset / PAGE_SIZE) + 1;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const searching = debounced !== '';

  return (
    <AdminScreen title={title} crumbs={crumbs}>
      <div className="space-y-4">
        {/* Cabeçalho do tema */}
        <Card padding="sm" className="flex items-center gap-3 sm:p-4">
          {theme ? (
            <>
              <div aria-hidden className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-wood/10 text-wood">
                <AppIcon name={theme.icon} className="h-6 w-6" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <Badge tone="wood">{plural(theme.item_count, info?.one ?? 'item', info?.many ?? 'itens')}</Badge>
                  {theme.active_item_count !== theme.item_count && <Badge>{plural(theme.active_item_count, 'ativo', 'ativos')}</Badge>}
                  {theme.is_active ? <Badge tone="success">Tema ativo</Badge> : <Badge tone="warning">Tema inativo</Badge>}
                </div>
                {theme.description && <p className="mt-1 line-clamp-2 text-sm text-muted">{theme.description}</p>}
              </div>
            </>
          ) : (
            <>
              <Skeleton className="h-11 w-11 shrink-0" />
              <Skeleton className="h-5 w-48" />
            </>
          )}
        </Card>

        {/* Novo item */}
        {type && info && (
          <Card as="section" aria-labelledby="new-item-title" className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 id="new-item-title" className="font-display font-bold">{info.newLabel}</h2>
              <Button variant="secondary" size="sm" leftIcon={<FileUp className="h-4 w-4" />} onClick={() => setBulkOpen(true)}>
                Importar em lote
              </Button>
            </div>
            <form onSubmit={add} className="flex flex-col gap-3 md:flex-row md:items-start" noValidate>
              <div className="min-w-0 flex-1">
                <ItemFieldInputs type={type} draft={draft} onChange={(d) => { setDraft(d); setDraftError(null); }} disabled={adding} error={draftError} />
              </div>
              <Button type="submit" loading={adding} leftIcon={<Plus className="h-4 w-4" />} className="md:mt-[1.625rem]">
                Adicionar
              </Button>
            </form>
          </Card>
        )}

        {/* Lista */}
        <section aria-labelledby="items-title" className="space-y-3">
          <h2 id="items-title" className="sr-only">{info ? capitalize(info.many) : 'Itens'}</h2>
          <SearchInput
            label={`Buscar ${info?.many ?? 'itens'}`}
            value={search}
            onChange={(v) => {
              setSearch(v);
              setOffset(0);
            }}
          />
          <p className="text-sm text-muted" aria-live="polite">
            {!page ? ' ' : searching ? `${plural(total, 'resultado', 'resultados')} para “${debounced}”.` : plural(total, info?.one ?? 'item', info?.many ?? 'itens')}
          </p>

          {!page && itemsQ.loading ? (
            <ListSkeleton rows={6} label="Carregando itens…" />
          ) : !page ? (
            <EmptyState
              tone="danger"
              icon={<ServerCrash />}
              title="Não deu para carregar os itens"
              description={itemsQ.error ?? undefined}
              action={<Button variant="secondary" leftIcon={<RefreshCw className="h-4 w-4" />} onClick={itemsQ.reload}>Tentar de novo</Button>}
              className="rounded-2xl border border-line bg-surface"
            />
          ) : page.items.length === 0 ? (
            searching ? (
              <EmptyState icon={<SearchX />} title="Nada encontrado" description={`Nenhum item com “${debounced}”.`} action={<Button variant="secondary" onClick={() => setSearch('')}>Limpar busca</Button>} />
            ) : (
              <EmptyState
                icon={<Inbox />}
                title={`Nenhum${info?.one === 'cenário' ? '' : 'a'} ${info?.one ?? 'item'} ainda`}
                description="Adicione um por um acima ou cole uma lista inteira."
                action={<Button leftIcon={<FileUp className="h-4 w-4" />} onClick={() => setBulkOpen(true)}>Importar em lote</Button>}
                className="rounded-2xl border border-line bg-surface"
              />
            )
          ) : (
            <ul className={`space-y-2 transition-opacity ${itemsQ.loading ? 'opacity-60' : ''}`} aria-busy={itemsQ.loading}>
              {page.items.map((item) => (
                <ItemRow
                  key={item.id}
                  item={item}
                  type={page.type}
                  pending={pending.isPending(item.id)}
                  onToggle={(next) => void toggle(item, next)}
                  onSave={(fields) => save(item, fields)}
                  onDelete={() => setToDelete(item)}
                />
              ))}
            </ul>
          )}

          {page && total > PAGE_SIZE && (
            <nav aria-label="Páginas" className="flex items-center justify-between gap-2 pt-1">
              <IconButton aria-label="Página anterior" icon={<ChevronLeft />} variant="soft" disabled={offset === 0 || itemsQ.loading} onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))} />
              <p className="text-sm text-muted">
                Página <span className="font-semibold text-ink">{pageNum}</span> de {pageCount}
              </p>
              <IconButton aria-label="Próxima página" icon={<ChevronRight />} variant="soft" disabled={offset + PAGE_SIZE >= total || itemsQ.loading} onClick={() => setOffset(offset + PAGE_SIZE)} />
            </nav>
          )}
        </section>
      </div>

      {bulkOpen && type && theme && (
        <BulkImportModal
          themeId={themeId}
          themeName={theme.name}
          type={type}
          onClose={() => setBulkOpen(false)}
          onImported={() => {
            itemsQ.reload();
            countsChanged();
          }}
        />
      )}

      <ConfirmModal
        open={toDelete != null}
        title={`Apagar ${info?.one ?? 'item'}?`}
        description="Isso não pode ser desfeito. Para só esconder dos jogadores, desative em vez de apagar."
        confirmLabel="Apagar"
        busy={deleting}
        onConfirm={() => void confirmDelete()}
        onClose={() => !deleting && setToDelete(null)}
      >
        {toDelete && <p className="rounded-xl border border-line bg-surface-2 p-3 text-sm text-ink">{itemLabel(toDelete)}</p>}
      </ConfirmModal>
    </AdminScreen>
  );
}

/** "Pergunta salva.", "Cenário apagado."… */
function oneDone(type: ItemType, verb: string) {
  return `${capitalize(countWith(type, 1, verb).replace(/^1 /, ''))}.`;
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
