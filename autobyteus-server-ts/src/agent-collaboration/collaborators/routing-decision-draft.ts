import type { AgentLaunchConfiguration } from "../../agent-team-execution/domain/team-run-config.js";
import type {
  DecisionLaunchSource,
  RoutingDecisionAgent,
  RoutingDecisionDraft,
} from "../../model-routing/domain/model-routing-types.js";
import { getAgentTeamAddressBasename } from "../domain/agent-team-address.js";
import type { LaunchConfigurationSource } from "../domain/launch-configuration-source.js";
import type { CollaboratorEntryPlan } from "./collaborator-entry-builder.js";
import { launchNotesOf } from "./launch-configuration-notes.js";

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
  notes: Object.freeze(launchNotesOf([{ name: getAgentTeamAddressBasename(address) ?? address, subject: "agent", launch, source }])),
});

/**
 * The decision records of a freshly resolved copy (REQ-012): every agent with its launch, source, router task kind and
 * reason, and its notes. A Team member without a source of its own follows its Team's.
 */
export const routingDecisionDraftOf = (plan: CollaboratorEntryPlan): RoutingDecisionDraft => Object.freeze({
  copyAddress: plan.address,
  copyKind: plan.kind,
  agents: Object.freeze(plan.kind === "agent"
    ? [agentOf(plan.address, plan.launchConfiguration, plan.launchSource)]
    : plan.members.map((member) => agentOf(member.address, member.launchConfiguration, member.launchSource ?? plan.defaultLaunchSource))),
});
