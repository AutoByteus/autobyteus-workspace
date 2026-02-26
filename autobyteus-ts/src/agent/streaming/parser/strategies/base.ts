import type { ParserContext } from '../parser-context.js';
import type { BaseState } from '../states/base-state.js';

export interface DetectionStrategy {
  name: string;
  nextMarker(context: ParserContext, startPos: number): number;
  createState(context: ParserContext): BaseState;
}
