import type { AgentOperationResult } from "../../agent-execution/domain/agent-operation-result.js";
import type { AgentLaunchConfiguration } from "../../agent-team-execution/domain/team-run-config.js";
import { getAgentTeamAddressBasename } from "../domain/agent-team-address.js";
import type {
  ConfiguredLaunchLayer,
  LaunchConfigurationFallback,
  LaunchConfigurationOrigin,
  LaunchConfigurationSource,
} from "../domain/launch-configuration-source.js";
import type { CollaboratorEntryPlan } from "./collaborator-entry-builder.js";

/** One resolved launch to describe: an Agent (or Team member), or a Team's own launch for its members. */
export type LaunchConfigurationSourceWithName = Readonly<{
  name: string;
  subject: "agent" | "team";
  launch: Readonly<Pick<AgentLaunchConfiguration, "llmModelIdentifier"> & { runtimeKind: string }>;
  source: LaunchConfigurationSource;
}>;

const LAYER_LABEL: Readonly<Record<ConfiguredLaunchLayer, string>> = {
  agent_default: "agent default",
  team_default: "team default",
};
const ORIGIN_LABEL: Readonly<Record<LaunchConfigurationOrigin, string>> = {
  agent_default: "its agent default",
  team_default: "its team default",
  model_router: "chosen by the Model Router",
  inherited: "inherited from the run",
  configured: "as configured in this run",
};

const configured = (fallback: LaunchConfigurationFallback): string =>
  `${fallback.runtimeKind ?? "(no runtime)"} / ${fallback.llmModelIdentifier ?? "(no model)"}`;

/** What was skipped and why (supplement §§ 5, 7): a configured layer, or the Model Router not active or failing. */
const skippedText = (fallback: LaunchConfigurationFallback): string => {
  const detail = fallback.detail.replace(/\.$/, "");
  if (fallback.layer === "model_router") {
    return fallback.reason === "router_failed"
      ? `Model Router could not choose (${detail})`
      : `Model Routing is on but the Model Router is not usable (${detail})`;
  }
  return `its ${LAYER_LABEL[fallback.layer]} ${configured(fallback)} could not be used (${detail})`;
};

/**
 * Human text for every launch the delegating agent should know about (REQ-003, REQ-008, REQ-009): one line per agent
 * the Model Router chose for (runtime, model, task kind, reason), and one per skipped layer (which agent, what was
 * configured or that the router could not choose, why, and what it runs on instead). Nothing else, no notes.
 */
export const launchNotesOf = (sources: readonly LaunchConfigurationSourceWithName[]): string[] =>
  sources.flatMap(({ name, subject, launch, source }) => {
    const runsOn = subject === "team" ? "its members without their own default run on" : "it runs on";
    const target = `${launch.runtimeKind} / ${launch.llmModelIdentifier}`;
    const skipped = source.fallbacks.map((fallback) =>
      `${name}: ${skippedText(fallback)}; ${runsOn} ${target} (${ORIGIN_LABEL[source.origin]}).`);
    if (source.origin !== "model_router") return skipped;
    const reason = source.choiceReason.trim().replace(/([^.!?])$/, "$1.");
    return [`${name}: runs on ${target}, chosen by the Model Router (${source.taskKind}): ${reason}`, ...skipped];
  });

/** The notes of one freshly resolved collaborator or catalog copy: the Agent, or the Team and each member. */
export const entryPlanLaunchNotes = (plan: CollaboratorEntryPlan): string[] => {
  if (plan.kind === "agent") {
    return launchNotesOf([{ name: plan.name, subject: "agent", launch: plan.launchConfiguration, source: plan.launchSource }]);
  }
  return launchNotesOf([
    { name: plan.name, subject: "team", launch: plan.defaultLaunchConfiguration, source: plan.defaultLaunchSource },
    ...plan.members.flatMap((member) => member.launchSource ? [{
      name: getAgentTeamAddressBasename(member.address) ?? member.address,
      subject: "agent" as const,
      launch: member.launchConfiguration,
      source: member.launchSource,
    }] : []),
  ]);
};

/**
 * Appends launch notes to an accepted `send_message_to` result that brought an agent or team in
 * (DS-004). A rejected result, or one without notes, is returned unchanged.
 */
export const appendLaunchNotes = (result: AgentOperationResult, notes: readonly string[] | undefined): AgentOperationResult => {
  if (!result.accepted || !notes?.length) return result;
  const lines = notes.map((note) => `- ${note}`).join("\n");
  return { ...result, message: `${result.message ?? "Message delivered."}\nLaunch configuration notes:\n${lines}` };
};
