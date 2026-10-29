// Card "Entrar numa sala": código de 4 letras → /sala/CODIGO.
import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { DoorOpen } from 'lucide-react';
import { Button, Card, Input } from '../../ui';

const CODE_RE = /^[A-Z]{4}$/;

export function JoinRoomCard() {
  const navigate = useNavigate();
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!CODE_RE.test(code)) {
      setError('O código tem 4 letras (A–Z).');
      return;
    }
    navigate(`/sala/${code}`);
  };

  return (
    <Card as="section" aria-labelledby="join-title">
      <form onSubmit={onSubmit} noValidate>
        <div className="mb-3 flex items-center gap-2">
          <DoorOpen aria-hidden className="h-5 w-5 text-wood" />
          <h2 id="join-title" className="font-display text-base font-bold">
            Entrar numa sala
          </h2>
        </div>
        <div className="flex items-start gap-2">
          <Input
            label="Código da sala"
            hideLabel
            hint="Peça o código de 4 letras para quem criou a sala."
            error={error}
            value={code}
            onChange={(e) => {
              setCode(e.target.value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 4));
              setError(null);
            }}
            placeholder="ABCD"
            inputMode="text"
            autoCapitalize="characters"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            maxLength={4}
            wrapperClassName="flex-1"
            className="text-center font-display text-lg font-bold uppercase tracking-[0.4em] placeholder:tracking-[0.4em]"
          />
          <Button type="submit" disabled={code.length !== 4}>
            Entrar
          </Button>
        </div>
      </form>
    </Card>
  );
}
