import { AgentOrgTokenAttributionTransition } from "../../../src/app-data-migrations/migrations/agent-org-flat-team-families-v1/agent-org-token-attribution-transition.js";
const emptyTokens = (memory: string) => new AgentOrgTokenAttributionTransition(memory, {
  async *listClaimedRoots() {}, async convertRoot() { return 0; },
});
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { AppConfig } from "../../../src/config/app-config.js";
import { AgentMemoryLayout } from "../../../src/agent-memory/store/agent-memory-layout.js";
import { AgentOrgFlatTeamFamiliesV1AppDataMigration } from "../../../src/app-data-migrations/migrations/agent-org-flat-team-families-v1/agent-org-flat-team-families-v1-app-data-migration.js";
import { TeamRunExecutionTreeV2AppDataMigration } from "../../../src/app-data-migrations/migrations/team-run-execution-tree-v2-app-data-migration.js";
import { getTeamRunExecutionTreePath } from "../../../src/run-history/store/team-run-execution-tree-path.js";
import { getAgentOrgRunExecutionTreePath } from "../../../src/run-history/store/agent-org-run-execution-tree-path.js";
import { getTaskDelegationRecordsV1Path } from "../../../src/agent-team-execution/task-delegation/records/task-delegation-records-v1-store.js";
import { getTeamCommunicationMessagesV1Path } from "../../../src/services/team-communication/team-communication-v1-store.js";
import { getAgentOrgTaskDelegationRecordsV1Path } from "../../../src/agent-org-execution/persistence/agent-org-task-delegation-records-v1-store.js";
import { getAgentOrgCommunicationMessagesV1Path } from "../../../src/agent-org-execution/persistence/agent-org-communication-messages-v1-store.js";
import { AgentOrgRunHistoryIndexStore } from "../../../src/run-history/store/agent-org-run-history-index-store.js";
import { TeamRunHistoryIndexStore } from "../../../src/run-history/store/team-run-history-index-store.js";
import {
  AtomicRunPackageFileCommitWriter,
} from "../../../src/run-history/store/atomic-run-package-file-commit-writer.js";
import { testAgentNode, testExecutionTree } from "../../fixtures/current-team-run-fixtures.js";

const tempDirs: string[] = [];
afterEach(async () => { await Promise.all(tempDirs.splice(0).map((dir) => fs.rm(dir, { recursive: true, force: true }))); });

const createEnvironment = async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "agent-org-family-migration-"));
  tempDirs.push(root);
  const memoryDir = path.join(root, "memory");
  const teamDefinitions = path.join(root, "definitions", "agent-teams");
  const orgDefinitions = path.join(root, "definitions", "agent-orgs");
  await Promise.all([fs.mkdir(memoryDir, { recursive: true }), fs.mkdir(teamDefinitions, { recursive: true }), fs.mkdir(orgDefinitions, { recursive: true })]);
  const config = { getAgentTeamsDir: () => teamDefinitions, getAgentOrgsDir: () => orgDefinitions, getBaseUrl: () => "http://127.0.0.1:43151" } as AppConfig;
  return {
    root,
    memoryDir,
    teamDefinitions,
    orgDefinitions,
    layout: new AgentMemoryLayout(memoryDir),
    migration: (writer?: AtomicRunPackageFileCommitWriter) =>
      new AgentOrgFlatTeamFamiliesV1AppDataMigration(memoryDir, config, writer, emptyTokens(memoryDir)),
  };
};

const json = (value: unknown) => `${JSON.stringify(value, null, 2)}\n`;
const writeTeamPackage = async (directory: string, runId: string, tree: unknown, sidecarRunId = runId) => {
  await fs.mkdir(directory, { recursive: true });
  await fs.writeFile(getTeamRunExecutionTreePath(directory), json(tree));
  await fs.writeFile(getTaskDelegationRecordsV1Path(directory), json({ schemaVersion: 1, rootTeamRunId: sidecarRunId, records: [] }));
  await fs.writeFile(getTeamCommunicationMessagesV1Path(directory), json({ schemaVersion: 1, rootTeamRunId: sidecarRunId, messages: [] }));
};
const flatTree = (runId: string) => {
  const lead = testAgentNode("/lead", { agentRunId: `${runId}-lead`, workspaceRootPath: "/workspace" });
  return testExecutionTree({ children: [lead], coordinatorAddress: lead.address, rootTeamRunId: runId, rootTeamDefinitionId: "flat-team", teamDefinitionName: "Flat Team" });
};
const orgLikeTree = (runId: string) => {
  const direct = testAgentNode("/director", { agentRunId: `${runId}-director`, workspaceRootPath: "/workspace" });
  const base = testExecutionTree({ children: [direct], coordinatorAddress: direct.address, rootTeamRunId: runId, rootTeamDefinitionId: "software-org", teamDefinitionName: "Software Org" });
  const directRecord = base.rootTeam.members[0];
  const teamAgent = {
    ...directRecord,
    address: "/delivery/lead",
    agentDefinitionId: "delivery-lead",
    agentRunId: `${runId}-delivery-lead`,
  };
  return {
    ...base,
    rootTeam: {
      ...base.rootTeam,
      members: [directRecord, {
        address: "/delivery",
        teamDefinitionId: "delivery-team",
        role: null,
        description: null,
        teamRunId: `${runId}-delivery`,
        coordinatorAddress: "/delivery/lead",
        defaultLaunchConfiguration: teamAgent.launchConfiguration,
        members: [teamAgent],
        taskExecutions: [],
      }],
    },
  };
};
type LegacyDefinitionMember = Readonly<{
  memberName: string;
  ref: string;
  refType: "agent" | "agent_team";
  refScope: "shared" | "team_local" | "application_owned";
}>;
const legacyDefinition = (members: readonly LegacyDefinitionMember[], coordinatorMemberName: string) => ({
  coordinatorMemberName,
  members,
  handoffs: [],
  avatarUrl: null,
  defaultLaunchConfig: null,
});
const writeLegacyOrgDefinition = async (env: Awaited<ReturnType<typeof createEnvironment>>, invalidLaterChild = false) => {
  const source = path.join(env.teamDefinitions, "software-org");
  const root = legacyDefinition([
    { memberName: "director", ref: "director-agent", refType: "agent", refScope: "shared" },
    { memberName: "delivery", ref: "delivery", refType: "agent_team", refScope: "team_local" },
    ...(invalidLaterChild
      ? [{ memberName: "quality", ref: "quality", refType: "agent_team" as const, refScope: "team_local" as const }]
      : []),
  ], "director");
  const childAgent: LegacyDefinitionMember = {
    memberName: "lead",
    ref: "lead-agent",
    refType: "agent",
    refScope: "shared",
  };
  const delivery = legacyDefinition([childAgent], "lead");
  const quality = legacyDefinition([
    childAgent,
    { memberName: "deeper", ref: "deeper-team", refType: "agent_team", refScope: "team_local" },
  ], "lead");
  await fs.mkdir(path.join(source, "agent-teams", "delivery"), { recursive: true });
  await fs.writeFile(path.join(source, "team-config.json"), json(root));
  await fs.writeFile(path.join(source, "team.md"), "---\nname: Software Org\ndescription: Delivery\n---\n\nCoordinate delivery.\n");
  await fs.writeFile(path.join(source, "agent-teams", "delivery", "team-config.json"), json(delivery));
  await fs.writeFile(path.join(source, "agent-teams", "delivery", "team.md"), "---\nname: Delivery\ndescription: Work\n---\n");
  if (invalidLaterChild) {
    await fs.mkdir(path.join(source, "agent-teams", "quality"), { recursive: true });
    await fs.writeFile(path.join(source, "agent-teams", "quality", "team-config.json"), json(quality));
    await fs.writeFile(path.join(source, "agent-teams", "quality", "team.md"), "---\nname: Quality\ndescription: Work\n---\n");
  }
  return source;
};
const detailCount = (result: Awaited<ReturnType<AgentOrgFlatTeamFamiliesV1AppDataMigration["execute"]>>, id: string) =>
  Number(result.summary.details.find((detail) => detail.itemId === id)?.message.match(/Count: (\d+)/)?.[1] ?? 0);

describe("AgentOrg flat-Team family startup migration", () => {
  it("leaves flat, nested and invalid authored packages unchanged while runtime migration remains independent", async () => {
    const env = await createEnvironment();
    const source = await writeLegacyOrgDefinition(env, true);
    const flat = path.join(env.teamDefinitions, "flat");
    await fs.mkdir(flat); await fs.writeFile(path.join(flat, "team-config.json"), json({ coordinatorMemberName: "lead", members: [{ memberName: "lead", ref: "agent", refType: "agent", refScope: "shared" }], handoffs: [] }));
    const snapshot = async (dir: string): Promise<Record<string, string>> => {
      const files: Record<string, string> = {};
      for (const item of await fs.readdir(dir, { withFileTypes: true })) {
        const file = path.join(dir, item.name);
        if (item.isDirectory()) Object.assign(files, await snapshot(file));
        else files[file] = await fs.readFile(file, "base64");
      }
      return files;
    };
    const before = await snapshot(env.teamDefinitions);
    const runId = "independent-org";
    await writeTeamPackage(env.layout.getTeamDirPath({ rootTeamRunId: runId, ancestorTeamRunIds: [] }), runId, orgLikeTree(runId));
    const writer = new AtomicRunPackageFileCommitWriter(), writes = vi.spyOn(writer, "write");
    expect((await env.migration(writer).execute()).status).toBe("SUCCEEDED");
    expect(await snapshot(env.teamDefinitions)).toEqual(before);
    expect(await fs.readdir(env.orgDefinitions)).toEqual([]);
    expect(writes.mock.calls.every(([request]) => request.file !== "definition" && !request.filePath.startsWith(source))).toBe(true);
    await fs.access(getAgentOrgRunExecutionTreePath(env.layout.getOrgDirPath(runId)));
  });

  it("keeps a native flat Team V2 package a strict zero-write cohort", async () => {
    const env = await createEnvironment(); const runId = "flat-run"; const directory = env.layout.getTeamDirPath({ rootTeamRunId: runId, ancestorTeamRunIds: [] });
    await writeTeamPackage(directory, runId, flatTree(runId));
    const beforeFiles = (await fs.readdir(directory)).sort();
    const before = await Promise.all(beforeFiles.map(async (name) => ({ name, bytes: await fs.readFile(path.join(directory, name)), stat: await fs.stat(path.join(directory, name)) })));
    const result = await env.migration().execute();
    expect(result.status).toBe("SUCCEEDED"); expect(detailCount(result, "SKIPPED_FLAT_TEAM_RUN_ZERO_WRITE")).toBe(1);
    expect((await fs.readdir(directory)).sort()).toEqual(beforeFiles);
    for (const file of before) { const target = path.join(directory, file.name); expect(await fs.readFile(target)).toEqual(file.bytes); const stat = await fs.stat(target); expect(stat.ino).toBe(file.stat.ino); expect(stat.mtimeMs).toBe(file.stat.mtimeMs); }
    await expect(fs.access(env.layout.getOrgDirPath(runId))).rejects.toMatchObject({ code: "ENOENT" });
  });

  it("converts one organization-like Team V2 package by direct family rename and transfers history", async () => {
    const env = await createEnvironment(); const runId = "org-run"; const source = env.layout.getTeamDirPath({ rootTeamRunId: runId, ancestorTeamRunIds: [] });
    await writeTeamPackage(source, runId, orgLikeTree(runId));
    await fs.mkdir(path.join(source, "opaque-agent-memory")); await fs.writeFile(path.join(source, "opaque-agent-memory", "content.bin"), Buffer.from([1, 2, 3]));
    await new TeamRunHistoryIndexStore(env.memoryDir).writeIndex([{ teamRunId: runId, teamDefinitionId: "software-org", teamDefinitionName: "Software Org", workspaceRootPath: "/workspace", summary: "Preserved summary", createdAt: "2026-08-15T00:00:00.000Z", archivedAt: null, terminatedAt: "2026-08-16T00:00:00.000Z" }]);
    const result = await env.migration().execute(); const target = env.layout.getOrgDirPath(runId);
    expect(result.status).toBe("SUCCEEDED"); expect(detailCount(result, "MIGRATED_ORG_RUN")).toBe(1); expect(detailCount(result, "MIGRATED_ORG_HISTORY")).toBe(1);
    await expect(fs.access(source)).rejects.toMatchObject({ code: "ENOENT" });
    expect(await fs.readFile(path.join(target, "opaque-agent-memory", "content.bin"))).toEqual(Buffer.from([1, 2, 3]));
    const tree = JSON.parse(await fs.readFile(getAgentOrgRunExecutionTreePath(target), "utf8"));
    expect(tree).toMatchObject({ schemaVersion: 1, subjectKind: "agent_org", rootOrg: { orgRunId: runId, orgDefinitionId: "software-org" } });
    expect(JSON.parse(await fs.readFile(getAgentOrgTaskDelegationRecordsV1Path(target), "utf8"))).toEqual({ schemaVersion: 1, subjectKind: "agent_org", orgRunId: runId, records: [] });
    expect(JSON.parse(await fs.readFile(getAgentOrgCommunicationMessagesV1Path(target), "utf8"))).toEqual({ schemaVersion: 1, subjectKind: "agent_org", orgRunId: runId, messages: [] });
    await expect(fs.access(getTeamRunExecutionTreePath(target))).rejects.toMatchObject({ code: "ENOENT" });
    await expect(fs.access(getTaskDelegationRecordsV1Path(target))).rejects.toMatchObject({ code: "ENOENT" });
    await expect(fs.access(getTeamCommunicationMessagesV1Path(target))).rejects.toMatchObject({ code: "ENOENT" });
    expect(await new TeamRunHistoryIndexStore(env.memoryDir).readIndex()).toEqual([]);
    expect(await new AgentOrgRunHistoryIndexStore(env.memoryDir).readIndex()).toEqual([expect.objectContaining({ orgRunId: runId, summary: "Preserved summary", terminatedAt: "2026-08-16T00:00:00.000Z" })]);
  });

  it("accepts the exact predecessor V1-to-released-V2 output before converting it to Org V1", async () => {
    const env = await createEnvironment();
    const fixtureDir = path.resolve(process.cwd(), "tests/fixtures/app-data-migrations/team-run-execution-tree-v1/case-001-persistent-only");
    const legacyTree = JSON.parse(await fs.readFile(path.join(fixtureDir, "team_run_execution_tree.json"), "utf8"));
    const qa = legacyTree.rootTeam.members.find((member: Record<string, unknown>) => member.address === "/qa");
    qa.members = qa.members.filter((member: Record<string, unknown>) => "agentRunId" in member);
    const runId = legacyTree.rootTeam.teamRunId as string;
    const source = env.layout.getTeamDirPath({ rootTeamRunId: runId, ancestorTeamRunIds: [] });
    await writeTeamPackage(source, runId, legacyTree);

    const predecessor = await new TeamRunExecutionTreeV2AppDataMigration(env.memoryDir).execute();
    expect(predecessor.status).toBe("SUCCEEDED");
    const released = JSON.parse(await fs.readFile(getTeamRunExecutionTreePath(source), "utf8"));
    expect(released).toMatchObject({ schemaVersion: 2, rootTeam: { teamRunId: runId } });

    const result = await env.migration().execute();
    expect(result.status).toBe("SUCCEEDED");
    expect(detailCount(result, "MIGRATED_ORG_RUN")).toBe(1);
    await expect(fs.access(source)).rejects.toMatchObject({ code: "ENOENT" });
    expect(JSON.parse(await fs.readFile(getAgentOrgRunExecutionTreePath(env.layout.getOrgDirPath(runId)), "utf8")))
      .toMatchObject({ schemaVersion: 1, subjectKind: "agent_org", rootOrg: { orgRunId: runId } });
  });

  it("rejects a released V2 member with an unrecognized compatibility field before mutation", async () => {
    const env = await createEnvironment();
    const runId = "invalid-released-run";
    const source = env.layout.getTeamDirPath({ rootTeamRunId: runId, ancestorTeamRunIds: [] });
    const tree = structuredClone(orgLikeTree(runId)) as Record<string, any>;
    tree.rootTeam.members[0].legacyRouteKey = "director";
    await writeTeamPackage(source, runId, tree);
    const before = await fs.readFile(getTeamRunExecutionTreePath(source));

    const result = await env.migration().execute();

    expect(result.status).toBe("FAILED");
    expect(detailCount(result, "FAILED_RUNTIME")).toBe(1);
    expect(await fs.readFile(getTeamRunExecutionTreePath(source))).toEqual(before);
    await expect(fs.access(env.layout.getOrgDirPath(runId))).rejects.toMatchObject({ code: "ENOENT" });
  });

  it("fails closed on a sidecar correlation mismatch without creating the Org family", async () => {
    const env = await createEnvironment(); const runId = "mismatch-run"; const source = env.layout.getTeamDirPath({ rootTeamRunId: runId, ancestorTeamRunIds: [] });
    await writeTeamPackage(source, runId, orgLikeTree(runId), "another-run");
    const original = await fs.readFile(getTeamRunExecutionTreePath(source)); const result = await env.migration().execute();
    expect(result.status).toBe("FAILED"); expect(detailCount(result, "FAILED_RUNTIME")).toBe(1);
    expect(await fs.readFile(getTeamRunExecutionTreePath(source))).toEqual(original);
    await expect(fs.access(env.layout.getOrgDirPath(runId))).rejects.toMatchObject({ code: "ENOENT" });
  });

  it("reports a family collision without modifying either package", async () => {
    const env = await createEnvironment(); const runId = "collision-run"; const source = env.layout.getTeamDirPath({ rootTeamRunId: runId, ancestorTeamRunIds: [] }); const target = env.layout.getOrgDirPath(runId);
    await writeTeamPackage(source, runId, orgLikeTree(runId)); await fs.mkdir(target, { recursive: true }); await fs.writeFile(path.join(target, "sentinel"), "keep");
    const original = await fs.readFile(getTeamRunExecutionTreePath(source)); const result = await env.migration().execute();
    expect(result.status).toBe("FAILED"); expect(detailCount(result, "FAILED_FAMILY_CONFLICT")).toBe(1); expect(await fs.readFile(getTeamRunExecutionTreePath(source))).toEqual(original); expect(await fs.readFile(path.join(target, "sentinel"), "utf8")).toBe("keep");
  });

  it("cleans retired Team authorities from a completely written current Org package on restart", async () => {
    const env = await createEnvironment(); const runId = "retry-run"; const source = env.layout.getTeamDirPath({ rootTeamRunId: runId, ancestorTeamRunIds: [] });
    await writeTeamPackage(source, runId, orgLikeTree(runId)); expect((await env.migration().execute()).status).toBe("SUCCEEDED");
    const target = env.layout.getOrgDirPath(runId); await fs.writeFile(getTeamRunExecutionTreePath(target), json(orgLikeTree(runId))); await fs.writeFile(getTaskDelegationRecordsV1Path(target), json({ schemaVersion: 1, rootTeamRunId: runId, records: [] })); await fs.writeFile(getTeamCommunicationMessagesV1Path(target), json({ schemaVersion: 1, rootTeamRunId: runId, messages: [] }));
    const retry = await env.migration().execute();
    expect(retry.status).toBe("SUCCEEDED"); expect(detailCount(retry, "CLEANED_CURRENT_ORG")).toBe(1);
    await expect(fs.access(getTeamRunExecutionTreePath(target))).rejects.toMatchObject({ code: "ENOENT" });
  });
});
