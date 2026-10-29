// Utilitários do painel admin (mensagens, rótulos por tipo de item, ícones disponíveis).
import type { AdminItem, ItemType } from '../../lib/adminApi';

export function errorMessage(err: unknown): string {
  if (err instanceof Error && err.message) return err.message;
  return 'Algo deu errado. Tente de novo.';
}

export function plural(n: number, one: string, many: string): string {
  return `${n.toLocaleString('pt-BR')} ${n === 1 ? one : many}`;
}

interface ItemTypeInfo {
  /** "pergunta" / "cenário" / "personalidade" */
  one: string;
  many: string;
  /** Artigo para "Nova pergunta" / "Novo cenário". */
  newLabel: string;
  /** Gênero gramatical (concordância: "adicionada"/"adicionado"). */
  feminine: boolean;
  lineFormat: string;
  lineExample: string;
}

export const ITEM_TYPES: Record<ItemType, ItemTypeInfo> = {
  questions: {
    one: 'pergunta',
    many: 'perguntas',
    newLabel: 'Nova pergunta',
    feminine: true,
    lineFormat: 'Uma pergunta por linha.',
    lineExample: 'Algo que você levaria para uma ilha deserta\nUm superpoder que você gostaria de ter',
  },
  scenarios: {
    one: 'cenário',
    many: 'cenários',
    newLabel: 'Novo cenário',
    feminine: false,
    lineFormat: 'Um cenário por linha, no formato: honesta | variação1; variação2',
    lineExample: 'Qual sua comida favorita? | Qual comida você odeia?; Qual comida você nunca provou?',
  },
  personalities: {
    one: 'personalidade',
    many: 'personalidades',
    newLabel: 'Nova personalidade',
    feminine: true,
    lineFormat: 'Um nome por linha.',
    lineExample: 'Albert Einstein\nMarie Curie',
  },
};

/** "3 perguntas adicionadas", "1 cenário adicionado"… */
export function countWith(type: ItemType, n: number, verb: string): string {
  const info = ITEM_TYPES[type];
  const ending = (info.feminine ? 'a' : 'o') + (n === 1 ? '' : 's');
  return `${plural(n, info.one, info.many)} ${verb}${ending}`;
}

/** Texto principal de um item (para busca, confirmação e leitores de tela). */
export function itemLabel(item: AdminItem): string {
  if ('content' in item) return item.content;
  if ('honest' in item) return item.honest;
  return item.name;
}

/** Variações do impostor: separadas por ";" num campo de texto. */
export function parseVariations(text: string): string[] {
  return text
    .split(';')
    .map((v) => v.trim())
    .filter(Boolean);
}

/** Ícones aceitos pelo app (mesmos nomes de `utils/iconMap`). */
export const ICON_OPTIONS = [
  'Sparkles',
  'Star',
  'Stars',
  'Zap',
  'Flame',
  'Heart',
  'Smile',
  'Brain',
  'Lightbulb',
  'HelpCircle',
  'MessagesSquare',
  'Ghost',
  'Crown',
  'Trophy',
  'Gamepad2',
  'Tv',
  'Film',
  'Music',
  'Coffee',
  'Briefcase',
  'Compass',
  'Scroll',
  'Unlock',
  'Shield',
  'Languages',
] as const;
