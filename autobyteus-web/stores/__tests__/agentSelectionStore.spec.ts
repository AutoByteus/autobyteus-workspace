import { describe, it, expect, beforeEach } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useAgentSelectionStore } from '~/stores/agentSelectionStore';

describe('agentSelectionStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  describe('initial state', () => {
    it('should have no selection initially', () => {
      const store = useAgentSelectionStore();
      expect(store.selectedRunId).toBeNull();
      expect(store.selectedType).toBeNull();
    });
  });

  describe('selectRun', () => {
    it('should select an agent run by default', () => {
      const store = useAgentSelectionStore();
      store.selectRun('agent-123');

      expect(store.selectedRunId).toBe('agent-123');
      expect(store.selectedType).toBe('agent');
      expect(store.isAgentSelected).toBe(true);
      expect(store.isTeamSelected).toBe(false);
    });

    it('should select a team run explicitly', () => {
      const store = useAgentSelectionStore();
      store.selectRun('team-123', 'team');

      expect(store.selectedRunId).toBe('team-123');
      expect(store.selectedType).toBe('team');
      expect(store.isAgentSelected).toBe(false);
      expect(store.isTeamSelected).toBe(true);
    });

    it('should overwrite previous selection', () => {
      const store = useAgentSelectionStore();
      store.selectRun('agent-123');
      store.selectRun('team-456', 'team');

      expect(store.selectedRunId).toBe('team-456');
      expect(store.selectedType).toBe('team');
    });
  });

  describe('clearSelection', () => {
    it('should clear the selection and type', () => {
      const store = useAgentSelectionStore();
      store.selectRun('team-123', 'team');
      store.clearSelection();

      expect(store.selectedRunId).toBeNull();
      expect(store.selectedType).toBeNull();
    });
  });
});
