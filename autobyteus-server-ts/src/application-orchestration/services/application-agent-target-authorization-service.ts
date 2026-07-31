import type { ApplicationAgentBindingRecord } from "../domain/models.js";
import type {
  ApplicationAgentTargetAddress,
  ApplicationExecutionProducer,
} from "@autobyteus/application-sdk-contracts";
import { ApplicationRunBindingStore } from "../stores/application-run-binding-store.js";
import type { ApplicationOrchestrationStartupGate } from "./application-orchestration-startup-gate.js";
import type { ApplicationAvailabilityService } from "./application-availability-service.js";
import type { ApplicationRunBindingLifecycleHub } from "./application-run-binding-lifecycle-hub.js";

export type ApplicationAgentTargetAuthorizationErrorCode =
  | "APPLICATION_NOT_AVAILABLE"
  | "TARGET_NOT_AVAILABLE"
  | "INVALID_TARGET";

export class ApplicationAgentTargetAuthorizationError extends Error {
  constructor(readonly code: ApplicationAgentTargetAuthorizationErrorCode) {
    super(code === "APPLICATION_NOT_AVAILABLE"
      ? "The application is not available."
      : code === "TARGET_NOT_AVAILABLE"
        ? "The application agent target is not available."
        : "The application agent target is invalid.");
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

export type ApplicationAgentTargetAuthorizationLease = {
  descriptor: AuthorizedApplicationAgentTargetDescriptor;
  release: () => void;
};

const fail = (code: ApplicationAgentTargetAuthorizationErrorCode): never => {
  throw new ApplicationAgentTargetAuthorizationError(code);
};
const toProducer = (
  member: ApplicationAgentBindingRecord["runtime"]["members"][number],
): ApplicationExecutionProducer => ({
  runId: member.runId,
  memberRouteKey: member.memberRouteKey,
  memberName: member.memberName,
  displayName: member.displayName,
  runtimeKind: member.runtimeKind,
  teamPath: [...member.teamPath],
});
const hasExactKeys = (value: object, keys: readonly string[]): boolean =>
  Object.keys(value).length === keys.length && keys.every((key) => Object.prototype.hasOwnProperty.call(value, key));
const validateAddress = (address: ApplicationAgentTargetAddress): void => {
  if (!address || typeof address !== "object" || !hasExactKeys(address, ["bindingId", "target"]) ||
      typeof address.bindingId !== "string" || !address.bindingId.trim()) {
    fail("TARGET_NOT_AVAILABLE");
  }
  if (!address.target || typeof address.target !== "object" ||
      !["AGENT_RUN", "AGENT_TEAM_RUN", "AGENT_TEAM_MEMBER"].includes(address.target.kind)) {
    fail("INVALID_TARGET");
  }
  if (address.target.kind === "AGENT_TEAM_MEMBER") {
    if (!hasExactKeys(address.target, ["kind", "memberRouteKey"]) ||
        typeof address.target.memberRouteKey !== "string" || !address.target.memberRouteKey.trim()) fail("INVALID_TARGET");
  } else if (!hasExactKeys(address.target, ["kind"])) {
    fail("INVALID_TARGET");
  }
};
const validateTarget = (binding: ApplicationAgentBindingRecord, address: ApplicationAgentTargetAddress): void => {
  validateAddress(address);
  if (binding.runtime.subject === "AGENT_RUN") {
    if (address.target.kind !== "AGENT_RUN") fail("INVALID_TARGET");
    return;
  }
  if (address.target.kind === "AGENT_RUN") fail("INVALID_TARGET");
  if (address.target.kind === "AGENT_TEAM_MEMBER") {
    const routeKey = typeof address.target.memberRouteKey === "string" ? address.target.memberRouteKey.trim() : "";
    if (!routeKey || !binding.runtime.members.some((member) => member.memberRouteKey === routeKey)) fail("INVALID_TARGET");
  }
};

export class ApplicationAgentTargetAuthorizationService {
  constructor(private readonly dependencies: {
    startupGate: ApplicationOrchestrationStartupGate;
    availabilityService: ApplicationAvailabilityService;
    bindingStore: ApplicationRunBindingStore;
    lifecycleHub: ApplicationRunBindingLifecycleHub;
  }) {}

  private get startupGate(): ApplicationOrchestrationStartupGate {
    return this.dependencies.startupGate;
  }
  private get availabilityService(): ApplicationAvailabilityService {
    return this.dependencies.availabilityService;
  }
  private get bindingStore(): ApplicationRunBindingStore {
    return this.dependencies.bindingStore;
  }
  private get lifecycleHub(): ApplicationRunBindingLifecycleHub {
    return this.dependencies.lifecycleHub;
  }

  async authorizeTarget(
    applicationId: string,
    address: ApplicationAgentTargetAddress,
  ): Promise<AuthorizedApplicationAgentTargetDescriptor> {
    await this.requireApplication(applicationId);
    return this.readAuthorizedTarget(applicationId, address);
  }

  async openLease(
    applicationId: string,
    address: ApplicationAgentTargetAddress,
    onBindingEnded: () => void,
  ): Promise<ApplicationAgentTargetAuthorizationLease> {
    await this.requireApplication(applicationId);
    validateAddress(address);
    let released = false;
    const releaseObservation = this.lifecycleHub.observeTerminal(
      applicationId,
      address.bindingId,
      () => onBindingEnded(),
    );
    const release = (): void => {
      if (released) return;
      released = true;
      releaseObservation();
    };
    try {
      return { descriptor: await this.readAuthorizedTarget(applicationId, address), release };
    } catch (error) {
      release();
      throw error;
    }
  }

  private async requireApplication(applicationId: string): Promise<void> {
    try {
      await this.startupGate.awaitReady();
      await this.availabilityService.requireApplicationActive(applicationId);
    } catch { fail("APPLICATION_NOT_AVAILABLE"); }
  }

  private async readAuthorizedTarget(
    applicationId: string,
    address: ApplicationAgentTargetAddress,
  ): Promise<AuthorizedApplicationAgentTargetDescriptor> {
    validateAddress(address);
    const binding = await this.bindingStore.getBinding(applicationId, address.bindingId);
    if (!binding || binding.applicationId !== applicationId ||
        binding.status === "TERMINATED" || binding.status === "ORPHANED") {
      return fail("TARGET_NOT_AVAILABLE");
    }
    validateTarget(binding, address);
    return {
      applicationId,
      address: structuredClone(address),
      runtimeSubject: binding.runtime.subject,
      runtimeRunId: binding.runtime.runId,
      producers: binding.runtime.members.map(toProducer),
    };
  }
}
