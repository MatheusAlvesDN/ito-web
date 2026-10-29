// useGames: carrega GET /api/v1/games com cache em memória (compartilhado entre telas).
import { useCallback, useEffect, useState } from 'react';
import { getGames, type ApiGame } from './api';

let cache: ApiGame[] | null = null;
let inflight: Promise<ApiGame[]> | null = null;

function load(force = false): Promise<ApiGame[]> {
  if (cache && !force) return Promise.resolve(cache);
  if (!inflight || force) {
    inflight = getGames()
      .then((data) => {
        cache = data;
        return data;
      })
      .finally(() => {
        inflight = null;
      });
  }
  return inflight;
}

/** Limpa o cache (ex.: depois que o admin editar jogos/temas). */
export function invalidateGames() {
  cache = null;
}

export interface UseGamesResult {
  data: ApiGame[] | null;
  loading: boolean;
  error: string | null;
  /** Busca de novo ignorando o cache. */
  reload: () => void;
}

export function useGames(): UseGamesResult {
  const [data, setData] = useState<ApiGame[] | null>(cache);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(!cache);
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    let alive = true;
    load(nonce > 0)
      .then((d) => {
        if (!alive) return;
        setData(d);
        setError(null);
      })
      .catch((e: unknown) => {
        if (!alive) return;
        setError(e instanceof Error ? e.message : String(e));
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [nonce]);

  const reload = useCallback(() => {
    setLoading(true);
    setError(null);
    setNonce((n) => n + 1);
  }, []);

  return { data, loading, error, reload };
}

/** Atalho: um jogo pelo id (ou undefined enquanto carrega / se não existir). */
export function useGame(id: string | undefined) {
  const games = useGames();
  return { ...games, game: games.data?.find((g) => g.id === id) };
}
