import type { ApplicationAgentBindingStatus } from "@autobyteus/application-sdk-contracts";
import type { ApplicationAgentBindingRecord } from "../domain/models.js";
import type { ApplicationRunBindingStore } from "../stores/application-run-binding-store.js";
import type { ApplicationRunLookupStore } from "../stores/application-run-lookup-store.js";
import type { ApplicationOrchestrationStartupGate } from "./application-orchestration-startup-gate.js";

export type ApplicationRunBindingProvenance = Readonly<{
  applicationId: string;
  bindingId: string;
}>;

export type ApplicationRunOwnershipInput = Readonly<{
  runId: string;
  applicationBinding?: ApplicationRunBindingProvenance | null;
}>;

export type ApplicationRunOwnershipReader = Readonly<{
  hasLiveRunOwnership(input: ApplicationRunOwnershipInput): Promise<boolean>;
}>;

const NONTERMINAL_STATUSES = new Set<ApplicationAgentBindingStatus>([
  "ATTACHED",
  "TERMINATING",
  "FAILED",
]);
const TERMINAL_STATUSES = new Set<ApplicationAgentBindingStatus>([
  "TERMINATED",
  "ORPHANED",
]);

const required = (value: string, field: string): string => {
  const normalized = value.trim();
  if (!normalized) throw new Error(`${field} is required.`);
  return normalized;
};

const normalizeProvenance = (
  value: ApplicationRunBindingProvenance | null | undefined,
): ApplicationRunBindingProvenance | null => value
  ? Object.freeze({
      applicationId: required(value.applicationId, "applicationBinding.applicationId"),
      bindingId: required(value.bindingId, "applicationBinding.bindingId"),
    })
  : null;

const bindingContainsRunId = (
  binding: ApplicationAgentBindingRecord,
  runId: string,
): boolean => binding.runtime.subject === "AGENT_RUN"
  ? binding.runtime.agentRunId === runId
  : binding.runtime.teamRunId === runId
    || binding.runtime.members.some((member) => member.agentRunId === runId);

const classifyBinding = (binding: ApplicationAgentBindingRecord): boolean => {
  if (NONTERMINAL_STATUSES.has(binding.status)) return true;
  if (TERMINAL_STATUSES.has(binding.status)) return false;
  throw new Error(`Application run binding '${binding.bindingId}' has unsupported status '${binding.status}'.`);
};

/** Read-only Application ownership lease; it exposes no runtime manager or mutation. */
export class ApplicationRunOwnershipService implements ApplicationRunOwnershipReader {
  constructor(private readonly dependencies: Readonly<{
    startupGate: Pick<ApplicationOrchestrationStartupGate, "awaitReady">;
    lookupStore: Pick<ApplicationRunLookupStore, "getLookupByRunId">;
    bindingStore: Pick<ApplicationRunBindingStore, "getBinding">;
  }>) {}

  async hasLiveRunOwnership(input: ApplicationRunOwnershipInput): Promise<boolean> {
    const runId = required(input.runId, "runId");
    const provenance = normalizeProvenance(input.applicationBinding);

    await this.dependencies.startupGate.awaitReady();
    const lookup = this.dependencies.lookupStore.getLookupByRunId(runId);
    if (!lookup && !provenance) return false;
    if (lookup && lookup.runId !== runId) {
      throw new Error(`Application ownership lookup does not match run '${runId}'.`);
    }

    if (
      lookup
      && provenance
      && (
        lookup.applicationId !== provenance.applicationId
        || lookup.bindingId !== provenance.bindingId
      )
    ) {
      throw new Error(`Application ownership evidence disagrees for run '${runId}'.`);
    }

    const reference = lookup ?? provenance!;
    const binding = await this.dependencies.bindingStore.getBinding(
      reference.applicationId,
      reference.bindingId,
    );
    if (!binding) {
      throw new Error(
        `Application run binding '${reference.bindingId}' was not found for run '${runId}'.`,
      );
    }
    if (
      binding.applicationId !== reference.applicationId
      || binding.bindingId !== reference.bindingId
      || !bindingContainsRunId(binding, runId)
    ) {
      throw new Error(`Application run binding '${reference.bindingId}' does not own run '${runId}'.`);
    }
    return classifyBinding(binding);
  }
}
