// ItemRow: um item de conteúdo com edição inline, ativar/desativar e apagar.
import { useState, type FormEvent } from 'react';
import { Check, Pencil, Trash2, X } from 'lucide-react';
import type { AdminItem, ItemFields, ItemType } from '../../../lib/adminApi';
import { Button, IconButton, Toggle, cx } from '../../../ui';
import { itemLabel } from '../utils';
import { ItemFieldInputs } from './ItemFieldInputs';
import { draftFromItem, draftToFields, type ItemDraft } from './itemDraft';

interface ItemRowProps {
  item: AdminItem;
  type: ItemType;
  pending: boolean;
  onToggle: (next: boolean) => void;
  /** Resolve true se salvou (fecha a edição). */
  onSave: (fields: ItemFields) => Promise<boolean>;
  onDelete: () => void;
}

export function ItemRow({ item, type, pending, onToggle, onSave, onDelete }: ItemRowProps) {
  const [draft, setDraft] = useState<ItemDraft | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const label = itemLabel(item);

  const startEdit = () => {
    setDraft(draftFromItem(item));
    setError(null);
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!draft) return;
    const fields = draftToFields(type, draft);
    if (typeof fields === 'string') {
      setError(fields);
      return;
    }
    setSaving(true);
    const ok = await onSave(fields);
    setSaving(false);
    if (ok) setDraft(null);
  };

  if (draft) {
    return (
      <li className="rounded-2xl border border-brand/30 bg-surface p-3 shadow-raised">
        <form onSubmit={submit} onKeyDown={(e) => e.key === 'Escape' && !saving && setDraft(null)} className="space-y-2">
          <ItemFieldInputs type={type} draft={draft} onChange={setDraft} disabled={saving} error={error} autoFocus compact />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" leftIcon={<X className="h-4 w-4" />} onClick={() => setDraft(null)} disabled={saving}>
              Cancelar
            </Button>
            <Button type="submit" size="sm" leftIcon={<Check className="h-4 w-4" />} loading={saving}>
              Salvar
            </Button>
          </div>
        </form>
      </li>
    );
  }

  return (
    <li className={cx('flex items-start gap-3 rounded-2xl border border-line p-3 sm:items-center', item.is_active ? 'bg-surface' : 'bg-surface-2')}>
      <div className="min-w-0 flex-1">
        <p className={cx('break-words text-[15px] leading-snug', item.is_active ? 'text-ink' : 'text-muted line-through decoration-muted/50')}>{label}</p>
        {'impostor_variations' in item && (
          <p className="mt-1 break-words text-xs leading-relaxed text-muted">
            <span className="font-semibold text-wood">Impostor: </span>
            {item.impostor_variations.join(' · ')}
          </p>
        )}
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1 sm:flex-row sm:items-center">
        <Toggle checked={item.is_active} onChange={onToggle} disabled={pending} aria-label={`Ativo: ${label}`} />
        <div className="flex items-center">
          <IconButton aria-label={`Editar: ${label}`} icon={<Pencil />} size="sm" onClick={startEdit} />
          <IconButton aria-label={`Apagar: ${label}`} icon={<Trash2 className="text-danger" />} size="sm" onClick={onDelete} />
        </div>
      </div>
    </li>
  );
}
