import { useState, useEffect } from 'react';
import {
  ChevronLeft,
  EyeOff,
  Ghost,
  Users,
  RefreshCw,
  MessageCircle,
  AlertTriangle,
  ArrowRight,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { type Theme, IMPOSTOR_SCENARIOS, type ImpostorScenario } from './data';
import { syncService, triggerVibration } from '../utils/syncService';
import { audioService } from '../utils/audioService';
import { ReactionsOverlay, ReactionsTray } from '../components/ReactionsOverlay';

type GameStep = 'distribution' | 'discussion' | 'reveal';

type Props = {
  onBack: () => void;
  players: string[];
  themes: Theme[];
  isMultiplayer?: boolean;
  isHost?: boolean;
  syncGameState?: any;
  playerId?: string;
  connectedPlayers?: { id: string; name: string }[];
  isMuted: boolean;
  toggleMute: () => void;
};

export default function GameScreenImpostor({
  onBack,
  players,
  themes,
  isMultiplayer = false,
  isHost = false,
  syncGameState = null,
  playerId = '',
  connectedPlayers = [],
  isMuted,
  toggleMute,
}: Props) {
  // --- ESTADOS LOCAIS ---
  const [localStep, setLocalStep] = useState<GameStep>('distribution');
  const [roundKey, setRoundKey] = useState(0);

  const [localImpostorIndex, setLocalImpostorIndex] = useState<number>(-1);
  const [localHonestQuestion, setLocalHonestQuestion] = useState<string>('');
  const [localImpostorQuestion, setLocalImpostorQuestion] = useState<string>('');
  const [localRedemptionStatus, setLocalRedemptionStatus] = useState<'pending' | 'impostor_won' | 'group_won'>('pending');
  
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0);
  const [isCardRevealed, setIsCardRevealed] = useState(false);

  // --- ESTADOS DERIVADOS MULTIPLAYER ---
  const step = isMultiplayer ? (syncGameState?.step || 'distribution') : localStep;
  const honestQuestion = isMultiplayer ? (syncGameState?.honestQuestion || '') : localHonestQuestion;
  const impostorQuestion = isMultiplayer ? (syncGameState?.impostorQuestion || '') : localImpostorQuestion;
  const impostorPlayerId = isMultiplayer ? (syncGameState?.impostorPlayerId || '') : '';
  const viewedPlayers = isMultiplayer ? (syncGameState?.viewedPlayers || []) : [];
  const redemptionStatus = isMultiplayer ? (syncGameState?.redemptionStatus || 'pending') : localRedemptionStatus;

  // --- TIMER STATE & EFFECTS ---
  const [timeLeft, setTimeLeft] = useState(120);
  const [timerActive, setTimerActive] = useState(true);

  useEffect(() => {
    if (step === 'discussion') {
      setTimeLeft(120);
      setTimerActive(true);
    }
  }, [step]);

  useEffect(() => {
    if (step !== 'discussion' || !timerActive || timeLeft <= 0) return;
    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          audioService.playFail();
          triggerVibration([200, 100, 200, 100, 400]); // Alarme vibratório!
          clearInterval(interval);
          return 0;
        }
        if (prev <= 10 && prev > 5) {
          audioService.playHeartbeat();
          triggerVibration(40);
        } else if (prev <= 5) {
          audioService.playTick();
          triggerVibration(60);
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [step, timerActive, timeLeft]);

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const s = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // --- LÓGICA DE INICIALIZAÇÃO ---

  const getScenarios = () => {
    let pool: ImpostorScenario[] = [...IMPOSTOR_SCENARIOS['default']];
    
    themes.forEach((t) => {
      if (t.id.startsWith('custom_theme_')) {
        try {
          const saved = localStorage.getItem('impostor_custom_scenarios_' + t.id);
          if (saved) {
            pool = [...pool, ...JSON.parse(saved)];
          }
        } catch (err) {
          console.error(err);
        }
      } else if (IMPOSTOR_SCENARIOS[t.id]) {
        pool = [...pool, ...IMPOSTOR_SCENARIOS[t.id]];
      }
    });
    return pool;
  };

  const setupRound = () => {
    if (players.length < 3) return;

    // 1. Sortear Impostor
    const newImpostorIndex = Math.floor(Math.random() * players.length);
    setLocalImpostorIndex(newImpostorIndex);

    // 2. Sortear Perguntas do Data.ts
    const scenarios = getScenarios();
    
    if (scenarios.length === 0) {
       setLocalHonestQuestion('Erro: Sem perguntas');
       setLocalImpostorQuestion('Erro');
       return;
    }

    const randomScenario = scenarios[Math.floor(Math.random() * scenarios.length)];
    
    const honestQ = randomScenario.honest;
    const impostorQ = randomScenario.impostorVariations[
      Math.floor(Math.random() * randomScenario.impostorVariations.length)
    ];

    setLocalHonestQuestion(honestQ);
    setLocalImpostorQuestion(impostorQ);

    // 3. Resetar estados
    setLocalStep('distribution');
    setCurrentPlayerIndex(0);
    setIsCardRevealed(false);
    setLocalRedemptionStatus('pending');
  };

  const setupMultiplayerRound = () => {
    if (!connectedPlayers || connectedPlayers.length < 3) return;

    // 1. Sortear Impostor por ID
    const randomPlayer = connectedPlayers[Math.floor(Math.random() * connectedPlayers.length)];
    const impostorId = randomPlayer.id;

    // 2. Sortear Perguntas
    const scenarios = getScenarios();
    if (scenarios.length === 0) return;

    const randomScenario = scenarios[Math.floor(Math.random() * scenarios.length)];
    const honestQ = randomScenario.honest;
    const impostorQ = randomScenario.impostorVariations[
      Math.floor(Math.random() * randomScenario.impostorVariations.length)
    ];

    // Reset local reveals
    setIsCardRevealed(false);

    // 3. Enviar estado sincronizado
    syncService.syncState({
      phase: 'game',
      step: 'distribution',
      impostorPlayerId: impostorId,
      honestQuestion: honestQ,
      impostorQuestion: impostorQ,
      viewedPlayers: [],
      redemptionStatus: 'pending'
    });
  };

  useEffect(() => {
    if (!isMultiplayer) {
      setupRound();
    }
  }, [roundKey]);

  useEffect(() => {
    if (isMultiplayer && isHost && syncGameState?.phase === 'setup') {
      setupMultiplayerRound();
    }
  }, [isHost, isMultiplayer, syncGameState?.phase, syncGameState?.roundKey]);

  // --- HANDLERS ---

  const handleNextPlayer = () => {
    audioService.playFlip();
    setIsCardRevealed(false);
    if (currentPlayerIndex < players.length - 1) {
      setCurrentPlayerIndex((prev) => prev + 1);
    } else {
      setLocalStep('discussion');
    }
  };

  const handleNewRound = () => {
    audioService.playFlip();
    setRoundKey((k) => k + 1);
  };

  // --- RENDER ---
  
  if (!isMultiplayer && players.length < 3) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 bg-slate-950 text-center text-slate-100 font-sans h-full">
        <div className="bg-red-950/20 border-2 border-red-500/20 p-6 rounded-full mb-4">
          <AlertTriangle size={48} className="text-red-555 animate-bounce" />
        </div>
        <h2 className="text-2xl font-black text-white mb-2 font-outfit">Jogadores Insuficientes</h2>
        <p className="text-slate-400 mb-6 text-sm font-medium">O modo Impostor precisa de no mínimo 3 pessoas.</p>
        <button onClick={onBack} className="bg-slate-900 border border-white/5 text-white px-6 py-3 rounded-2xl font-bold font-outfit active:scale-95 transition-all">Voltar</button>
      </div>
    );
  }

  // FASE 1: DISTRIBUIÇÃO
  if (step === 'distribution') {
    const currentPlayerName = isMultiplayer 
      ? (connectedPlayers.find(p => p.id === playerId)?.name || '') 
      : players[currentPlayerIndex];
      
    const isImpostor = isMultiplayer 
      ? playerId === impostorPlayerId 
      : currentPlayerIndex === localImpostorIndex;
      
    const questionToShow = isImpostor ? impostorQuestion : honestQuestion;

    const handleRevealCard = () => {
      audioService.playFlip();
      setIsCardRevealed(true);
      
      // Haptic Feedback: batimento cardíaco duplo se for Impostor, vibração simples se for honesto
      if (isImpostor) {
        triggerVibration([100, 80, 100, 300]);
      } else {
        triggerVibration(100);
      }

      if (isMultiplayer) {
        const currentViewed = syncGameState?.viewedPlayers || [];
        if (!currentViewed.includes(playerId)) {
          syncService.syncState({
            viewedPlayers: [...currentViewed, playerId]
          });
        }
      }
    };

    return (
      <div className="flex-1 flex flex-col bg-[#F5F7FB] text-slate-800 relative h-full overflow-hidden font-sans">
        <ReactionsOverlay />
        {/* Header Fixo */}
        <div className="px-6 py-4 flex items-center justify-between bg-[#F5F7FB]/90 border-b border-slate-200/50 backdrop-blur-xl sticky top-0 z-20 pt-safe shrink-0">
          <div className="flex items-center gap-2">
            <button onClick={onBack} className="w-10 h-10 flex items-center justify-center rounded-full bg-white shadow-sm border border-slate-100 text-slate-600 hover:text-purple-600 hover:bg-slate-50 transition-colors">
              <ChevronLeft size={22} />
            </button>
            <button 
              onClick={toggleMute}
              className="w-10 h-10 flex items-center justify-center rounded-full bg-white shadow-sm border border-slate-100 text-slate-600 hover:bg-slate-50 transition-colors"
            >
              {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
            </button>
          </div>
          <div className="flex flex-col items-end">
             <span className="text-purple-600 text-[10px] font-black uppercase tracking-widest font-outfit">Distribuição</span>
             <span className="text-slate-800 text-xs font-bold font-outfit">
               {isMultiplayer 
                 ? `${viewedPlayers.length} de ${connectedPlayers.length} Viram` 
                 : `${currentPlayerIndex + 1} de ${players.length}`}
             </span>
          </div>
        </div>

        {/* Área Central Rolável */}
        <div className="flex-1 flex flex-col p-6 items-center justify-center overflow-y-auto">
          <div className="mb-6 text-center animate-fade-in">
            {isMultiplayer ? (
              <>
                <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-2 font-outfit">Seu Apelido</p>
                <h1 className="text-3xl font-black text-slate-800 font-outfit">{currentPlayerName}</h1>
              </>
            ) : (
              <>
                <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-2 font-outfit">Passe o celular para</p>
                <h1 className="text-3xl sm:text-4xl font-black text-slate-800 font-outfit">{currentPlayerName}</h1>
              </>
            )}
          </div>

          <div className="w-full max-w-[280px] aspect-[3/4.2] relative perspective-1000">
            <div className={`w-full h-full relative transition-all duration-500 transform-style-3d bg-white rounded-3xl border-2 shadow-card ${
                isCardRevealed 
                  ? (isImpostor ? 'border-purple-400 shadow-purple-500/20' : 'border-amber-400 shadow-amber-500/20') 
                  : 'border-slate-200/80 shadow-soft'
              }`}>
              {!isCardRevealed ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
                  <div className="bg-purple-50 border border-purple-100 p-5 rounded-full mb-6 animate-pulse text-purple-600">
                    <EyeOff size={48} />
                  </div>
                  <h3 className="text-xl font-black text-slate-800 mb-2 font-outfit">Toque para ver</h3>
                  <p className="text-xs text-slate-500 leading-relaxed font-medium">Garanta que ninguém mais está olhando!</p>
                  <button onClick={handleRevealCard} className="absolute inset-0 w-full h-full z-10" />
                </div>
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center animate-fade-in bg-white rounded-3xl overflow-hidden">
                   <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-[0.03] pointer-events-none text-slate-800">
                      {isImpostor ? <Ghost size={260} /> : <Users size={260} />}
                   </div>
                   <div className="z-10 relative flex flex-col items-center h-full justify-between py-2">
                      <div className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-wider font-outfit ${
                        isImpostor ? 'bg-purple-50 border border-purple-200 text-purple-700' : 'bg-amber-50 border border-amber-200 text-amber-800'
                      }`}>
                        {isImpostor ? <><Ghost size={14}/> Seu Papel</> : <><Users size={14}/> Seu Papel</>}
                      </div>
                      
                      <div className="my-auto">
                        <h2 className="text-2xl sm:text-3xl font-black text-slate-800 leading-tight mb-4 font-outfit">{questionToShow}</h2>
                        {isImpostor ? (
                           <p className="text-purple-900 text-xs sm:text-sm font-medium bg-purple-50 p-4 rounded-2xl border border-purple-100">
                             Você é o Impostor! Finja que sabe do que eles estão falando e misture-se.
                           </p>
                        ) : (
                           <p className="text-amber-900 text-xs sm:text-sm font-medium bg-amber-50 p-4 rounded-2xl border border-amber-100">
                             Você faz parte do grupo honesto. Descubra quem tem uma pergunta diferente.
                           </p>
                        )}
                      </div>
                   </div>
                   <button onClick={() => setIsCardRevealed(false)} className="absolute bottom-5 left-5 right-5 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-2xl transition-colors flex items-center justify-center gap-1.5 z-20 text-sm font-outfit">
                     <EyeOff size={18} /> Esconder Papel
                   </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Rodapé Fixo */}
        {(!isCardRevealed || isMultiplayer) && (
          <div className="p-6 bg-white/90 border-t border-slate-200/60 backdrop-blur-md shrink-0 safe-bottom shadow-card">
             {isMultiplayer ? (
               isHost ? (
                 <button
                   onClick={() => syncService.syncState({ step: 'discussion' })}
                   className="w-full bg-purple-600 hover:bg-purple-700 text-white font-black text-lg py-4 rounded-2xl shadow-lg shadow-purple-500/20 transition-all active:scale-95 flex items-center justify-center gap-2 font-outfit"
                 >
                   <span>INICIAR DISCUSSÃO</span> <MessageCircle size={20} />
                 </button>
               ) : (
                 <div className="w-full bg-slate-100 p-4 rounded-2xl border border-slate-200 text-center flex items-center justify-center gap-3 animate-pulse">
                   <span className="w-2 h-2 rounded-full bg-purple-500 animate-ping" />
                   <span className="text-xs text-slate-500 font-black uppercase tracking-wider font-outfit">Aguardando líder iniciar debate...</span>
                 </div>
               )
             ) : (
               <button onClick={handleNextPlayer} className="w-full bg-purple-600 hover:bg-purple-700 text-white font-black text-lg py-4 rounded-2xl shadow-lg shadow-purple-500/20 transition-all active:scale-95 flex items-center justify-center gap-2 font-outfit">
                 {currentPlayerIndex === players.length - 1 ? (
                   <>INICIAR DISCUSSÃO <MessageCircle size={20} /></>
                 ) : (
                   <>PRÓXIMO JOGADOR <ArrowRight size={20} /></>
                 )}
               </button>
             )}
          </div>
        )}
        {isMultiplayer && !isCardRevealed && (
          <div className="absolute bottom-28 left-0 right-0 flex justify-center z-45 pointer-events-none">
            <ReactionsTray />
          </div>
        )}
      </div>
    );
  }

  // FASE 2: DISCUSSÃO
  if (step === 'discussion') {
    return (
      <div className="flex-1 flex flex-col bg-[#F5F7FB] text-slate-800 relative h-full overflow-hidden font-sans">
        <ReactionsOverlay />
        {/* Header Fixo */}
        <div className="px-6 py-4 flex items-center justify-between bg-[#F5F7FB]/90 border-b border-slate-200/50 backdrop-blur-xl sticky top-0 z-20 pt-safe shrink-0">
          <div className="flex items-center gap-2">
            <button onClick={onBack} className="w-10 h-10 flex items-center justify-center rounded-full bg-white shadow-sm border border-slate-100 text-slate-600 hover:text-purple-600 hover:bg-slate-50 transition-colors">
              <ChevronLeft size={22} />
            </button>
            <button 
              onClick={toggleMute}
              className="w-10 h-10 flex items-center justify-center rounded-full bg-white shadow-sm border border-slate-100 text-slate-600 hover:bg-slate-50 transition-colors"
            >
              {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
            </button>
          </div>
          <span className="font-black text-xl text-slate-800 font-outfit">Discussão</span>
        </div>

        {/* Área Central */}
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center overflow-y-auto">
          {/* Cronômetro */}
          <div className="mb-6 flex flex-col items-center gap-2 bg-white border border-slate-200/80 px-6 py-4 rounded-3xl shadow-card backdrop-blur-md animate-fade-in w-full max-w-sm">
            <div className="flex items-center gap-1.5 opacity-80 text-xs text-purple-600 font-black uppercase tracking-wider font-outfit">
              <span className={`w-2 h-2 rounded-full ${timerActive && timeLeft > 0 ? 'bg-purple-600 animate-ping' : 'bg-slate-400'}`} />
              Tempo de Debate
            </div>
            
            <div className={`text-4xl font-black font-outfit tracking-wider select-none ${timeLeft <= 10 && timeLeft > 0 ? 'text-red-500 animate-pulse' : 'text-slate-800'}`}>
              {formatTime(timeLeft)}
            </div>

            <div className="flex items-center gap-2.5 mt-2">
              <button 
                onClick={() => { setTimerActive(!timerActive); triggerVibration(50); }}
                className="py-1.5 px-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-all active:scale-90 text-xs font-bold font-outfit"
              >
                {timerActive && timeLeft > 0 ? "Pausar" : "Retomar"}
              </button>
              <button 
                onClick={() => { setTimeLeft(prev => prev + 30); triggerVibration(50); }}
                className="py-1.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-all active:scale-90 text-xs font-bold font-outfit"
              >
                +30s
              </button>
              <button 
                onClick={() => { setTimeLeft(120); setTimerActive(false); triggerVibration(50); }}
                className="py-1.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-all active:scale-90 text-xs font-bold font-outfit"
              >
                Resetar
              </button>
            </div>
          </div>

          <div className="relative mb-6">
            <div className="absolute inset-0 bg-purple-500/10 blur-3xl rounded-full" />
            <div className="bg-white border-2 border-purple-100 p-8 rounded-full shadow-card relative z-10 animate-bounce" style={{ animationDuration: '4s' }}>
              <MessageCircle size={72} className="text-purple-600 fill-purple-100" />
            </div>
          </div>
          <h1 className="text-3xl font-black text-slate-800 mb-3 font-outfit">Hora do Debate!</h1>
          <div className="bg-white p-6 rounded-3xl border border-slate-200/80 max-w-sm w-full space-y-4 shadow-card">
             <p className="text-slate-600 text-sm leading-relaxed font-medium">
               Façam perguntas inteligentes e subjetivas uns aos outros sobre o tema secreto.
             </p>
             <div className="h-px bg-slate-100 w-full" />
             <p className="text-xs text-slate-500 font-medium">
               <strong className="text-purple-600 uppercase tracking-widest font-outfit block mb-1">Seu Objetivo:</strong> 
               Detectar quem está parecendo confuso ou dando respostas desalinhadas.
             </p>
          </div>
        </div>

        {/* Rodapé Fixo */}
        <div className="p-6 bg-white/90 border-t border-slate-200/60 backdrop-blur-md shrink-0 safe-bottom shadow-card">
           {isMultiplayer ? (
             isHost ? (
               <button onClick={() => syncService.syncState({ step: 'reveal' })} className="w-full bg-purple-600 hover:bg-purple-700 text-white font-black text-lg py-4 rounded-2xl shadow-lg shadow-purple-500/20 transition-all active:scale-95 font-outfit">
                 REVELAR IMPOSTOR
               </button>
             ) : (
               <div className="w-full bg-slate-100 p-4 rounded-2xl border border-slate-200 text-center flex items-center justify-center gap-3 animate-pulse">
                 <span className="w-2 h-2 rounded-full bg-purple-500 animate-ping" />
                 <span className="text-xs text-slate-500 font-black uppercase tracking-wider font-outfit">Líder revelará impostor em breve...</span>
               </div>
             )
           ) : (
             <button onClick={() => setLocalStep('reveal')} className="w-full bg-purple-600 hover:bg-purple-700 text-white font-black text-lg py-4 rounded-2xl shadow-lg shadow-purple-500/20 transition-all active:scale-95 font-outfit">
               REVELAR IMPOSTOR
             </button>
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

  // FASE 3: REVELAÇÃO
  if (step === 'reveal') {
    const impostorName = isMultiplayer
      ? (connectedPlayers.find(p => p.id === impostorPlayerId)?.name || 'Desconhecido')
      : players[localImpostorIndex];

    const handleRedemptionChoice = (status: 'impostor_won' | 'group_won') => {
      if (status === 'impostor_won') {
        audioService.playSuspense();
        triggerVibration([100, 50, 200]);
      } else {
        audioService.playSuccess();
        triggerVibration([100, 100, 100]);
      }

      if (isMultiplayer) {
        if (isHost) {
          syncService.syncState({ redemptionStatus: status });
        }
      } else {
        setLocalRedemptionStatus(status);
      }
    };

    const handlePlayAgain = () => {
      if (isMultiplayer) {
        syncService.syncState({
          phase: 'setup',
          roundKey: Date.now()
        });
      } else {
        handleNewRound();
      }
    };

    return (
      <div className="flex-1 flex flex-col bg-[#F5F7FB] text-slate-800 relative overflow-hidden font-sans h-full">
        <ReactionsOverlay />
        {/* Header Fixo */}
        <div className="px-6 py-4 flex items-center justify-between bg-[#F5F7FB]/90 border-b border-slate-200/50 backdrop-blur-xl sticky top-0 z-20 pt-safe shrink-0">
          <div className="flex items-center gap-2">
            <button onClick={onBack} className="w-10 h-10 flex items-center justify-center rounded-full bg-white shadow-sm border border-slate-100 text-slate-600 hover:text-purple-600 hover:bg-slate-50 transition-colors">
              <ChevronLeft size={22} />
            </button>
            <button 
              onClick={toggleMute}
              className="w-10 h-10 flex items-center justify-center rounded-full bg-white shadow-sm border border-slate-100 text-slate-600 hover:bg-slate-50 transition-colors"
            >
              {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
            </button>
          </div>
          <span className="font-black text-xl text-slate-800 font-outfit">Revelação</span>
        </div>

        <div className="absolute top-0 left-0 w-full h-full opacity-5 pointer-events-none">
           <Ghost size={400} className="absolute -right-20 -top-20 text-purple-600 rotate-12" />
        </div>

        {/* Área Central com Scroll */}
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center z-10 overflow-y-auto">
          <p className="text-slate-400 font-black uppercase tracking-[0.2em] text-[10px] mb-4 font-outfit">O Impostor Infiltrado era</p>
          
          <div className="relative mb-6 select-none">
            <div className="absolute inset-0 bg-purple-500/20 blur-3xl rounded-full" />
            <div className="w-24 h-24 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-full flex items-center justify-center shadow-xl relative z-10 border-4 border-white">
               <span className="text-4xl font-black text-white font-outfit">{impostorName.charAt(0).toUpperCase()}</span>
            </div>
            <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-white border border-purple-200 px-4 py-1 rounded-full whitespace-nowrap z-20 shadow-md">
               <span className="font-black text-xs text-purple-700 font-outfit tracking-wide uppercase">{impostorName}</span>
            </div>
          </div>

          <div className="w-full max-w-sm space-y-4">
             {/* Chute de Redenção do Impostor */}
             {redemptionStatus === 'pending' ? (
               <div className="bg-white p-6 rounded-3xl border border-purple-200/80 text-center shadow-card space-y-3 animate-fade-in">
                 <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-50 border border-purple-200 text-purple-700 text-xs font-black font-outfit uppercase">
                   🎯 Chute de Redenção
                 </div>
                 <p className="text-slate-800 font-bold text-sm leading-relaxed">
                   O Impostor tem 1 chance para adivinhar a palavra do Grupo Honesto e roubar a vitória!
                 </p>
                 {(!isMultiplayer || isHost) ? (
                   <div className="flex flex-col sm:flex-row gap-2 pt-1">
                     <button
                       onClick={() => handleRedemptionChoice('impostor_won')}
                       className="flex-1 py-3 px-3 rounded-2xl bg-purple-600 hover:bg-purple-700 text-white font-black text-xs active:scale-95 transition-all shadow-md font-outfit"
                     >
                       👑 Acertou o Chute!
                     </button>
                     <button
                       onClick={() => handleRedemptionChoice('group_won')}
                       className="flex-1 py-3 px-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs active:scale-95 transition-all shadow-md font-outfit"
                     >
                       🛡️ Errou! Grupo Venceu
                     </button>
                   </div>
                 ) : (
                   <p className="text-xs text-slate-500 font-medium animate-pulse">
                     O líder está registrando se o impostor acertou a palavra...
                   </p>
                 )}
               </div>
             ) : (
               <div className="space-y-4 animate-fade-in">
                 {redemptionStatus === 'impostor_won' ? (
                   <div className="p-4 bg-purple-50 border border-purple-200 rounded-2xl text-purple-800 font-black font-outfit text-center shadow-sm">
                     👑 O IMPOSTOR ACERTOU E ROUBOU A VITÓRIA!
                   </div>
                 ) : (
                   <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 font-black font-outfit text-center shadow-sm">
                     🛡️ O GRUPO HONESTO VENCEU A RODADA!
                   </div>
                 )}

                 <div className="bg-white p-5 rounded-3xl border-l-4 border-amber-400 border border-slate-200/80 text-left shadow-card">
                    <div className="flex items-center gap-2 mb-1 text-amber-600">
                       <Users size={14} />
                       <span className="text-[9px] font-black uppercase tracking-widest font-outfit">Tema do Grupo</span>
                    </div>
                    <p className="text-lg font-black text-slate-800 font-outfit leading-snug">{honestQuestion}</p>
                 </div>
                 <div className="bg-white p-5 rounded-3xl border-l-4 border-purple-500 border border-slate-200/80 text-left shadow-card">
                    <div className="flex items-center gap-2 mb-1 text-purple-600">
                       <Ghost size={14} />
                       <span className="text-[9px] font-black uppercase tracking-widest font-outfit">Tema do Impostor</span>
                    </div>
                    <p className="text-lg font-black text-slate-800 font-outfit leading-snug">{impostorQuestion}</p>
                 </div>
               </div>
             )}
          </div>
        </div>

        {/* Rodapé Fixo */}
        <div className="p-6 bg-white/90 border-t border-slate-200/60 backdrop-blur-md safe-bottom flex flex-col gap-3 shrink-0 shadow-card">
           {(!isMultiplayer || isHost) ? (
             <button onClick={handlePlayAgain} className="w-full bg-purple-600 hover:bg-purple-700 text-white font-black text-lg py-4 rounded-2xl shadow-lg shadow-purple-500/20 transition-all active:scale-95 flex items-center justify-center gap-2 font-outfit">
               <RefreshCw size={20} /> JOGAR NOVAMENTE
             </button>
           ) : (
             <div className="w-full bg-slate-100 p-4 rounded-2xl border border-slate-200 text-center flex items-center justify-center gap-3 animate-pulse">
               <span className="w-2 h-2 rounded-full bg-purple-500 animate-ping" />
               <span className="text-xs text-slate-500 font-black uppercase tracking-wider font-outfit">Aguardando líder reiniciar...</span>
             </div>
           )}
           <button onClick={onBack} className="w-full bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-bold py-3 rounded-2xl shadow-sm transition-colors text-sm font-outfit">
             Sair para o Menu
           </button>
         </div>
         {isMultiplayer && (
           <div className="absolute bottom-28 left-0 right-0 flex justify-center z-45 pointer-events-none">
             <ReactionsTray />
           </div>
         )}
      </div>
    );
  }

  return null;
}