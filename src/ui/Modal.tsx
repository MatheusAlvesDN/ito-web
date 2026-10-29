// Modal: diálogo acessível (role="dialog", foco preso, Esc fecha, devolve o foco). Bottom sheet no celular.
import { useEffect, useId, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { IconButton } from './IconButton';
import { cx } from './styles';

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  /** Ações no rodapé (ex.: botões Cancelar/Confirmar). */
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg';
  /** Impede fechar clicando fora / Esc (ex.: ação em andamento). */
  dismissible?: boolean;
}

const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';
const WIDTH = { sm: 'sm:max-w-sm', md: 'sm:max-w-md', lg: 'sm:max-w-2xl' };

export function Modal({ open, onClose, title, description, children, footer, size = 'md', dismissible = true }: ModalProps) {
  const id = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  const dismissibleRef = useRef(dismissible);

  useEffect(() => {
    onCloseRef.current = onClose;
    dismissibleRef.current = dismissible;
  });

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const panel = panelRef.current;
    const first = panel?.querySelector<HTMLElement>('[data-autofocus]') ?? panel?.querySelector<HTMLElement>(FOCUSABLE);
    (first ?? panel)?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && dismissibleRef.current) {
        e.stopPropagation();
        onCloseRef.current();
        return;
      }
      if (e.key !== 'Tab' || !panel) return;
      const items = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((el) => el.offsetParent !== null);
      if (items.length === 0) {
        e.preventDefault();
        panel.focus();
        return;
      }
      const firstEl = items[0];
      const lastEl = items[items.length - 1];
      if (e.shiftKey && (document.activeElement === firstEl || document.activeElement === panel)) {
        e.preventDefault();
        lastEl.focus();
      } else if (!e.shiftKey && document.activeElement === lastEl) {
        e.preventDefault();
        firstEl.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      previous?.focus?.();
    };
  }, [open]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
      <div
        aria-hidden
        className="absolute inset-0 bg-[rgb(20_12_6/0.55)] backdrop-blur-[2px] animate-fade-in"
        onClick={() => dismissible && onClose()}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${id}-title`}
        aria-describedby={description ? `${id}-desc` : undefined}
        tabIndex={-1}
        className={cx(
          'relative flex max-h-[90dvh] w-full flex-col rounded-t-3xl border border-line bg-surface text-ink shadow-overlay outline-none animate-fade-in-scale sm:rounded-3xl',
          WIDTH[size],
        )}
      >
        <div className="flex items-start gap-3 px-5 pb-2 pt-5">
          <div className="min-w-0 flex-1">
            <h2 id={`${id}-title`} className="font-display text-lg font-bold leading-tight">
              {title}
            </h2>
            {description && (
              <p id={`${id}-desc`} className="mt-1 text-sm text-muted">
                {description}
              </p>
            )}
          </div>
          {dismissible && <IconButton aria-label="Fechar" icon={<X />} size="sm" onClick={onClose} className="-mr-1 -mt-1" />}
        </div>
        {children && <div className="min-h-0 flex-1 overflow-y-auto px-5 py-3">{children}</div>}
        {footer && (
          <div className="flex flex-col-reverse gap-2 border-t border-line px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 sm:flex-row sm:justify-end">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
