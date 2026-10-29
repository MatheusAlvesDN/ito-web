// ConfirmModal: confirmação de ação destrutiva (botão vermelho, não fecha enquanto executa).
import type { ReactNode } from 'react';
import { Button, Modal } from '../../../ui';

interface ConfirmModalProps {
  open: boolean;
  title: ReactNode;
  description?: ReactNode;
  confirmLabel: string;
  busy?: boolean;
  onConfirm: () => void;
  onClose: () => void;
  children?: ReactNode;
}

export function ConfirmModal({ open, title, description, confirmLabel, busy, onConfirm, onClose, children }: ConfirmModalProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      description={description}
      size="sm"
      dismissible={!busy}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={busy} data-autofocus>
            Cancelar
          </Button>
          <Button variant="danger" onClick={onConfirm} loading={busy}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      {children}
    </Modal>
  );
}
