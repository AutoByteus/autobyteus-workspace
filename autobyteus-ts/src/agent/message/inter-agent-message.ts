export class InterAgentMessage {
  recipientRoleName: string;
  recipientAgentId: string;
  content: string;
  messageType: string;
  senderAgentId: string;

  constructor(
    recipientRoleName: string,
    recipientAgentId: string,
    content: string,
    messageType: string,
    senderAgentId: string
  ) {
    this.recipientRoleName = recipientRoleName;
    this.recipientAgentId = recipientAgentId;
    this.content = content;
    this.messageType = InterAgentMessage.normalizeMessageType(messageType);
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
      `messageType='${this.messageType}', ` +
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
    const normalizedMessageType = InterAgentMessage.normalizeMessageType(messageType);
    return new InterAgentMessage(
      recipientRoleName,
      recipientAgentId,
      content,
      normalizedMessageType,
      senderAgentId,
    );
  }

  private static normalizeMessageType(messageType: string): string {
    const normalizedMessageType = String(messageType ?? '').trim();
    if (!normalizedMessageType) {
      throw new Error('messageType cannot be empty');
    }
    return normalizedMessageType;
  }
}
