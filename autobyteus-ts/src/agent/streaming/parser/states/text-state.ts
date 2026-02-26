import { BaseState } from './base-state.js';
import type { ParserContext } from '../parser-context.js';

export class TextState extends BaseState {
  constructor(context: ParserContext) {
    super(context);
  }

  run(): void {
    const startPos = this.context.getPosition();

    if (!this.context.hasMoreChars()) {
      return;
    }

    const strategies = this.context.detectionStrategies;
    let bestIdx = -1;
    let bestStrategy: any = null;

    for (const strategy of strategies) {
      const idx = strategy.nextMarker(this.context, startPos);
      if (idx === -1) {
        continue;
      }
      if (bestIdx === -1 || idx < bestIdx) {
        bestIdx = idx;
        bestStrategy = strategy;
      }
    }

    if (bestIdx === -1) {
      const text = this.context.substring(startPos);
      if (text) {
        this.context.appendTextSegment(text);
      }
      this.context.setPosition(this.context.getBufferLength());
      return;
    }

    if (bestIdx > startPos) {
      const text = this.context.substring(startPos, bestIdx);
      if (text) {
        this.context.appendTextSegment(text);
      }
    }

    this.context.setPosition(bestIdx);

    if (!bestStrategy) {
      throw new Error('No detection strategy available for marker.');
    }
    this.context.transitionTo(bestStrategy.createState(this.context));
  }

  finalize(): void {
    // No-op: text already emitted in run
  }
}
