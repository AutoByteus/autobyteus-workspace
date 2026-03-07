import { beforeEach, describe, expect, it } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useTeamWorkspaceViewStore } from '~/stores/teamWorkspaceViewStore';

describe('teamWorkspaceViewStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('defaults to focus mode when no team mode is stored', () => {
    const store = useTeamWorkspaceViewStore();
    expect(store.getMode()).toBe('focus');
    expect(store.getMode('team-1')).toBe('focus');
  });

  it('stores and returns per-team modes', () => {
    const store = useTeamWorkspaceViewStore();
    store.setMode('team-1', 'grid');
    store.setMode('team-2', 'spotlight');

    expect(store.getMode('team-1')).toBe('grid');
    expect(store.getMode('team-2')).toBe('spotlight');
    expect(store.getMode('team-3')).toBe('focus');
  });

  it('migrates a stored mode when a team run id changes', () => {
    const store = useTeamWorkspaceViewStore();
    store.setMode('temp-team-1', 'grid');

    store.migrateMode('temp-team-1', 'team-1');

    expect(store.getMode('temp-team-1')).toBe('focus');
    expect(store.getMode('team-1')).toBe('grid');
  });

  it('clears either one team mode or all team modes', () => {
    const store = useTeamWorkspaceViewStore();
    store.setMode('team-1', 'grid');
    store.setMode('team-2', 'spotlight');

    store.clearMode('team-1');
    expect(store.getMode('team-1')).toBe('focus');
    expect(store.getMode('team-2')).toBe('spotlight');

    store.clearMode();
    expect(store.getMode('team-2')).toBe('focus');
  });
});
