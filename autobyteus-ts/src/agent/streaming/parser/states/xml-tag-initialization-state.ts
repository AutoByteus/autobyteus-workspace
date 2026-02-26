import { BaseState } from './base-state.js';
import type { ParserContext } from '../parser-context.js';
import { TextState } from './text-state.js';
import { SegmentType } from '../events.js';
import { CustomXmlTagWriteFileParsingState } from './custom-xml-tag-write-file-parsing-state.js';
import { CustomXmlTagRunBashParsingState } from './custom-xml-tag-run-bash-parsing-state.js';
import { XmlToolParsingState } from './xml-tool-parsing-state.js';
import { XmlToolParsingStateRegistry } from '../xml-tool-parsing-state-registry.js';

export class XmlTagInitializationState extends BaseState {
  static POSSIBLE_WRITE_FILE = '<write_file';
  static POSSIBLE_RUN_BASH = '<run_bash';
  static POSSIBLE_TOOL = '<tool';

  private tagBuffer: string;

  constructor(context: ParserContext) {
    super(context);
    this.context.advance();
    this.tagBuffer = '<';
  }

  run(): void {
    if (!this.context.hasMoreChars()) {
      return;
    }

    const startPos = this.context.getPosition();
    const endIdx = this.context.find('>', startPos);

    if (endIdx === -1) {
      this.tagBuffer += this.context.consumeRemaining();

      const lowerBuffer = this.tagBuffer.toLowerCase();
      const possibleWriteFile =
        XmlTagInitializationState.POSSIBLE_WRITE_FILE.startsWith(lowerBuffer) ||
        lowerBuffer.startsWith(XmlTagInitializationState.POSSIBLE_WRITE_FILE);
      const possibleRunBash =
        XmlTagInitializationState.POSSIBLE_RUN_BASH.startsWith(lowerBuffer) ||
        lowerBuffer.startsWith(XmlTagInitializationState.POSSIBLE_RUN_BASH);
      const possibleTool =
        XmlTagInitializationState.POSSIBLE_TOOL.startsWith(lowerBuffer) ||
        lowerBuffer.startsWith(XmlTagInitializationState.POSSIBLE_TOOL);

      if (!(possibleWriteFile || possibleRunBash || possibleTool)) {
        this.context.appendTextSegment(this.tagBuffer);
        this.context.transitionTo(new TextState(this.context));
      }
      return;
    }

    this.tagBuffer += this.context.consume(endIdx - startPos + 1);
    const lowerBuffer = this.tagBuffer.toLowerCase();

    if (lowerBuffer.startsWith(XmlTagInitializationState.POSSIBLE_WRITE_FILE)) {
      if (this.context.getCurrentSegmentType() === SegmentType.TEXT) {
        this.context.emitSegmentEnd();
      }
      this.context.transitionTo(new CustomXmlTagWriteFileParsingState(this.context, this.tagBuffer));
      return;
    }

    if (lowerBuffer.startsWith(XmlTagInitializationState.POSSIBLE_RUN_BASH)) {
      if (this.context.getCurrentSegmentType() === SegmentType.TEXT) {
        this.context.emitSegmentEnd();
      }
      this.context.transitionTo(new CustomXmlTagRunBashParsingState(this.context, this.tagBuffer));
      return;
    }

    if (lowerBuffer.startsWith(XmlTagInitializationState.POSSIBLE_TOOL)) {
      if (this.context.parseToolCalls) {
        if (this.context.getCurrentSegmentType() === SegmentType.TEXT) {
          this.context.emitSegmentEnd();
        }

        const nameMatch = /name\s*=\s*["']([^"']+)["']/i.exec(this.tagBuffer);
        if (nameMatch) {
          const toolName = nameMatch[1].toLowerCase();
          const registry = new XmlToolParsingStateRegistry();
          const stateClass = registry.getStateForTool(toolName);
          if (stateClass) {
            this.context.transitionTo(new stateClass(this.context, this.tagBuffer));
          } else {
            this.context.transitionTo(new XmlToolParsingState(this.context, this.tagBuffer));
          }
        } else {
          this.context.transitionTo(new XmlToolParsingState(this.context, this.tagBuffer));
        }
      } else {
        this.context.appendTextSegment(this.tagBuffer);
        this.context.transitionTo(new TextState(this.context));
      }
      return;
    }

    this.context.appendTextSegment(this.tagBuffer);
    this.context.transitionTo(new TextState(this.context));
  }

  finalize(): void {
    if (this.tagBuffer) {
      this.context.appendTextSegment(this.tagBuffer);
      this.tagBuffer = '';
    }
    this.context.transitionTo(new TextState(this.context));
  }
}
