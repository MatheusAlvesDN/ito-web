// Serviço para evitar que a tela do celular apague durante rodadas (Screen Wake Lock API)
import { useEffect } from 'react';

class WakeLockService {
  private wakeLock: WakeLockSentinel | null = null;
  private isRequested: boolean = false;

  public async requestWakeLock(): Promise<void> {
    this.isRequested = true;
    if (typeof navigator !== 'undefined' && 'wakeLock' in navigator) {
      try {
        if (!this.wakeLock) {
          this.wakeLock = await navigator.wakeLock.request('screen');
          this.wakeLock.addEventListener('release', () => {
            this.wakeLock = null;
          });
        }
      } catch (err) {
        console.warn('Falha ao ativar Screen Wake Lock:', err);
      }
    }
  }

  public async releaseWakeLock(): Promise<void> {
    this.isRequested = false;
    if (this.wakeLock) {
      try {
        await this.wakeLock.release();
        this.wakeLock = null;
      } catch (err) {
        console.warn('Falha ao liberar Screen Wake Lock:', err);
      }
    }
  }

  public handleVisibilityChange = async () => {
    if (this.isRequested && document.visibilityState === 'visible') {
      await this.requestWakeLock();
    }
  };
}

export const wakeLockService = new WakeLockService();

// Listener para reativar wakeLock caso o usuário alterne de app e retorne
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    wakeLockService.handleVisibilityChange();
  });
}

/**
 * Hook do React para ativar/desativar Wake Lock em telas específicas de jogo
 */
export function useWakeLock(enabled: boolean = true) {
  useEffect(() => {
    if (enabled) {
      wakeLockService.requestWakeLock();
    } else {
      wakeLockService.releaseWakeLock();
    }
    return () => {
      wakeLockService.releaseWakeLock();
    };
  }, [enabled]);
}
