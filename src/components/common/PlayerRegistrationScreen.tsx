import { useState, useEffect } from 'react';
import { ChevronLeft, Plus, Trash2, Users, X, ArrowRight, Pencil } from 'lucide-react';
import { toast } from 'sonner';
import { TagChip } from './TagChip';
import { AvatarPickerModal } from './AvatarPickerModal';
import {
  getAvatarUrl,
  getPlayerAvatar,
  savePlayerAvatar,
  getSavedAvatars,
} from '../../utils/avatarService';

export type AccentColor = 'yellow' | 'purple' | 'emerald' | 'rose';

interface Props {
  title: string;
  onBack: () => void;
  onNext: (players: string[]) => void;
  accentColor?: AccentColor;
  minPlayers?: number;
  storageKey?: string;
}

export function PlayerRegistrationScreen({
  title,
  onBack,
  onNext,
  minPlayers = 2,
  storageKey = 'ito_saved_players',
}: Props) {
  const [inputValue, setInputValue] = useState('');
  const [localPlayers, setLocalPlayers] = useState<string[]>([]);
  const [savedHistory, setSavedHistory] = useState<string[]>([]);
  const [playerAvatars, setPlayerAvatars] = useState<Record<string, string>>(() => getSavedAvatars());
  const [avatarModalTarget, setAvatarModalTarget] = useState<{ name: string; avatar: string } | null>(null);

  // Carrega jogadores do localStorage ao montar o componente
  useEffect(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        setSavedHistory(JSON.parse(saved));
      } catch {}
    }
    setPlayerAvatars(getSavedAvatars());
  }, [storageKey]);

  const addPlayer = () => {
    const v = inputValue.trim();
    if (!v) return;
    if (localPlayers.includes(v)) return;
    setLocalPlayers((prev) => [...prev, v]);
    setInputValue('');
  };

  const removePlayer = (index: number) => {
    setLocalPlayers((prev) => prev.filter((_, i) => i !== index));
  };

  const togglePlayerFromHistory = (player: string) => {
    if (localPlayers.includes(player)) {
      setLocalPlayers((prev) => prev.filter((p) => p !== player));
    } else {
      setLocalPlayers((prev) => [...prev, player]);
    }
  };

  const deleteFromHistory = (player: string) => {
    const updatedHistory = savedHistory.filter((p) => p !== player);
    setSavedHistory(updatedHistory);
    localStorage.setItem(storageKey, JSON.stringify(updatedHistory));
  };

  const handleOpenAvatarModal = (playerName: string) => {
    const current = playerAvatars[playerName] || getPlayerAvatar(playerName);
    setAvatarModalTarget({ name: playerName, avatar: current });
  };

  const handleSaveAvatar = (newAvatar: string) => {
    if (avatarModalTarget) {
      const playerName = avatarModalTarget.name;
      savePlayerAvatar(playerName, newAvatar);
      setPlayerAvatars((prev) => ({ ...prev, [playerName]: newAvatar }));
      toast.success(`Avatar de ${playerName} atualizado!`);
    }
  };

  const handleNext = () => {
    const newHistory = Array.from(new Set([...savedHistory, ...localPlayers]));
    localStorage.setItem(storageKey, JSON.stringify(newHistory));
    onNext(localPlayers);
  };

  return (
    <div className="flex-1 flex flex-col bg-[#F5F7FB] relative h-full overflow-hidden text-slate-800 font-sans">
      {/* Header Fixo */}
      <div className="px-6 py-4 flex items-center justify-between bg-[#F5F7FB]/90 border-b border-slate-200/50 backdrop-blur-xl sticky top-0 z-20 pt-safe shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            aria-label="Voltar"
            className="w-10 h-10 flex items-center justify-center rounded-full bg-white shadow-sm border border-slate-100 text-slate-600 hover:text-party-blue hover:bg-slate-50 transition-colors"
          >
            <ChevronLeft size={22} />
          </button>
          <div>
            <h1 className="font-bold text-lg text-slate-800 leading-tight">{title}</h1>
            <p className="text-xs text-slate-500 font-medium">Quem vai entrar na roda?</p>
          </div>
        </div>

        <TagChip 
          label={`${localPlayers.length} / mín ${minPlayers}`} 
          variant={localPlayers.length >= minPlayers ? 'success' : 'warning'} 
        />
      </div>

      {/* Área Central Rolável */}
      <div 
        className="flex-1 p-6 flex flex-col max-w-md mx-auto w-full overflow-y-auto"
        style={{ paddingBottom: 'max(7.5rem, calc(6.5rem + env(safe-area-inset-bottom, 0px)))' }}
      >
        {/* Input Card */}
        <div className="bg-white p-5 rounded-3xl shadow-card border border-slate-100 mb-6 shrink-0 animate-fade-in">
          <label className="block text-slate-500 font-bold mb-2 ml-1 text-xs uppercase tracking-wider">
            Adicionar Jogador
          </label>
          <div className="flex gap-2">
            <input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addPlayer()}
              placeholder="Digite o nome do amigo..."
              className="flex-1 bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3.5 text-slate-800 placeholder:text-slate-400 font-medium focus:bg-white focus:border-party-blue focus:ring-2 focus:ring-party-blue/20 outline-none transition-all duration-200 text-sm"
            />
            <button
              onClick={addPlayer}
              disabled={!inputValue.trim()}
              aria-label="Adicionar jogador"
              className="bg-party-blue hover:bg-party-blueHover disabled:bg-slate-100 disabled:text-slate-300 text-white font-bold rounded-2xl px-4 py-3.5 shadow-sm active:scale-95 disabled:scale-100 transition-all duration-150 flex items-center justify-center shrink-0"
            >
              <Plus size={22} />
            </button>
          </div>
        </div>

        {/* Jogadores Salvos / Histórico */}
        {savedHistory.length > 0 && (
          <div className="mb-6 shrink-0 animate-fade-in">
            <span className="block text-slate-400 font-bold mb-2.5 ml-1 text-[11px] uppercase tracking-wider">
              Adicionar do Histórico
            </span>
            <div className="flex flex-wrap gap-2 max-h-36 overflow-y-auto pr-1 pb-1">
              {savedHistory.map((player) => {
                const isSelected = localPlayers.includes(player);
                const avatar = playerAvatars[player] || getPlayerAvatar(player);
                return (
                  <div
                    key={`history-${player}`}
                    onClick={() => togglePlayerFromHistory(player)}
                    className={`flex items-center gap-1.5 pl-1.5 pr-2.5 py-1 rounded-full border text-xs font-bold transition-all duration-200 cursor-pointer select-none active:scale-95 ${
                      isSelected
                        ? 'bg-party-blue text-white border-party-blue shadow-sm'
                        : 'bg-white border-slate-200 text-slate-700 hover:border-party-blue/50 hover:text-party-blue shadow-xs'
                    }`}
                  >
                    <div className="w-5 h-5 rounded-full overflow-hidden bg-slate-100 shrink-0 border border-slate-200/50">
                      <img src={getAvatarUrl(avatar)} alt="" className="w-full h-full object-cover" />
                    </div>
                    <span>{player}</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteFromHistory(player);
                      }}
                      aria-label="Remover do histórico"
                      className={`p-0.5 rounded-full transition-colors ${
                        isSelected ? 'hover:bg-blue-600 text-white/80' : 'hover:bg-slate-100 text-slate-400'
                      }`}
                      title="Remover do histórico"
                    >
                      <X size={12} />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Lista de Jogadores */}
        <div className="flex-1 space-y-2.5">
          <div className="flex items-center justify-between ml-1 mb-1">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Jogadores na Partida ({localPlayers.length})
            </span>
            {localPlayers.length > 0 && (
              <button 
                onClick={() => setLocalPlayers([])}
                className="text-xs text-red-500 font-medium hover:underline"
              >
                Limpar todos
              </button>
            )}
          </div>

          {localPlayers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center bg-white/60 border border-dashed border-slate-200 rounded-3xl animate-fade-in">
              <div className="w-14 h-14 bg-blue-50 text-party-blue rounded-2xl flex items-center justify-center mb-3">
                <Users size={28} />
              </div>
              <p className="font-bold text-slate-700 text-base">
                Nenhum jogador ainda
              </p>
              <p className="text-xs text-slate-400 mt-1 max-w-[220px]">
                Adicione pelo menos {minPlayers} amigos para iniciar a partida!
              </p>
            </div>
          ) : (
            localPlayers.map((player, index) => {
              const currentAvatar = playerAvatars[player] || getPlayerAvatar(player);
              return (
                <div
                  key={`${player}-${index}`}
                  className="flex items-center justify-between bg-white p-3.5 rounded-2xl shadow-card border border-slate-100 hover:border-slate-200 transition-all duration-200 animate-fade-in"
                >
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => handleOpenAvatarModal(player)}
                      className="group relative w-11 h-11 rounded-full overflow-hidden bg-slate-100 border-2 border-slate-200 hover:border-party-blue transition-all active:scale-90 shrink-0 shadow-xs cursor-pointer focus:outline-none focus:ring-2 focus:ring-party-blue/30"
                      title="Toque para trocar o avatar"
                      aria-label={`Trocar avatar de ${player}`}
                    >
                      <img 
                        src={getAvatarUrl(currentAvatar)} 
                        alt={player}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                      <div className="absolute inset-0 bg-slate-900/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                        <Pencil size={13} className="text-white drop-shadow-sm" />
                      </div>
                      <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-party-blue text-white rounded-full flex items-center justify-center border border-white shadow-xs">
                        <Pencil size={8} strokeWidth={3} />
                      </span>
                    </button>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-slate-800 text-sm">{player}</span>
                        <button
                          type="button"
                          onClick={() => handleOpenAvatarModal(player)}
                          className="text-[10px] text-party-blue font-semibold hover:underline"
                        >
                          trocar
                        </button>
                      </div>
                      <span className="block text-[11px] text-slate-400 font-medium">#{index + 1}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => removePlayer(index)}
                    aria-label="Remover jogador"
                    className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all duration-150"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Modal de Escolha de Avatar */}
      <AvatarPickerModal
        isOpen={Boolean(avatarModalTarget)}
        onClose={() => setAvatarModalTarget(null)}
        currentAvatar={avatarModalTarget?.avatar || ''}
        playerName={avatarModalTarget?.name}
        onSave={handleSaveAvatar}
      />

      {/* Rodapé Fixo com Safe Area */}
      <div 
        className="fixed bottom-0 left-0 w-full bg-white/95 backdrop-blur-xl border-t border-slate-200 px-6 pt-3 z-50 shadow-[0_-4px_20px_rgba(0,0,0,0.03)] pb-safe-bottom"
        style={{ paddingBottom: 'max(1.25rem, calc(0.75rem + env(safe-area-inset-bottom, 0px)))' }}
      >
        <div className="max-w-md mx-auto w-full">
          <button
            onClick={handleNext}
            disabled={localPlayers.length < minPlayers}
            className="w-full bg-party-blue hover:bg-party-blueHover disabled:bg-slate-200 disabled:text-slate-400 text-white font-bold text-base py-4 rounded-full shadow-[0_8px_20px_rgba(37,99,235,0.25)] disabled:shadow-none transition-all duration-150 active:scale-95 flex items-center justify-center gap-2"
          >
            <span>Continuar para Temas</span>
            <ArrowRight size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}
