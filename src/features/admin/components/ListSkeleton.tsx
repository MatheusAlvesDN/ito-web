// ListSkeleton: linhas pulsantes enquanto uma lista do admin carrega.
import { Skeleton } from '../../../ui';

export function ListSkeleton({ rows = 4, label = 'Carregando…' }: { rows?: number; label?: string }) {
  return (
    <div role="status" aria-live="polite">
      <span className="sr-only">{label}</span>
      <ul aria-hidden className="space-y-3">
        {Array.from({ length: rows }, (_, i) => (
          <li key={i} className="flex items-center gap-3 rounded-2xl border border-line bg-surface p-4 shadow-raised">
            <Skeleton className="h-11 w-11 shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-2/5" />
              <Skeleton className="h-3 w-4/5" />
            </div>
            <Skeleton className="h-7 w-12 shrink-0 rounded-full" />
          </li>
        ))}
      </ul>
    </div>
  );
}
