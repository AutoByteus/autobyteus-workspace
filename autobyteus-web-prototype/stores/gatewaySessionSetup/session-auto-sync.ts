import type { SessionStatusAutoSyncState } from '~/types/messaging';

export function detachTimer(timer: ReturnType<typeof setTimeout>) {
  if (typeof timer === 'object' && timer && 'unref' in timer && typeof timer.unref === 'function') {
    timer.unref();
  }
}

export function nextAutoSyncStateForReason(reason: string): SessionStatusAutoSyncState {
  if (reason === 'retry_budget_exhausted' || reason === 'timeout') {
    return 'paused';
  }
  if (reason === 'restart') {
    return 'running';
  }
  return 'stopped';
}
