import { MemoryType } from '../models/memory-types.js';
import { MemoryBundle } from './memory-bundle.js';
import { MemoryStore } from '../store/base-store.js';
import { EpisodicItem } from '../models/episodic-item.js';
import { SemanticItem } from '../models/semantic-item.js';

export class Retriever {
  private store: MemoryStore;

  constructor(store: MemoryStore) {
    this.store = store;
  }

  retrieve(maxEpisodic: number, maxSemantic: number): MemoryBundle {
    const episodic = this.store.list(MemoryType.EPISODIC, maxEpisodic) as EpisodicItem[];
    const semantic = (this.store.list(MemoryType.SEMANTIC) as SemanticItem[])
      .sort((left, right) => {
        if (right.salience !== left.salience) {
          return right.salience - left.salience;
        }
        return right.ts - left.ts;
      })
      .slice(0, maxSemantic);
    return new MemoryBundle({ episodic, semantic });
  }
}
