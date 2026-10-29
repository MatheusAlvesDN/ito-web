// Rascunho de um item de conteúdo (formulário) ↔ campos da API.
import type { AdminItem, ItemFields, ItemType } from '../../../lib/adminApi';
import { parseVariations } from '../utils';

export interface ItemDraft {
  primary: string;
  variations: string;
}

export const EMPTY_DRAFT: ItemDraft = { primary: '', variations: '' };

export function draftFromItem(item: AdminItem): ItemDraft {
  if ('content' in item) return { primary: item.content, variations: '' };
  if ('honest' in item) return { primary: item.honest, variations: item.impostor_variations.join('; ') };
  return { primary: item.name, variations: '' };
}

/** Converte o rascunho em campos da API ou devolve a mensagem de erro. */
export function draftToFields(type: ItemType, draft: ItemDraft): ItemFields | string {
  const primary = draft.primary.trim();
  if (type === 'questions') return primary ? { content: primary } : 'Escreva a pergunta.';
  if (type === 'personalities') return primary ? { name: primary } : 'Escreva o nome.';
  if (!primary) return 'Escreva a pergunta honesta.';
  const variations = parseVariations(draft.variations);
  if (variations.length === 0) return 'Informe ao menos uma variação para o impostor.';
  if (variations.length > 20) return 'No máximo 20 variações.';
  return { honest: primary, impostor_variations: variations };
}
