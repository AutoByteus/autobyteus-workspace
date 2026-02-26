import { BaseState } from './base-state.js';
import type { ParserContext } from '../parser-context.js';
import { SegmentType } from '../events.js';
import { TextState } from './text-state.js';
import { JsonToolParsingState } from './json-tool-parsing-state.js';
import { ParserConfig } from '../parser-context.js';

export class JsonToolSignatureChecker {
  private patterns: string[];

  constructor(patterns?: string[]) {
    this.patterns = patterns ?? ParserConfig.DEFAULT_JSON_PATTERNS;
  }

  checkSignature(buffer: string): 'match' | 'partial' | 'no_match' {
    const normalized = buffer.replace(/[\s]/g, '');

    for (const pattern of this.patterns) {
      const normalizedPattern = pattern.replace(/\s/g, '');
      if (normalized.startsWith(normalizedPattern)) {
        return 'match';
      }
      if (normalizedPattern.startsWith(normalized)) {
        return 'partial';
      }
    }

    if (normalized.length < 8) {
      if (
        ['', '{', '[', '{"', '[{', '{"n', '{"na', '{"nam'].includes(normalized)
      ) {
        return 'partial';
      }
    }

    return 'no_match';
  }
}

export class JsonInitializationState extends BaseState {
  private signatureBuffer: string;
  private checker: JsonToolSignatureChecker;

  constructor(context: ParserContext) {
    super(context);
    const trigger = this.context.peekChar();
    this.context.advance();
    this.signatureBuffer = trigger ?? '';
    this.checker = new JsonToolSignatureChecker(context.jsonToolPatterns);
  }

  run(): void {
    while (this.context.hasMoreChars()) {
      const char = this.context.peekChar();
      if (char === undefined) {
        break;
      }
      this.signatureBuffer += char;
      this.context.advance();

      const match = this.checker.checkSignature(this.signatureBuffer);

      if (match === 'match') {
        if (this.context.parseToolCalls) {
          if (this.context.getCurrentSegmentType() === SegmentType.TEXT) {
            this.context.emitSegmentEnd();
          }
          this.context.transitionTo(
            new JsonToolParsingState(this.context, this.signatureBuffer, true)
          );
        } else {
          this.context.appendTextSegment(this.signatureBuffer);
          this.context.transitionTo(new TextState(this.context));
        }
        return;
      }

      if (match === 'no_match') {
        this.context.appendTextSegment(this.signatureBuffer);
        this.context.transitionTo(new TextState(this.context));
        return;
      }
    }
  }

  finalize(): void {
    if (this.signatureBuffer) {
      this.context.appendTextSegment(this.signatureBuffer);
      this.signatureBuffer = '';
    }
    this.context.transitionTo(new TextState(this.context));
  }
}
