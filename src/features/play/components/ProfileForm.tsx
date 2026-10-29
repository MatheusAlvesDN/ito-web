// ProfileForm: nome + avatar do jogador (online). Usado ao criar sala e ao entrar por código/link.
import { useState, type ReactNode } from 'react';
import { Pencil } from 'lucide-react';
import { Input, PlayerAvatar, cx, focusRing } from '../../../ui';
import { MAX_NAME_LENGTH, type Profile } from '../profile';
import { AvatarPicker } from './AvatarPicker';

export interface ProfileFormProps {
  value: Profile;
  onChange: (p: Profile) => void;
  error?: ReactNode;
  autoFocus?: boolean;
}

export function ProfileForm({ value, onChange, error, autoFocus }: ProfileFormProps) {
  const [picking, setPicking] = useState(false);
  return (
    <div className="flex items-start gap-3">
      <button
        type="button"
        onClick={() => setPicking(true)}
        className={cx('group relative mt-6 shrink-0 rounded-full', focusRing)}
        aria-label="Trocar avatar"
      >
        <PlayerAvatar name={value.name || 'Você'} avatar={value.avatar} size="lg" decorative />
        <span className="absolute -bottom-0.5 -right-0.5 flex h-6 w-6 items-center justify-center rounded-full border border-line bg-surface text-ink shadow-raised group-hover:bg-surface-2">
          <Pencil aria-hidden className="h-3 w-3" />
        </span>
      </button>
      <Input
        label="Seu nome"
        hint="É assim que os outros vão te ver."
        error={error}
        value={value.name}
        maxLength={MAX_NAME_LENGTH}
        autoComplete="nickname"
        autoFocus={autoFocus}
        onChange={(e) => onChange({ ...value, name: e.target.value })}
        wrapperClassName="flex-1"
      />
      <AvatarPicker open={picking} onClose={() => setPicking(false)} value={value.avatar} name={value.name} onSave={(avatar) => onChange({ ...value, avatar })} />
    </div>
  );
}
