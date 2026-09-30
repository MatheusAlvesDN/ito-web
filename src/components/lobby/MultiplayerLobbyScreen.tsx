import { useState } from 'react';
import { ChevronLeft, Copy, Users, Crown, ArrowRight, Share2, QrCode, X, Sparkles, Zap, Ghost, ScanFace, HelpCircle } from 'lucide-react';
import { toast } from 'sonner';
import type { GameMode } from '../../App';
import { TagChip } from '../common/TagChip';

const AVAILABLE_MODES: {
  id: GameMode;
  title: string;
  subtitle: string;
  minPlayers: number;
  tag: string;
  iconBg: string;
  activeBorder: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
}[] = [
  {
    id: 'classic',
    title: 'ITO Clássico',
    subtitle: 'Ordene números em equipe',
    minPlayers: 2,
    tag: 'Coop',
    iconBg: 'bg-blue-50 text-party-blue',
    activeBorder: 'border-party-blue ring-2 ring-party-blue/20 bg-blue-50/40',
    icon: Zap,
  },
  {
    id: 'impostor',
    title: 'Impostor',
    subtitle: 'Descubra quem não sabe o tema',
    minPlayers: 3,
    tag: 'Bluff',
    iconBg: 'bg-purple-50 text-purple-600',
    activeBorder: 'border-purple-500 ring-2 ring-purple-500/20 bg-purple-50/40',
    icon: Ghost,
  },
  {
    id: 'whoami',
    title: 'Quem Sou Eu?',
    subtitle: 'Adivinhe seu personagem',
    minPlayers: 2,
    tag: 'Casual',
    iconBg: 'bg-orange-50 text-orange-500',
    activeBorder: 'border-orange-500 ring-2 ring-orange-500/20 bg-orange-50/40',
    icon: ScanFace,
  },
  {
    id: 'whatdoyouknow',
    title: 'O Que Você Sabe?',
    subtitle: 'Adivinhe a resposta do amigo',
    minPlayers: 3,
    tag: 'Party',
    iconBg: 'bg-emerald-50 text-emerald-600',
    activeBorder: 'border-emerald-500 ring-2 ring-emerald-500/20 bg-emerald-50/40',
    icon: HelpCircle,
  },
];

export const MultiplayerLobbyScreen = ({
  onBack,
  roomCode,
  isHost,
  connectedPlayers,
  onStartGame,
  gameMode,
  onSelectGameMode,
}: {
  onBack: () => void;
  roomCode: string;
  isHost: boolean;
  connectedPlayers: { id: string; name: string }[];
  onStartGame: () => void;
  gameMode: GameMode;
  onSelectGameMode?: (mode: GameMode) => void;
}) => {
  const [copied, setCopied] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);

  const selectedModeConfig = AVAILABLE_MODES.find(m => m.id === gameMode) || AVAILABLE_MODES[0];
  const minRequired = selectedModeConfig.minPlayers;
  const canStart = connectedPlayers.length >= minRequired;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(roomCode);
    setCopied(true);
    toast.success('Código copiado!');
    setTimeout(() => setCopied(false), 2000);
  };

  const shareRoomLink = () => {
    const link = `${window.location.origin}${window.location.pathname}?room=${roomCode}&mode=${gameMode}`;
    if (navigator.share) {
      navigator.share({
        title: 'Junte-se à minha partida no Party Games!',
        text: `Entre na sala ${roomCode} para jogar comigo!`,
        url: link,
      }).catch(err => console.log('Share failed', err));
    } else {
      navigator.clipboard.writeText(link);
      toast.success('Link copiado!');
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-[#F5F7FB] text-slate-800 relative h-full overflow-hidden font-sans">
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
            <h1 className="font-bold text-lg text-slate-800 leading-tight">Lobby Multiplayer</h1>
            <p className="text-xs text-slate-500 font-medium">{connectedPlayers.length} na sala</p>
          </div>
        </div>

        <TagChip label={selectedModeConfig.title} variant="primary" />
      </div>

      {/* Conteúdo Central */}
      <div 
        className="flex-1 overflow-y-auto p-4 md:p-6 flex flex-col gap-4 max-w-sm mx-auto w-full"
        style={{ paddingBottom: 'max(7.5rem, calc(6.5rem + env(safe-area-inset-bottom, 0px)))' }}
      >
        {/* Código Card */}
        <div className="bg-white p-5 rounded-3xl border border-slate-100 text-center shadow-card relative overflow-hidden">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1">
            Código da Sala
          </p>
          <div className="flex items-center justify-center gap-3 my-1">
            <h2 className="text-4xl sm:text-5xl font-black text-slate-800 tracking-wider select-all font-mono">
              {roomCode}
            </h2>
            <button
              onClick={copyToClipboard}
              className="p-2.5 bg-slate-50 hover:bg-blue-50 text-slate-600 hover:text-party-blue border border-slate-100 rounded-xl transition-all active:scale-90"
              title="Copiar código"
            >
              {copied ? (
                <span className="text-[10px] font-bold text-emerald-600">COPIADO</span>
              ) : (
                <Copy size={18} />
              )}
            </button>
          </div>
          <p className="text-xs text-slate-400 font-medium mb-3">Compartilhe o código ou QR Code com seus amigos.</p>
          
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={shareRoomLink}
              className="py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 active:scale-95 transition-all"
            >
              <Share2 size={14} /> Link Convite
            </button>
            <button
              onClick={() => setShowQrModal(true)}
              className="py-2.5 bg-blue-50 hover:bg-blue-100 text-party-blue border border-blue-100 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 active:scale-95 transition-all"
            >
              <QrCode size={14} /> QR Code
            </button>
          </div>
        </div>

        {/* Seletor do Modo de Jogo */}
        <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-card">
          <div className="flex items-center justify-between mb-3 px-1">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <Sparkles size={14} className="text-party-blue" /> Modo de Jogo
            </span>
            {isHost ? (
              <span className="text-[10px] font-bold text-party-blue bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-full">
                Você escolhe
              </span>
            ) : (
              <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                Escolhido pelo Líder
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2">
            {AVAILABLE_MODES.map((m) => {
              const isSelected = gameMode === m.id;
              const IconComponent = m.icon;
              return (
                <button
                  key={m.id}
                  type="button"
                  disabled={!isHost}
                  onClick={() => onSelectGameMode && onSelectGameMode(m.id)}
                  className={`p-3 rounded-2xl border text-left transition-all duration-200 flex flex-col justify-between min-h-[72px] ${
                    isSelected
                      ? `${m.activeBorder} shadow-xs`
                      : 'border-slate-100 bg-slate-50 hover:bg-slate-100/70 opacity-70 hover:opacity-100'
                  } ${isHost ? 'cursor-pointer active:scale-95' : 'cursor-default'}`}
                >
                  <div className="flex items-center justify-between gap-1">
                    <div className="flex items-center gap-1.5">
                      <div className={`p-1.5 rounded-lg ${m.iconBg}`}>
                        <IconComponent size={14} />
                      </div>
                      <span className="font-bold text-xs text-slate-800 leading-tight">
                        {m.title}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-2 text-[10px] text-slate-500 font-medium">
                    <span>Mín. {m.minPlayers}</span>
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-white border border-slate-100 text-slate-600">
                      {m.tag}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Jogadores Conectados */}
        <div className="bg-white rounded-3xl border border-slate-100 shadow-card overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <Users size={14} /> Jogadores Conectados ({connectedPlayers.length})
            </span>
            {isHost && (
              <span className="text-[10px] font-bold text-party-blue bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-full">
                Você é o Líder
              </span>
            )}
          </div>

          <div className="p-3 space-y-2 max-h-[190px] overflow-y-auto">
            {connectedPlayers.map((player, index) => (
              <div
                key={player.id}
                className="flex items-center justify-between p-2.5 rounded-2xl bg-slate-50 border border-slate-100 transition-all"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full overflow-hidden bg-white border border-slate-200 shrink-0">
                    <img 
                      src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${player.name}`} 
                      alt={player.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <span className="font-bold text-sm text-slate-800">{player.name}</span>
                </div>
                {index === 0 ? (
                  <span className="text-[10px] font-bold text-party-orange bg-orange-50 border border-orange-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <Crown size={12} className="fill-orange-400" /> Líder
                  </span>
                ) : (
                  <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                    Conectado
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Barra Inferior com Safe Area */}
      <div 
        className="fixed bottom-0 left-0 w-full bg-white/95 backdrop-blur-xl border-t border-slate-200 px-6 pt-3 z-40 shadow-[0_-4px_20px_rgba(0,0,0,0.03)] pb-safe-bottom"
        style={{ paddingBottom: 'max(1.25rem, calc(0.75rem + env(safe-area-inset-bottom, 0px)))' }}
      >
        <div className="max-w-sm mx-auto w-full">
          {isHost ? (
            <div>
              <button
                onClick={onStartGame}
                disabled={!canStart}
                className="w-full py-4 bg-party-blue hover:bg-party-blueHover disabled:bg-slate-200 disabled:text-slate-400 text-white font-bold text-base rounded-full shadow-[0_8px_20px_rgba(37,99,235,0.25)] disabled:shadow-none transition-all active:scale-[0.98] flex items-center justify-center gap-2"
              >
                <span>Avançar para Temas</span>
                <ArrowRight size={18} />
              </button>
              {!canStart && (
                <p className="text-center text-party-orange text-xs font-bold mt-2">
                  Mínimo de {minRequired} jogadores para iniciar {selectedModeConfig.title}
                </p>
              )}
            </div>
          ) : (
            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-center gap-3">
              <span className="w-2.5 h-2.5 rounded-full bg-party-blue animate-ping" />
              <p className="text-slate-600 text-xs font-bold text-center">
                Aguardando o Líder iniciar a partida...
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Modal QR Code */}
      {showQrModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-6 animate-fade-in">
          <div className="bg-white border border-slate-100 rounded-3xl p-6 max-w-sm w-full text-center relative shadow-2xl">
            <button
              onClick={() => setShowQrModal(false)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-700 rounded-full bg-slate-50 transition-colors"
            >
              <X size={18} />
            </button>
            <p className="text-xs font-bold uppercase text-party-blue tracking-wider mb-1">Entrar na Sala</p>
            <h3 className="text-xl font-bold text-slate-800 mb-4">Aponte a câmera do celular</h3>
            <div className="bg-white p-3 rounded-2xl inline-block border border-slate-100 shadow-sm mx-auto mb-4">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(
                  `${window.location.origin}${window.location.pathname}?room=${roomCode}&mode=${gameMode}`
                )}`}
                alt="QR Code da Sala"
                className="w-48 h-48 mx-auto"
              />
            </div>
            <p className="text-xs text-slate-500 mb-4 font-medium">Ou digite o código <span className="text-slate-900 font-black">{roomCode}</span> no aplicativo.</p>
            <button
              onClick={() => {
                shareRoomLink();
                setShowQrModal(false);
              }}
              className="w-full py-3 bg-party-blue hover:bg-party-blueHover text-white font-bold text-xs rounded-full shadow-sm"
            >
              Copiar Link Direto
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
