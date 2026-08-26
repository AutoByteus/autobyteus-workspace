import {
  parseApplicationAgentMemberAddress,
  type ApplicationAgentBinding,
  type ApplicationAgentTargetAddress,
  type ApplicationAgentTeamBinding,
} from "@autobyteus/application-sdk-contracts";
import type { ResolvedApplicationAgentExecutionTarget } from "../../application-platform/execution/application-execution-scope-contracts.js";
import {
  toPublicApplicationAgentBinding,
  type ApplicationAgentBindingRecord,
} from "../domain/models.js";
import { ApplicationExecutionProducerProjector } from "../domain/application-execution-producer-projector.js";
import { ApplicationRunBindingStore } from "../stores/application-run-binding-store.js";
import type { ApplicationAvailabilityService } from "./application-availability-service.js";
import type { ApplicationOrchestrationStartupGate } from "./application-orchestration-startup-gate.js";
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

export type AuthorizedApplicationAgentTargetDescriptor = Readonly<{
  applicationId: string;
  address: ApplicationAgentTargetAddress;
  binding: ApplicationAgentBinding | ApplicationAgentTeamBinding;
  runtime: ResolvedApplicationAgentExecutionTarget;
}>;

export type ApplicationAgentTargetAuthorizationLease = Readonly<{
  descriptor: AuthorizedApplicationAgentTargetDescriptor;
  release: () => void;
}>;

const fail = (code: ApplicationAgentTargetAuthorizationErrorCode): never => {
  throw new ApplicationAgentTargetAuthorizationError(code);
};

const validateAddress = (value: ApplicationAgentTargetAddress): ApplicationAgentTargetAddress => {
  if (!value || typeof value !== "object" || Array.isArray(value)) fail("INVALID_TARGET");
  const input = value as unknown as Record<string, unknown>;
  if (Object.keys(input).length !== 2 ||
      !Object.prototype.hasOwnProperty.call(input, "bindingId") ||
      !Object.prototype.hasOwnProperty.call(input, "memberAddress") ||
      typeof input.bindingId !== "string" ||
      !input.bindingId.trim()) {
    fail("INVALID_TARGET");
  }
  if (input.memberAddress !== null && !parseApplicationAgentMemberAddress(input.memberAddress)) {
    fail("INVALID_TARGET");
  }
  const bindingId = input.bindingId as string;
  return Object.freeze({
    bindingId: bindingId.trim(),
    memberAddress: input.memberAddress === null
      ? null
      : parseApplicationAgentMemberAddress(input.memberAddress)!,
  });
};

const deepFreeze = <T>(value: T): T => {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  Object.freeze(value);
  for (const child of Object.values(value as Record<string, unknown>)) deepFreeze(child);
  return value;
};

const producer = (agentRunId: string, displayName: string | null) =>
  ApplicationExecutionProducerProjector.project({ agentRunId, displayName });

const resolvedRuntime = (
  binding: ApplicationAgentBindingRecord,
  memberAddress: ApplicationAgentTargetAddress["memberAddress"],
): ResolvedApplicationAgentExecutionTarget => {
  if (binding.runtime.subject === "AGENT_RUN") {
    if (memberAddress !== null) fail("INVALID_TARGET");
    return Object.freeze({
      subject: "AGENT_RUN",
      agentRunId: binding.runtime.agentRunId,
      producer: producer(binding.runtime.agentRunId, null),
    });
  }

  const selectedMember = memberAddress === null
    ? null
    : binding.runtime.members.find((member) => member.memberAddress === memberAddress) ?? null;
  if (memberAddress !== null && !selectedMember) fail("INVALID_TARGET");
  const members = selectedMember ? [selectedMember] : binding.runtime.members;
  return Object.freeze({
    subject: "TEAM_RUN",
    teamRunId: binding.runtime.teamRunId,
    targetAgentRunId: selectedMember?.agentRunId ?? null,
    producers: Object.freeze(members.map((member) =>
      producer(member.agentRunId, member.displayName))),
  });
};

export class ApplicationAgentTargetAuthorizationService {
  constructor(private readonly dependencies: {
    startupGate: ApplicationOrchestrationStartupGate;
    availabilityService: ApplicationAvailabilityService;
    bindingStore: ApplicationRunBindingStore;
    lifecycleHub: ApplicationRunBindingLifecycleHub;
  }) {}

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
    const currentAddress = validateAddress(address);
    let released = false;
    const stop = this.dependencies.lifecycleHub.observeTerminal(
      applicationId,
      currentAddress.bindingId,
      onBindingEnded,
    );
    const release = (): void => {
      if (released) return;
      released = true;
      stop();
    };
    try {
      return Object.freeze({
        descriptor: await this.readAuthorizedTarget(applicationId, currentAddress),
        release,
      });
    } catch (error) {
      release();
      throw error;
    }
  }

  private async requireApplication(applicationId: string): Promise<void> {
    try {
      await this.dependencies.startupGate.awaitReady();
      await this.dependencies.availabilityService.requireApplicationActive(applicationId);
    } catch {
      fail("APPLICATION_NOT_AVAILABLE");
    }
  }

  private async readAuthorizedTarget(
    applicationId: string,
    address: ApplicationAgentTargetAddress,
  ): Promise<AuthorizedApplicationAgentTargetDescriptor> {
    const currentAddress = validateAddress(address);
    const storedBinding = await this.dependencies.bindingStore.getBinding(
      applicationId,
      currentAddress.bindingId,
    );
    const binding = storedBinding ?? fail("TARGET_NOT_AVAILABLE");
    if (binding.applicationId !== applicationId ||
        binding.status === "TERMINATED" || binding.status === "ORPHANED") {
      fail("TARGET_NOT_AVAILABLE");
    }
    return deepFreeze({
      applicationId,
      address: structuredClone(currentAddress),
      binding: structuredClone(toPublicApplicationAgentBinding(binding)),
      runtime: structuredClone(resolvedRuntime(binding, currentAddress.memberAddress)),
    });
  }
}
