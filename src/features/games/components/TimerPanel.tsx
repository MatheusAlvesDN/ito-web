// TimerPanel: cronômetro do servidor (TimerView) com controles do líder.
import { useEffect, useRef } from 'react';
import { Pause, Play, Plus, RotateCcw } from 'lucide-react';
import { formatSeconds, useCountdown, type TimerAction, type TimerView } from '../../../lib/room';
import { audioService } from '../../../utils/audioService';
import { Button, Card, cx } from '../../../ui';

export interface TimerPanelProps {
  timer: TimerView;
  /** Mostra pausar/retomar/+30s/reiniciar. */
  canControl: boolean;
  send: (action: TimerAction) => void;
  label?: string;
  /** Tique sonoro nos últimos N segundos (0 desliga). */
  tickLast?: number;
  className?: string;
}

export function TimerPanel({ timer, canControl, send, label = 'Tempo', tickLast = 5, className }: TimerPanelProps) {
  const remaining = useCountdown(timer) ?? 0;
  const lastTick = useRef<number | null>(null);
  const running = !timer.paused && timer.deadline != null;

  useEffect(() => {
    if (!running || remaining <= 0 || remaining > tickLast || lastTick.current === remaining) return;
    lastTick.current = remaining;
    audioService.playTick();
  }, [remaining, running, tickLast]);

  const pct = timer.duration > 0 ? Math.min(100, (remaining / timer.duration) * 100) : 0;
  const over = remaining <= 0;
  const urgent = !over && remaining <= 10;

  return (
    <Card className={cx('space-y-3', className)} aria-label={label}>
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-semibold text-muted">{label}</span>
        <span className="text-xs font-medium text-muted">{over ? 'Tempo esgotado' : timer.paused ? 'Pausado' : 'Correndo'}</span>
      </div>
      <p
        className={cx('text-center font-display text-5xl font-extrabold tabular-nums', over ? 'text-danger' : urgent ? 'text-brand-strong' : 'text-ink')}
        role="timer"
        aria-live="off"
      >
        {formatSeconds(remaining)}
      </p>
      <div className="h-2 overflow-hidden rounded-full bg-surface-2" aria-hidden>
        <div className={cx('h-full rounded-full transition-[width] duration-300', over || urgent ? 'bg-danger' : 'bg-brand')} style={{ width: `${pct}%` }} />
      </div>
      {canControl && (
        // Quebra de linha em telas estreitas em vez de cortar os rótulos
        <div className="flex flex-wrap gap-2 [&>*]:min-w-[7rem] [&>*]:flex-1">
          {timer.paused ? (
            <Button variant="secondary" size="sm" leftIcon={<Play className="h-4 w-4" />} disabled={over} onClick={() => send({ type: 'TIMER_RESUME' })}>
              Retomar
            </Button>
          ) : (
            <Button variant="secondary" size="sm" leftIcon={<Pause className="h-4 w-4" />} onClick={() => send({ type: 'TIMER_PAUSE' })}>
              Pausar
            </Button>
          )}
          <Button variant="secondary" size="sm" leftIcon={<Plus className="h-4 w-4" />} onClick={() => send({ type: 'TIMER_ADD', seconds: 30 })}>
            30s
          </Button>
          <Button variant="secondary" size="sm" leftIcon={<RotateCcw className="h-4 w-4" />} onClick={() => send({ type: 'TIMER_RESET' })}>
            Reiniciar
          </Button>
        </div>
      )}
    </Card>
  );
}
