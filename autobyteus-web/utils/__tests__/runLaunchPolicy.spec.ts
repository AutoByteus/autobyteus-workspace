import { describe, expect, it, vi } from 'vitest';
import {
  pickPreferredRunTemplate,
  resolveRunnableModelIdentifier,
} from '~/utils/runLaunchPolicy';

describe('runLaunchPolicy', () => {
  describe('pickPreferredRunTemplate', () => {
    it('prefers same-workspace candidate with model and newest activity', () => {
      const candidates = [
        {
          config: { workspaceId: 'ws-a', llmModelIdentifier: 'model-a-older' },
          state: { conversation: { updatedAt: '2026-01-01T00:00:00.000Z' } },
        },
        {
          config: { workspaceId: 'ws-a', llmModelIdentifier: 'model-a-newer' },
          state: { conversation: { updatedAt: '2026-01-02T00:00:00.000Z' } },
        },
        {
          config: { workspaceId: 'ws-b', llmModelIdentifier: 'model-b' },
          state: { conversation: { updatedAt: '2026-01-03T00:00:00.000Z' } },
        },
      ];

      const selected = pickPreferredRunTemplate(candidates, 'ws-a');
      expect(selected?.config.llmModelIdentifier).toBe('model-a-newer');
    });

    it('falls back to cross-workspace candidate when same workspace has no model', () => {
      const candidates = [
        {
          config: { workspaceId: 'ws-a', llmModelIdentifier: '' },
          state: { conversation: { updatedAt: '2026-01-03T00:00:00.000Z' } },
        },
        {
          config: { workspaceId: 'ws-b', llmModelIdentifier: 'model-b' },
          state: { conversation: { updatedAt: '2026-01-02T00:00:00.000Z' } },
        },
      ];

      const selected = pickPreferredRunTemplate(candidates, 'ws-a');
      expect(selected?.config.llmModelIdentifier).toBe('model-b');
    });

    it('returns null when no candidate has model', () => {
      const candidates = [
        {
          config: { workspaceId: 'ws-a', llmModelIdentifier: '' },
          state: { conversation: { updatedAt: '2026-01-03T00:00:00.000Z' } },
        },
      ];

      expect(pickPreferredRunTemplate(candidates, 'ws-a')).toBeNull();
    });
  });

  describe('resolveRunnableModelIdentifier', () => {
    it('returns first non-empty candidate model without fetching', async () => {
      const ensureModelsLoaded = vi.fn();
      const result = await resolveRunnableModelIdentifier({
        candidateModels: ['', 'model-candidate', 'model-late'],
        getKnownModels: () => ['model-known'],
        ensureModelsLoaded,
      });

      expect(result).toBe('model-candidate');
      expect(ensureModelsLoaded).not.toHaveBeenCalled();
    });

    it('fetches known models when candidates are empty', async () => {
      const ensureModelsLoaded = vi.fn().mockResolvedValue(undefined);
      const result = await resolveRunnableModelIdentifier({
        candidateModels: ['', null, undefined],
        getKnownModels: () => ['model-known'],
        ensureModelsLoaded,
      });

      expect(ensureModelsLoaded).toHaveBeenCalledTimes(1);
      expect(result).toBe('model-known');
    });

    it('returns empty string when no model can be resolved', async () => {
      const ensureModelsLoaded = vi.fn().mockRejectedValue(new Error('network'));
      const result = await resolveRunnableModelIdentifier({
        candidateModels: ['', null],
        getKnownModels: () => [],
        ensureModelsLoaded,
      });

      expect(result).toBe('');
    });
  });
});
