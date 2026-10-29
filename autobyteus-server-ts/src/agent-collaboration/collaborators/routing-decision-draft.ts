import type { AgentLaunchConfiguration } from "../../agent-team-execution/domain/team-run-config.js";
import type {
  DecisionLaunchSource,
  RoutingDecisionAgent,
  RoutingDecisionDraft,
} from "../../model-routing/domain/model-routing-types.js";
import type { LaunchConfigurationSource } from "../domain/launch-configuration-source.js";
import type { CollaboratorEntryPlan } from "./collaborator-entry-builder.js";

/** A fresh copy's origin as Decisions group it; a fresh copy is never `configured`. */
const decisionSourceOf = (source: LaunchConfigurationSource): DecisionLaunchSource =>
  source.origin === "configured" ? "inherited" : source.origin;

const agentOf = (address: string, launch: AgentLaunchConfiguration, source: LaunchConfigurationSource): RoutingDecisionAgent => Object.freeze({
  agentAddress: address,
  runtimeKind: launch.runtimeKind,
  llmModelIdentifier: launch.llmModelIdentifier,
  source: decisionSourceOf(source),
  taskKind: source.origin === "model_router" ? source.taskKind : null,
  choiceReason: source.origin === "model_router" ? source.choiceReason : null,
  routerFailure: source.fallbacks.find((fallback) => fallback.reason === "router_failed")?.detail ?? null,
  skipped: Object.freeze(source.fallbacks.flatMap((fallback) => fallback.layer === "model_router" ? [] : [Object.freeze({
    layer: fallback.layer, runtimeKind: fallback.runtimeKind, llmModelIdentifier: fallback.llmModelIdentifier, detail: fallback.detail,
  })])),
});

/**
 * The decision records of a freshly resolved copy (REQ-012): every agent with its launch, source, router task kind and
 * reason, router failure and skipped defaults (SR-017: these structured fields are the only stored form; no rendered
 * notes). A Team member without a source of its own follows its Team's.
 */
export const routingDecisionDraftOf = (plan: CollaboratorEntryPlan): RoutingDecisionDraft => Object.freeze({
  copyAddress: plan.address,
  copyKind: plan.kind,
  agents: Object.freeze(plan.kind === "agent"
    ? [agentOf(plan.address, plan.launchConfiguration, plan.launchSource)]
    : plan.members.map((member) => agentOf(member.address, member.launchConfiguration, member.launchSource ?? plan.defaultLaunchSource))),
});
