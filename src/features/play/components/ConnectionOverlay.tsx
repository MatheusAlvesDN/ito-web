// ConnectionOverlay: aviso de reconexão por cima da sala (o estado volta sozinho ao reconectar).
import { WifiOff } from 'lucide-react';
import { Button, Spinner } from '../../../ui';

export function ConnectionOverlay({ onLeave }: { onLeave: () => void }) {
  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center bg-bg/80 p-6 backdrop-blur-sm" role="alertdialog" aria-live="assertive" aria-label="Reconectando">
      <div className="w-full max-w-sm space-y-4 rounded-3xl border border-line bg-surface p-6 text-center shadow-overlay">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-warning/10 text-warning">
          <WifiOff aria-hidden className="h-7 w-7" />
        </div>
        <div>
          <h2 className="font-display text-lg font-bold">Conexão perdida</h2>
          <p className="mt-1 text-sm text-muted">Tentando reconectar… Seu lugar na sala fica guardado por um tempo.</p>
        </div>
        <div className="flex justify-center">
          <Spinner size="md" label="Reconectando" />
        </div>
        <Button variant="ghost" fullWidth onClick={onLeave}>
          Sair da sala
        </Button>
      </div>
    </div>
  );
}
