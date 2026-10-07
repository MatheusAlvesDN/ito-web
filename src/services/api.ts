import { getIconComponent } from '../utils/iconMap';
import type { BaseTheme, ImpostorScenario } from '../types/game';

const API_BASE = '/api/v1';

export type ApiThemeResponse = {
  id: string;
  original_theme_id: string;
  game_id: string;
  name: string;
  description: string;
  color: string;
  text_color: string;
  button_color?: string;
  icon: string;
  is_active: boolean;
};

export type GameContentResponse = {
  game_id: string;
  theme_id: string;
  questions?: string[];
  scenarios?: ImpostorScenario[];
  personalities?: string[];
};

export const api = {
  async getGames() {
    const res = await fetch(`${API_BASE}/games`);
    if (!res.ok) throw new Error(`Falha ao buscar jogos: ${res.statusText}`);
    return res.json();
  },

  async getThemes(gameId: string): Promise<BaseTheme[]> {
    const res = await fetch(`${API_BASE}/games/${gameId}/themes`);
    if (!res.ok) throw new Error(`Falha ao buscar temas do jogo ${gameId}: ${res.statusText}`);
    const data: ApiThemeResponse[] = await res.json();
    return data.map((t) => ({
      id: t.original_theme_id || t.id,
      original_theme_id: t.original_theme_id,
      game_id: t.game_id,
      name: t.name,
      description: t.description || '',
      color: t.color,
      textColor: t.text_color,
      buttonColor: t.button_color || undefined,
      icon: getIconComponent(t.icon),
    }));
  },

  async getThemeContent(gameId: string, themeId: string, randomCount?: number): Promise<GameContentResponse> {
    const url = new URL(`${API_BASE}/games/${gameId}/themes/${themeId}/content`, window.location.origin);
    if (randomCount) {
      url.searchParams.set('random_count', randomCount.toString());
    }
    const res = await fetch(url.pathname + url.search);
    if (!res.ok) throw new Error(`Falha ao buscar conteúdo para o tema ${themeId}: ${res.statusText}`);
    return res.json();
  },
};
