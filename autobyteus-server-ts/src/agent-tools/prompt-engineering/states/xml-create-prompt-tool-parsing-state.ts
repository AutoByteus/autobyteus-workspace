import { XmlToolParsingState } from "autobyteus-ts/agent/streaming/parser/states/xml-tool-parsing-state.js";
import type { ParserContext } from "autobyteus-ts/agent/streaming/parser/parser-context.js";
import { SegmentType } from "autobyteus-ts/agent/streaming/parser/events.js";
import { TextState } from "autobyteus-ts/agent/streaming/parser/states/text-state.js";

export class XmlCreatePromptToolParsingState extends XmlToolParsingState {
  static SEGMENT_TYPE = SegmentType.TOOL_CALL;
  static START_CONTENT_MARKER = "__START_CONTENT__";
  static END_CONTENT_MARKER = "__END_CONTENT__";
  static CONTENT_ARG_CLOSE_TAG = "</arg>";
  static CLOSING_TAG = "</tool>";

  private static ARG_NAME_PATTERN = /<arg\s+name=["']name["']\s*>([^<]+)<\/arg>/i;
  private static CATEGORY_PATTERN = /<arg\s+name=["']category["']\s*>([^<]+)<\/arg>/i;
  private static DESCRIPTION_PATTERN = /<arg\s+name=["']description["']\s*>([^<]+)<\/arg>/i;
  private static SUITABLE_MODELS_PATTERN = /<arg\s+name=["']suitable_for_models["']\s*>([^<]+)<\/arg>/i;
  private static PROMPT_CONTENT_ARG_OPEN_PATTERN = /<arg\s+name=["']prompt_content["']\s*>/i;

  private contentMode: "seek" | "marker" | "passthrough" = "seek";
  private contentSeekBuffer = "";
  private markerTail = "";
  private contentBuffering = "";
  private foundContentArg = false;

  private capturedName?: string;
  private capturedCategory?: string;
  private capturedDescription?: string;
  private capturedSuitableModels?: string;
  private accumulatedContent = "";

  constructor(context: ParserContext, openingTag: string) {
    super(context, openingTag);
  }

  private getStartMetadata(): Record<string, any> {
    return this.toolName ? { tool_name: this.toolName } : {};
  }

  private getEndMetadata(): Record<string, any> {
    const meta: Record<string, any> = this.toolName ? { tool_name: this.toolName } : {};
    const args: Record<string, unknown> = {};

    if (this.capturedName) args.name = this.capturedName;
    if (this.capturedCategory) args.category = this.capturedCategory;
    if (this.capturedDescription) args.description = this.capturedDescription;
    if (this.capturedSuitableModels) args.suitable_for_models = this.capturedSuitableModels;
    if (this.accumulatedContent) args.prompt_content = this.accumulatedContent;

    if (Object.keys(args).length > 0) {
      meta.arguments = args;
    }

    return meta;
  }

  run(): void {
    if (!this.context.hasMoreChars()) {
      if (this.contentBuffering.includes(XmlCreatePromptToolParsingState.CLOSING_TAG)) {
        if (!this.segmentStarted) {
          this.context.emitSegmentStart(
            (this.constructor as typeof XmlCreatePromptToolParsingState).SEGMENT_TYPE,
            this.getStartMetadata(),
          );
          this.segmentStarted = true;
        }
        this.finalizeSegment();
      }
      return;
    }

    const chunk = this.context.consumeRemaining();

    if (this.foundContentArg) {
      if (this.contentMode === "seek") {
        this.processSeekMarkerContent(chunk);
      } else if (this.contentMode === "marker") {
        this.processMarkerContent(chunk);
      } else {
        this.processPassthrough(chunk);
      }
      return;
    }

    this.contentBuffering += chunk;

    if (!this.capturedName) {
      const match = XmlCreatePromptToolParsingState.ARG_NAME_PATTERN.exec(this.contentBuffering);
      if (match) {
        this.capturedName = match[1].trim();
      }
    }

    if (!this.capturedCategory) {
      const match = XmlCreatePromptToolParsingState.CATEGORY_PATTERN.exec(this.contentBuffering);
      if (match) {
        this.capturedCategory = match[1].trim();
      }
    }

    if (!this.capturedDescription) {
      const match = XmlCreatePromptToolParsingState.DESCRIPTION_PATTERN.exec(this.contentBuffering);
      if (match) {
        this.capturedDescription = match[1].trim();
      }
    }

    if (!this.capturedSuitableModels) {
      const match = XmlCreatePromptToolParsingState.SUITABLE_MODELS_PATTERN.exec(this.contentBuffering);
      if (match) {
        this.capturedSuitableModels = match[1].trim();
      }
    }

    const contentMatch = XmlCreatePromptToolParsingState.PROMPT_CONTENT_ARG_OPEN_PATTERN.exec(
      this.contentBuffering,
    );
    if (contentMatch) {
      const endOfTag = contentMatch.index + contentMatch[0].length;
      const realContent = this.contentBuffering.slice(endOfTag);
      this.contentBuffering = "";
      this.foundContentArg = true;

      if (!this.segmentStarted) {
        this.context.emitSegmentStart(
          (this.constructor as typeof XmlCreatePromptToolParsingState).SEGMENT_TYPE,
          this.getStartMetadata(),
        );
        this.segmentStarted = true;
      }

      if (realContent) {
        this.processSeekMarkerContent(realContent);
      }
    }
  }

  private processSeekMarkerContent(chunk: string): void {
    this.contentSeekBuffer += chunk;

    const startMarker = (this.constructor as typeof XmlCreatePromptToolParsingState).START_CONTENT_MARKER;
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
      (this.constructor as typeof XmlCreatePromptToolParsingState).CONTENT_ARG_CLOSE_TAG,
    );
    if (closingIdx !== -1) {
      const content = this.contentSeekBuffer.slice(0, closingIdx).trim();
      const remainder = this.contentSeekBuffer.slice(closingIdx);
      if (content) {
        this.emitContent(content);
      }
      this.contentSeekBuffer = "";
      this.contentMode = "passthrough";
      this.tail = "";
      if (remainder) {
        this.processPassthrough(remainder);
      }
      return;
    }

    const stripped = this.contentSeekBuffer.replace(/^\s+/, "");
    if (stripped) {
      const isPrefix = startMarker.startsWith(stripped) || stripped.startsWith(startMarker);
      if (!isPrefix) {
        const content = this.contentSeekBuffer;
        this.contentSeekBuffer = "";
        this.contentMode = "passthrough";
        this.tail = "";
        this.processPassthrough(content);
      }
    }
  }

  private processMarkerContent(chunk: string): void {
    const combined = `${this.markerTail}${chunk}`;
    const endMarker = (this.constructor as typeof XmlCreatePromptToolParsingState).END_CONTENT_MARKER;

    const endIdx = combined.indexOf(endMarker);
    if (endIdx !== -1) {
      let content = combined.slice(0, endIdx);
      if (content.endsWith("\n")) {
        content = content.slice(0, -1);
      }
      if (content) {
        this.emitContent(content);
      }
      this.markerTail = "";
      this.contentMode = "passthrough";
      const remainder = combined.slice(endIdx + endMarker.length);
      if (remainder) {
        this.processPassthrough(remainder);
      }
      return;
    }

    const holdbackLen = endMarker.length - 1;
    if (combined.length > holdbackLen) {
      const emitPortion = combined.slice(0, -holdbackLen);
      this.markerTail = combined.slice(-holdbackLen);
      if (emitPortion) {
        this.emitContent(emitPortion);
      }
    } else {
      this.markerTail = combined;
    }
  }

  private processPassthrough(chunk: string): void {
    if (!chunk) {
      return;
    }

    const closingTag = (this.constructor as typeof XmlCreatePromptToolParsingState).CLOSING_TAG;
    if (chunk.includes(closingTag)) {
      const idx = chunk.indexOf(closingTag);
      const remainder = chunk.slice(idx + closingTag.length);
      this.finalizeSegment();
      if (remainder) {
        this.context.appendTextSegment(remainder);
      }
      return;
    }
  }

  private emitContent(content: string): void {
    this.context.emitSegmentContent(content);
    this.accumulatedContent += content;
  }

  private finalizeSegment(): void {
    this._onSegmentComplete();
    const endMeta = this.getEndMetadata();
    if (Object.keys(endMeta).length > 0) {
      this.context.updateCurrentSegmentMetadata(endMeta);
    }
    this.context.emitSegmentEnd();
    this.context.transitionTo(new TextState(this.context));
  }

  protected _onSegmentComplete(): void {
    return;
  }
}
