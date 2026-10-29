// Cliente HTTP da API do backend (FastAPI em /api/v1, via proxy do Vite em dev).

const API_BASE = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '') ?? '/api/v1';

/** Erro de API com status HTTP (0 = sem conexão) e mensagem em português. */
export class ApiError extends Error {
  readonly status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

export const OFFLINE_MESSAGE = 'Não foi possível falar com o servidor. Ele está rodando?';

function messageForStatus(status: number): string {
  if (status === 401) return 'Sua sessão expirou. Entre novamente.';
  if (status === 403) return 'Você não tem permissão para isso.';
  if (status === 404) return 'Não encontrado.';
  if (status === 409) return 'Conflito: o item já existe ou foi alterado.';
  if (status === 422) return 'Dados inválidos. Confira os campos.';
  if (status >= 500) return 'O servidor teve um problema. Tente de novo em instantes.';
  return `Erro inesperado (HTTP ${status}).`;
}

/** Extrai a mensagem do corpo de erro do FastAPI ({detail: string | [{msg}]}). */
async function readErrorDetail(res: Response): Promise<string | null> {
  try {
    const body = await res.json();
    const detail = body?.detail ?? body?.message;
    if (typeof detail === 'string') return detail;
    if (Array.isArray(detail) && typeof detail[0]?.msg === 'string') return detail[0].msg;
  } catch {
    /* corpo não-JSON */
  }
  return null;
}

export interface RequestOptions {
  /** Token Bearer (painel admin). */
  token?: string | null;
  signal?: AbortSignal;
}

async function request<T>(method: string, path: string, body?: unknown, opts: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (opts.token) headers.Authorization = `Bearer ${opts.token}`;

  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path.startsWith('/') ? path : `/${path}`}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: opts.signal,
    });
  } catch (err) {
    if ((err as { name?: string } | null)?.name === 'AbortError') throw err;
    throw new ApiError(OFFLINE_MESSAGE, 0);
  }

  // Proxy do Vite responde 502/504 (ou HTML) quando o backend está desligado.
  if (res.status === 502 || res.status === 503 || res.status === 504) throw new ApiError(OFFLINE_MESSAGE, res.status);
  if (!res.ok) throw new ApiError((await readErrorDetail(res)) ?? messageForStatus(res.status), res.status);
  if (res.status === 204) return undefined as T;
  try {
    return (await res.json()) as T;
  } catch {
    throw new ApiError(OFFLINE_MESSAGE, res.status);
  }
}

/** GET JSON. */
export function apiGet<T>(path: string, opts?: RequestOptions): Promise<T> {
  return request<T>('GET', path, undefined, opts);
}

/** POST/PUT/PATCH/DELETE com corpo JSON opcional. */
export function apiSend<T>(method: 'POST' | 'PUT' | 'PATCH' | 'DELETE', path: string, body?: unknown, opts?: RequestOptions): Promise<T> {
  return request<T>(method, path, body, opts);
}

// ---------------------------------------------------------------- jogos

export interface ApiTheme {
  id: string;
  original_theme_id: string;
  name: string;
  description?: string | null;
  icon: string;
  /** Quantidade de itens ativos (pode faltar em backends antigos). */
  item_count?: number;
  color?: string;
  text_color?: string;
}

export interface ApiGame {
  /** 'classic' (ITO) | 'impostor' | 'whoami' | 'whatdoyouknow' | 'translator' */
  id: string;
  name: string;
  description?: string | null;
  icon: string;
  themes: ApiTheme[];
}

/** Lista jogos e temas ativos. */
export function getGames(signal?: AbortSignal): Promise<ApiGame[]> {
  return apiGet<ApiGame[]>('/games', { signal });
}
