import { randomUUID } from "node:crypto";
import type { ApplicationAgentTargetAddress } from "@autobyteus/application-sdk-contracts";
import {
  ApplicationAgentStreamingService,
  getApplicationAgentStreamingService,
} from "../../application-agent-streaming/services/application-agent-streaming-service.js";
import {
  ApplicationOrchestrationHostService,
  getApplicationOrchestrationHostService,
} from "../../application-orchestration/services/application-orchestration-host-service.js";
import type { ApplicationAgentCommunicationNetworkSocket } from "../domain/application-agent-communication-models.js";
import { ApplicationAgentCommunicationSession } from "./application-agent-communication-session.js";

export class ApplicationAgentCommunicationService {
  private static instance: ApplicationAgentCommunicationService | null = null;
  static getInstance(dependencies: ConstructorParameters<typeof ApplicationAgentCommunicationService>[0] = {}): ApplicationAgentCommunicationService {
    this.instance ??= new ApplicationAgentCommunicationService(dependencies);
    return this.instance;
  }
  static resetInstance(): void { this.instance = null; cachedService = null; }

  private readonly sessions = new Map<string, ApplicationAgentCommunicationSession>();
  constructor(private readonly dependencies: {
    streamingService?: ApplicationAgentStreamingService;
    orchestrationService?: ApplicationOrchestrationHostService;
  } = {}) {}

  connect(input: {
    applicationId: string;
    address: ApplicationAgentTargetAddress;
    socket: ApplicationAgentCommunicationNetworkSocket;
  }): string {
    const sessionId = randomUUID();
    const session = new ApplicationAgentCommunicationSession({
      sessionId,
      ...input,
      streaming: this.dependencies.streamingService ?? getApplicationAgentStreamingService(),
      orchestration: this.dependencies.orchestrationService ?? getApplicationOrchestrationHostService(),
      onFinalized: () => { if (this.sessions.get(sessionId) === session) this.sessions.delete(sessionId); },
    });
    this.sessions.set(sessionId, session);
    void session.establish();
    return sessionId;
  }
}

let cachedService: ApplicationAgentCommunicationService | null = null;
export const getApplicationAgentCommunicationService = (): ApplicationAgentCommunicationService => {
  cachedService ??= ApplicationAgentCommunicationService.getInstance();
  return cachedService;
};
