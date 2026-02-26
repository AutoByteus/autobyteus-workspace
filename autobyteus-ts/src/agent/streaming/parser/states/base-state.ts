import type { ParserContext } from '../parser-context.js';

export abstract class BaseState {
  protected context: ParserContext;

  constructor(context: ParserContext) {
    this.context = context;
  }

  abstract run(): void;
  abstract finalize(): void;
}
