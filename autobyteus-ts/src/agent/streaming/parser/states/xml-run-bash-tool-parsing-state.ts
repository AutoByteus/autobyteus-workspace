import { XmlToolParsingState } from './xml-tool-parsing-state.js';
import type { ParserContext } from '../parser-context.js';
import { SegmentType } from '../events.js';
import { TextState } from './text-state.js';

export class XmlRunBashToolParsingState extends XmlToolParsingState {
  static SEGMENT_TYPE = SegmentType.RUN_BASH;

  private foundContentStart = false;
  private contentBuffering = '';
  private swallowingRemaining = false;
  private extractedMetadata: Record<string, any> = {};

  constructor(context: ParserContext, openingTag: string) {
    super(context, openingTag);
    this.extractMetadataFromAttributes(openingTag);
    if (this.toolName !== undefined && this.toolName !== 'run_bash') {
      // No-op: specialized state expects run_bash but falls back gracefully.
    }
  }

  protected _getStartMetadata(): Record<string, any> {
    return {
      ...super._getStartMetadata(),
      ...this.extractedMetadata
    };
  }

  run(): void {
    if (this.swallowingRemaining) {
      this.handleSwallowing();
      return;
    }

    if (!this.segmentStarted) {
      this.context.emitSegmentStart((this.constructor as typeof XmlRunBashToolParsingState).SEGMENT_TYPE, this._getStartMetadata());
      this.segmentStarted = true;
    }

    if (!this.context.hasMoreChars()) {
      return;
    }

    const chunk = this.context.consumeRemaining();

    if (!this.foundContentStart) {
      this.contentBuffering += chunk;
      this.extractMetadataFromArgumentBuffer(this.contentBuffering);
      const match = /<arg\s+name=["']command["']>/i.exec(this.contentBuffering);
      if (match) {
        this.foundContentStart = true;
        const endOfTag = match.index + match[0].length;
        const realContent = this.contentBuffering.slice(endOfTag);
        this.contentBuffering = '';
        this.processContentChunk(realContent);
      } else {
        if (this.contentBuffering.includes('</tool>')) {
          this._onSegmentComplete();
          this.context.emitSegmentEnd();
          this.context.transitionTo(new TextState(this.context));
        }
      }
      return;
    }

    this.processContentChunk(chunk);
  }

  private processContentChunk(chunk: string): void {
    const closingTag = '</arg>';
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

  private handleSwallowing(): void {
    this.contentBuffering += this.context.consumeRemaining();
    this.extractMetadataFromArgumentBuffer(this.contentBuffering);

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

  private extractMetadataFromAttributes(openingTag: string): void {
    const backgroundRaw = this.readAttribute(openingTag, 'background');
    if (backgroundRaw !== null) {
      const normalized = backgroundRaw.trim().toLowerCase();
      if (['true', '1', 'yes'].includes(normalized)) {
        this.extractedMetadata.background = true;
      } else if (['false', '0', 'no'].includes(normalized)) {
        this.extractedMetadata.background = false;
      }
    }

    const timeoutRaw =
      this.readAttribute(openingTag, 'timeout_seconds') ??
      this.readAttribute(openingTag, 'timeoutSeconds');
    if (timeoutRaw !== null) {
      const parsed = Number.parseInt(timeoutRaw.trim(), 10);
      if (Number.isFinite(parsed) && parsed > 0) {
        this.extractedMetadata.timeout_seconds = parsed;
      }
    }
  }

  private extractMetadataFromArgumentBuffer(buffer: string): void {
    let updated = false;

    const backgroundMatch = /<arg\s+name=["']background["']>([\s\S]*?)<\/arg>/i.exec(buffer);
    if (backgroundMatch && this.extractedMetadata.background === undefined) {
      const normalized = (backgroundMatch[1] ?? '').trim().toLowerCase();
      if (['true', '1', 'yes'].includes(normalized)) {
        this.extractedMetadata.background = true;
        updated = true;
      } else if (['false', '0', 'no'].includes(normalized)) {
        this.extractedMetadata.background = false;
        updated = true;
      }
    }

    const timeoutMatch =
      /<arg\s+name=["']timeout_seconds["']>([\s\S]*?)<\/arg>/i.exec(buffer) ??
      /<arg\s+name=["']timeoutSeconds["']>([\s\S]*?)<\/arg>/i.exec(buffer);
    if (timeoutMatch && this.extractedMetadata.timeout_seconds === undefined) {
      const parsed = Number.parseInt((timeoutMatch[1] ?? '').trim(), 10);
      if (Number.isFinite(parsed) && parsed > 0) {
        this.extractedMetadata.timeout_seconds = parsed;
        updated = true;
      }
    }

    if (updated) {
      this.context.updateCurrentSegmentMetadata(this.extractedMetadata);
    }
  }

  private readAttribute(openingTag: string, attributeName: string): string | null {
    const escapedName = attributeName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const pattern = new RegExp(`${escapedName}\\s*=\\s*["']([^"']+)["']`, 'i');
    const match = pattern.exec(openingTag);
    return match?.[1] ?? null;
  }
}
