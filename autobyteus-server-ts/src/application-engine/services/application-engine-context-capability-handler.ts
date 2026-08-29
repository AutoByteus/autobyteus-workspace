import type { ApplicationOrchestrationHostService } from "../../application-orchestration/services/application-orchestration-host-service.js";
import type { ApplicationAgentStreamingService } from "../../application-agent-streaming/services/application-agent-streaming-service.js";
import {
  ApplicationEngineClient,
  ApplicationEngineResponseAfterWrite,
} from "../runtime/application-engine-client.js";
import type { ApplicationWorkerContextCapabilityInput } from "../runtime/protocol.js";
import { createApplicationAgentStreamObserverActivationBarrier } from "./application-agent-stream-observer-activation-barrier.js";

export class ApplicationEngineContextCapabilityHandler {
  constructor(private readonly dependencies: {
    orchestrationHostService: ApplicationOrchestrationHostService;
    agentStreamingService: ApplicationAgentStreamingService;
  }) {}

  async handle(
    applicationId: string,
    input: ApplicationWorkerContextCapabilityInput,
    client: ApplicationEngineClient,
  ): Promise<unknown> {
    const orchestration = this.dependencies.orchestrationHostService;
    if (input.capability === "agentExecution") {
      switch (input.operation) {
        case "startAgent": return orchestration.startAgent(applicationId, input.input);
        case "startAgentTeam": return orchestration.startAgentTeam(applicationId, input.input);
        case "get": return orchestration.getRunBinding(applicationId, input.input.bindingId);
        case "findByLaunchRequestId":
          return orchestration.findRunBindingByLaunchRequestId(
            applicationId,
            input.input.launchRequestId,
          );
        case "list": return orchestration.listRunBindings(applicationId, input.input);
        case "sendInput": return orchestration.sendRunInput(applicationId, input.input);
        case "subscribeEventStream":
          return this.subscribeToEventStream(applicationId, input, client);
        case "unsubscribeEventStream":
          await this.dependencies.agentStreamingService.unsubscribe(
            applicationId,
            input.input.subscriptionId,
            input.input.reason,
          );
          return { unsubscribed: true };
        case "terminate":
          return orchestration.terminateRunBinding(
            applicationId,
            input.input.bindingId,
          );
      }
    }
    if (input.capability === "agentResources") {
      switch (input.operation) {
        case "listAvailable":
          return orchestration.listAvailableExecutionResources(
            applicationId,
            input.input,
          );
        case "requireRunnable":
          return orchestration.requireRunnableExecutionResource(
            applicationId,
            input.input.slotKey,
          );
      }
    }
    if (input.capability === "publishedArtifacts") {
      switch (input.operation) {
        case "list":
          return orchestration.listRunPublishedArtifacts(
            applicationId,
            input.input.runId,
          );
        case "readRevision":
          return orchestration.readPublishedArtifactRevision(
            applicationId,
            input.input,
          );
      }
    }
    throw new Error("Unsupported application context capability request.");
  }

  private async subscribeToEventStream(
    applicationId: string,
    input: Extract<
      ApplicationWorkerContextCapabilityInput,
      { capability: "agentExecution"; operation: "subscribeEventStream" }
    >,
    client: ApplicationEngineClient,
  ): Promise<ApplicationEngineResponseAfterWrite> {
    const barrier = createApplicationAgentStreamObserverActivationBarrier(
      client,
      input.input.subscriptionId,
      () => {
        void this.dependencies.agentStreamingService.unsubscribe(
          applicationId,
          input.input.subscriptionId,
          "UNSUBSCRIBED",
        );
      },
    );
    const result = await this.dependencies.agentStreamingService.subscribe({
      applicationId,
      subscriptionId: input.input.subscriptionId,
      address: input.input.address,
      emitter: barrier.emitter,
    });
    return new ApplicationEngineResponseAfterWrite(result, barrier.activate);
  }
}
