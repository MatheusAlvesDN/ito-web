// PlayerAvatar: avatar DiceBear do jogador (avatarService) com fallback de iniciais.
import { useState } from 'react';
import { getAvatarUrl } from '../utils/avatarService';
import { cx } from './styles';

export interface PlayerAvatarProps {
  name: string;
  /** Id do avatar ("estilo:semente"); se vazio usa o nome como semente. */
  avatar?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  /** Destaca com anel laranja (ex.: vez do jogador, host). */
  highlight?: boolean;
  /** true quando o nome já aparece ao lado (alt vazio). */
  decorative?: boolean;
  className?: string;
}

const SIZE = { xs: 'h-6 w-6 text-[10px]', sm: 'h-8 w-8 text-xs', md: 'h-11 w-11 text-sm', lg: 'h-16 w-16 text-lg', xl: 'h-24 w-24 text-2xl' };

function initials(name: string) {
  return name.trim().split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? '').join('') || '?';
}

export function PlayerAvatar({ name, avatar, size = 'md', highlight, decorative, className }: PlayerAvatarProps) {
  const url = getAvatarUrl(name, avatar);
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const classes = cx(
    'inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full border bg-surface-2',
    highlight ? 'border-brand ring-2 ring-brand/40' : 'border-line',
    SIZE[size],
    className,
  );
  if (failedUrl === url) {
    return (
      <span className={cx(classes, 'font-display font-bold text-wood')} role={decorative ? undefined : 'img'} aria-label={decorative ? undefined : name} aria-hidden={decorative || undefined}>
        {initials(name)}
      </span>
    );
  }
  return (
    <span className={classes}>
      <img src={url} alt={decorative ? '' : `Avatar de ${name}`} loading="lazy" draggable={false} onError={() => setFailedUrl(url)} className="h-full w-full object-cover" />
    </span>
  );
}
