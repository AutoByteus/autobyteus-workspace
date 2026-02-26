import { DelimitedContentState } from './delimited-content-state.js';
import type { ParserContext } from '../parser-context.js';
import { SegmentType } from '../events.js';

export class XmlToolParsingState extends DelimitedContentState {
  static NAME_PATTERN = /name\s*=\s*["']([^"']+)["']/i;
  static CLOSING_TAG = '</tool>';
  static SEGMENT_TYPE = SegmentType.TOOL_CALL;

  protected toolName?: string;

  constructor(context: ParserContext, openingTag: string) {
    super(context, openingTag);

    const match = (this.constructor as typeof XmlToolParsingState).NAME_PATTERN.exec(openingTag);
    if (match) {
      this.toolName = match[1];
    }
  }

  protected _canStartSegment(): boolean {
    return this.toolName !== undefined;
  }

  protected _getStartMetadata(): Record<string, any> {
    return this.toolName ? { tool_name: this.toolName } : {};
  }

  protected _onSegmentComplete(): void {
    return;
  }
}
