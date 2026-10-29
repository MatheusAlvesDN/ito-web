// IconSelect: escolha do ícone (nomes do iconMap) com prévia ao lado.
import { AppIcon, Select } from '../../../ui';
import { ICON_OPTIONS } from '../utils';

interface IconSelectProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export function IconSelect({ value, onChange, disabled }: IconSelectProps) {
  const known = (ICON_OPTIONS as readonly string[]).includes(value);
  return (
    <div className="flex items-end gap-3">
      <Select
        label="Ícone"
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        wrapperClassName="flex-1"
        options={[...(known || !value ? [] : [{ value, label: `${value} (atual)` }]), ...ICON_OPTIONS.map((name) => ({ value: name, label: name }))]}
      />
      <div aria-hidden className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand/10 text-brand-strong">
        <AppIcon name={value} className="h-5 w-5" />
      </div>
    </div>
  );
}
