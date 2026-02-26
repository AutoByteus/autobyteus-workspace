import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { WorkingContextSnapshotStore } from '../../../src/memory/store/working-context-snapshot-store.js';

const makeTempDir = () => fs.mkdtempSync(path.join(os.tmpdir(), 'snapshot-store-'));

describe('WorkingContextSnapshotStore', () => {
  it('writes, reads, and checks existence', () => {
    const tempDir = makeTempDir();
    try {
      const store = new WorkingContextSnapshotStore(tempDir, 'agent_1');
      expect(store.exists('agent_1')).toBe(false);

      const payload = { schema_version: 1, agent_id: 'agent_1', messages: [] };
      store.write('agent_1', payload);

      expect(store.exists('agent_1')).toBe(true);
      expect(store.read('agent_1')).toEqual(payload);
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });
});
