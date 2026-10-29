// Metadados de cada modo usados no lobby (mín. de jogadores, formulário de config, tema livre).
// Só servem para dicas e formulários: o servidor valida tudo de novo (START_GAME/SET_CONFIG).
import type { GameMode } from '../../lib/room';

export type ConfigField =
  | { key: string; kind: 'choice'; label: string; description?: string; default: number | string; options: { value: number | string; label: string }[] }
  | { key: string; kind: 'number'; label: string; description?: string; default: number; min: number; max: number; step: number; unit?: 'seconds' | 'lives' }
  | { key: string; kind: 'toggle'; label: string; description?: string; default: boolean };

export interface ModeMeta {
  /** Mínimo de jogadores dado o config atual (ITO com sabotador = 3). */
  minPlayers: (config: Record<string, unknown>) => number;
  /** Campos do formulário de config (ver games/PROTOCOL.md). */
  config: ConfigField[];
  /** Ids de tema sempre aceitos mesmo sem itens (ITO: modo livre). */
  freeThemeIds?: string[];
  /** Frase curta de como jogar (lobby). */
  howTo: string;
}

export const MODE_META: Record<GameMode, ModeMeta> = {
  classic: {
    minPlayers: (c) => (c.saboteur ? 3 : 2),
    freeThemeIds: ['classic_free'],
    howTo: 'Cada um recebe um número secreto e dá uma dica no tema. Juntos, coloquem as cartas em ordem crescente.',
    config: [
      {
        key: 'scale',
        kind: 'choice',
        label: 'Escala dos números',
        default: 100,
        options: [
          { value: 50, label: '1–50' },
          { value: 100, label: '1–100' },
          { value: 1000, label: '1–1000' },
        ],
      },
      { key: 'lives', kind: 'number', label: 'Vidas', default: 3, min: 1, max: 5, step: 1, unit: 'lives' },
      { key: 'saboteur', kind: 'toggle', label: 'Sabotador', description: 'Um jogador secreto tenta atrapalhar (mín. 3 jogadores).', default: false },
    ],
  },
  impostor: {
    minPlayers: () => 3,
    howTo: 'Todos recebem a mesma pergunta, menos o impostor. Discutam as respostas e descubram quem é.',
    config: [
      { key: 'discussionSeconds', kind: 'number', label: 'Tempo de discussão', default: 120, min: 30, max: 900, step: 30, unit: 'seconds' },
    ],
  },
  whoami: {
    minPlayers: () => 2,
    howTo: 'Cada um recebe uma personalidade que todos veem, menos ele. Faça perguntas de sim ou não para descobrir quem você é.',
    config: [{ key: 'roundSeconds', kind: 'number', label: 'Tempo por rodada', default: 120, min: 30, max: 900, step: 30, unit: 'seconds' }],
  },
  whatdoyouknow: {
    minPlayers: () => 3,
    howTo: 'A cada rodada um jogador é o alvo: todos tentam adivinhar a resposta dele. Quem acerta pontua — e o alvo também.',
    config: [],
  },
};

/** Tema "livre" do modo (aceito mesmo com 0 itens)? */
export function isFreeTheme(mode: GameMode, themeId: string): boolean {
  return MODE_META[mode].freeThemeIds?.includes(themeId) ?? false;
}

/** Valor atual de um campo (config do servidor → padrão). */
export function configValue(config: Record<string, unknown>, field: ConfigField): number | string | boolean {
  const v = config[field.key];
  return v === undefined || v === null ? field.default : (v as number | string | boolean);
}
