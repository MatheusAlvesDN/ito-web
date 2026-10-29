// usePending: conjunto de ids com operação em andamento (desabilita botões/toggles daquele item).
import { useCallback, useState } from 'react';

export function usePending<K extends string | number>() {
  const [pending, setPending] = useState<ReadonlySet<K>>(() => new Set());
  const start = useCallback((id: K) => setPending((s) => new Set(s).add(id)), []);
  const done = useCallback(
    (id: K) =>
      setPending((s) => {
        const n = new Set(s);
        n.delete(id);
        return n;
      }),
    [],
  );
  return { isPending: (id: K) => pending.has(id), start, done };
}
