import { XmlToolParsingState } from "autobyteus-ts/agent/streaming/parser/states/xml-tool-parsing-state.js";
import type { ParserContext } from "autobyteus-ts/agent/streaming/parser/parser-context.js";
import { SegmentType } from "autobyteus-ts/agent/streaming/parser/events.js";
import { TextState } from "autobyteus-ts/agent/streaming/parser/states/text-state.js";

export class XmlPatchPromptToolParsingState extends XmlToolParsingState {
  static SEGMENT_TYPE = SegmentType.TOOL_CALL;
  static START_CONTENT_MARKER = "__START_PATCH__";
  static END_CONTENT_MARKER = "__END_PATCH__";
  static CONTENT_ARG_CLOSE_TAG = "</arg>";

  private foundContentStart = false;
  private contentBuffering = "";
  private capturedPromptId?: string;
  private accumulatedPatchContent = "";
  private contentMode: "seek_marker" | "marker" | "passthrough" = "seek_marker";
  private contentSeekBuffer = "";
  private markerTail = "";
  private swallowingRemaining = false;

  constructor(context: ParserContext, openingTag: string) {
    super(context, openingTag);
  }

  private getStartMetadata(): Record<string, any> {
    return this.toolName ? { tool_name: this.toolName } : {};
  }

  private getEndMetadata(): Record<string, any> {
    const meta: Record<string, any> = this.toolName ? { tool_name: this.toolName } : {};
    const args: Record<string, unknown> = {};

    if (this.capturedPromptId) args.prompt_id = this.capturedPromptId;
    if (this.accumulatedPatchContent) args.patch = this.accumulatedPatchContent;

    if (Object.keys(args).length > 0) {
      meta.arguments = args;
    }

    return meta;
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

      if (!this.capturedPromptId) {
        const idMatch = /<arg\s+name=["']prompt_id["']>([^<]+)<\/arg>/i.exec(
          this.contentBuffering,
        );
        if (idMatch) {
          this.capturedPromptId = idMatch[1].trim();
        }
      }

      const contentMatch = /<arg\s+name=["']patch["']>/i.exec(this.contentBuffering);
      if (contentMatch) {
        this.foundContentStart = true;
        const endOfTag = contentMatch.index + contentMatch[0].length;

        if (!this.segmentStarted) {
          this.context.emitSegmentStart(
            (this.constructor as typeof XmlPatchPromptToolParsingState).SEGMENT_TYPE,
            this.getStartMetadata(),
          );
          this.segmentStarted = true;
        }

        const realContent = this.contentBuffering.slice(endOfTag);
        this.contentBuffering = "";
        this.contentMode = "seek_marker";
        this.contentSeekBuffer = "";
        this.markerTail = "";
        this.tail = "";
        this.processSeekMarkerContent(realContent);
        return;
      }

      if (this.contentBuffering.includes("</tool>")) {
        if (!this.segmentStarted) {
          this.context.emitSegmentStart(
            (this.constructor as typeof XmlPatchPromptToolParsingState).SEGMENT_TYPE,
            this.getStartMetadata(),
          );
          this.segmentStarted = true;
        }
        this.finalizeSegment();
        this.context.transitionTo(new TextState(this.context));
      }

      return;
    }

    if (this.contentMode === "marker") {
      this.processMarkerContent(chunk);
    } else if (this.contentMode === "passthrough") {
      this.processDefaultContent(chunk);
    } else {
      this.processSeekMarkerContent(chunk);
    }
  }

  private processSeekMarkerContent(chunk: string): void {
    this.contentSeekBuffer += chunk;

    const startMarker = (this.constructor as typeof XmlPatchPromptToolParsingState).START_CONTENT_MARKER;
    const startIdx = this.contentSeekBuffer.indexOf(startMarker);
    if (startIdx !== -1) {
      let afterStart = this.contentSeekBuffer.slice(startIdx + startMarker.length);
      if (afterStart.startsWith("\n")) {
        afterStart = afterStart.slice(1);
      }
      this.contentSeekBuffer = "";
      this.contentMode = "marker";
      this.markerTail = "";
      this.tail = "";
      if (afterStart) {
        this.processMarkerContent(afterStart);
      }
      return;
    }

    const closingIdx = this.contentSeekBuffer.indexOf(
      (this.constructor as typeof XmlPatchPromptToolParsingState).CONTENT_ARG_CLOSE_TAG,
    );
    if (closingIdx !== -1) {
      const buffered = this.contentSeekBuffer;
      this.contentSeekBuffer = "";
      this.contentMode = "passthrough";
      this.tail = "";
      this.processDefaultContent(buffered);
      return;
    }

    const stripped = this.contentSeekBuffer.replace(/^\s+/, "");
    if (stripped && !startMarker.startsWith(stripped)) {
      const buffered = this.contentSeekBuffer;
      this.contentSeekBuffer = "";
      this.contentMode = "passthrough";
      this.tail = "";
      this.processDefaultContent(buffered);
    }
  }

  private processDefaultContent(chunk: string): void {
    const closingTag = (this.constructor as typeof XmlPatchPromptToolParsingState).CONTENT_ARG_CLOSE_TAG;
    const combined = `${this.tail}${chunk}`;

    const idx = combined.indexOf(closingTag);
    if (idx !== -1) {
      const actualContent = combined.slice(0, idx);
      if (actualContent) {
        this.emitPatchContent(actualContent);
      }

      this.tail = "";
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
        this.emitPatchContent(safe);
      }
      this.tail = combined.slice(-holdbackLen);
    } else {
      this.tail = combined;
    }
  }

  private processMarkerContent(chunk: string): void {
    const combined = `${this.markerTail}${chunk}`;
    const endMarker = (this.constructor as typeof XmlPatchPromptToolParsingState).END_CONTENT_MARKER;
    const closingTag = (this.constructor as typeof XmlPatchPromptToolParsingState).CONTENT_ARG_CLOSE_TAG;

    const endIdx = combined.indexOf(endMarker);
    if (endIdx !== -1) {
      const actualContent = combined.slice(0, endIdx);
      if (actualContent) {
        this.emitPatchContent(actualContent);
      }

      this.markerTail = "";
      const remainder = combined.slice(endIdx + endMarker.length);
      this.contentMode = "passthrough";
      if (remainder) {
        this.processDefaultContent(remainder);
      }
      return;
    }

    const idxClose = combined.indexOf(closingTag);
    if (idxClose !== -1) {
      let actualContent = combined.slice(0, idxClose);
      if (/\n\s*$/.test(actualContent)) {
        actualContent = actualContent.replace(/\n\s*$/, "");
      }
      if (actualContent) {
        this.emitPatchContent(actualContent);
      }
      this.markerTail = "";
      const remainder = combined.slice(idxClose + closingTag.length);
      this.contentMode = "passthrough";
      if (remainder) {
        this.processDefaultContent(remainder);
      }
      return;
    }

    const holdbackLen = Math.max(endMarker.length - 1, 20);
    if (combined.length > holdbackLen) {
      const safe = combined.slice(0, -holdbackLen);
      if (safe) {
        this.emitPatchContent(safe);
      }
      this.markerTail = combined.slice(-holdbackLen);
    } else {
      this.markerTail = combined;
    }
  }

  private handleSwallowing(): void {
    this.contentBuffering += this.context.consumeRemaining();

    const closingTag = "</tool>";
    const idx = this.contentBuffering.indexOf(closingTag);
    if (idx !== -1) {
      const remainder = this.contentBuffering.slice(idx + closingTag.length);
      this.finalizeSegment();
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

  private emitPatchContent(content: string): void {
    this.context.emitSegmentContent(content);
    this.accumulatedPatchContent += content;
  }

  private finalizeSegment(): void {
    this._onSegmentComplete();
    const endMeta = this.getEndMetadata();
    if (Object.keys(endMeta).length > 0) {
      this.context.updateCurrentSegmentMetadata(endMeta);
    }
    this.context.emitSegmentEnd();
  }

  protected _onSegmentComplete(): void {
    return;
  }
}
