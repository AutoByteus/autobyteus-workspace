// Frozen copy (import paths remapped, exported names prefixed `Released`) of the team-run config aggregate in
// `src/agent-team-execution/domain/team-run-config.ts` as released at origin/personal@57df63f07, the last shape that
// carried `skillAccessMode`. Owned by released app-data migrations; current runtime must not import it.
import type { ReleasedSkillAccessMode } from "./released-skill-access-mode.js";
import type { RuntimeKind } from "../../runtime-management/runtime-kind-enum.js";
import type { TeamBackendKind } from "../../agent-team-execution/domain/team-backend-kind.js";
import {
  appendAgentTeamAddress,
  assertAgentTeamAddress,
  getAgentTeamAddressBasename,
  getParentAgentTeamAddress,
  type AgentTeamAddress,
} from "../../agent-collaboration/domain/agent-team-address.js";
import {
  cloneCollaborationHandoffs,
  type CollaborationHandoff,
} from "../../agent-collaboration/domain/collaboration-handoff.js";

export type ReleasedAgentLaunchConfiguration = Readonly<{
  runtimeKind: RuntimeKind;
  llmModelIdentifier: string;
  llmConfig: Readonly<Record<string, unknown>> | null;
  autoExecuteTools: boolean;
  skillAccessMode: ReleasedSkillAccessMode;
  workspaceRootPath: string | null;
}>;

export type ReleasedTeamRunAgentNode = Readonly<{
  kind: "agent";
  address: AgentTeamAddress;
  agentDefinitionId: string;
  agentRunId: string;
  platformAgentRunId: string | null;
  role: string | null;
  description: string | null;
  runtimeKind: RuntimeKind;
  llmModelIdentifier: string;
  llmConfig: Readonly<Record<string, unknown>> | null;
  autoExecuteTools: boolean;
  skillAccessMode: ReleasedSkillAccessMode;
  workspaceRootPath: string | null;
}>;

export type ReleasedTeamRunAgentTeamNode = Readonly<{
  kind: "agent_team";
  address: AgentTeamAddress;
  teamDefinitionId: string;
  teamRunId: string;
  coordinatorAddress: AgentTeamAddress;
  defaultLaunchConfiguration: ReleasedAgentLaunchConfiguration;
  role?: string | null;
  description?: string | null;
  children: readonly ReleasedTeamRunNode[];
}>;

export type ReleasedTeamRunNode = ReleasedTeamRunAgentNode | ReleasedTeamRunAgentTeamNode;

export type ReleasedTeamRunApplicationBinding = Readonly<{
  applicationId: string;
  bindingId: string;
}>;

const required = (value: string, fieldName: string): string => {
  const normalized = typeof value === "string" ? value.trim() : "";
  if (!normalized) throw new Error(`${fieldName} is required.`);
  return normalized;
};

const optional = (value: string | null | undefined): string | null =>
  typeof value === "string" && value.trim() ? value.trim() : null;

const freezeObjectGraph = <T>(value: T): Readonly<T> => {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) freezeObjectGraph(child);
  return Object.freeze(value);
};

const freezeRecord = (
  value: Record<string, unknown> | null | undefined,
): Readonly<Record<string, unknown>> | null => value
  ? freezeObjectGraph(structuredClone(value))
  : null;

export const cloneReleasedAgentLaunchConfiguration = (
  value: ReleasedAgentLaunchConfiguration,
  label = "launchConfiguration",
): ReleasedAgentLaunchConfiguration => Object.freeze({
  runtimeKind: value.runtimeKind,
  llmModelIdentifier: required(value.llmModelIdentifier, `${label}.llmModelIdentifier`),
  llmConfig: freezeRecord(value.llmConfig as Record<string, unknown> | null),
  autoExecuteTools: Boolean(value.autoExecuteTools),
  skillAccessMode: value.skillAccessMode,
  workspaceRootPath: optional(value.workspaceRootPath),
});

export const cloneReleasedTeamRunNode = (node: ReleasedTeamRunNode): ReleasedTeamRunNode => {
  const address = assertAgentTeamAddress(node.address);
  if (node.kind === "agent") {
    if (address === "/") throw new Error("The root TeamRun node must be an AgentTeam.");
    return Object.freeze({
      kind: "agent",
      address,
      agentDefinitionId: required(node.agentDefinitionId, `agentDefinitionId at '${address}'`),
      agentRunId: required(node.agentRunId, `agentRunId at '${address}'`),
      platformAgentRunId: optional(node.platformAgentRunId),
      role: node.role ?? null,
      description: node.description ?? null,
      runtimeKind: node.runtimeKind,
      llmModelIdentifier: required(node.llmModelIdentifier, `llmModelIdentifier at '${address}'`),
      llmConfig: freezeRecord(node.llmConfig as Record<string, unknown> | null),
      autoExecuteTools: Boolean(node.autoExecuteTools),
      skillAccessMode: node.skillAccessMode,
      workspaceRootPath: optional(node.workspaceRootPath),
    });
  }
  const children = Object.freeze(node.children.map(cloneReleasedTeamRunNode));
  const coordinatorAddress = assertAgentTeamAddress(node.coordinatorAddress);
  const directCoordinator = children.filter((child) =>
    child.kind === "agent" && child.address === coordinatorAddress,
  );
  if (directCoordinator.length !== 1) {
    throw new Error(`AgentTeam '${address}' must have exactly one direct Agent coordinator '${coordinatorAddress}'.`);
  }
  const seen = new Set<string>();
  for (const child of children) {
    if (getParentAgentTeamAddress(child.address) !== address) {
      throw new Error(`Node '${child.address}' is not a direct child of AgentTeam '${address}'.`);
    }
    const name = getAgentTeamAddressBasename(child.address)!;
    const expected = appendAgentTeamAddress(address, name);
    if (child.address !== expected) throw new Error(`Node '${child.address}' is not canonical.`);
    const folded = name.toLocaleLowerCase("en-US");
    if (seen.has(folded)) throw new Error(`AgentTeam '${address}' has duplicate child '${name}'.`);
    seen.add(folded);
  }
  const placement = address === "/"
    ? {}
    : {
        role: node.role ?? null,
        description: node.description ?? null,
      };
  return Object.freeze({
    kind: "agent_team",
    address,
    teamDefinitionId: required(node.teamDefinitionId, `teamDefinitionId at '${address}'`),
    teamRunId: required(node.teamRunId, `teamRunId at '${address}'`),
    coordinatorAddress,
    defaultLaunchConfiguration: cloneReleasedAgentLaunchConfiguration(
      node.defaultLaunchConfiguration,
      `defaultLaunchConfiguration at '${address}'`,
    ),
    ...placement,
    children,
  });
};

/** Immutable released-schema aggregate used by released migrations only. */
export class ReleasedTeamRunConfig {
  readonly teamBackendKind: TeamBackendKind;
  readonly rootTeam: ReleasedTeamRunAgentTeamNode;
  readonly handoffs: readonly CollaborationHandoff[];
  readonly applicationBinding: ReleasedTeamRunApplicationBinding | null;

  constructor(input: {
    teamBackendKind: TeamBackendKind;
    rootTeam: ReleasedTeamRunAgentTeamNode;
    handoffs?: readonly CollaborationHandoff[] | null;
    applicationBinding?: ReleasedTeamRunApplicationBinding | null;
  }) {
    this.teamBackendKind = input.teamBackendKind;
    this.rootTeam = cloneReleasedTeamRunNode(input.rootTeam) as ReleasedTeamRunAgentTeamNode;
    if (this.rootTeam.address !== "/") throw new Error("Root AgentTeam address must be '/'.");
    this.handoffs = Object.freeze(cloneCollaborationHandoffs(input.handoffs ?? []));
    this.applicationBinding = input.applicationBinding
      ? Object.freeze({
          applicationId: required(input.applicationBinding.applicationId, "applicationBinding.applicationId"),
          bindingId: required(input.applicationBinding.bindingId, "applicationBinding.bindingId"),
        })
      : null;
    Object.freeze(this);
  }
}
