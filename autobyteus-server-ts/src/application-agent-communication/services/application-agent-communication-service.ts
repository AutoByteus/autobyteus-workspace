import { randomUUID } from "node:crypto";
import type { ApplicationAgentTargetAddress } from "@autobyteus/application-sdk-contracts";
import type { ApplicationAgentStreamingService } from "../../application-agent-streaming/services/application-agent-streaming-service.js";
import type { ApplicationOrchestrationHostService } from "../../application-orchestration/services/application-orchestration-host-service.js";
import type { ApplicationAgentCommunicationNetworkSocket } from "../domain/application-agent-communication-models.js";
import { ApplicationAgentCommunicationSession } from "./application-agent-communication-session.js";

export class ApplicationAgentCommunicationService {
  private readonly sessions = new Map<string, ApplicationAgentCommunicationSession>();
  constructor(private readonly dependencies: {
    streamingService: ApplicationAgentStreamingService;
    orchestrationService: ApplicationOrchestrationHostService;
  }) {}

  connect(input: {
    applicationId: string;
    address: ApplicationAgentTargetAddress;
    socket: ApplicationAgentCommunicationNetworkSocket;
  }): string {
    const sessionId = randomUUID();
    const session = new ApplicationAgentCommunicationSession({
      sessionId,
      ...input,
      streaming: this.dependencies.streamingService,
      orchestration: this.dependencies.orchestrationService,
      onFinalized: () => { if (this.sessions.get(sessionId) === session) this.sessions.delete(sessionId); },
    });
    this.sessions.set(sessionId, session);
    void session.establish();
    return sessionId;
  }

  closeAll(): void {
    for (const session of Array.from(this.sessions.values())) {
      session.abort();
    }
    this.sessions.clear();
  }
}
