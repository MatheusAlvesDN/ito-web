// PlayerNamesEditor: lista de nomes do Pass and Play (adicionar, remover, reordenar).
import { useState, type FormEvent } from 'react';
import { ArrowDown, ArrowUp, Plus, X } from 'lucide-react';
import { Button, IconButton, Input, PlayerAvatar } from '../../../ui';
import { MAX_LOCAL_PLAYERS, MAX_NAME_LENGTH, validateNewName } from '../profile';

export interface PlayerNamesEditorProps {
  names: string[];
  onChange: (names: string[]) => void;
}

export function PlayerNamesEditor({ names, onChange }: PlayerNamesEditorProps) {
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string | null>(null);

  const add = (e: FormEvent) => {
    e.preventDefault();
    const err = validateNewName(draft, names);
    if (err) {
      setError(err);
      return;
    }
    onChange([...names, draft.trim()]);
    setDraft('');
    setError(null);
  };
  const move = (i: number, d: -1 | 1) => {
    const next = [...names];
    [next[i], next[i + d]] = [next[i + d], next[i]];
    onChange(next);
  };

  return (
    <div className="space-y-3">
      <form onSubmit={add} noValidate className="flex items-start gap-2">
        <Input
          label="Nome do jogador"
          hideLabel
          placeholder="Nome do jogador"
          value={draft}
          error={error}
          maxLength={MAX_NAME_LENGTH}
          autoComplete="off"
          onChange={(e) => {
            setDraft(e.target.value);
            setError(null);
          }}
          wrapperClassName="flex-1"
          disabled={names.length >= MAX_LOCAL_PLAYERS}
        />
        <Button type="submit" leftIcon={<Plus className="h-4 w-4" />} disabled={!draft.trim() || names.length >= MAX_LOCAL_PLAYERS}>
          Adicionar
        </Button>
      </form>

      {names.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-line px-4 py-6 text-center text-sm text-muted">Ninguém ainda. Adicione os nomes de quem vai jogar.</p>
      ) : (
        <ol className="space-y-2" aria-label="Jogadores">
          {names.map((n, i) => (
            <li key={n} className="flex items-center gap-2 rounded-2xl border border-line bg-surface py-2 pl-3 pr-1.5">
              <span className="w-5 text-center text-sm font-semibold text-muted">{i + 1}</span>
              <PlayerAvatar name={n} size="sm" decorative />
              <span className="min-w-0 flex-1 truncate font-semibold">{n}</span>
              <IconButton aria-label={`Subir ${n}`} icon={<ArrowUp />} size="sm" disabled={i === 0} onClick={() => move(i, -1)} />
              <IconButton aria-label={`Descer ${n}`} icon={<ArrowDown />} size="sm" disabled={i === names.length - 1} onClick={() => move(i, 1)} />
              <IconButton aria-label={`Remover ${n}`} icon={<X />} size="sm" onClick={() => onChange(names.filter((_, j) => j !== i))} />
            </li>
          ))}
        </ol>
      )}
      <p className="text-xs text-muted">
        {names.length} de {MAX_LOCAL_PLAYERS} jogadores. A ordem é a ordem de passar o celular.
      </p>
    </div>
  );
}
