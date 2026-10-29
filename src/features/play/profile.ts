// Preferências do jogador guardadas no aparelho (localStorage): nome/avatar e nomes do Pass and Play.
import { getRandomAvatar } from '../../utils/avatarService';

const PROFILE_KEY = 'pg.profile';
const LOCAL_PLAYERS_KEY = 'pg.localPlayers';

export interface Profile {
  name: string;
  avatar: string;
}

export function loadProfile(): Profile {
  try {
    const p = JSON.parse(localStorage.getItem(PROFILE_KEY) ?? 'null') as Partial<Profile> | null;
    if (p && typeof p.name === 'string') return { name: p.name, avatar: typeof p.avatar === 'string' && p.avatar ? p.avatar : getRandomAvatar() };
  } catch {
    /* ignore */
  }
  return { name: '', avatar: getRandomAvatar() };
}

export function saveProfile(p: Profile) {
  try {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(p));
  } catch {
    /* ignore */
  }
}

export function loadLocalPlayers(): string[] {
  try {
    const v = JSON.parse(localStorage.getItem(LOCAL_PLAYERS_KEY) ?? '[]') as unknown;
    if (Array.isArray(v)) return v.filter((n): n is string => typeof n === 'string' && n.trim() !== '').slice(0, MAX_LOCAL_PLAYERS);
  } catch {
    /* ignore */
  }
  return [];
}

export function saveLocalPlayers(names: string[]) {
  try {
    localStorage.setItem(LOCAL_PLAYERS_KEY, JSON.stringify(names));
  } catch {
    /* ignore */
  }
}

export const MIN_LOCAL_PLAYERS = 2;
export const MAX_LOCAL_PLAYERS = 16;
export const MAX_NAME_LENGTH = 40;

/** Valida um nome novo contra a lista (sem diferenciar maiúsculas). Devolve a mensagem de erro ou null. */
export function validateNewName(name: string, existing: string[]): string | null {
  const n = name.trim();
  if (!n) return 'Digite um nome.';
  if (n.length > MAX_NAME_LENGTH) return `Use até ${MAX_NAME_LENGTH} caracteres.`;
  if (existing.some((e) => e.trim().toLowerCase() === n.toLowerCase())) return 'Já tem alguém com esse nome.';
  if (existing.length >= MAX_LOCAL_PLAYERS) return `No máximo ${MAX_LOCAL_PLAYERS} jogadores.`;
  return null;
}
