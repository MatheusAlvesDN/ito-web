// Reações (emojis) das salas online: bandeja para enviar e overlay que mostra as recebidas (EVENT reaction).
import { useEffect, useState } from 'react';
import { roomClient, useRoomEvent } from '../../../lib/room';
import { cx, focusRing } from '../../../ui';

const REACTION_EMOJIS = ['👍', '😂', '🤔', '😮', '🕵️', '🎉', '🔥', '🤫'];

interface Floating {
  id: number;
  name: string;
  emoji: string;
  left: number;
}

let nextId = 1;

export function ReactionsOverlay() {
  const [items, setItems] = useState<Floating[]>([]);

  useRoomEvent('reaction', (data) => {
    if (!REACTION_EMOJIS.includes(data.reaction)) return;
    const id = nextId++;
    setItems((prev) => [...prev.slice(-11), { id, name: data.name, emoji: data.reaction, left: 8 + Math.random() * 80 }]);
  });

  useEffect(() => {
    if (items.length === 0) return;
    const oldest = items[0].id;
    const t = setTimeout(() => setItems((prev) => prev.filter((r) => r.id !== oldest)), 3000);
    return () => clearTimeout(t);
  }, [items]);

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 z-30 overflow-hidden">
      {items.map((r) => (
        <div key={r.id} className="animate-reaction absolute bottom-24 flex flex-col items-center" style={{ left: `${r.left}%` }}>
          <span className="text-4xl drop-shadow">{r.emoji}</span>
          <span className="mt-1 max-w-[8rem] truncate rounded-full bg-ink px-2 py-0.5 text-[10px] font-bold text-bg">{r.name}</span>
        </div>
      ))}
    </div>
  );
}

export function ReactionsTray({ className }: { className?: string }) {
  const [cooldown, setCooldown] = useState(false);
  useEffect(() => {
    if (!cooldown) return;
    const t = setTimeout(() => setCooldown(false), 600);
    return () => clearTimeout(t);
  }, [cooldown]);

  return (
    <div className={cx('flex items-center justify-between gap-1', className)} role="group" aria-label="Reações">
      {REACTION_EMOJIS.map((emoji) => (
        <button
          key={emoji}
          type="button"
          disabled={cooldown}
          onClick={() => {
            roomClient.sendReaction(emoji);
            setCooldown(true);
          }}
          className={cx('rounded-xl p-1.5 text-2xl transition-transform hover:bg-ink/5 active:scale-90 disabled:opacity-50', focusRing)}
          aria-label={`Reagir ${emoji}`}
        >
          {emoji}
        </button>
      ))}
    </div>
  );
}
