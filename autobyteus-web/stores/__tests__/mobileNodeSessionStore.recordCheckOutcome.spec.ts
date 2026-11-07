import { beforeEach, describe, expect, it } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useMobileNodeSessionStore } from '~/stores/mobileNodeSessionStore';

// autobyteus-426 D-02 (ARCH-REV-001 AR-001): one outcome per check sets both connection facts.
describe('mobileNodeSessionStore.recordCheckOutcome', () => {
  beforeEach(() => setActivePinia(createPinia()));

  it('sets Phone Access off and reachability together, so a later check always replaces "off"', () => {
    const store = useMobileNodeSessionStore();
    store.recordCheckOutcome('phone_access_off');
    expect([store.phoneAccessOff, store.authorizedApiReachable]).toEqual([true, false]);
    store.recordCheckOutcome('unreachable');
    expect([store.phoneAccessOff, store.authorizedApiReachable]).toEqual([false, false]);
    store.recordCheckOutcome('phone_access_off');
    store.recordCheckOutcome('reachable');
    expect([store.phoneAccessOff, store.authorizedApiReachable]).toEqual([false, true]);
  });

  it('forgets Phone Access off when the session ends', () => {
    const store = useMobileNodeSessionStore();
    store.recordCheckOutcome('phone_access_off');
    store.rejectLocalSessionForAuthFailure();
    expect(store.phoneAccessOff).toBe(false);
    store.recordCheckOutcome('phone_access_off');
    store.deleteLocalSession();
    expect(store.phoneAccessOff).toBe(false);
  });
});
