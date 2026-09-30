import { RefreshCw } from 'lucide-react';
import type { AccentColor } from './PlayerRegistrationScreen';

interface Props {
  title?: string;
  message?: string;
  accentColor?: AccentColor;
}

export function SyncWaitingScreen({
  title = 'Sincronizando Temas...',
  message = 'O líder da sala está configurando os temas do jogo. Prepare-se!',
}: Props) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 bg-[#F5F7FB] text-center text-slate-800 font-sans relative overflow-hidden h-full">
      <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/5 rounded-full blur-[120px] pointer-events-none" />
      
      <div className="mb-6 relative">
        <div className="absolute inset-0 bg-blue-500/10 blur-xl rounded-full" />
        <div
          className="bg-white border border-slate-100 p-6 rounded-3xl shadow-card relative z-10 animate-spin"
          style={{ animationDuration: '3s' }}
        >
          <RefreshCw size={44} className="text-party-blue" />
        </div>
      </div>
      
      <h2 className="text-2xl font-black text-slate-800 mb-2">{title}</h2>
      <p className="text-slate-500 max-w-xs text-sm font-medium leading-relaxed">
        {message}
      </p>
    </div>
  );
}
