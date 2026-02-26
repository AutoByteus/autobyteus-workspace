const logger = {
  debug: (...args: unknown[]) => console.debug(...args),
};

export class AgentSession {
  private connected = false;
  private closed = false;
  readonly sessionId: string;
  readonly runId: string;

  constructor(sessionId: string, runId: string) {
    this.sessionId = sessionId;
    this.runId = runId;
  }

  get isConnected(): boolean {
    return this.connected && !this.closed;
  }

  connect(): void {
    if (this.closed) {
      throw new Error("Cannot connect a closed session");
    }
    this.connected = true;
    logger.debug(`AgentSession ${this.sessionId} connected to run ${this.runId}`);
  }

  close(): void {
    this.closed = true;
    this.connected = false;
    logger.debug(`AgentSession ${this.sessionId} closed`);
  }
}
