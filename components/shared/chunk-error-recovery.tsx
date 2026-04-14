'use client';

import { useEffect } from 'react';

const RELOAD_GUARD_KEY = 'bb_chunk_reload_ts';
const RELOAD_COOLDOWN_MS = 30000;

function isChunkLoadError(error: unknown): boolean {
  const message = String((error as any)?.message || error || '');
  const name = String((error as any)?.name || '');
  return name === 'ChunkLoadError' || message.includes('ChunkLoadError') || message.includes('Loading chunk');
}

export function ChunkErrorRecovery() {
  useEffect(() => {
    const tryRecover = (error: unknown) => {
      if (!isChunkLoadError(error)) return;

      const lastReloadAt = Number(sessionStorage.getItem(RELOAD_GUARD_KEY) || '0');
      if (Date.now() - lastReloadAt < RELOAD_COOLDOWN_MS) return;

      sessionStorage.setItem(RELOAD_GUARD_KEY, String(Date.now()));
      window.location.reload();
    };

    const onError = (event: ErrorEvent) => {
      tryRecover(event.error || event.message);
    };

    const onUnhandledRejection = (event: PromiseRejectionEvent) => {
      tryRecover(event.reason);
    };

    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection', onUnhandledRejection);

    return () => {
      window.removeEventListener('error', onError);
      window.removeEventListener('unhandledrejection', onUnhandledRejection);
    };
  }, []);

  return null;
}
