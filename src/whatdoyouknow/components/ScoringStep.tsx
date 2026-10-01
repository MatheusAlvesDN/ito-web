import { ChevronLeft, CheckCircle } from 'lucide-react';

type Props = {
  onBack: () => void;
  targetPlayer: string;
  isMultiplayer: boolean;
  isHost: boolean;
  guessingPlayers: string[];
  selectedWinners: Set<string>;
  toggleWinner: (playerName: string) => void;
  handleConfirmScores: () => void;
};

export default function ScoringStep({
  onBack,
  targetPlayer,
  isMultiplayer,
  isHost,
  guessingPlayers,
  selectedWinners,
  toggleWinner,
  handleConfirmScores
}: Props) {
  return (
    <div className="flex-1 flex flex-col bg-[#F5F7FB] text-slate-800 relative h-full overflow-hidden font-sans">
      <div className="px-6 py-4 flex items-center justify-between bg-[#F5F7FB]/90 border-b border-slate-200/50 backdrop-blur-xl sticky top-0 z-20 pt-safe shrink-0">
        <button onClick={onBack} className="w-10 h-10 flex items-center justify-center rounded-full bg-white shadow-sm border border-slate-100 text-slate-600 hover:text-rose-600 hover:bg-slate-50 transition-colors">
          <ChevronLeft size={22} />
        </button>
        <span className="font-black text-xl text-slate-800 font-outfit">Pontuação</span>
      </div>

      <div className="flex-1 flex flex-col p-6 overflow-y-auto">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-black text-slate-800 font-outfit mb-2">Quem Acertou?</h1>
          <p className="text-sm text-slate-500 font-medium">
            Marque todos os jogadores que acertaram a resposta de <strong className="text-rose-600">{targetPlayer}</strong>.
          </p>
        </div>

        {(!isMultiplayer || isHost) ? (
          <div className="space-y-3 mb-6">
            {guessingPlayers.map((player) => {
              const isWinner = selectedWinners.has(player);
              return (
                <div
                  key={player}
                  onClick={() => toggleWinner(player)}
                  className={`flex items-center justify-between p-4 rounded-2xl border-2 transition-all cursor-pointer overflow-hidden relative shadow-sm ${isWinner
                    ? 'bg-rose-50 border-rose-500 text-rose-700 shadow-rose-500/10'
                    : 'bg-white border-slate-200/80 hover:border-rose-300 text-slate-800'
                    }`}
                >
                  <span className={`font-bold text-lg font-outfit relative z-10 ${isWinner ? 'text-rose-700' : 'text-slate-800'}`}>
                    {player}
                  </span>
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center transition-all border-2 relative z-10 ${isWinner ? 'bg-rose-500 border-rose-500 text-white scale-110 shadow-sm' : 'border-slate-300 text-transparent'
                    }`}>
                    <CheckCircle size={18} strokeWidth={2.5} />
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center">
            <div className="bg-white p-8 rounded-3xl border border-slate-200/80 text-center shadow-card animate-pulse max-w-sm">
              <CheckCircle size={48} className="text-rose-500 mx-auto mb-4" />
              <h3 className="text-lg font-bold font-outfit text-slate-800 mb-2">Aguardando Avaliação</h3>
              <p className="text-sm text-slate-500">O líder está registrando quem acertou a resposta.</p>
            </div>
          </div>
        )}
      </div>

      <div className="p-6 bg-white/90 border-t border-slate-200/60 backdrop-blur-md shrink-0 safe-bottom shadow-card z-20">
        {(!isMultiplayer || isHost) && (
          <button onClick={handleConfirmScores} className="w-full bg-rose-600 hover:bg-rose-700 text-white font-black text-lg py-4 rounded-2xl shadow-lg shadow-rose-500/20 transition-all active:scale-95 flex items-center justify-center gap-2 font-outfit">
            <span>CONFIRMAR PONTOS</span> <CheckCircle size={20} />
          </button>
        )}
      </div>
    </div>
  );
}
