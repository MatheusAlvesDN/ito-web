// SearchInput: campo de busca com ícone de lupa e botão de limpar.
import { Search, X } from 'lucide-react';
import { IconButton, Input } from '../../../ui';

interface SearchInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function SearchInput({ label, value, onChange, placeholder, className }: SearchInputProps) {
  return (
    <div className={`relative ${className ?? ''}`}>
      <Search aria-hidden className="pointer-events-none absolute left-3.5 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-muted" />
      <Input
        type="search"
        label={label}
        hideLabel
        value={value}
        placeholder={placeholder ?? label}
        onChange={(e) => onChange(e.target.value)}
        className="pl-10 pr-10 [&::-webkit-search-cancel-button]:hidden"
      />
      {value && (
        <IconButton aria-label="Limpar busca" icon={<X />} size="sm" onClick={() => onChange('')} className="absolute right-1.5 top-1/2 -translate-y-1/2" />
      )}
    </div>
  );
}
