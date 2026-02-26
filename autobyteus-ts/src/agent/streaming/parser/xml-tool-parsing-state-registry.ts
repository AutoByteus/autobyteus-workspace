import { Singleton } from '../../../utils/singleton.js';
import type { BaseState } from './states/base-state.js';
import type { ParserContext } from './parser-context.js';
import { XmlWriteFileToolParsingState } from './states/xml-write-file-tool-parsing-state.js';
import { XmlEditFileToolParsingState } from './states/xml-edit-file-tool-parsing-state.js';
import { XmlRunBashToolParsingState } from './states/xml-run-bash-tool-parsing-state.js';
import { TOOL_NAME_WRITE_FILE, TOOL_NAME_EDIT_FILE, TOOL_NAME_RUN_BASH } from './tool-constants.js';

export type XmlToolParsingStateClass = new (context: ParserContext, openingTag: string) => BaseState;

export class XmlToolParsingStateRegistry extends Singleton {
  protected static instance?: XmlToolParsingStateRegistry;

  private toolStates: Map<string, XmlToolParsingStateClass> = new Map();

  constructor() {
    super();
    if (XmlToolParsingStateRegistry.instance) {
      return XmlToolParsingStateRegistry.instance;
    }
    XmlToolParsingStateRegistry.instance = this;

    this.registerToolState(TOOL_NAME_WRITE_FILE, XmlWriteFileToolParsingState);
    this.registerToolState(TOOL_NAME_EDIT_FILE, XmlEditFileToolParsingState);
    this.registerToolState(TOOL_NAME_RUN_BASH, XmlRunBashToolParsingState);
  }

  registerToolState(toolName: string, stateClass: XmlToolParsingStateClass): void {
    this.toolStates.set(toolName, stateClass);
  }

  getStateForTool(toolName: string): XmlToolParsingStateClass | undefined {
    return this.toolStates.get(toolName);
  }
}
