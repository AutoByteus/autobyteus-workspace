import type { AgentOperationResult } from "../../agent-execution/domain/agent-operation-result.js";
import type { AgentLaunchConfiguration } from "../../agent-team-execution/domain/team-run-config.js";
import { getAgentTeamAddressBasename } from "../domain/agent-team-address.js";
import type {
  LaunchConfigurationFallback,
  LaunchConfigurationOrigin,
  LaunchConfigurationSource,
} from "../domain/launch-configuration-source.js";
import type { CollaboratorEntryPlan } from "./collaborator-entry-builder.js";

/** One resolved launch to describe: an Agent (or Team member), or a Team's own launch for its members. */
export type LaunchConfigurationSourceWithName = Readonly<{
  name: string;
  subject: "agent" | "team";
  launch: AgentLaunchConfiguration;
  source: LaunchConfigurationSource;
}>;

const LAYER_LABEL: Readonly<Record<LaunchConfigurationFallback["layer"], string>> = {
  agent_default: "agent default",
  team_default: "team default",
};
const ORIGIN_LABEL: Readonly<Record<LaunchConfigurationOrigin, string>> = {
  agent_default: "its agent default",
  team_default: "its team default",
  inherited: "inherited from the run",
  configured: "as configured in this run",
};

const configured = (fallback: LaunchConfigurationFallback): string =>
  `${fallback.runtimeKind ?? "(no runtime)"} / ${fallback.llmModelIdentifier ?? "(no model)"}`;

/**
 * Human text for every skipped configured layer (REQ-003, REQ-008): which agent, what was
 * configured, why it could not be used and what it runs on instead. No fallbacks, no notes.
 */
export const launchNotesOf = (sources: readonly LaunchConfigurationSourceWithName[]): string[] =>
  sources.flatMap(({ name, subject, launch, source }) => source.fallbacks.map((fallback) => {
    const runsOn = subject === "team" ? "its members without their own default run on" : "it runs on";
    const detail = fallback.detail.replace(/\.$/, "");
    return `${name}: its ${LAYER_LABEL[fallback.layer]} ${configured(fallback)} could not be used (${detail}); `
      + `${runsOn} ${launch.runtimeKind} / ${launch.llmModelIdentifier} (${ORIGIN_LABEL[source.origin]}).`;
  }));

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
