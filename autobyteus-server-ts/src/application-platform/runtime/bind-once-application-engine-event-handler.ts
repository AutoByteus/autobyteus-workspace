import type {
  ApplicationExecutionEventEnvelope,
  ApplicationPublishedArtifactEvent,
} from "@autobyteus/application-sdk-contracts";
import type { ApplicationExecutionEventDispatchResult } from "../../application-engine/runtime/protocol.js";
import type { ApplicationEngineHostService } from "../../application-engine/services/application-engine-host-service.js";

export type ApplicationEngineEventHandler = Pick<
  ApplicationEngineHostService,
  | "invokeApplicationEventHandler"
  | "invokeApplicationArtifactHandler"
  | "stopApplicationEngine"
>;

export class BindOnceApplicationEngineEventHandler
implements ApplicationEngineEventHandler {
  private target: ApplicationEngineEventHandler | null = null;

  bind(target: ApplicationEngineEventHandler): void {
    if (this.target) {
      throw new Error("The application engine event handler is already bound.");
    }
    this.target = target;
  }

  isBound(): boolean {
    return this.target !== null;
  }

  invokeApplicationEventHandler(
    applicationId: string,
    input: { envelope: ApplicationExecutionEventEnvelope },
  ): Promise<ApplicationExecutionEventDispatchResult> {
    return this.requireTarget().invokeApplicationEventHandler(applicationId, input);
  }

  invokeApplicationArtifactHandler(
    applicationId: string,
    input: { event: ApplicationPublishedArtifactEvent },
  ): Promise<ApplicationExecutionEventDispatchResult> {
    return this.requireTarget().invokeApplicationArtifactHandler(applicationId, input);
  }

  stopApplicationEngine(applicationId: string): Promise<void> {
    return this.requireTarget().stopApplicationEngine(applicationId);
  }

  private requireTarget(): ApplicationEngineEventHandler {
    if (!this.target) {
      throw new Error("The application engine event handler is not bound.");
    }
    return this.target;
  }
}
