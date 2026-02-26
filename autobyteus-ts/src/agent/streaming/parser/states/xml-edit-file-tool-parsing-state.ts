import { XmlToolParsingState } from './xml-tool-parsing-state.js';
import type { ParserContext } from '../parser-context.js';
import { SegmentType } from '../events.js';
import { TextState } from './text-state.js';

export class XmlEditFileToolParsingState extends XmlToolParsingState {
  static SEGMENT_TYPE = SegmentType.EDIT_FILE;
  static START_CONTENT_MARKER = '__START_PATCH__';
  static END_CONTENT_MARKER = '__END_PATCH__';
  static CONTENT_ARG_CLOSE_TAG = '</arg>';

  private foundContentStart = false;
  private contentBuffering = '';
  private capturedPath?: string;
  private deferStart = true;
  private swallowingRemaining = false;
  private contentMode: 'seek_marker' | 'marker' | 'default' = 'seek_marker';
  private contentSeekBuffer = '';
  private markerTail = '';

  constructor(context: ParserContext, openingTag: string) {
    super(context, openingTag);
    if (this.toolName !== undefined && this.toolName !== 'edit_file') {
      // No-op: specialized state expects edit_file but falls back gracefully.
    }
  }

  run(): void {
    if (this.swallowingRemaining) {
      this.handleSwallowing();
      return;
    }

    if (!this.context.hasMoreChars()) {
      return;
    }

    const chunk = this.context.consumeRemaining();

    if (!this.foundContentStart) {
      this.contentBuffering += chunk;

      if (!this.capturedPath) {
        const pathMatch = /<arg\s+name=["']path["']>([^<]+)<\/arg>/i.exec(this.contentBuffering);
        if (pathMatch) {
          this.capturedPath = pathMatch[1].trim();
          if (this.deferStart && !this.segmentStarted) {
            const meta = { ...this._getStartMetadata(), path: this.capturedPath };
            this.context.emitSegmentStart((this.constructor as typeof XmlEditFileToolParsingState).SEGMENT_TYPE, meta);
            this.segmentStarted = true;
            this.deferStart = false;
          }
        }
      }

      const contentMatch = /<arg\s+name=["']patch["']>/i.exec(this.contentBuffering);
      if (contentMatch) {
        this.foundContentStart = true;
        const endOfTag = contentMatch.index + contentMatch[0].length;

        if (!this.segmentStarted) {
          this.context.emitSegmentStart((this.constructor as typeof XmlEditFileToolParsingState).SEGMENT_TYPE, this._getStartMetadata());
          this.segmentStarted = true;
        }

        if (this.capturedPath) {
          this.context.updateCurrentSegmentMetadata({ path: this.capturedPath });
        }

        const realContent = this.contentBuffering.slice(endOfTag);
        this.contentBuffering = '';
        this.contentMode = 'seek_marker';
        this.contentSeekBuffer = '';
        this.markerTail = '';
        this.tail = '';
        this.processContentChunk(realContent);
        return;
      }

      if (this.contentBuffering.includes('</tool>')) {
        if (!this.segmentStarted) {
          this.context.emitSegmentStart((this.constructor as typeof XmlEditFileToolParsingState).SEGMENT_TYPE, this._getStartMetadata());
          this.segmentStarted = true;
        }
        this._onSegmentComplete();
        this.context.emitSegmentEnd();
        this.context.transitionTo(new TextState(this.context));
      }

      return;
    }

    this.processContentChunk(chunk);
  }

  private processContentChunk(chunk: string): void {
    if (!chunk) {
      return;
    }

    if (this.contentMode === 'marker') {
      this.processMarkerContent(chunk);
      return;
    }

    if (this.contentMode === 'default') {
      this.processDefaultContent(chunk);
      return;
    }

    this.processSeekMarkerContent(chunk);
  }

  private processSeekMarkerContent(chunk: string): void {
    this.contentSeekBuffer += chunk;

    const startMarker = (this.constructor as typeof XmlEditFileToolParsingState).START_CONTENT_MARKER;
    const startIdx = this.contentSeekBuffer.indexOf(startMarker);
    if (startIdx !== -1) {
      let afterStart = this.contentSeekBuffer.slice(startIdx + startMarker.length);
      if (afterStart.startsWith('\n')) {
        afterStart = afterStart.slice(1);
      }
      this.contentSeekBuffer = '';
      this.contentMode = 'marker';
      this.markerTail = '';
      this.tail = '';
      if (afterStart) {
        this.processMarkerContent(afterStart);
      }
      return;
    }

    const closingIdx = this.contentSeekBuffer.indexOf((this.constructor as typeof XmlEditFileToolParsingState).CONTENT_ARG_CLOSE_TAG);
    if (closingIdx !== -1) {
      const buffered = this.contentSeekBuffer;
      this.contentSeekBuffer = '';
      this.contentMode = 'default';
      this.tail = '';
      this.processDefaultContent(buffered);
      return;
    }

    const stripped = this.contentSeekBuffer.replace(/^\s+/, '');
    if (stripped && !startMarker.startsWith(stripped)) {
      const buffered = this.contentSeekBuffer;
      this.contentSeekBuffer = '';
      this.contentMode = 'default';
      this.tail = '';
      this.processDefaultContent(buffered);
    }
  }

  private processDefaultContent(chunk: string): void {
    const closingTag = (this.constructor as typeof XmlEditFileToolParsingState).CONTENT_ARG_CLOSE_TAG;
    const combined = `${this.tail}${chunk}`;

    const idx = combined.indexOf(closingTag);
    if (idx !== -1) {
      const actualContent = combined.slice(0, idx);
      if (actualContent) {
        this.context.emitSegmentContent(actualContent);
      }

      this.tail = '';
      const remainder = combined.slice(idx + closingTag.length);
      this.contentBuffering = remainder;
      this.swallowingRemaining = true;
      this.handleSwallowing();
      return;
    }

    const holdbackLen = closingTag.length - 1;
    if (combined.length > holdbackLen) {
      const safe = combined.slice(0, -holdbackLen);
      if (safe) {
        this.context.emitSegmentContent(safe);
      }
      this.tail = combined.slice(-holdbackLen);
    } else {
      this.tail = combined;
    }
  }

  private processMarkerContent(chunk: string): void {
    const combined = `${this.markerTail}${chunk}`;
    const endMarker = (this.constructor as typeof XmlEditFileToolParsingState).END_CONTENT_MARKER;
    const closingTag = (this.constructor as typeof XmlEditFileToolParsingState).CONTENT_ARG_CLOSE_TAG;

    let searchStart = 0;
    while (true) {
      const idx = combined.indexOf(endMarker, searchStart);
      if (idx === -1) {
        break;
      }

      const remainderAfterMarker = combined.slice(idx + endMarker.length);
      if (/^\s*<\/arg>/.test(remainderAfterMarker)) {
        const actualContent = combined.slice(0, idx);
        if (actualContent) {
          this.context.emitSegmentContent(actualContent);
        }

        this.markerTail = '';
        const remainder = combined.slice(idx + endMarker.length);
        this.contentBuffering = remainder;
        this.swallowingRemaining = true;
        this.handleSwallowing();
        return;
      }

      if (remainderAfterMarker.trim().length === 0) {
        if (idx > 0) {
          const safeContent = combined.slice(0, idx);
          if (safeContent) {
            this.context.emitSegmentContent(safeContent);
          }
          this.markerTail = combined.slice(idx);
        } else {
          this.markerTail = combined;
        }
        return;
      }

      searchStart = idx + endMarker.length;
    }

    const idxClose = combined.indexOf(closingTag);
    if (idxClose !== -1) {
      const remainderAfterClose = combined.slice(idxClose + closingTag.length);
      let isValidClosure = false;

      if (/^\s*(?:<\/arguments>|<\/tool>)/.test(remainderAfterClose)) {
        isValidClosure = true;
      } else if (remainderAfterClose.trim().length === 0) {
        this.markerTail = combined;
        return;
      }

      if (isValidClosure) {
        let actualContent = combined.slice(0, idxClose);
        if (/\n\s*$/.test(actualContent)) {
          actualContent = actualContent.replace(/\n\s*$/, '');
        }

        if (actualContent) {
          this.context.emitSegmentContent(actualContent);
        }

        this.markerTail = '';
        const remainder = combined.slice(idxClose + closingTag.length);
        this.contentBuffering = remainder;
        this.swallowingRemaining = true;
        this.handleSwallowing();
        return;
      }
    }

    const maxHoldback = 35;
    if (combined.length > maxHoldback) {
      const safe = combined.slice(0, -maxHoldback);
      if (safe) {
        this.context.emitSegmentContent(safe);
      }
      this.markerTail = combined.slice(-maxHoldback);
    } else {
      this.markerTail = combined;
    }
  }

  private handleSwallowing(): void {
    this.contentBuffering += this.context.consumeRemaining();

    const closingTag = '</tool>';
    const idx = this.contentBuffering.indexOf(closingTag);
    if (idx !== -1) {
      const remainder = this.contentBuffering.slice(idx + closingTag.length);
      this._onSegmentComplete();
      this.context.emitSegmentEnd();
      if (remainder) {
        this.context.rewindBy(remainder.length);
      }
      this.context.transitionTo(new TextState(this.context));
      return;
    }

    const holdbackLen = closingTag.length - 1;
    if (this.contentBuffering.length > holdbackLen) {
      this.contentBuffering = this.contentBuffering.slice(-holdbackLen);
    }
  }

  protected _onSegmentComplete(): void {
    return;
  }
}
