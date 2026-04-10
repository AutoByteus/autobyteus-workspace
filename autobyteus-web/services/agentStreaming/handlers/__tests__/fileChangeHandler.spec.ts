import { beforeEach, describe, expect, it } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { handleFileChangeUpdated } from '../fileChangeHandler';
import { useRunFileChangesStore } from '~/stores/runFileChangesStore';
import type { AgentContext } from '~/types/agent/AgentContext';

describe('fileChangeHandler', () => {
  let mockContext: AgentContext;

  beforeEach(() => {
    setActivePinia(createPinia());
    mockContext = {} as AgentContext;
  });

  it('upserts live file-change payloads into the dedicated store', () => {
    handleFileChangeUpdated(
      {
        id: 'agent-1:src/test.md',
        runId: 'agent-1',
        path: 'src/test.md',
        type: 'file',
        status: 'available',
        sourceTool: 'edit_file',
        sourceInvocationId: 'edit-1',
        backendArtifactId: 'artifact-1',
        content: 'hello',
        createdAt: '2026-04-10T00:00:00.000Z',
        updatedAt: '2026-04-10T00:00:01.000Z',
      },
      mockContext,
    );

    expect(useRunFileChangesStore().getArtifactsForRun('agent-1')).toEqual([
      expect.objectContaining({
        id: 'agent-1:src/test.md',
        status: 'available',
        sourceTool: 'edit_file',
      }),
    ]);
  });
});
