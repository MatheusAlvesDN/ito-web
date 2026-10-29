// useAdminQuery: busca dados do admin com recarga, cancelamento e atualização local (otimista).
import { useCallback, useEffect, useRef, useState } from 'react';
import { errorMessage } from './utils';

interface QueryState<T> {
  key: string;
  data?: T;
  error?: string;
}

export interface AdminQuery<T> {
  data: T | undefined;
  /** true enquanto a busca da chave atual não terminou (os dados anteriores continuam em `data`). */
  loading: boolean;
  error: string | null;
  /** Busca de novo (mantém os dados atuais na tela). */
  reload: () => void;
  /** Altera os dados localmente (ex.: toggle otimista). */
  setData: (update: (prev: T) => T) => void;
}

/** `key` identifica a busca: quando muda, busca de novo (ex.: termo de busca, página). */
export function useAdminQuery<T>(load: (signal: AbortSignal) => Promise<T>, key: string): AdminQuery<T> {
  const loadRef = useRef(load);
  const [nonce, setNonce] = useState(0);
  const [state, setState] = useState<QueryState<T> | null>(null);
  const reqKey = `${key}#${nonce}`;

  useEffect(() => {
    loadRef.current = load;
  });

  useEffect(() => {
    const ctrl = new AbortController();
    loadRef.current(ctrl.signal)
      .then((data) => setState({ key: reqKey, data }))
      .catch((err: unknown) => {
        if (ctrl.signal.aborted) return;
        setState((prev) => ({ key: reqKey, data: prev?.data, error: errorMessage(err) }));
      });
    return () => ctrl.abort();
  }, [reqKey]);

  const reload = useCallback(() => setNonce((n) => n + 1), []);
  const setData = useCallback((update: (prev: T) => T) => {
    setState((prev) => (prev && prev.data !== undefined ? { ...prev, data: update(prev.data) } : prev));
  }, []);

  return {
    data: state?.data,
    loading: state?.key !== reqKey,
    error: state?.key === reqKey ? (state.error ?? null) : null,
    reload,
    setData,
  };
}
