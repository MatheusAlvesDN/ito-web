// RoomCodePanel: código da sala grande + copiar + compartilhar link + QR code gerado localmente.
import { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Copy, QrCode, Share2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button, Card, Modal } from '../../../ui';

function roomLink(code: string): string {
  return `${window.location.origin}/sala/${code}`;
}

async function copyText(text: string, okMessage: string) {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(okMessage);
  } catch {
    toast.error('Não foi possível copiar. Copie manualmente: ' + text);
  }
}

export function RoomCodePanel({ code }: { code: string }) {
  const [qrOpen, setQrOpen] = useState(false);
  const link = roomLink(code);

  const share = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Party Games', text: `Entre na minha sala: ${code}`, url: link });
        return;
      } catch (e) {
        if ((e as { name?: string } | null)?.name === 'AbortError') return;
      }
    }
    void copyText(link, 'Link copiado!');
  };

  return (
    <Card className="space-y-4">
      <div className="flex items-center gap-4">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted">Código da sala</p>
          <p className="font-display text-5xl font-extrabold tracking-[0.2em] text-brand-strong" aria-label={`Código ${code.split('').join(' ')}`}>
            {code}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setQrOpen(true)}
          className="hidden shrink-0 rounded-xl border border-line bg-[#ffffff] p-2 sm:block"
          aria-label="Ampliar QR code"
        >
          <QRCodeSVG value={link} size={88} bgColor="#ffffff" fgColor="#1c130d" level="M" />
        </button>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <Button variant="secondary" size="sm" leftIcon={<Copy className="h-4 w-4" />} onClick={() => copyText(code, 'Código copiado!')}>
          Copiar
        </Button>
        <Button variant="secondary" size="sm" leftIcon={<Share2 className="h-4 w-4" />} onClick={share}>
          Link
        </Button>
        <Button variant="secondary" size="sm" leftIcon={<QrCode className="h-4 w-4" />} onClick={() => setQrOpen(true)}>
          QR code
        </Button>
      </div>
      <Modal open={qrOpen} onClose={() => setQrOpen(false)} title={`Sala ${code}`} description="Aponte a câmera do celular para entrar na sala." size="sm">
        <div className="flex flex-col items-center gap-3 pb-2">
          <div className="rounded-2xl bg-[#ffffff] p-4">
            <QRCodeSVG value={link} size={224} bgColor="#ffffff" fgColor="#1c130d" level="M" title={`QR code da sala ${code}`} />
          </div>
          <p className="break-all text-center text-xs text-muted">{link}</p>
        </div>
      </Modal>
    </Card>
  );
}
