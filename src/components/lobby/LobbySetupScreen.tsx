import { useState } from 'react';
import { ChevronLeft, Plus, RefreshCw, LogIn, Wifi } from 'lucide-react';
import type { GameMode } from '../../App';

export const LobbySetupScreen = ({
  onBack,
  playerName,
  setPlayerName,
  isConnecting,
  handleConnect,
}: {
  onBack: () => void;
  playerName: string;
  setPlayerName: (val: string) => void;
  isConnecting: boolean;
  handleConnect: (customIp: string, actionType: 'create' | 'join', joinCode?: string) => void;
  gameMode?: GameMode;
}) => {
  const [roomToJoin, setRoomToJoin] = useState(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      return (params.get('room') || '').toUpperCase().slice(0, 4);
    } catch {
      return '';
    }
  });

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
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Multiplayer Sem Fio</span>
          <h1 className="font-bold text-lg text-slate-800 leading-tight">Configurar Sala</h1>
        </div>
      </div>

      <div 
        className="flex-1 p-6 flex flex-col justify-center max-w-sm mx-auto w-full overflow-y-auto gap-5"
        style={{ paddingBottom: 'max(4rem, calc(2rem + env(safe-area-inset-bottom, 0px)))' }}
      >
        <div className="text-center mb-1">
          <div className="inline-flex p-3 bg-blue-50 text-party-blue rounded-2xl mb-2.5 shadow-sm border border-blue-100/50">
            <Wifi size={28} />
          </div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">Sala Multiplayer</h2>
          <p className="text-slate-500 text-xs mt-1 font-medium">Jogue direto pelo celular de cada amigo conectado na mesma sala.</p>
        </div>

        {/* Card: Seu Apelido */}
        <div className="bg-white p-5 rounded-3xl shadow-card border border-slate-100 space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5 ml-1">
              Seu Nome ou Apelido
            </label>
            <input
              type="text"
              placeholder="Ex: Matheus"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value.slice(0, 14))}
              className="w-full bg-slate-50 border border-slate-200 px-4 py-3 rounded-2xl text-slate-800 font-bold placeholder:text-slate-400 outline-none focus:bg-white focus:border-party-blue focus:ring-2 focus:ring-party-blue/20 transition-all text-sm"
            />
          </div>

          {/* Criar Nova Sala */}
          <button
            onClick={() => handleConnect('', 'create')}
            disabled={!playerName.trim() || isConnecting}
            className="w-full py-4 bg-party-blue hover:bg-party-blueHover disabled:bg-slate-200 disabled:text-slate-400 text-white font-bold text-base rounded-full shadow-[0_8px_20px_rgba(37,99,235,0.25)] disabled:shadow-none transition-all active:scale-[0.98] flex items-center justify-center gap-2"
          >
            {isConnecting ? (
              <RefreshCw size={18} className="animate-spin" />
            ) : (
              <Plus size={18} />
            )}
            <span>Criar Nova Sala</span>
          </button>
        </div>

        {/* Card: Entrar em Sala Existente */}
        <div className="bg-white p-5 rounded-3xl shadow-card border border-slate-100 space-y-3">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5 ml-1">
              Já tem o código? Entrar na Sala
            </label>
            <input
              type="text"
              placeholder="Ex: ABCD"
              value={roomToJoin}
              onChange={(e) => setRoomToJoin(e.target.value.toUpperCase().slice(0, 4))}
              className="w-full bg-slate-50 border border-slate-200 px-4 py-2.5 rounded-2xl text-center text-xl font-black tracking-widest text-slate-800 placeholder:text-slate-300 outline-none focus:bg-white focus:border-party-blue focus:ring-2 focus:ring-party-blue/20 transition-all"
            />
          </div>
          <button
            onClick={() => handleConnect('', 'join', roomToJoin)}
            disabled={!playerName.trim() || roomToJoin.trim().length !== 4 || isConnecting}
            className="w-full py-3.5 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 disabled:bg-slate-50 disabled:text-slate-300 text-slate-700 font-bold text-sm rounded-full transition-all active:scale-[0.98] flex items-center justify-center gap-2 border border-slate-200"
          >
            {isConnecting ? (
              <RefreshCw size={16} className="animate-spin" />
            ) : (
              <LogIn size={16} />
            )}
            <span>Entrar na Sala Existente</span>
          </button>
        </div>
      </div>
    </div>
  );
};
