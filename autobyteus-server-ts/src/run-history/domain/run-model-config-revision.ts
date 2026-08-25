import { createHash } from "node:crypto";
import type { TeamRunExecutionTreeSnapshot } from "../../agent-team-execution/domain/team-run-execution-tree.js";
import type { AgentRunMetadata } from "../store/agent-run-metadata-types.js";

const canonicalize = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, child]) => [key, canonicalize(child)]),
  );
};

const digest = (subject: unknown): string => createHash("sha256")
  .update(`run-model-config:v1:${JSON.stringify(canonicalize(subject))}`)
  .digest("hex");

export const computeAgentRunModelConfigRevision = (
  metadata: Pick<AgentRunMetadata, "runtimeKind" | "llmModelIdentifier" | "llmConfig">,
): string => digest({
  runtimeKind: metadata.runtimeKind,
  llmModelIdentifier: metadata.llmModelIdentifier,
  llmConfig: metadata.llmConfig ?? null,
});

type TeamRevisionScope = Readonly<{
  kind: "CONFIGURED_TEAM" | "CONFIGURED_AGENT";
  address: string;
  runtimeKind: string;
  llmModelIdentifier: string;
  llmConfig: Readonly<Record<string, unknown>> | null;
}>;

const collectTeamRevisionScopes = (tree: TeamRunExecutionTreeSnapshot): TeamRevisionScope[] => {
  const scopes: TeamRevisionScope[] = [{
    kind: "CONFIGURED_TEAM",
    address: "/",
    runtimeKind: tree.rootTeam.defaultLaunchConfiguration.runtimeKind,
    llmModelIdentifier: tree.rootTeam.defaultLaunchConfiguration.llmModelIdentifier,
    llmConfig: tree.rootTeam.defaultLaunchConfiguration.llmConfig,
  }];
  const visit = (members: TeamRunExecutionTreeSnapshot["rootTeam"]["members"]): void => {
    for (const member of members) {
      if ("agentRunId" in member) {
        scopes.push({
          kind: "CONFIGURED_AGENT",
          address: member.address,
          runtimeKind: member.launchConfiguration.runtimeKind,
          llmModelIdentifier: member.launchConfiguration.llmModelIdentifier,
          llmConfig: member.launchConfiguration.llmConfig,
        });
      } else {
        scopes.push({
          kind: "CONFIGURED_TEAM",
          address: member.address,
          runtimeKind: member.defaultLaunchConfiguration.runtimeKind,
          llmModelIdentifier: member.defaultLaunchConfiguration.llmModelIdentifier,
          llmConfig: member.defaultLaunchConfiguration.llmConfig,
        });
        visit(member.members);
      }
    }
  };
  visit(tree.rootTeam.members);
  return scopes.sort((left, right) =>
    left.address.localeCompare(right.address) || left.kind.localeCompare(right.kind));
};

export const computeTeamRunModelConfigRevision = (
  tree: TeamRunExecutionTreeSnapshot,
): string => digest(collectTeamRevisionScopes(tree));
