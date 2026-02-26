import type { ParserContext } from '../parser-context.js';
import type { BaseState } from '../states/base-state.js';
import { XmlTagInitializationState } from '../states/xml-tag-initialization-state.js';
import type { DetectionStrategy } from './base.js';

export class XmlTagStrategy implements DetectionStrategy {
  name = 'xml_tag';

  nextMarker(context: ParserContext, startPos: number): number {
    return context.find('<', startPos);
  }

  createState(context: ParserContext): BaseState {
    return new XmlTagInitializationState(context);
  }
}
