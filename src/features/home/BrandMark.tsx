// BrandMark: logotipo do app (dado laranja sobre madeira) + nome.
import { cx } from '../../ui';

export function BrandMark({ className }: { className?: string }) {
  return (
    <span className={cx('inline-flex items-center gap-2.5', className)}>
      <span aria-hidden className="relative inline-flex h-9 w-9 items-center justify-center rounded-xl bg-wood shadow-raised">
        <span className="grid h-6 w-6 grid-cols-2 gap-[3px] rounded-md bg-brand p-[5px]">
          <span className="rounded-full bg-brand-ink" />
          <span />
          <span />
          <span className="rounded-full bg-brand-ink" />
        </span>
      </span>
      <span className="font-display text-xl font-extrabold tracking-tight text-ink">
        Party <span className="text-brand-strong">Games</span>
      </span>
    </span>
  );
}
