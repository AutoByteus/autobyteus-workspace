import { describe, expect, it } from "vitest";
import { SkillAccessMode } from "autobyteus-ts/agent/context/skill-access-mode.js";
import { createAgentTeamAddress } from "../../../src/agent-collaboration/domain/agent-team-address.js";
import type {
  TeamRunAgentMemberMetadata,
  TeamRunMemberMetadata,
  TeamRunSubTeamMemberMetadata,
} from "../../../src/app-data-migrations/legacy/team-run-metadata-types.js";
import { applicationBindingFromMetadata } from "../../../src/app-data-migrations/migrations/team-run-execution-tree-v1/predecessor-team-run-planner.js";
import { RuntimeKind } from "../../../src/runtime-management/runtime-kind-enum.js";

type ApplicationBinding = Readonly<{ applicationId: string; bindingId: string }>;

const agent = (
  segments: string[],
  applicationExecutionContext: ApplicationBinding | null,
): TeamRunAgentMemberMetadata => {
  const name = segments.at(-1)!;
  return Object.freeze({
    kind: "agent",
    address: createAgentTeamAddress(segments),
    agentDefinitionId: `definition-${name}`,
    agentRunId: `run-${name}`,
    platformAgentRunId: null,
    role: null,
    description: null,
    runtimeKind: RuntimeKind.AUTOBYTEUS,
    llmModelIdentifier: "test-model",
    llmConfig: null,
    autoExecuteTools: false,
    skillAccessMode: SkillAccessMode.PRELOADED_ONLY,
    workspaceRootPath: "/workspace",
    applicationExecutionContext,
  });
};

const team = (
  segments: string[],
  coordinatorSegments: string[],
  children: readonly TeamRunMemberMetadata[],
): TeamRunSubTeamMemberMetadata => Object.freeze({
  kind: "agent_team",
  address: createAgentTeamAddress(segments),
  teamDefinitionId: `definition-${segments.at(-1) ?? "root"}`,
  teamRunId: `run-${segments.at(-1) ?? "root"}`,
  coordinatorAddress: createAgentTeamAddress(coordinatorSegments),
  role: segments.length ? null : undefined,
  description: segments.length ? null : undefined,
  children,
});

const metadataTree = (
  nestedAgentContexts: readonly (ApplicationBinding | null)[],
): TeamRunSubTeamMemberMetadata => {
  const nestedAgents = nestedAgentContexts.map((context, index) =>
    agent(["research", `researcher-${index + 1}`], context));
  return team([], ["lead"], [
    agent(["lead"], null),
    team(["research"], ["research", "researcher-1"], nestedAgents),
  ]);
};

describe("applicationBindingFromMetadata", () => {
  it("returns one consistent binding found in nested Agent records", () => {
    const binding = { applicationId: "application-1", bindingId: "binding-1" };

    expect(applicationBindingFromMetadata(metadataTree([binding, binding]))).toEqual(binding);
  });

  it("returns null when every nested Agent has no application binding", () => {
    expect(applicationBindingFromMetadata(metadataTree([null, null]))).toBeNull();
  });

  it("rejects contradictory bindings from distinct nested Agent records", () => {
    expect(() => applicationBindingFromMetadata(metadataTree([
      { applicationId: "application-1", bindingId: "binding-1" },
      { applicationId: "application-2", bindingId: "binding-2" },
    ]))).toThrow("Predecessor TeamRun contains contradictory application bindings.");
  });
});
