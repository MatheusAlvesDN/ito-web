// GameFormModal: editar nome, descrição e ícone de um jogo.
import { useState, type FormEvent } from 'react';
import type { AdminGame, GameUpdate } from '../../../lib/adminApi';
import { Button, Input, Modal, TextArea } from '../../../ui';
import { IconSelect } from './IconSelect';

interface GameFormModalProps {
  game: AdminGame;
  busy: boolean;
  onSave: (data: GameUpdate) => void;
  onClose: () => void;
}

export function GameFormModal({ game, busy, onSave, onClose }: GameFormModalProps) {
  const [name, setName] = useState(game.name);
  const [description, setDescription] = useState(game.description ?? '');
  const [icon, setIcon] = useState(game.icon ?? 'Sparkles');
  const [error, setError] = useState<string | null>(null);
  const formId = `game-form-${game.id}`;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Informe o nome do jogo.');
      return;
    }
    onSave({ name: name.trim(), description: description.trim() || null, icon });
  };

  return (
    <Modal
      open
      onClose={onClose}
      title="Editar jogo"
      description={`Código interno: ${game.id}`}
      dismissible={!busy}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={busy}>
            Cancelar
          </Button>
          <Button type="submit" form={formId} loading={busy}>
            Salvar
          </Button>
        </>
      }
    >
      <form id={formId} className="space-y-4" onSubmit={submit} noValidate>
        <Input label="Nome" value={name} maxLength={100} onChange={(e) => setName(e.target.value)} error={error ?? undefined} disabled={busy} data-autofocus />
        <TextArea label="Descrição" hint="Aparece na tela inicial." value={description} maxLength={500} rows={3} onChange={(e) => setDescription(e.target.value)} disabled={busy} />
        <IconSelect value={icon} onChange={setIcon} disabled={busy} />
      </form>
    </Modal>
  );
}
