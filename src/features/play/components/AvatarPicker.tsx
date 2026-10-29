// AvatarPicker: escolha de avatar DiceBear por categoria (reestilização do AvatarPickerModal antigo).
import { useState } from 'react';
import { Check, Dices } from 'lucide-react';
import { AVATAR_CATEGORIES, getAvatarUrl, getRandomAvatar, parseAvatar } from '../../../utils/avatarService';
import { audioService } from '../../../utils/audioService';
import { Button, Modal, PlayerAvatar, cx, focusRing } from '../../../ui';

export interface AvatarPickerProps {
  open: boolean;
  onClose: () => void;
  value: string;
  name: string;
  onSave: (avatar: string) => void;
}

export function AvatarPicker(props: AvatarPickerProps) {
  // Remonta a cada abertura para começar do avatar atual.
  return props.open ? <AvatarPickerDialog {...props} /> : null;
}

function categoryOf(avatar: string) {
  const { style } = parseAvatar(avatar);
  return AVATAR_CATEGORIES.some((c) => c.style === style) ? style : AVATAR_CATEGORIES[0].style;
}

function AvatarPickerDialog({ onClose, value, name, onSave }: AvatarPickerProps) {
  const [selected, setSelected] = useState(value);
  const [category, setCategory] = useState(() => categoryOf(value));
  const cat = AVATAR_CATEGORIES.find((c) => c.style === category) ?? AVATAR_CATEGORIES[0];

  const randomize = () => {
    const r = getRandomAvatar();
    setSelected(r);
    setCategory(categoryOf(r));
    audioService.playFlip();
  };

  return (
    <Modal
      open
      onClose={onClose}
      title="Escolher avatar"
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            leftIcon={<Check className="h-4 w-4" />}
            onClick={() => {
              onSave(selected);
              onClose();
            }}
          >
            Usar este
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <PlayerAvatar name={name || 'Você'} avatar={selected} size="lg" highlight decorative />
            <p className="truncate font-display font-bold">{name || 'Você'}</p>
          </div>
          <Button variant="secondary" size="sm" leftIcon={<Dices className="h-4 w-4" />} onClick={randomize}>
            Sortear
          </Button>
        </div>

        <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1" role="tablist" aria-label="Categorias">
          {AVATAR_CATEGORIES.map((c) => (
            <button
              key={c.id}
              type="button"
              role="tab"
              aria-selected={c.style === category}
              onClick={() => setCategory(c.style)}
              className={cx(
                'whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors',
                c.style === category ? 'border-brand bg-brand text-brand-ink' : 'border-line bg-surface-2 text-muted hover:text-ink',
                focusRing,
              )}
            >
              {c.name}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-4 gap-2 sm:grid-cols-6" role="radiogroup" aria-label={`Avatares: ${cat.name}`}>
          {cat.seeds.map((seed) => {
            const key = `${cat.style}:${seed}`;
            const on = key === selected;
            return (
              <button
                key={key}
                type="button"
                role="radio"
                aria-checked={on}
                aria-label={seed}
                onClick={() => {
                  setSelected(key);
                  audioService.playFlip();
                }}
                className={cx(
                  'relative aspect-square rounded-2xl border bg-surface-2 p-1 transition-colors',
                  on ? 'border-brand ring-2 ring-brand/40' : 'border-line hover:border-muted/50',
                  focusRing,
                )}
              >
                <img src={getAvatarUrl(key)} alt="" loading="lazy" draggable={false} className="h-full w-full rounded-xl object-cover" />
                {on && (
                  <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-brand text-brand-ink">
                    <Check className="h-3 w-3" strokeWidth={3} />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </Modal>
  );
}
