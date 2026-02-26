import { BaseState } from './base-state.js';
import type { ParserContext } from '../parser-context.js';
import { TextState } from './text-state.js';
import { SegmentType } from '../events.js';
import { START_MARKER, MARKER_END } from '../sentinel-format.js';
import { SentinelContentState } from './sentinel-content-state.js';

export class SentinelInitializationState extends BaseState {
  private headerBuffer = '';

  run(): void {
    if (!this.context.hasMoreChars()) {
      return;
    }

    const startPos = this.context.getPosition();
    const endIdx = this.context.find(MARKER_END, startPos);

    if (endIdx === -1) {
      this.headerBuffer += this.context.consumeRemaining();
      if (!this.isPossiblePrefix(this.headerBuffer)) {
        this.context.appendTextSegment(this.headerBuffer);
        this.context.transitionTo(new TextState(this.context));
      }
      return;
    }

    this.headerBuffer += this.context.consume(endIdx - startPos + MARKER_END.length);

    if (!this.headerBuffer.startsWith(START_MARKER)) {
      this.context.appendTextSegment(this.headerBuffer);
      this.context.transitionTo(new TextState(this.context));
      return;
    }

    let headerJson = this.headerBuffer.slice(START_MARKER.length);
    if (headerJson.endsWith(MARKER_END)) {
      headerJson = headerJson.slice(0, -MARKER_END.length);
    }
    headerJson = headerJson.trim();

    if (!headerJson) {
      this.context.appendTextSegment(this.headerBuffer);
      this.context.transitionTo(new TextState(this.context));
      return;
    }

    const data = this.parseHeaderJson(headerJson);
    if (!data) {
      this.context.appendTextSegment(this.headerBuffer);
      this.context.transitionTo(new TextState(this.context));
      return;
    }

    const typeStr = typeof data.type === 'string' ? data.type : undefined;
    const segmentType = this.mapSegmentType(typeStr);

    if (!segmentType) {
      this.context.appendTextSegment(this.headerBuffer);
      this.context.transitionTo(new TextState(this.context));
      return;
    }

    const metadata = { ...data } as Record<string, any>;
    delete metadata.type;

    if (this.context.getCurrentSegmentType() === SegmentType.TEXT) {
      this.context.emitSegmentEnd();
    }

    this.context.transitionTo(new SentinelContentState(this.context, segmentType, metadata));
  }

  finalize(): void {
    if (this.context.hasMoreChars()) {
      this.headerBuffer += this.context.consumeRemaining();
    }

    if (this.headerBuffer) {
      this.context.appendTextSegment(this.headerBuffer);
    }
    this.context.transitionTo(new TextState(this.context));
  }

  private isPossiblePrefix(buffer: string): boolean {
    return START_MARKER.startsWith(buffer) || buffer.startsWith(START_MARKER);
  }

  private parseHeaderJson(headerJson: string): Record<string, any> | null {
    try {
      const data = JSON.parse(headerJson);
      return data && typeof data === 'object' && !Array.isArray(data) ? data : null;
    } catch {
      return null;
    }
  }

  private mapSegmentType(typeStr?: string): SegmentType | undefined {
    if (!typeStr) {
      return undefined;
    }
    const value = typeStr.trim().toLowerCase();
    const mapping: Record<string, SegmentType> = {
      text: SegmentType.TEXT,
      tool: SegmentType.TOOL_CALL,
      tool_call: SegmentType.TOOL_CALL,
      write_file: SegmentType.WRITE_FILE,
      edit_file: SegmentType.EDIT_FILE,
      run_bash: SegmentType.RUN_BASH,
      run_terminal_cmd: SegmentType.RUN_BASH
    };
    return mapping[value];
  }
}
