import type { ParserContext } from '../parser-context.js';
import type { BaseState } from '../states/base-state.js';
import { JsonInitializationState } from '../states/json-initialization-state.js';
import type { DetectionStrategy } from './base.js';

export class JsonToolStrategy implements DetectionStrategy {
  name = 'json_tool';

  nextMarker(context: ParserContext, startPos: number): number {
    if (!context.parseToolCalls) {
      return -1;
    }
    const nextCurly = context.find('{', startPos);
    const nextBracket = context.find('[', startPos);
    const candidates = [nextCurly, nextBracket].filter((idx) => idx !== -1);
    return candidates.length ? Math.min(...candidates) : -1;
  }

  createState(context: ParserContext): BaseState {
    return new JsonInitializationState(context);
  }
}
