import { BaseState } from './base-state.js';
import type { ParserContext } from '../parser-context.js';
import { SegmentType } from '../events.js';
import { TextState } from './text-state.js';

export class JsonToolParsingState extends BaseState {
  private signatureBuffer: string;
  private signatureConsumed: boolean;
  private braceCount = 0;
  private bracketCount = 0;
  private inString = false;
  private escapeNext = false;
  private segmentStarted = false;
  private initialized = false;
  private isArray: boolean;

  constructor(context: ParserContext, signatureBuffer: string, signatureConsumed = false) {
    super(context);
    this.signatureBuffer = signatureBuffer;
    this.signatureConsumed = signatureConsumed;
    this.isArray = signatureBuffer.startsWith('[');
  }

  run(): void {
    if (!this.segmentStarted) {
      this.context.emitSegmentStart(SegmentType.TOOL_CALL);
      this.segmentStarted = true;
    }

    const consumed: string[] = [];

    if (!this.initialized) {
      if (this.signatureConsumed) {
        consumed.push(this.signatureBuffer);
        for (const char of this.signatureBuffer) {
          this.updateBraceCount(char);
        }
      } else {
        const signature = this.context.consume(this.signatureBuffer.length);
        if (signature) {
          consumed.push(signature);
          for (const char of signature) {
            this.updateBraceCount(char);
          }
        }
      }
      this.initialized = true;
    }

    while (this.context.hasMoreChars()) {
      const char = this.context.peekChar();
      if (char === undefined) {
        break;
      }
      this.context.advance();
      consumed.push(char);
      this.updateBraceCount(char);

      if (this.isJsonComplete()) {
        if (consumed.length) {
          this.context.emitSegmentContent(consumed.join(''));
        }
        this.context.emitSegmentEnd();
        this.context.transitionTo(new TextState(this.context));
        return;
      }
    }

    if (consumed.length) {
      this.context.emitSegmentContent(consumed.join(''));
    }
  }

  finalize(): void {
    if (this.context.hasMoreChars()) {
      const remaining = this.context.consumeRemaining();
      if (remaining) {
        this.context.emitSegmentContent(remaining);
      }
    }
    if (this.segmentStarted) {
      this.context.emitSegmentEnd();
    }
    this.context.transitionTo(new TextState(this.context));
  }

  private updateBraceCount(char: string): void {
    if (this.escapeNext) {
      this.escapeNext = false;
      return;
    }

    if (char === '\\\\' && this.inString) {
      this.escapeNext = true;
      return;
    }

    if (char === '"' && !this.escapeNext) {
      this.inString = !this.inString;
      return;
    }

    if (this.inString) {
      return;
    }

    if (char === '{') {
      this.braceCount += 1;
    } else if (char === '}') {
      this.braceCount -= 1;
    } else if (char === '[') {
      this.bracketCount += 1;
    } else if (char === ']') {
      this.bracketCount -= 1;
    }
  }

  private isJsonComplete(): boolean {
    if (this.inString) {
      return false;
    }
    if (this.isArray) {
      return this.bracketCount === 0 && this.braceCount === 0;
    }
    return this.braceCount === 0;
  }
}
