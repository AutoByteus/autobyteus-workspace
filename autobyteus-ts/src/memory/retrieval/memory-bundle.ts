import { EpisodicItem } from '../models/episodic-item.js';
import { SemanticItem } from '../models/semantic-item.js';

export class MemoryBundle {
  episodic: EpisodicItem[];
  semantic: SemanticItem[];

  constructor(options?: { episodic?: EpisodicItem[]; semantic?: SemanticItem[] }) {
    this.episodic = options?.episodic ?? [];
    this.semantic = options?.semantic ?? [];
  }
}
