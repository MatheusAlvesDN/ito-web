// ThemeFormModal: criar ou editar um tema (nome, descrição, ícone e se começa ativo).
import { useState, type FormEvent } from 'react';
import type { AdminTheme, ThemeInput } from '../../../lib/adminApi';
import { Button, Input, Modal, TextArea, Toggle } from '../../../ui';
import { IconSelect } from './IconSelect';

interface ThemeFormModalProps {
  /** null = novo tema. */
  theme: AdminTheme | null;
  gameName: string;
  busy: boolean;
  onSave: (data: ThemeInput & { name: string }) => void;
  onClose: () => void;
}

export function ThemeFormModal({ theme, gameName, busy, onSave, onClose }: ThemeFormModalProps) {
  const [name, setName] = useState(theme?.name ?? '');
  const [description, setDescription] = useState(theme?.description ?? '');
  const [icon, setIcon] = useState(theme?.icon ?? 'Star');
  const [active, setActive] = useState(theme?.is_active ?? true);
  const [error, setError] = useState<string | null>(null);
  const formId = 'theme-form';

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Informe o nome do tema.');
      return;
    }
    onSave({ name: name.trim(), description: description.trim() || null, icon, is_active: active });
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={theme ? 'Editar tema' : 'Novo tema'}
      description={theme ? `Código interno: ${theme.id}` : `O tema será criado em ${gameName}.`}
      dismissible={!busy}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={busy}>
            Cancelar
          </Button>
          <Button type="submit" form={formId} loading={busy}>
            {theme ? 'Salvar' : 'Criar tema'}
          </Button>
        </>
      }
    >
      <form id={formId} className="space-y-4" onSubmit={submit} noValidate>
        <Input label="Nome" value={name} maxLength={100} onChange={(e) => setName(e.target.value)} error={error ?? undefined} disabled={busy} data-autofocus />
        <TextArea label="Descrição" hint="Opcional. Ajuda os jogadores a escolher." value={description} maxLength={500} rows={3} onChange={(e) => setDescription(e.target.value)} disabled={busy} />
        <IconSelect value={icon} onChange={setIcon} disabled={busy} />
        <Toggle label="Ativo" description="Temas inativos não aparecem para os jogadores." checked={active} onChange={setActive} disabled={busy} />
      </form>
    </Modal>
  );
}
