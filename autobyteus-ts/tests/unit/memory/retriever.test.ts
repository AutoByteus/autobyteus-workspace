import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { Retriever } from '../../../src/memory/retrieval/retriever.js';
import { FileMemoryStore } from '../../../src/memory/store/file-store.js';
import { EpisodicItem } from '../../../src/memory/models/episodic-item.js';
import { SemanticItem } from '../../../src/memory/models/semantic-item.js';

const makeTempDir = () => fs.mkdtempSync(path.join(os.tmpdir(), 'retriever-'));

describe('Retriever', () => {
  it('returns limited episodic and semantic items', () => {
    const tempDir = makeTempDir();
    try {
      const store = new FileMemoryStore(tempDir, 'agent_retriever');
      const retriever = new Retriever(store);

      store.add([
        new EpisodicItem({ id: 'ep_1', ts: Date.now() / 1000, turnIds: ['turn_0001'], summary: 'first' }),
        new EpisodicItem({ id: 'ep_2', ts: Date.now() / 1000, turnIds: ['turn_0002'], summary: 'second' })
      ]);
      store.add([
        new SemanticItem({ id: 'sem_1', ts: Date.now() / 1000, fact: 'fact 1' }),
        new SemanticItem({ id: 'sem_2', ts: Date.now() / 1000, fact: 'fact 2' }),
        new SemanticItem({ id: 'sem_3', ts: Date.now() / 1000, fact: 'fact 3' })
      ]);

      const bundle = retriever.retrieve(1, 2);

      expect(bundle.episodic).toHaveLength(1);
      expect(bundle.episodic[0].summary).toBe('second');
      expect(bundle.semantic).toHaveLength(2);
      expect(bundle.semantic[0].fact).toBe('fact 2');
      expect(bundle.semantic[1].fact).toBe('fact 3');
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });
});
