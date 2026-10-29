// Cliente tipado da API do painel admin (/api/v1/admin/*, token Bearer em sessionStorage).
import { ApiError, apiGet, apiSend } from './api';

const TOKEN_KEY = 'pg.adminToken';

// ---------------------------------------------------------------- token

export function getAdminToken(): string | null {
  try {
    return sessionStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setAdminToken(token: string) {
  try {
    sessionStorage.setItem(TOKEN_KEY, token);
  } catch {
    /* storage indisponível: a sessão vale só até recarregar */
  }
  memoryToken = token;
}

export function clearAdminToken() {
  memoryToken = null;
  try {
    sessionStorage.removeItem(TOKEN_KEY);
  } catch {
    /* ignora */
  }
}

// Cópia em memória para quando o sessionStorage não funciona (modo privado etc.).
let memoryToken: string | null = null;
function currentToken(): string | null {
  return getAdminToken() ?? memoryToken;
}

export function hasAdminToken(): boolean {
  return currentToken() != null;
}

// ---------------------------------------------------------------- 401

type UnauthorizedListener = (message: string) => void;
const listeners = new Set<UnauthorizedListener>();

/** O layout do admin escuta para mandar ao login; devolve a função de cancelar. */
export function onAdminUnauthorized(fn: UnauthorizedListener): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

function handleUnauthorized(message: string) {
  clearAdminToken();
  if (listeners.size > 0) listeners.forEach((fn) => fn(message));
  else if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/admin/login')) window.location.assign('/admin/login');
}

type Method = 'GET' | 'POST' | 'PATCH' | 'DELETE';

async function adminRequest<T>(method: Method, path: string, body?: unknown, signal?: AbortSignal): Promise<T> {
  const opts = { token: currentToken(), signal };
  try {
    return method === 'GET' ? await apiGet<T>(`/admin${path}`, opts) : await apiSend<T>(method, `/admin${path}`, body, opts);
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) handleUnauthorized(err.message);
    throw err;
  }
}

// ---------------------------------------------------------------- tipos

export interface AdminUser {
  id: number;
  username: string;
}

export interface AdminUserDetail extends AdminUser {
  is_active: boolean;
  created_at: string;
}

export interface LoginResult {
  token: string;
  admin: AdminUser;
}

export type ItemType = 'questions' | 'scenarios' | 'personalities';

export interface AdminGame {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  is_active: boolean;
  /** null = jogo sem conteúdo editável (ex.: tradutor). */
  item_type: ItemType | null;
  theme_count: number;
  active_theme_count: number;
}

export interface GameUpdate {
  name?: string;
  description?: string | null;
  icon?: string;
  is_active?: boolean;
}

export interface AdminTheme {
  id: string;
  original_theme_id: string;
  game_id: string;
  name: string;
  description: string | null;
  color: string | null;
  text_color: string | null;
  button_color: string | null;
  icon: string | null;
  is_active: boolean;
  item_count: number;
  active_item_count: number;
}

export interface ThemeInput {
  name?: string;
  description?: string | null;
  icon?: string;
  is_active?: boolean;
}

interface ItemBase {
  id: number;
  theme_id: string;
  is_active: boolean;
}
export interface QuestionItem extends ItemBase {
  content: string;
}
export interface ScenarioItem extends ItemBase {
  honest: string;
  impostor_variations: string[];
}
export interface PersonalityItem extends ItemBase {
  name: string;
}
export type AdminItem = QuestionItem | ScenarioItem | PersonalityItem;

/** Campos editáveis de um item (o formato depende do tipo do tema). */
export type ItemFields =
  | { content: string }
  | { honest: string; impostor_variations: string[] }
  | { name: string };

export interface ItemPage {
  type: ItemType;
  total: number;
  offset: number;
  limit: number;
  items: AdminItem[];
}

export interface BulkImportResult {
  type: ItemType;
  created: number;
  skipped_blank: number;
  skipped_duplicate: number;
  invalid: { line: number; error: string }[];
}

// ---------------------------------------------------------------- auth

/** Login não passa pelo tratamento de 401 (senha errada não é sessão expirada). */
export async function adminLogin(username: string, password: string): Promise<LoginResult> {
  const result = await apiSend<LoginResult>('POST', '/admin/auth/login', { username, password });
  setAdminToken(result.token);
  return result;
}

export async function adminLogout(): Promise<void> {
  const token = currentToken();
  clearAdminToken();
  if (!token) return;
  try {
    await apiSend<void>('POST', '/admin/auth/logout', undefined, { token });
  } catch {
    /* sessão já inválida ou servidor fora: o token local já foi apagado */
  }
}

export const getMe = (signal?: AbortSignal) => adminRequest<AdminUser>('GET', '/auth/me', undefined, signal);

// ---------------------------------------------------------------- jogos

export const listAdminGames = (signal?: AbortSignal) => adminRequest<AdminGame[]>('GET', '/games', undefined, signal);

export const updateAdminGame = (gameId: string, data: GameUpdate) =>
  adminRequest<AdminGame>('PATCH', `/games/${encodeURIComponent(gameId)}`, data);

// ---------------------------------------------------------------- temas

export const listThemes = (gameId: string, signal?: AbortSignal) =>
  adminRequest<AdminTheme[]>('GET', `/games/${encodeURIComponent(gameId)}/themes`, undefined, signal);

export const createTheme = (gameId: string, data: ThemeInput & { name: string }) =>
  adminRequest<AdminTheme>('POST', `/games/${encodeURIComponent(gameId)}/themes`, data);

export const updateTheme = (themeId: string, data: ThemeInput) =>
  adminRequest<AdminTheme>('PATCH', `/themes/${encodeURIComponent(themeId)}`, data);

export const deleteTheme = (themeId: string) => adminRequest<void>('DELETE', `/themes/${encodeURIComponent(themeId)}`);

/**
 * Acha um tema pelo id. A API não tem `GET /themes/{id}`: tenta o jogo do prefixo do id
 * (`<jogo>_<slug>`) e, se não achar, procura em todos os jogos.
 */
export const getTheme = (themeId: string, signal?: AbortSignal) =>
  adminRequest<AdminTheme>('GET', `/themes/${encodeURIComponent(themeId)}`, undefined, signal);

export async function findTheme(themeId: string, signal?: AbortSignal): Promise<{ game: AdminGame; theme: AdminTheme } | null> {
  try {
    const [theme, games] = await Promise.all([getTheme(themeId, signal), listAdminGames(signal)]);
    const game = games.find((g) => g.id === theme.game_id);
    return game ? { game, theme } : null;
  } catch (err) {
    // Tema inexistente vira "não encontrado" na tela, não erro
    if (err instanceof ApiError && err.status === 404) return null;
    throw err;
  }
}

// ---------------------------------------------------------------- itens

export interface ListItemsParams {
  search?: string;
  offset?: number;
  limit?: number;
}

export function listItems(themeId: string, params: ListItemsParams = {}, signal?: AbortSignal) {
  const q = new URLSearchParams();
  if (params.search?.trim()) q.set('search', params.search.trim());
  if (params.offset) q.set('offset', String(params.offset));
  if (params.limit) q.set('limit', String(params.limit));
  const qs = q.toString();
  return adminRequest<ItemPage>('GET', `/themes/${encodeURIComponent(themeId)}/items${qs ? `?${qs}` : ''}`, undefined, signal);
}

export const createItem = (themeId: string, data: ItemFields & { is_active?: boolean }) =>
  adminRequest<AdminItem>('POST', `/themes/${encodeURIComponent(themeId)}/items`, data);

export const updateItem = (type: ItemType, itemId: number, data: Partial<ItemFields> & { is_active?: boolean }) =>
  adminRequest<AdminItem>('PATCH', `/items/${type}/${itemId}`, data);

export const deleteItem = (type: ItemType, itemId: number) => adminRequest<void>('DELETE', `/items/${type}/${itemId}`);

export const bulkImport = (themeId: string, lines: string[]) =>
  adminRequest<BulkImportResult>('POST', `/themes/${encodeURIComponent(themeId)}/items/bulk`, { lines });

// ---------------------------------------------------------------- admins

export const listAdmins = (signal?: AbortSignal) => adminRequest<AdminUserDetail[]>('GET', '/admins', undefined, signal);

export const createAdmin = (username: string, password: string) =>
  adminRequest<AdminUserDetail>('POST', '/admins', { username, password });

export const updateAdmin = (adminId: number, data: { is_active?: boolean; password?: string }) =>
  adminRequest<AdminUserDetail>('PATCH', `/admins/${adminId}`, data);
