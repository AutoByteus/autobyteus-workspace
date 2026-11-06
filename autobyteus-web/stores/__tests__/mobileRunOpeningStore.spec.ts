import { beforeEach, describe, expect, it } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useAgentSelectionStore } from '../agentSelectionStore';
import { useMobileRunOpeningStore } from '../mobileRunOpeningStore';

// autobyteus-277 AR-001: one owner of the pending open; idle → opening(key) → idle.
describe('mobileRunOpeningStore', () => {
  beforeEach(() => setActivePinia(createPinia()));

  it('a begun open is pending until its commit', () => {
    const store = useMobileRunOpeningStore();
    store.begin('agent:a');
    expect(store.pending).toEqual({ key: 'agent:a', status: 'opening' });
    store.commit('agent:a');
    expect(store.pending).toBeNull();
    expect(store.failure).toBeNull();
  });

  it('a failed open ends pending and is reported once, a new object each time', () => {
    const store = useMobileRunOpeningStore();
    store.begin('agent:a'); store.fail('agent:a');
    const first = store.failure;
    expect(store.pending).toBeNull();
    expect(first).toEqual({ key: 'agent:a' });
    store.begin('agent:a'); store.fail('agent:a');
    expect(store.failure).not.toBe(first);
  });

  it('a newer open supersedes: the old key\'s commit or failure is ignored', () => {
    const store = useMobileRunOpeningStore();
    store.begin('agent:a'); store.begin('agent:b');
    store.commit('agent:a'); store.fail('agent:a');
    expect(store.pending).toEqual({ key: 'agent:b', status: 'opening' });
    expect(store.failure).toBeNull();
  });

  // Review residual 1: an earlier open's late commit cannot be taken for the new one.
  it('a new open ends the selection intent in flight', () => {
    const selection = useAgentSelectionStore();
    const earlier = selection.beginSelectionIntent();
    useMobileRunOpeningStore().begin('agent:b');
    expect(earlier.isCurrent()).toBe(false);
  });
});
