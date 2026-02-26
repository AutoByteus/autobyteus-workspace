import { DelimitedContentState } from './delimited-content-state.js';
import type { ParserContext } from '../parser-context.js';
import { SegmentType } from '../events.js';

export class CustomXmlTagRunBashParsingState extends DelimitedContentState {
  static CLOSING_TAG = '</run_bash>';
  static SEGMENT_TYPE = SegmentType.RUN_BASH;
  private metadata: Record<string, any>;

  constructor(context: ParserContext, openingTag: string) {
    super(context, openingTag);
    this.metadata = CustomXmlTagRunBashParsingState.extractMetadata(openingTag);
  }

  protected _getStartMetadata(): Record<string, any> {
    return this.metadata;
  }

  private static extractMetadata(openingTag: string): Record<string, any> {
    const metadata: Record<string, any> = {};
    const backgroundRaw = this.readAttribute(openingTag, 'background');
    if (backgroundRaw !== null) {
      const normalized = backgroundRaw.trim().toLowerCase();
      if (['true', '1', 'yes'].includes(normalized)) {
        metadata.background = true;
      } else if (['false', '0', 'no'].includes(normalized)) {
        metadata.background = false;
      }
    }

    const timeoutRaw =
      this.readAttribute(openingTag, 'timeout_seconds') ??
      this.readAttribute(openingTag, 'timeoutSeconds');
    if (timeoutRaw !== null) {
      const parsed = Number.parseInt(timeoutRaw.trim(), 10);
      if (Number.isFinite(parsed) && parsed > 0) {
        metadata.timeout_seconds = parsed;
      }
    }

    return metadata;
  }

  private static readAttribute(openingTag: string, attributeName: string): string | null {
    const escapedName = attributeName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const pattern = new RegExp(`${escapedName}\\s*=\\s*["']([^"']+)["']`, 'i');
    const match = pattern.exec(openingTag);
    return match?.[1] ?? null;
  }
}
