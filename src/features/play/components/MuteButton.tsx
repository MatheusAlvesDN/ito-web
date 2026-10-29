// MuteButton: liga/desliga os sons (audioService, salvo no aparelho).
import { useState } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { audioService } from '../../../utils/audioService';
import { IconButton } from '../../../ui';

export function MuteButton() {
  const [muted, setMuted] = useState(() => audioService.isMuted());
  return (
    <IconButton
      aria-label={muted ? 'Ligar sons' : 'Desligar sons'}
      title={muted ? 'Ligar sons' : 'Desligar sons'}
      icon={muted ? <VolumeX /> : <Volume2 />}
      onClick={() => {
        const m = audioService.toggleMute();
        setMuted(m);
        if (!m) audioService.playPop();
      }}
    />
  );
}
