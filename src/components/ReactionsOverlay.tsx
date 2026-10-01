import { useState, useEffect } from 'react';
import { syncService } from '../utils/syncService';

export const REACTION_EMOJIS = ['👍', '🤔', '🕵️', '😂', '😮', '🎉', '🔥', '🤫'];

type ActiveReaction = {
  id: number;
  playerName: string;
  emoji: string;
  left: number;
};

export const ReactionsOverlay = () => {
  const [reactions, setReactions] = useState<ActiveReaction[]>([]);

  useEffect(() => {
    const handleReaction = (e: Event) => {
      const customEvent = e as CustomEvent<{ playerId: string; playerName: string; reaction: string }>;
      const { playerName, reaction } = customEvent.detail;
      
      const newReaction: ActiveReaction = {
        id: Date.now() + Math.random(),
        playerName,
        emoji: reaction,
        left: 10 + Math.random() * 80, // Offset aleatório na tela
      };

      setReactions((prev) => [...prev, newReaction]);
    };

    window.addEventListener('ito-reaction', handleReaction);
    return () => window.removeEventListener('ito-reaction', handleReaction);
  }, []);

  // Remove reações antigas após a animação de 3 segundos
  useEffect(() => {
    if (reactions.length === 0) return;
    const interval = setInterval(() => {
      setReactions((prev) => {
        const now = Date.now();
        return prev.filter(r => (now - Math.floor(r.id)) < 3000);
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [reactions]);

  return (
    <div className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none z-40">
      {reactions.map((r) => (
        <div
          key={r.id}
          className="absolute bottom-16 flex flex-col items-center animate-reaction select-none"
          style={{ left: `${r.left}%` }}
        >
          <span className="text-4xl filter drop-shadow-[0_4px_10px_rgba(0,0,0,0.6)]">
            {r.emoji}
          </span>
          <span className="bg-slate-900/95 text-[9px] font-black text-white px-2 py-0.5 rounded-full border border-white/5 whitespace-nowrap drop-shadow-md tracking-wider uppercase font-outfit mt-1">
            {r.playerName}
          </span>
        </div>
      ))}
    </div>
  );
};

export const ReactionsTray = () => {
  return (
    <div className="flex items-center justify-center gap-1.5 bg-white/95 px-4 py-2 rounded-3xl border border-slate-200/80 backdrop-blur-md shadow-card pointer-events-auto">
      {REACTION_EMOJIS.map((emoji) => (
        <button
          key={emoji}
          onClick={() => syncService.sendReaction(emoji)}
          className="text-2xl hover:scale-130 active:scale-90 transition-transform duration-100 p-1"
        >
          {emoji}
        </button>
      ))}
    </div>
  );
};
