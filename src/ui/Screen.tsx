// Screen: layout de página (cabeçalho com voltar + título + slot à direita, corpo rolável, rodapé fixo com safe-area).
import type { ReactNode } from 'react';
import { ArrowLeft } from 'lucide-react';
import type { To } from 'react-router-dom';
import { IconButton } from './IconButton';
import { cx } from './styles';

export interface ScreenProps {
  /** Título no cabeçalho (h1). Pode ser omitido se `header` customizado for passado. */
  title?: ReactNode;
  subtitle?: ReactNode;
  /** Destino do botão voltar (rota) ou callback. Omitido = sem botão. */
  back?: To | (() => void);
  backLabel?: string;
  /** Conteúdo à direita do cabeçalho (ex.: ThemeToggle, menu). */
  right?: ReactNode;
  /** Substitui o miolo do cabeçalho (mantém voltar/right). */
  header?: ReactNode;
  /** Rodapé fixo (ações principais). */
  footer?: ReactNode;
  /** Largura máxima da coluna: narrow ≈ 640px (padrão), wide ≈ 1024px, full. */
  width?: 'narrow' | 'wide' | 'full';
  children?: ReactNode;
  /** Classe extra no container do corpo. */
  bodyClassName?: string;
}

const WIDTH = { narrow: 'max-w-xl', wide: 'max-w-5xl', full: 'max-w-none' };

export function Screen({ title, subtitle, back, backLabel = 'Voltar', right, header, footer, width = 'narrow', children, bodyClassName }: ScreenProps) {
  const col = cx('mx-auto w-full px-4', WIDTH[width]);
  const backBtn =
    back == null ? null : typeof back === 'function' ? (
      <IconButton aria-label={backLabel} icon={<ArrowLeft />} onClick={back} className="-ml-2" />
    ) : (
      <IconButton aria-label={backLabel} icon={<ArrowLeft />} to={back} className="-ml-2" />
    );

  return (
    <div className="flex h-full min-h-0 w-full flex-col overflow-hidden bg-bg text-ink">
      <header className="z-20 flex-none border-b border-line/70 bg-bg/90 pt-[env(safe-area-inset-top)] backdrop-blur">
        <div className={cx(col, 'flex min-h-[3.75rem] items-center gap-2 py-2')}>
          {backBtn}
          <div className="min-w-0 flex-1">
            {header ?? (
              <>
                {title != null && <h1 className="truncate font-display text-lg font-bold leading-tight">{title}</h1>}
                {subtitle != null && <p className="truncate text-xs text-muted">{subtitle}</p>}
              </>
            )}
          </div>
          {right && <div className="flex shrink-0 items-center gap-1">{right}</div>}
        </div>
      </header>

      <main className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain">
        <div className={cx(col, 'py-5', !footer && 'pb-[max(1.5rem,env(safe-area-inset-bottom))]', bodyClassName)}>{children}</div>
      </main>

      {footer && (
        <footer className="z-20 flex-none border-t border-line/70 bg-surface/95 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur">
          <div className={col}>{footer}</div>
        </footer>
      )}
    </div>
  );
}
