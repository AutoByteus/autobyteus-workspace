import type { ApplicationAgentTargetAddress, ApplicationExecutionProducer } from "@autobyteus/application-sdk-contracts";
import type { ApplicationAgentBindingRecord } from "../domain/models.js";
import { ApplicationRunBindingStore } from "../stores/application-run-binding-store.js";
import type { ApplicationAvailabilityService } from "./application-availability-service.js";
import type { ApplicationOrchestrationStartupGate } from "./application-orchestration-startup-gate.js";
import type { ApplicationRunBindingLifecycleHub } from "./application-run-binding-lifecycle-hub.js";

export type ApplicationAgentTargetAuthorizationErrorCode = "APPLICATION_NOT_AVAILABLE" | "TARGET_NOT_AVAILABLE" | "INVALID_TARGET";
export class ApplicationAgentTargetAuthorizationError extends Error {
  constructor(readonly code: ApplicationAgentTargetAuthorizationErrorCode) {
    super(code === "APPLICATION_NOT_AVAILABLE" ? "The application is not available." : code === "TARGET_NOT_AVAILABLE" ? "The application agent target is not available." : "The application agent target is invalid.");
    this.name = "ApplicationAgentTargetAuthorizationError";
  }
}
export type AuthorizedApplicationAgentTargetDescriptor = {
  applicationId: string;
  address: ApplicationAgentTargetAddress;
  runtimeSubject: "AGENT_RUN" | "TEAM_RUN";
  runtimeRunId: string;
  producers: ApplicationExecutionProducer[];
};
export type ApplicationAgentTargetAuthorizationLease = { descriptor: AuthorizedApplicationAgentTargetDescriptor; release: () => void };
const fail = (code: ApplicationAgentTargetAuthorizationErrorCode): never => { throw new ApplicationAgentTargetAuthorizationError(code); };
const exact = (value: object, keys: readonly string[]): boolean => Object.keys(value).length === keys.length && keys.every((key) => Object.prototype.hasOwnProperty.call(value, key));
const validateAddress = (address: ApplicationAgentTargetAddress): void => {
  if (!address || typeof address !== "object" || !exact(address, ["bindingId", "target"]) || !address.bindingId?.trim()) fail("TARGET_NOT_AVAILABLE");
  if (!address.target || typeof address.target !== "object") fail("INVALID_TARGET");
  if (address.target.kind === "AGENT_TEAM_MEMBER") {
    if (!exact(address.target, ["kind", "agentRunId"]) || !address.target.agentRunId?.trim()) fail("INVALID_TARGET");
  } else if ((address.target.kind !== "AGENT_RUN" && address.target.kind !== "AGENT_TEAM_RUN") || !exact(address.target, ["kind"])) fail("INVALID_TARGET");
};
const producers = (binding: ApplicationAgentBindingRecord): ApplicationExecutionProducer[] => {
  if (binding.runtime.subject === "AGENT_RUN") return [{
    agentRunId: binding.runtime.agentRunId,
    displayName: null,
    runtimeKind: "AGENT",
  }];
  const runtime = binding.runtime;
  return runtime.members.map((member) => ({
    agentRunId: member.agentRunId,
    displayName: member.displayName,
    runtimeKind: member.runtimeKind,
  }));
};

export class ApplicationAgentTargetAuthorizationService {
  constructor(private readonly dependencies: { startupGate: ApplicationOrchestrationStartupGate; availabilityService: ApplicationAvailabilityService; bindingStore: ApplicationRunBindingStore; lifecycleHub: ApplicationRunBindingLifecycleHub }) {}
  private get startupGate() { return this.dependencies.startupGate; }
  private get availabilityService() { return this.dependencies.availabilityService; }
  private get bindingStore() { return this.dependencies.bindingStore; }
  private get lifecycleHub() { return this.dependencies.lifecycleHub; }

  async authorizeTarget(applicationId: string, address: ApplicationAgentTargetAddress): Promise<AuthorizedApplicationAgentTargetDescriptor> {
    await this.requireApplication(applicationId); return this.readAuthorizedTarget(applicationId, address);
  }
  async openLease(applicationId: string, address: ApplicationAgentTargetAddress, onBindingEnded: () => void): Promise<ApplicationAgentTargetAuthorizationLease> {
    await this.requireApplication(applicationId); validateAddress(address);
    let released = false;
    const stop = this.lifecycleHub.observeTerminal(applicationId, address.bindingId, onBindingEnded);
    const release = (): void => { if (!released) { released = true; stop(); } };
    try { return { descriptor: await this.readAuthorizedTarget(applicationId, address), release }; } catch (error) { release(); throw error; }
  }
  private async requireApplication(applicationId: string): Promise<void> {
    try { await this.startupGate.awaitReady(); await this.availabilityService.requireApplicationActive(applicationId); }
    catch { fail("APPLICATION_NOT_AVAILABLE"); }
  }
  private async readAuthorizedTarget(applicationId: string, address: ApplicationAgentTargetAddress): Promise<AuthorizedApplicationAgentTargetDescriptor> {
    validateAddress(address);
    const binding = await this.bindingStore.getBinding(applicationId, address.bindingId);
    if (!binding) throw new ApplicationAgentTargetAuthorizationError("TARGET_NOT_AVAILABLE");
    if (binding.applicationId !== applicationId || binding.status === "TERMINATED" || binding.status === "ORPHANED") fail("TARGET_NOT_AVAILABLE");
    if (binding.runtime.subject === "AGENT_RUN") {
      if (address.target.kind !== "AGENT_RUN") fail("INVALID_TARGET");
      return { applicationId, address: structuredClone(address), runtimeSubject: "AGENT_RUN", runtimeRunId: binding.runtime.agentRunId, producers: producers(binding) };
    }
    if (address.target.kind === "AGENT_RUN") fail("INVALID_TARGET");
    const all = producers(binding);
    const selectedAgentRunId = address.target.kind === "AGENT_TEAM_MEMBER" ? address.target.agentRunId : null;
    const selected = selectedAgentRunId
      ? all.filter((producer) => producer.agentRunId === selectedAgentRunId)
      : all;
    if (selectedAgentRunId && selected.length !== 1) fail("INVALID_TARGET");
    return { applicationId, address: structuredClone(address), runtimeSubject: "TEAM_RUN", runtimeRunId: binding.runtime.teamRunId, producers: selected };
  }
}
