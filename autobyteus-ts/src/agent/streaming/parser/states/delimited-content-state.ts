import { BaseState } from './base-state.js';
import type { ParserContext } from '../parser-context.js';
import { SegmentType } from '../events.js';
import { TextState } from './text-state.js';

export class DelimitedContentState extends BaseState {
  static CLOSING_TAG = '';
  static SEGMENT_TYPE: SegmentType | undefined = undefined;

  protected openingTag: string;
  protected segmentStarted = false;
  protected tail = '';
  protected segmentTypeOverride?: SegmentType;
  protected closingTag: string;
  protected closingTagLower: string;
  protected holdbackLen: number;

  constructor(context: ParserContext, openingTag: string, closingTagOverride?: string) {
    super(context);
    this.openingTag = openingTag;
    this.closingTag = closingTagOverride ?? (this.constructor as typeof DelimitedContentState).CLOSING_TAG;
    this.closingTagLower = this.closingTag.toLowerCase();
    this.holdbackLen = Math.max(this.closingTag.length - 1, 0);
  }

  protected _canStartSegment(): boolean {
    return true;
  }

  protected _getStartMetadata(): Record<string, any> {
    return {};
  }

  protected _openingContent(): string | undefined {
    return undefined;
  }

  protected _onSegmentComplete(): void {
    return;
  }

  protected _shouldEmitClosingTag(): boolean {
    return false;
  }

  run(): void {
    if (!this.segmentStarted) {
      if (!this._canStartSegment()) {
        this.context.appendTextSegment(this.openingTag);
        this.context.transitionTo(new TextState(this.context));
        return;
      }

      const segmentType =
        this.segmentTypeOverride ?? (this.constructor as typeof DelimitedContentState).SEGMENT_TYPE;
      if (!segmentType) {
        throw new Error('SEGMENT_TYPE is not defined for DelimitedContentState.');
      }

      this.context.emitSegmentStart(segmentType, this._getStartMetadata());
      this.segmentStarted = true;

      const openingContent = this._openingContent();
      if (openingContent) {
        this.context.emitSegmentContent(openingContent);
      }
    }

    if (!this.context.hasMoreChars()) {
      return;
    }

    const available = this.context.consumeRemaining();
    const combined = this.tail + available;
    const idx = combined ? combined.toLowerCase().indexOf(this.closingTagLower) : -1;

    if (idx !== -1) {
      const contentBefore = combined.slice(0, idx);
      if (contentBefore) {
        this.context.emitSegmentContent(contentBefore);
      }

      if (this._shouldEmitClosingTag() && this.closingTag) {
        this.context.emitSegmentContent(this.closingTag);
      }

      const tailLen = this.tail.length;
      const closingLen = this.closingTag.length;
      const consumedFromAvailable = idx < tailLen ? idx + closingLen - tailLen : idx - tailLen + closingLen;
      const extra = available.length - consumedFromAvailable;
      if (extra > 0) {
        this.context.rewindBy(extra);
      }

      this.tail = '';
      this._onSegmentComplete();
      this.context.emitSegmentEnd();
      this.context.transitionTo(new TextState(this.context));
      return;
    }

    if (this.holdbackLen === 0) {
      if (combined) {
        this.context.emitSegmentContent(combined);
      }
      this.tail = '';
      return;
    }

    if (combined.length > this.holdbackLen) {
      const safe = combined.slice(0, -this.holdbackLen);
      if (safe) {
        this.context.emitSegmentContent(safe);
      }
      this.tail = combined.slice(-this.holdbackLen);
    } else {
      this.tail = combined;
    }
  }

  finalize(): void {
    const remaining = this.context.hasMoreChars() ? this.context.consumeRemaining() : '';

    if (!this.segmentStarted) {
      const text = `${this.openingTag}${this.tail}${remaining}`;
      if (text) {
        this.context.appendTextSegment(text);
      }
    } else {
      if (this.tail || remaining) {
        this.context.emitSegmentContent(`${this.tail}${remaining}`);
      }
      this.tail = '';
      this.context.emitSegmentEnd();
    }

    this.context.transitionTo(new TextState(this.context));
  }
}
