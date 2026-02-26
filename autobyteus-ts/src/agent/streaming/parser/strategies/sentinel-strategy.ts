import type { ParserContext } from '../parser-context.js';
import type { BaseState } from '../states/base-state.js';
import { SentinelInitializationState } from '../states/sentinel-initialization-state.js';
import { START_MARKER } from '../sentinel-format.js';
import type { DetectionStrategy } from './base.js';

export class SentinelStrategy implements DetectionStrategy {
  name = 'sentinel';

  nextMarker(context: ParserContext, startPos: number): number {
    return context.find(START_MARKER, startPos);
  }

  createState(context: ParserContext): BaseState {
    return new SentinelInitializationState(context);
  }
}
