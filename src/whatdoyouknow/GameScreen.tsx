import { useState, useEffect } from 'react';
import { api } from '../services/api';
import type { WhatDoYouKnowTheme } from '../types/game';
import { syncService, triggerVibration } from '../utils/syncService';
import { audioService } from '../utils/audioService';
import { getAvatarUrl, getPlayerAvatar } from '../utils/avatarService';

// Importando os novos componentes
import QuestionStep from './components/QuestionStep';
import ScoringStep from './components/ScoringStep';
import LeaderboardStep from './components/LeaderboardStep';

type GameStep = 'question' | 'scoring' | 'leaderboard';

type Props = {
  onBack: () => void;
  players: string[];
  themes: WhatDoYouKnowTheme[];
  isMultiplayer?: boolean;
  isHost?: boolean;
  syncGameState?: any;
  playerId?: string;
  connectedPlayers?: { id: string; name: string; avatar?: string }[];
  isMuted: boolean;
  toggleMute: () => void;
};

export default function GameScreenWhatDoYouKnow({
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
  const [localStep, setLocalStep] = useState<GameStep>('question');
  const [roundKey, setRoundKey] = useState(0);

  const [localTargetPlayer, setLocalTargetPlayer] = useState<string>('');
  const [localQuestion, setLocalQuestion] = useState<string>('');
  const [localScores, setLocalScores] = useState<Record<string, number>>({});
  const [localRemainingTargets, setLocalRemainingTargets] = useState<string[]>([]);
  const [usedQuestions, setUsedQuestions] = useState<Set<string>>(new Set());

  // Para a tela de pontuação
  const [selectedWinners, setSelectedWinners] = useState<Set<string>>(new Set());

  // --- ESTADOS DERIVADOS MULTIPLAYER ---
  const step = isMultiplayer ? (syncGameState?.step || 'question') : localStep;
  const targetPlayer = isMultiplayer ? (syncGameState?.targetPlayer || '') : localTargetPlayer;
  const question = isMultiplayer ? (syncGameState?.question || '') : localQuestion;
  const scores = isMultiplayer ? (syncGameState?.scores || {}) : localScores;

  // Lista de jogadores (nomes)
  const activePlayers = isMultiplayer ? connectedPlayers.map(p => p.name) : players;

  const getAvatarForPlayer = (name: string) => {
    const cp = connectedPlayers.find(p => p.name === name);
    if (cp && cp.avatar) return cp.avatar;
    return getPlayerAvatar(name);
  };

  const getPlayerAvatarUrl = (name: string) => getAvatarUrl(getAvatarForPlayer(name));

  // --- LÓGICA DE INICIALIZAÇÃO VIA API ---
  const [questionsPool, setQuestionsPool] = useState<string[]>([]);

  useEffect(() => {
    async function loadQuestions() {
      let pool: string[] = [];
      const themeList = themes.length > 0 ? themes : [{ id: 'pessoal' } as WhatDoYouKnowTheme];
      for (const t of themeList) {
        if (t.questions && Array.isArray(t.questions) && t.questions.length > 0) {
          pool.push(...t.questions);
        } else if (t.id.startsWith('custom_theme_')) {
          try {
            const saved = localStorage.getItem('whatdoyouknow_custom_themes');
            if (saved) {
              const list: WhatDoYouKnowTheme[] = JSON.parse(saved);
              const found = list.find((item) => item.id === t.id);
              if (found?.questions) pool.push(...found.questions);
            }
          } catch {}
        } else {
          try {
            const res = await api.getThemeContent('whatdoyouknow', t.id);
            if (res.questions) pool.push(...res.questions);
          } catch (err) {
            console.error(err);
          }
        }
      }
      setQuestionsPool(pool);
    }
    loadQuestions();
  }, [themes]);

  const getAllQuestions = () => {
    return questionsPool;
  };

  const getNextTarget = (currentRemaining: string[], allPlayers: string[]) => {
    let pool = [...currentRemaining];
    if (pool.length === 0) {
      pool = [...allPlayers]; // Refill
    }
    const randomIndex = Math.floor(Math.random() * pool.length);
    const selected = pool[randomIndex];
    pool.splice(randomIndex, 1);
    return { selected, newRemaining: pool };
  };

  const pickQuestion = (currentUsed: Set<string>) => {
    const allQ = getAllQuestions();
    if (allQ.length === 0) return { q: 'Sem perguntas cadastradas', newUsed: currentUsed };

    // Filtra as perguntas não usadas
    let available = allQ.filter(q => !currentUsed.has(q));
    
    // Se todas foram usadas, reseta
    if (available.length === 0) {
      available = allQ;
      currentUsed = new Set();
    }

    const randomQ = available[Math.floor(Math.random() * available.length)];
    const newUsed = new Set(currentUsed);
    newUsed.add(randomQ);

    return { q: randomQ, newUsed };
  };

  const setupRound = () => {
    if (activePlayers.length < 3) return;

    let remaining = [...localRemainingTargets];
    // Se for o primeiro round, inicializa
    if (Object.keys(localScores).length === 0) {
      const initScores: Record<string, number> = {};
      activePlayers.forEach(p => initScores[p] = 0);
      setLocalScores(initScores);
      remaining = [...activePlayers];
    }

    const { selected, newRemaining } = getNextTarget(remaining, activePlayers);
    setLocalRemainingTargets(newRemaining);
    setLocalTargetPlayer(selected);

    const { q, newUsed } = pickQuestion(usedQuestions);
    setUsedQuestions(newUsed);
    setLocalQuestion(q);
    
    setLocalStep('question');
    setSelectedWinners(new Set());
  };

  const setupMultiplayerRound = () => {
    if (!connectedPlayers || connectedPlayers.length < 3) return;

    const currentScores = syncGameState?.scores || {};
    let remaining = syncGameState?.remainingTargets || [];

    // Inicializa scores se vazio
    if (Object.keys(currentScores).length === 0) {
      connectedPlayers.forEach(p => currentScores[p.name] = 0);
      remaining = connectedPlayers.map(p => p.name);
    }

    const { selected, newRemaining } = getNextTarget(remaining, connectedPlayers.map(p => p.name));

    // Multiplayers should also sync used questions ideally, but to keep it simple, the host manages it locally
    // Host generates the question
    const { q, newUsed } = pickQuestion(usedQuestions);
    setUsedQuestions(newUsed);

    syncService.syncState({
      phase: 'game',
      step: 'question',
      targetPlayer: selected,
      question: q,
      scores: currentScores,
      remainingTargets: newRemaining
    });
  };

  useEffect(() => {
    if (!isMultiplayer && questionsPool.length > 0) {
      setupRound();
    }
  }, [roundKey, questionsPool, isMultiplayer]);

  useEffect(() => {
    if (isMultiplayer && isHost && syncGameState?.phase === 'setup' && questionsPool.length > 0) {
      setupMultiplayerRound();
    }
  }, [isHost, isMultiplayer, syncGameState?.phase, syncGameState?.roundKey, questionsPool]);

  // --- HANDLERS ---

  const handleGoToScoring = () => {
    triggerVibration(50);
    if (isMultiplayer) {
      syncService.syncState({ step: 'scoring' });
    } else {
      setLocalStep('scoring');
    }
  };

  const handleConfirmScores = () => {
    audioService.playSuccess();
    triggerVibration([50, 100, 50]);

    const newScores = { ...scores };
    const correctCount = selectedWinners.size;

    // A pessoa que respondeu ganha 1 ponto por CADA pessoa que acertou
    if (newScores[targetPlayer] !== undefined) {
      newScores[targetPlayer] += correctCount;
    }

    // Cada pessoa que acertou ganha 1 ponto
    selectedWinners.forEach(winner => {
      if (newScores[winner] !== undefined) {
        newScores[winner] += 1;
      }
    });

    if (isMultiplayer) {
      syncService.syncState({
        step: 'leaderboard',
        scores: newScores
      });
    } else {
      setLocalScores(newScores);
      setLocalStep('leaderboard');
    }
  };

  const handleNextRound = () => {
    triggerVibration(50);
    if (isMultiplayer) {
      setupMultiplayerRound();
    } else {
      setRoundKey(k => k + 1);
    }
  };

  const toggleWinner = (playerName: string) => {
    triggerVibration(50);
    const newSet = new Set(selectedWinners);
    if (newSet.has(playerName)) {
      newSet.delete(playerName);
    } else {
      newSet.add(playerName);
    }
    setSelectedWinners(newSet);
  };

  // --- RENDER ---

  if (activePlayers.length < 3) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 bg-[#F5F7FB] text-center text-slate-800 font-sans h-full">
        <h2 className="text-2xl font-black text-slate-800 mb-2 font-outfit">Jogadores Insuficientes</h2>
        <p className="text-slate-500 mb-6 text-sm font-medium">O modo O Que Você Sabe precisa de no mínimo 3 pessoas.</p>
        <button onClick={onBack} className="bg-white border border-slate-200 shadow-sm text-slate-700 px-6 py-3 rounded-2xl font-bold font-outfit active:scale-95 transition-all">Voltar</button>
      </div>
    );
  }

  const isMyTurn = isMultiplayer ? (connectedPlayers.find(p => p.id === playerId)?.name === targetPlayer) : false;

  if (step === 'question') {
    return (
      <QuestionStep 
        onBack={onBack}
        toggleMute={toggleMute}
        isMuted={isMuted}
        targetPlayer={targetPlayer}
        question={question}
        isMultiplayer={isMultiplayer}
        isHost={isHost}
        isMyTurn={isMyTurn}
        handleGoToScoring={handleGoToScoring}
        getAvatar={getPlayerAvatarUrl}
      />
    );
  }

  if (step === 'scoring') {
    const guessingPlayers = activePlayers.filter(p => p !== targetPlayer);
    return (
      <ScoringStep 
        onBack={onBack}
        targetPlayer={targetPlayer}
        isMultiplayer={isMultiplayer}
        isHost={isHost}
        guessingPlayers={guessingPlayers}
        selectedWinners={selectedWinners}
        toggleWinner={toggleWinner}
        handleConfirmScores={handleConfirmScores}
        getAvatar={getPlayerAvatarUrl}
      />
    );
  }

  if (step === 'leaderboard') {
    return (
      <LeaderboardStep 
        onBack={onBack}
        activePlayers={activePlayers}
        scores={scores}
        isMultiplayer={isMultiplayer}
        isHost={isHost}
        handleNextRound={handleNextRound}
        getAvatar={getPlayerAvatarUrl}
      />
    );
  }

  return null;
}
