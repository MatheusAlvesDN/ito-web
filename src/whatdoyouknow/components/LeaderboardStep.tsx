import { ChevronLeft, Trophy, Play } from 'lucide-react';
import { ReactionsOverlay, ReactionsTray } from '../../components/ReactionsOverlay';

type Props = {
  onBack: () => void;
  activePlayers: string[];
  scores: Record<string, number>;
  isMultiplayer: boolean;
  isHost: boolean;
  handleNextRound: () => void;
  getAvatar?: (name: string) => string;
};

export default function LeaderboardStep({
  onBack,
  activePlayers,
  scores,
  isMultiplayer,
  isHost,
  handleNextRound,
  getAvatar
}: Props) {
  const sortedPlayers = [...activePlayers].sort((a, b) => (scores[b] || 0) - (scores[a] || 0));
  const highestScore = scores[sortedPlayers[0]] || 0;

  return (
    <div className="flex-1 flex flex-col bg-[#F5F7FB] text-slate-800 relative h-full overflow-hidden font-sans">
      <ReactionsOverlay />
      <div className="px-6 py-4 flex items-center justify-between bg-[#F5F7FB]/90 border-b border-slate-200/50 backdrop-blur-xl sticky top-0 z-20 pt-safe shrink-0">
        <button onClick={onBack} className="w-10 h-10 flex items-center justify-center rounded-full bg-white shadow-sm border border-slate-100 text-slate-600 hover:text-rose-600 hover:bg-slate-50 transition-colors">
          <ChevronLeft size={22} />
        </button>
        <span className="font-black text-xl text-slate-800 font-outfit">Placar</span>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="flex flex-col items-center mb-8">
          <div className="w-20 h-20 bg-rose-50 rounded-full flex items-center justify-center mb-4 border border-rose-100 shadow-sm text-rose-500">
            <Trophy size={40} />
          </div>
          <h1 className="text-3xl font-black text-slate-800 font-outfit">Ranking</h1>
        </div>

        <div className="space-y-3">
          {sortedPlayers.map((player, index) => {
            const playerScore = scores[player] || 0;
            const isFirstPlace = playerScore > 0 && playerScore === highestScore;
            
            return (
              <div
                key={player}
                className={`flex items-center justify-between p-4 rounded-2xl border-2 transition-all shadow-sm ${isFirstPlace
                  ? 'bg-gradient-to-r from-amber-50 to-yellow-50/50 border-amber-300 shadow-amber-500/10'
                  : 'bg-white border-slate-200/80'
                  }`}
              >
                <div className="flex items-center gap-3.5">
                  <span className={`font-black text-xl font-outfit w-6 text-center ${isFirstPlace ? 'text-amber-500' : 'text-slate-400'}`}>
                    {index + 1}
                  </span>
                  {getAvatar && (
                    <img
                      src={getAvatar(player)}
                      alt={player}
                      className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 p-0.5 object-contain shrink-0"
                    />
                  )}
                  <span className={`font-bold text-lg font-outfit ${isFirstPlace ? 'text-slate-900' : 'text-slate-700'}`}>
                    {player}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200">
                  <span className="font-black text-rose-600 font-outfit">{playerScore}</span>
                  <span className="text-[10px] text-slate-400 uppercase font-bold">pts</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="p-6 bg-white/90 border-t border-slate-200/60 backdrop-blur-md shrink-0 safe-bottom shadow-card z-20">
        {(!isMultiplayer || isHost) ? (
          <button onClick={handleNextRound} className="w-full bg-rose-600 hover:bg-rose-700 text-white font-black text-lg py-4 rounded-2xl shadow-lg shadow-rose-500/20 transition-all active:scale-95 flex items-center justify-center gap-2 font-outfit">
            <span>PRÓXIMA RODADA</span> <Play size={20} />
          </button>
        ) : (
          <div className="w-full bg-slate-100 p-4 rounded-2xl border border-slate-200 text-center flex items-center justify-center gap-3 animate-pulse">
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
            <span className="text-xs text-slate-500 font-black uppercase tracking-wider font-outfit">Aguardando líder iniciar nova rodada...</span>
          </div>
        )}
      </div>
      {isMultiplayer && (
        <div className="absolute bottom-28 left-0 right-0 flex justify-center z-45 pointer-events-none">
          <ReactionsTray />
        </div>
      )}
    </div>
  );
}
