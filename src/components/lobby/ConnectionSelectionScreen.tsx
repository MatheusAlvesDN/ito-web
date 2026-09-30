import { ChevronLeft, Smartphone, Wifi, ChevronRight } from 'lucide-react';
import type { GameMode } from '../../App';
import { TagChip } from '../common/TagChip';

export const ConnectionSelectionScreen = ({
  onBack,
  onSelectLocal,
  onSelectMultiplayer,
  gameMode,
}: {
  onBack: () => void;
  onSelectLocal: () => void;
  onSelectMultiplayer: () => void;
  gameMode?: GameMode;
}) => {
  const getGameLabel = () => {
    switch (gameMode) {
      case 'classic': return 'ITO Clássico';
      case 'impostor': return 'O Impostor';
      case 'whoami': return 'Quem Sou Eu?';
      case 'whatdoyouknow': return 'O Que Você Sabe?';
      default: return 'Partida';
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-[#F5F7FB] relative h-full overflow-hidden text-slate-800 font-sans">
      {/* Header Fixo */}
      <div className="px-6 py-4 flex items-center bg-[#F5F7FB]/90 border-b border-slate-200/50 backdrop-blur-xl sticky top-0 z-20 pt-safe shrink-0">
        <button 
          onClick={onBack} 
          aria-label="Voltar"
          className="w-10 h-10 flex items-center justify-center rounded-full bg-white shadow-sm border border-slate-100 text-slate-600 hover:text-party-blue hover:bg-slate-50 transition-colors"
        >
          <ChevronLeft size={22} />
        </button>
        <div className="ml-3">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">{getGameLabel()}</span>
          <h1 className="font-black text-lg text-slate-800 leading-tight">Escolha a Conexão</h1>
        </div>
      </div>

      <div className="flex-1 p-6 flex flex-col justify-center gap-5 max-w-md mx-auto w-full pb-safe">
        <div className="text-center mb-2">
          <div className="inline-flex p-3 bg-blue-50 text-party-blue rounded-2xl mb-3 shadow-sm border border-blue-100/50">
            <Smartphone size={28} />
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-800 tracking-tight">Como querem jogar?</h2>
          <p className="text-slate-500 mt-1.5 text-sm font-medium">Escolha jogar compartilhando um único celular ou conectando múltiplos aparelhos.</p>
        </div>

        {/* Local: Passa e Joga */}
        <button
          onClick={onSelectLocal}
          className="group relative w-full bg-white p-5 rounded-3xl border border-slate-100 hover:border-party-blue/40 shadow-card hover:shadow-soft transition-all duration-200 transform active:scale-[0.98] text-left"
        >
          <div className="flex items-start gap-4">
            <div className="p-3.5 bg-slate-50 group-hover:bg-blue-50 rounded-2xl text-slate-600 group-hover:text-party-blue transition-colors shrink-0 border border-slate-100">
              <Smartphone size={26} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-lg font-bold text-slate-800">1 Celular</h3>
                <TagChip label="Pass & Play" variant="neutral" />
              </div>
              <p className="text-slate-500 text-xs sm:text-sm font-medium leading-relaxed">
                Todos jogam na mesma tela, passando o aparelho a cada turno. Perfeito para qualquer lugar!
              </p>
            </div>
            <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-party-blue transition-colors shrink-0 self-center" />
          </div>
        </button>

        {/* Multiplayer: Vários Celulares */}
        <button
          onClick={onSelectMultiplayer}
          className="group relative w-full bg-white p-5 rounded-3xl border-2 border-party-blue/20 hover:border-party-blue shadow-card hover:shadow-soft transition-all duration-200 transform active:scale-[0.98] text-left overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-36 h-36 bg-blue-500/5 rounded-full blur-2xl pointer-events-none" />
          <div className="flex items-start gap-4 relative z-10">
            <div className="p-3.5 bg-blue-50 group-hover:bg-party-blue rounded-2xl text-party-blue group-hover:text-white transition-colors shrink-0 border border-blue-100">
              <Wifi size={26} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-lg font-bold text-slate-800">Vários Celulares</h3>
                <TagChip label="Sem Fio / Wi-Fi" variant="primary" />
              </div>
              <p className="text-slate-500 text-xs sm:text-sm font-medium leading-relaxed">
                Cada um usa seu próprio celular sincronizado em tempo real. Não precisa instalar nada!
              </p>
            </div>
            <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-party-blue transition-colors shrink-0 self-center" />
          </div>
        </button>
      </div>
    </div>
  );
};
