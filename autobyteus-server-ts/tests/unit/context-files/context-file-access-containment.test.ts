import { noDelegations } from "../../helpers/no-delegations.js";
import { createStoredCollaborationExecutionLocationService } from "../../../src/agent-collaboration/execution/services/collaboration-execution-location-service.js";
import { TeamRunExecutionTreeStore } from "../../../src/run-history/store/team-run-execution-tree-store.js";
import { validateTeamRunExecutionTreePayload } from "../../../src/run-history/store/team-run-execution-tree-schema.js";
import fs from "node:fs/promises";
import fsSync from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, expect, it, vi } from "vitest";
import { testAgentNode, testExecutionTree } from "../../fixtures/current-team-run-fixtures.js";
import { writeStoredOrgContainer } from "../../helpers/stored-org-container.js";
import { ContextFileOwnerResolver } from "../../../src/context-files/services/context-file-owner-resolver.js";
import { ContextFileReadService } from "../../../src/context-files/services/context-file-read-service.js";
import { ContextFileLocalPathResolver } from "../../../src/context-files/services/context-file-local-path-resolver.js";
import { ContextFileDraftCleanupService } from "../../../src/context-files/services/context-file-draft-cleanup-service.js";
import { ContextFileLayout } from "../../../src/context-files/store/context-file-layout.js";
import { buildFinalContextFileLocator, type ContextFileFinalOwnerDescriptor } from "../../../src/context-files/domain/context-file-owner-types.js";
import * as records from "../../../src/app-data-migrations/frozen/server/context-files/services/context-file-record-locators.js";
import { assertContainedContextFile, assertContainedContextFileSync } from "../../../src/context-files/services/context-file-path-validation.js";
import { RootRunPackageReadinessIndex } from "../../../src/run-history/services/root-run-package-readiness-index.js";

const roots: string[] = [];
afterEach(async () => {
  vi.restoreAllMocks();
  await Promise.all(roots.splice(0).map(root => fs.rm(root, {recursive: true, force: true})));
});
const put = async (file: string, value: unknown) => {
  await fs.mkdir(path.dirname(file), {recursive: true});
  await fs.writeFile(file, typeof value === "string" ? value : JSON.stringify(value));
};
const filename = "ctx_test__file.txt";
const fixture = async (family: "team" | "org" | "standalone") => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "targeted-context-")); roots.push(root);
  const memoryDir = path.join(root, "memory");
  let directory: string;
  let owner: ContextFileFinalOwnerDescriptor;
  if (family === "team") {
    const team = path.join(memoryDir, "agent_teams", "team");
    await put(path.join(team, "team_run_execution_tree.json"), testExecutionTree({rootTeamRunId: "team", children: [testAgentNode("/worker", {agentRunId: "worker"})], coordinatorAddress: "/worker"}));
    await put(path.join(team, "task_delegation_records.json"), {schemaVersion: 1, rootTeamRunId: "team", records: []});
    await fs.writeFile(path.join(team, "team_communication_messages_active.jsonl"), "");
    directory = path.join(team, "worker");
    owner = {kind: "team_member_final", teamRunId: "team", agentRunId: "worker"};
  } else if (family === "org") {
    // An Org container (org-teams-follow-definition): its direct agent's files are in its own agent run.
    await writeStoredOrgContainer(memoryDir, { orgRunId: "org", units: [{ kind: "agent", address: "/worker", runId: "worker" }] });
    directory = path.join(memoryDir, "agents", "worker");
    owner = {kind: "org_member_final", orgRunId: "org", agentRunId: "worker"};
  } else {
    directory = path.join(memoryDir, "agents", "worker");
    await put(path.join(directory, "run_metadata.json"), {runId: "worker", agentDefinitionId: "def", workspaceRootPath: "/workspace", memoryDir, llmModelIdentifier: "model", runtimeKind: "autobyteus"});
    owner = {kind: "agent_final", runId: "worker"};
  }
  const file = path.join(directory, "context_files", filename);
  await put(file, "exact bytes");
  // An unusable history payload must not be touched through indirect owner initialization.
  await put(path.join(directory, "raw_traces_active.jsonl"), "unusable history, not JSON");
  const layout = new ContextFileLayout({appDataDir: root, memoryDir});
  const resolver = new ContextFileOwnerResolver({memoryDir, locations: createStoredCollaborationExecutionLocationService(memoryDir)});
  const read = new ContextFileReadService(layout, new ContextFileDraftCleanupService(layout), resolver);
  const local = new ContextFileLocalPathResolver({layout, ownerResolver: resolver, baseUrl: "http://localhost:8000"});
  return {root, memoryDir, directory, owner, file, read, local, layout, locator: buildFinalContextFileLocator(owner, filename)};
};

it.each(["team", "org", "standalone"] as const)("checks only the requested %s file on async and sync reads, including after admission", async family => {
  const f = await fixture(family);
  const enumerate = vi.spyOn(records, "listContextFileRecordSources");
  const transform = vi.spyOn(records, "transformContextFileRecordLocators");
  const read = vi.spyOn(fs, "readFile"); const readSync = vi.spyOn(fsSync, "readFileSync");
  expect(await f.read.getFinalFilePath(f.owner, filename)).toBe(f.file);
  expect(f.local.resolve(f.locator)).toBe(f.file);
  await new RootRunPackageReadinessIndex(f.memoryDir).admitCurrent(family === "team" ? "agent_team" : family === "org" ? "agent_org" : "agent", family === "standalone" ? "worker" : family);
  expect(f.local.resolve(f.locator)).toBe(f.file);
  expect(enumerate).not.toHaveBeenCalled(); expect(transform).not.toHaveBeenCalled();
  expect([...read.mock.calls, ...readSync.mock.calls].some(([file]) => String(file).includes("raw_traces"))).toBe(false);
  await fs.unlink(f.file);
  expect(await f.read.getFinalFilePath(f.owner, filename)).toBeNull();
  expect(f.local.resolve(f.locator)).toBeNull();
  await fs.mkdir(f.file);
  expect(await f.read.getFinalFilePath(f.owner, filename)).toBeNull();
  expect(f.local.resolve(f.locator)).toBeNull();
});

it.each(["outside-file", "other-owner-file", "outside-directory", "other-owner-directory"])("rejects %s symlinks in both access paths without excluding the package", async shape => {
  const f = await fixture("team");
  const targetDir = shape.startsWith("outside") ? path.join(f.root, "external") : path.join(f.memoryDir, "agents", "other", "context_files");
  await put(path.join(targetDir, filename), "not this execution");
  if (shape.endsWith("directory")) {
    await fs.rm(path.dirname(f.file), {recursive: true});
    await fs.symlink(targetDir, path.dirname(f.file));
  } else {
    await fs.unlink(f.file); await fs.symlink(path.join(targetDir, filename), f.file);
  }
  expect(await f.read.getFinalFilePath(f.owner, filename)).toBeNull();
  expect(f.local.resolve(f.locator)).toBeNull();
  expect(new RootRunPackageReadinessIndex(f.memoryDir).isAdmitted("agent_team", "team")).toBe(true);
});

it("uses the configured root, rejects an outside physical path and accepts a symlink only at the root itself", async () => {
  const f = await fixture("standalone");
  const outside = path.join(f.root, filename); await put(outside, "outside");
  await expect(assertContainedContextFile(f.memoryDir, outside)).rejects.toThrow("contained regular");
  expect(() => assertContainedContextFileSync(f.memoryDir, outside)).toThrow("contained regular");
  const linkedRoot = path.join(f.root, "memory-link"); await fs.symlink(f.memoryDir, linkedRoot);
  const linkedFile = path.join(linkedRoot, path.relative(f.memoryDir, f.file));
  await expect(assertContainedContextFile(linkedRoot, linkedFile)).resolves.toBeUndefined();
  expect(() => assertContainedContextFileSync(linkedRoot, linkedFile)).not.toThrow();
});

it("reads a delegated team run's member by that team run's own ID, never the delegator's", async () => {
  const f = await fixture("team");
  // A team run one of the team's members delegated to is its own team run, with its own package (autobyteus-461).
  const nested = path.join(path.dirname(path.dirname(f.directory)), "nested");
  await put(path.join(nested, "team_run_execution_tree.json"), testExecutionTree({rootTeamRunId: "nested", children: [testAgentNode("/worker", {agentRunId: "nested-worker"})], coordinatorAddress: "/worker"}));
  await fs.writeFile(path.join(nested, "team_communication_messages_active.jsonl"), "");
  const nestedFile = path.join(nested, "nested-worker", "context_files", filename);
  await put(nestedFile, "nested bytes");
  const owner = {kind: "team_member_final" as const, teamRunId: "nested", agentRunId: "nested-worker"};
  expect(await f.read.getFinalFilePath(owner, filename)).toBe(nestedFile);
  expect(f.local.resolve(buildFinalContextFileLocator(owner, filename))).toBe(nestedFile);
  const wrong = {...owner, teamRunId: "team"};
  await expect(f.read.getFinalFilePath(wrong, filename)).rejects.toThrow("Unable to resolve");
  expect(f.local.resolve(buildFinalContextFileLocator(wrong, filename))).toBeNull();
});

