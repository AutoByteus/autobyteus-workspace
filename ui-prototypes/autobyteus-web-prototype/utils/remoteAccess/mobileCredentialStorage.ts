import type { MobileNodeSession } from '~/types/remoteAccess';

const STORAGE_KEY = 'autobyteus.remote_access.mobile_session.v1';

const canUseLocalStorage = (): boolean =>
  typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';

const isMobileNodeSession = (value: unknown): value is MobileNodeSession => {
  const candidate = value as Partial<MobileNodeSession> | null;
  return Boolean(
    candidate
      && candidate.version === 1
      && typeof candidate.nodeId === 'string'
      && typeof candidate.serverBaseUrl === 'string'
      && typeof candidate.credential === 'string'
      && candidate.device
      && typeof candidate.device.deviceId === 'string',
  );
};

export const mobileCredentialStorage = {
  load(): MobileNodeSession | null {
    if (!canUseLocalStorage()) {
      return null;
    }
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        return null;
      }
      const parsed = JSON.parse(raw) as unknown;
      return isMobileNodeSession(parsed) ? parsed : null;
    } catch {
      return null;
    }
  },

  save(session: MobileNodeSession): void {
    if (!canUseLocalStorage()) {
      return;
    }
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  },

  clear(): void {
    if (!canUseLocalStorage()) {
      return;
    }
    window.localStorage.removeItem(STORAGE_KEY);
  },
};
