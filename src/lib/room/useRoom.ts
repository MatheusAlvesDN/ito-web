// Hooks React do cliente de sala.
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import type { TimerView } from './gameTypes';
import { roomClient, type RoomClient, type RoomSnapshot } from './roomClient';
import type { RoomError, RoomEvent, RoomEventDataMap, RoomEventName } from './types';

export interface UseRoomResult extends RoomSnapshot {
  client: RoomClient;
}

/** Estado da sala (status, STATE atual, erro fatal, sessão) + o cliente. */
export function useRoom(): UseRoomResult {
  const snap = useSyncExternalStore(roomClient.subscribe, roomClient.getSnapshot, roomClient.getSnapshot);
  return { ...snap, client: roomClient };
}

/** Assina um `EVENT` do servidor pelo nome (`'*'` = todos). O handler pode mudar a cada render. */
export function useRoomEvent<N extends RoomEventName>(name: N, handler: (data: RoomEventDataMap[N], event: RoomEvent) => void): void;
export function useRoomEvent(name: string, handler: (data: Record<string, unknown>, event: RoomEvent) => void): void;
export function useRoomEvent(name: string, handler: (data: never, event: RoomEvent) => void): void {
  const ref = useRef(handler);
  useEffect(() => {
    ref.current = handler;
  });
  useEffect(() => roomClient.on(name, (ev) => (ref.current as (d: unknown, e: RoomEvent) => void)(ev.data, ev)), [name]);
}

/** Assina os `ERROR` não fatais (ação recusada). */
export function useRoomError(handler: (error: RoomError) => void): void {
  const ref = useRef(handler);
  useEffect(() => {
    ref.current = handler;
  });
  useEffect(() => roomClient.onError((e) => ref.current(e)), []);
}

/** Segundos restantes (fracionários) de um cronômetro do servidor, no relógio do servidor. */
export function timerRemaining(timer: TimerView, serverNow: number): number {
  if (timer.paused || timer.deadline == null) return Math.max(0, timer.remaining);
  return Math.max(0, timer.deadline - serverNow);
}

/**
 * Segundos restantes (inteiros, arredondados para cima) de `timer`; atualiza sozinho
 * enquanto ele corre. `null` sem cronômetro.
 */
export function useCountdown(timer: TimerView | null | undefined): number | null {
  const running = !!timer && !timer.paused && timer.deadline != null;
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setTick((t) => t + 1), 250);
    return () => clearInterval(id);
  }, [running, timer?.deadline]);
  if (!timer) return null;
  return Math.max(0, Math.ceil(timerRemaining(timer, roomClient.serverNow()) - 1e-3));
}

/** Formata segundos como m:ss. */
export function formatSeconds(total: number): string {
  const s = Math.max(0, Math.round(total));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}
