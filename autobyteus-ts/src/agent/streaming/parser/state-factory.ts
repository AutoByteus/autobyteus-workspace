import type { ParserContext } from './parser-context.js';
import type { BaseState } from './states/base-state.js';
import { TextState } from './states/text-state.js';
import { XmlTagInitializationState } from './states/xml-tag-initialization-state.js';
import { CustomXmlTagWriteFileParsingState } from './states/custom-xml-tag-write-file-parsing-state.js';
import { CustomXmlTagRunBashParsingState } from './states/custom-xml-tag-run-bash-parsing-state.js';
import { XmlToolParsingState } from './states/xml-tool-parsing-state.js';
import { JsonInitializationState } from './states/json-initialization-state.js';
import { JsonToolParsingState } from './states/json-tool-parsing-state.js';

export class StateFactory {
  static textState(context: ParserContext): BaseState {
    return new TextState(context);
  }

  static xmlTagInitState(context: ParserContext): BaseState {
    return new XmlTagInitializationState(context);
  }

  static writeFileParsingState(context: ParserContext, openingTag: string): BaseState {
    return new CustomXmlTagWriteFileParsingState(context, openingTag);
  }

  static runBashParsingState(context: ParserContext, openingTag: string): BaseState {
    return new CustomXmlTagRunBashParsingState(context, openingTag);
  }

  static xmlToolParsingState(context: ParserContext, signatureBuffer: string): BaseState {
    return new XmlToolParsingState(context, signatureBuffer);
  }

  static jsonInitState(context: ParserContext): BaseState {
    return new JsonInitializationState(context);
  }

  static jsonToolParsingState(context: ParserContext, signatureBuffer: string): BaseState {
    return new JsonToolParsingState(context, signatureBuffer);
  }
}
