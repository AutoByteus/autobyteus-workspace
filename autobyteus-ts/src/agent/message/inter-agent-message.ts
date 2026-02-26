import { InterAgentMessageType } from './inter-agent-message-type.js';

export class InterAgentMessage {
  recipientRoleName: string;
  recipientAgentId: string;
  content: string;
  messageType: InterAgentMessageType;
  senderAgentId: string;

  constructor(
    recipientRoleName: string,
    recipientAgentId: string,
    content: string,
    messageType: InterAgentMessageType,
    senderAgentId: string
  ) {
    this.recipientRoleName = recipientRoleName;
    this.recipientAgentId = recipientAgentId;
    this.content = content;
    this.messageType = messageType;
    this.senderAgentId = senderAgentId;
  }

  equals(other: unknown): boolean {
    if (!(other instanceof InterAgentMessage)) {
      return false;
    }
    return (
      this.recipientRoleName === other.recipientRoleName &&
      this.recipientAgentId === other.recipientAgentId &&
      this.content === other.content &&
      this.messageType === other.messageType &&
      this.senderAgentId === other.senderAgentId
    );
  }

  toString(): string {
    return (
      `InterAgentMessage(recipientRoleName='${this.recipientRoleName}', ` +
      `recipientAgentId='${this.recipientAgentId}', ` +
      `content='${this.content}', ` +
      `messageType=<${this.messageType.constructor.name}.${this.messageType.name}: '${this.messageType.value}'>, ` +
      `senderAgentId='${this.senderAgentId}')`
    );
  }

  static createWithDynamicMessageType(
    recipientRoleName: string,
    recipientAgentId: string,
    content: string,
    messageType: string,
    senderAgentId: string
  ): InterAgentMessage {
    if (!messageType) {
      throw new Error('messageType cannot be empty');
    }

    const normalized = messageType.toLowerCase();
    let msgType = InterAgentMessageType.getByValue(normalized) as InterAgentMessageType | undefined;
    if (!msgType) {
      msgType = InterAgentMessageType.addType(messageType.toUpperCase(), normalized) ?? undefined;
    }

    if (!msgType) {
      throw new Error(`Failed to create or find InterAgentMessageType: ${messageType}`);
    }

    return new InterAgentMessage(recipientRoleName, recipientAgentId, content, msgType, senderAgentId);
  }
}
