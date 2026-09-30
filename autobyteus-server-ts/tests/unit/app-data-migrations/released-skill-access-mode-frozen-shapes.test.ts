import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { assertAgentTeamAddress } from "../../../src/agent-collaboration/domain/agent-team-address.js";
import { TeamBackendKind } from "../../../src/agent-team-execution/domain/team-backend-kind.js";
import { validateLaunchConfiguration as validateReleasedV2LaunchConfiguration } from "../../../src/app-data-migrations/legacy/released-run-package-shapes/run-execution-tree-shared-record-schemas-v2.js";
import { validateTeamRunExecutionTreePayload as validateReleasedTreeV2 } from "../../../src/app-data-migrations/legacy/released-run-package-shapes/team-run-execution-tree-v2-schema.js";
import {
  RELEASED_SKILL_ACCESS_MODES,
  isReleasedSkillAccessMode,
} from "../../../src/app-data-migrations/legacy/released-skill-access-mode.js";
import {
  ReleasedTeamRunConfig,
  type ReleasedTeamRunAgentNode,
  type ReleasedTeamRunAgentTeamNode,
} from "../../../src/app-data-migrations/legacy/released-team-run-config.js";
import { validateTeamRunMetadataPayload } from "../../../src/app-data-migrations/legacy/team-run-metadata-schema.js";
import { convertLegacyTeamRunMetadata } from "../../../src/app-data-migrations/migrations/team-run-execution-tree-v1/predecessor-team-metadata-converter.js";
import { planPredecessorTeamRunV1Package } from "../../../src/app-data-migrations/migrations/team-run-execution-tree-v1/predecessor-team-run-planner.js";
import { buildInitialTeamRunExecutionTree } from "../../../src/app-data-migrations/migrations/team-run-execution-tree-v1/team-run-execution-tree-v1-builder.js";
import { validateTeamRunExecutionTreePayload as validateTreeV1 } from "../../../src/app-data-migrations/migrations/team-run-execution-tree-v1/team-run-execution-tree-v1-schema.js";
import type { TeamRunExecutionTreeFileV1 } from "../../../src/app-data-migrations/migrations/team-run-execution-tree-v1/team-run-execution-tree-v1-types.js";
import { transformTeamRunExecutionTreeV1ToV2 } from "../../../src/app-data-migrations/migrations/team-run-execution-tree-v2-app-data-migration.js";
import { decodeFlatTeamRunMetadataToMemberTree } from "../../../src/app-data-migrations/migrations/team-run-member-tree-prerequisite-converter.js";
import { RuntimeKind } from "../../../src/runtime-management/runtime-kind-enum.js";

/**
 * The run-level skill access mode no longer exists in current code. Released app-data
 * migrations still read and write it through frozen shapes; these tests pin that their
 * accept/reject behavior is what it was when the field was removed.
 */
type Json = Record<string, unknown>;
const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
const fixture = async (relative: string): Promise<Json> => JSON.parse(await fs.readFile(
  path.resolve(process.cwd(), "tests/fixtures/app-data-migrations", relative),
  "utf-8",
)) as Json;

const roots: string[] = [];
afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => fs.rm(root, { recursive: true, force: true })));
});

/** Each frozen validator: accepts both released values, rejects an unknown value and a missing key. */
const expectReleasedModeContract = (
  label: string,
  validate: (mutate: (holder: Json) => void) => unknown,
): void => {
  for (const mode of RELEASED_SKILL_ACCESS_MODES) {
    expect(() => validate((holder) => { holder.skillAccessMode = mode; }), `${label} accepts ${mode}`).not.toThrow();
  }
  expect(() => validate((holder) => { holder.skillAccessMode = "GLOBAL_DISCOVERY"; }), `${label} rejects unknown`).toThrow();
  expect(() => validate((holder) => { delete holder.skillAccessMode; }), `${label} rejects missing`).toThrow();
};

const legacyAgent = (address: string[], runId: string): Json => ({
  memberKind: "agent",
  memberRouteKey: address.join("/"),
  memberPath: address,
  memberName: address.at(-1),
  memberRunId: runId,
  runtimeKind: RuntimeKind.CODEX_APP_SERVER,
  platformAgentRunId: null,
  agentDefinitionId: `definition-${runId}`,
  llmModelIdentifier: "codex:model",
  autoExecuteTools: false,
  skillAccessMode: "PRELOADED_ONLY",
  llmConfig: null,
  workspaceRootPath: "/workspace",
  applicationExecutionContext: null,
  role: null,
  description: null,
});

const legacyMetadata = (): Json => ({
  teamRunId: "root-team-run",
  teamDefinitionId: "root-team-definition",
  teamDefinitionName: "Root Team",
  coordinatorMemberRouteKey: "lead",
  createdAt: "2026-08-01T00:00:00.000Z",
  archivedAt: null,
  handoffs: [],
  memberTree: [
    legacyAgent(["lead"], "lead-run"),
    {
      memberKind: "agent_team",
      memberRouteKey: "review",
      memberPath: ["review"],
      memberName: "review",
      memberRunId: "review-team-run",
      teamRunId: "review-team-run",
      teamDefinitionId: "review-team-definition",
      coordinatorMemberRouteKey: "review/reviewer",
      role: null,
      description: null,
      memberTree: [legacyAgent(["review", "reviewer"], "reviewer-run")],
    },
  ],
});

const releasedAgent = (address: string, mode: "PRELOADED_ONLY" | "NONE" = "PRELOADED_ONLY"): ReleasedTeamRunAgentNode => ({
  kind: "agent",
  address: assertAgentTeamAddress(address),
  agentDefinitionId: `definition-${address}`,
  agentRunId: `run-${address}`,
  platformAgentRunId: null,
  role: null,
  description: null,
  runtimeKind: RuntimeKind.AUTOBYTEUS,
  llmModelIdentifier: "model",
  llmConfig: null,
  autoExecuteTools: true,
  skillAccessMode: mode,
  workspaceRootPath: null,
});

const releasedRoot = (
  children: ReleasedTeamRunAgentTeamNode["children"],
  overrides: Partial<ReleasedTeamRunAgentTeamNode> = {},
): ReleasedTeamRunAgentTeamNode => ({
  kind: "agent_team",
  address: assertAgentTeamAddress("/"),
  teamDefinitionId: "team-definition",
  teamRunId: "team-run",
  coordinatorAddress: assertAgentTeamAddress("/lead"),
  defaultLaunchConfiguration: {
    runtimeKind: RuntimeKind.AUTOBYTEUS,
    llmModelIdentifier: "model",
    llmConfig: null,
    autoExecuteTools: true,
    skillAccessMode: "PRELOADED_ONLY",
    workspaceRootPath: null,
  },
  children,
  ...overrides,
});

const launchConfigurationsOf = (tree: TeamRunExecutionTreeFileV1): Json[] => {
  const found: Json[] = [];
  const visit = (value: unknown): void => {
    if (!value || typeof value !== "object") return;
    if (Array.isArray(value)) { value.forEach(visit); return; }
    for (const [key, child] of Object.entries(value)) {
      if (key === "launchConfiguration") found.push(child as Json);
      else visit(child);
    }
  };
  visit(tree);
  return found;
};

describe("released skill access mode literal", () => {
  it("holds exactly the values released shapes carried", () => {
    expect([...RELEASED_SKILL_ACCESS_MODES]).toEqual(["PRELOADED_ONLY", "NONE"]);
    expect(isReleasedSkillAccessMode("NONE")).toBe(true);
    expect(isReleasedSkillAccessMode("GLOBAL_DISCOVERY")).toBe(false);
    expect(isReleasedSkillAccessMode(undefined)).toBe(false);
  });
});

describe("frozen launch-configuration validators keep their released accept/reject behavior", () => {
  it("released tree V2 shared schema", () => {
    const launch = {
      runtimeKind: RuntimeKind.AUTOBYTEUS, llmModelIdentifier: "model", llmConfig: null,
      autoExecuteTools: true, skillAccessMode: "PRELOADED_ONLY", workspaceRootPath: null,
    };
    expectReleasedModeContract("tree V2", (mutate) => {
      const candidate: Json = { ...launch };
      mutate(candidate);
      validateReleasedV2LaunchConfiguration(candidate, "launch");
    });
  });

  it("tree V1 schema", async () => {
    const tree = await fixture("team-run-execution-tree-v1/case-001-persistent-only/team_run_execution_tree.json");
    const firstLaunch = (candidate: Json): Json => {
      const members = (candidate.rootTeam as Json).members as Json[];
      return members.find((member) => "launchConfiguration" in member)!.launchConfiguration as Json;
    };
    expectReleasedModeContract("tree V1", (mutate) => {
      const candidate = clone(tree);
      mutate(firstLaunch(candidate));
      validateTreeV1(candidate);
    });
  });

  it("team metadata V3 schema", () => {
    const valid = clone(convertLegacyTeamRunMetadata(legacyMetadata(), "root-team-run")) as unknown as Json;
    expect(valid.schemaVersion).toBe(3);
    expectReleasedModeContract("team metadata V3", (mutate) => {
      const candidate = clone(valid);
      mutate(((candidate.rootTeam as Json).children as Json[])[0]!);
      validateTeamRunMetadataPayload(candidate, "root-team-run");
    });
  });

  it("flat member-tree prerequisite converter", async () => {
    const flat = await fixture("team-run-metadata-member-tree/legacy-flat-safe-team-run-metadata.json");
    expectReleasedModeContract("prerequisite converter", (mutate) => {
      const candidate = clone(flat);
      mutate((candidate.memberMetadata as Json[])[0]!);
      decodeFlatTeamRunMetadataToMemberTree(candidate, String(candidate.teamRunId));
    });
  });

  it("predecessor team metadata converter", () => {
    expectReleasedModeContract("predecessor converter", (mutate) => {
      const candidate = legacyMetadata();
      mutate((candidate.memberTree as Json[])[0]!);
      convertLegacyTeamRunMetadata(candidate, "root-team-run");
    });
  });
});

describe("tree V1 migration keeps the field through the frozen team-run config", () => {
  it("builds a V1 tree that carries each agent's mode and passes the V1 schema", () => {
    const config = new ReleasedTeamRunConfig({
      teamBackendKind: TeamBackendKind.MIXED,
      rootTeam: releasedRoot([releasedAgent("/lead"), releasedAgent("/worker", "NONE")]),
    });
    expect(Object.keys(config.rootTeam.children[0]!)).toContain("skillAccessMode");
    expect(config.rootTeam.defaultLaunchConfiguration.skillAccessMode).toBe("PRELOADED_ONLY");

    const tree = buildInitialTeamRunExecutionTree({ config, teamDefinitionName: "Team" });

    expect(launchConfigurationsOf(tree).map((launch) => launch.skillAccessMode)).toEqual(["PRELOADED_ONLY", "NONE"]);
    expect(() => validateTreeV1(clone(tree), "team-run")).not.toThrow();
  });

  it("plans a predecessor package whose every launch configuration carries the field", async () => {
    const rootDir = await fs.mkdtemp(path.join(os.tmpdir(), "released-team-run-planner-"));
    roots.push(rootDir);
    const metadataPath = path.join(rootDir, "team_run_metadata.json");
    const metadata = legacyMetadata();
    ((metadata.memberTree as Json[])[0]!).skillAccessMode = "NONE";
    await fs.writeFile(metadataPath, JSON.stringify(metadata), "utf-8");

    const planned = await planPredecessorTeamRunV1Package({
      rootTeamRunId: "root-team-run",
      rootDir,
      metadataPath,
      taskRecordsPath: path.join(rootDir, "task_delegation_records.json"),
      communicationPath: path.join(rootDir, "team_communication_messages.json"),
      tokenRows: [],
    });

    const launches = launchConfigurationsOf(planned.executionTree);
    expect(launches.map((launch) => launch.skillAccessMode)).toEqual(["NONE", "PRELOADED_ONLY"]);
    expect(() => validateTreeV1(clone(planned.executionTree), "root-team-run")).not.toThrow();
  });

  it.each([
    ["no direct coordinator", () => releasedRoot([releasedAgent("/worker")]), "exactly one direct Agent coordinator"],
    ["a child that is not a direct child", () => releasedRoot([releasedAgent("/lead"), releasedAgent("/nested/worker")]), "is not a direct child"],
    ["duplicate child names differing only by case", () => releasedRoot([releasedAgent("/lead"), releasedAgent("/Lead")]), "duplicate child"],
    ["a missing agent run id", () => releasedRoot([{ ...releasedAgent("/lead"), agentRunId: " " }]), "agentRunId at '/lead' is required"],
    ["a non-root top-level team", () => releasedRoot([releasedAgent("/team/lead")], {
      address: assertAgentTeamAddress("/team"),
      coordinatorAddress: assertAgentTeamAddress("/team/lead"),
    }), "Root AgentTeam address must be '/'"],
  ])("still rejects %s", (_name, rootTeam, message) => {
    expect(() => new ReleasedTeamRunConfig({ teamBackendKind: TeamBackendKind.MIXED, rootTeam: rootTeam() }))
      .toThrow(message);
  });
});

describe("tree V2 migration output stays a released shape", () => {
  it("writes the field and validates under the frozen strict V2 schema", () => {
    const launch = {
      runtimeKind: "CODEX" as const, llmModelIdentifier: "model", llmConfig: null,
      autoExecuteTools: true, skillAccessMode: "NONE" as const, workspaceRootPath: "/workspace",
    };
    const v1: TeamRunExecutionTreeFileV1 = {
      schemaVersion: 1,
      createdAt: "2026-08-24T10:00:00.000Z",
      archivedAt: null,
      applicationBinding: null,
      handoffs: [],
      rootTeam: {
        teamDefinitionId: "definition",
        teamDefinitionName: "Flat Team",
        teamRunId: "flat-run",
        coordinatorAddress: assertAgentTeamAddress("/lead"),
        members: [{
          address: assertAgentTeamAddress("/lead"), agentDefinitionId: "definition-lead", role: null,
          description: null, agentRunId: "lead-run", platformAgentRunId: null, launchConfiguration: launch,
        }],
        taskExecutions: [],
      },
    };

    const v2 = clone(transformTeamRunExecutionTreeV1ToV2(v1)) as unknown as Json;

    const root = v2.rootTeam as Json;
    expect((root.defaultLaunchConfiguration as Json).skillAccessMode).toBe("NONE");
    expect(((root.members as Json[])[0]!.launchConfiguration as Json).skillAccessMode).toBe("NONE");
    expect(() => validateReleasedTreeV2(v2, "flat-run")).not.toThrow();
  });
});
