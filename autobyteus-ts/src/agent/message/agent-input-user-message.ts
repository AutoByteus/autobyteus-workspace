import { ContextFile } from './context-file.js';
import { SenderType } from '../sender-type.js';
import { parseAgentExternalSourceMetadata, type AgentExternalSourceMetadata } from './external-source-metadata.js';

export class AgentInputUserMessage {
  content: string;
  senderType: SenderType;
  contextFiles: ContextFile[] | null;
  metadata: Record<string, unknown>;

  constructor(
    content: string,
    senderType: SenderType = SenderType.USER,
    contextFiles: ContextFile[] | null = null,
    metadata: Record<string, unknown> = {}
  ) {
    if (typeof content !== 'string') {
      throw new TypeError("AgentInputUserMessage 'content' must be a string.");
    }
    if (!Object.values(SenderType).includes(senderType)) {
      throw new TypeError("AgentInputUserMessage 'senderType' must be a SenderType enum.");
    }
    if (contextFiles !== null) {
      if (!Array.isArray(contextFiles) || !contextFiles.every((cf) => cf instanceof ContextFile)) {
        throw new TypeError("AgentInputUserMessage 'contextFiles' must be a list of ContextFile objects if provided.");
      }
    }
    if (typeof metadata !== 'object' || metadata === null || Array.isArray(metadata)) {
      throw new TypeError("AgentInputUserMessage 'metadata' must be a dictionary.");
    }

    this.content = content;
    this.senderType = senderType;
    this.contextFiles = contextFiles;
    this.metadata = metadata;
  }

  toDict(): Record<string, unknown> {
    const contextFiles = this.contextFiles
      ? this.contextFiles.map((cf) => cf.toDict())
      : null;

    return {
      content: this.content,
      sender_type: this.senderType,
      context_files: contextFiles,
      metadata: this.metadata
    };
  }

  static fromDict(data: Record<string, unknown>): AgentInputUserMessage {
    const payload = data ?? {};
    const payloadRecord = payload as Record<string, unknown>;
    const content = payloadRecord.content;
    if (typeof content !== 'string') {
      throw new Error("AgentInputUserMessage 'content' in dictionary must be a string.");
    }

    const senderTypeVal = payloadRecord.sender_type ?? SenderType.USER;
    const senderType = Object.values(SenderType).includes(senderTypeVal as SenderType)
      ? (senderTypeVal as SenderType)
      : SenderType.USER;

    const contextFilesData = payloadRecord.context_files;
    let contextFiles: ContextFile[] | null = null;
    if (contextFilesData !== null && contextFilesData !== undefined) {
      if (!Array.isArray(contextFilesData)) {
        throw new Error("AgentInputUserMessage 'context_files' in dictionary must be a list if provided.");
      }
      contextFiles = contextFilesData.map((cfData) => ContextFile.fromDict(cfData as Record<string, unknown>));
    }

    const metadata = payloadRecord.metadata ?? {};
    if (typeof metadata !== 'object' || metadata === null || Array.isArray(metadata)) {
      throw new Error("AgentInputUserMessage 'metadata' in dictionary must be a dict if provided.");
    }

    return new AgentInputUserMessage(content, senderType, contextFiles, metadata as Record<string, unknown>);
  }

  toString(): string {
    const contentPreview = this.content.length > 100 ? `${this.content.slice(0, 100)}...` : this.content;
    const contextCount = this.contextFiles ? this.contextFiles.length : 0;
    const contextInfo = this.contextFiles ? `, contextFiles=[${contextCount} ContextFile(s)]` : '';
    const metaInfo = Object.keys(this.metadata).length > 0 ? `, metadata_keys=${Object.keys(this.metadata)}` : '';
    return `AgentInputUserMessage(senderType='${this.senderType}', content='${contentPreview}'${contextInfo}${metaInfo})`;
  }

  getExternalSourceMetadata(): AgentExternalSourceMetadata | null {
    return parseAgentExternalSourceMetadata(this.metadata);
  }
}
