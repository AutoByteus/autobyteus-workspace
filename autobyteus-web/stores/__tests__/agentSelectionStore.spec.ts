import { describe, it, expect, beforeEach } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useWorkspaceCenterViewStore } from '~/stores/workspaceCenterViewStore';
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
    it('keeps Settings open within the same run, and opens another run at its chat (autobyteus-366)', () => {
      const store = useAgentSelectionStore();
      const center = useWorkspaceCenterViewStore();
      store.selectRun('team-1', 'team');
      center.showConfig();
      store.selectRun('team-1', 'team');
      expect(center.isConfigMode).toBe(true);
      store.selectRun('team-2', 'team');
      expect(center.isConfigMode).toBe(false);
      center.showConfig();
      store.selectRun('team-2', 'agent');
      expect(center.isConfigMode).toBe(false);
    });

    it('should select an agent instance by default', () => {
      const store = useAgentSelectionStore();
      store.selectRun('agent-123');

      expect(store.selectedRunId).toBe('agent-123');
      expect(store.selectedType).toBe('agent');
      expect(store.isAgentSelected).toBe(true);
      expect(store.isTeamSelected).toBe(false);
    });

    it('should select a team instance explicitly', () => {
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
