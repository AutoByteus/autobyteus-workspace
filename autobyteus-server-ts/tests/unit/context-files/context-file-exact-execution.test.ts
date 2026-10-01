import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, expect, it } from "vitest";
import { testAgentNode, testExecutionTree } from "../../fixtures/current-team-run-fixtures.js";
import { createStoredTeamRunExecutionTreeLocationService } from "../../../src/run-history/services/team-run-execution-tree-location-service.js";
import { ContextFileOwnerResolver } from "../../../src/context-files/services/context-file-owner-resolver.js";
import { ContextFileFinalizationService } from "../../../src/context-files/services/context-file-finalization-service.js";
import { ContextFileReadService } from "../../../src/context-files/services/context-file-read-service.js";
import { ContextFileLocalPathResolver } from "../../../src/context-files/services/context-file-local-path-resolver.js";
import { ContextFileDraftCleanupService } from "../../../src/context-files/services/context-file-draft-cleanup-service.js";
import { ContextFileLayout } from "../../../src/context-files/store/context-file-layout.js";

const roots: string[] = [];
afterEach(async () => { await Promise.all(roots.splice(0).map((dir) => fs.rm(dir, { recursive: true, force: true }))); });
it("finalizes and reads only the selected execution despite repeated address and filenames, including after reader restart", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "exact-context-owner-")); roots.push(root);
  const memoryDir = path.join(root, "memory");
  const teamDir = path.join(memoryDir, "agent_teams", "team");
  await fs.mkdir(teamDir, { recursive: true });
  const tree = testExecutionTree({ rootTeamRunId: "team", children: [testAgentNode("/worker", { agentRunId: "configured" })], coordinatorAddress: "/worker" });
  await fs.writeFile(path.join(teamDir, "team_run_execution_tree.json"), JSON.stringify({ ...tree, rootTeam: { ...tree.rootTeam, taskExecutions: [
    { address: "/worker", agentRunId: "task", platformAgentRunId: null, delegatorAgentRunId: "configured", startedAt: "2026-09-01T00:00:00.000Z" },
  ] } }));
  await fs.writeFile(path.join(teamDir, "team_communication_messages.json"), JSON.stringify({schemaVersion: 1, rootTeamRunId: "team", messages: []}));
  const layout = new ContextFileLayout({ appDataDir: root, memoryDir });
  const resolver = () => new ContextFileOwnerResolver({ memoryDir, locations: createStoredTeamRunExecutionTreeLocationService(memoryDir) });
  const cleanup = new ContextFileDraftCleanupService(layout);
  const draftOwner = { kind: "team_member_draft" as const, teamDraftId: "draft", memberAddress: "/worker" as const };
  const filename = "ctx_unique__notes.txt";
  const draftFile = layout.getDraftFilePath(draftOwner, filename);
  await fs.mkdir(path.dirname(draftFile), { recursive: true }); await fs.writeFile(draftFile, "configured bytes");
  const otherFile = path.join(teamDir, "task", "context_files", filename);
  await fs.mkdir(path.dirname(otherFile), { recursive: true }); await fs.writeFile(otherFile, "retained task bytes");
  const finalOwner = { kind: "team_member_final" as const, teamRunId: "team", agentRunId: "configured" };
  const finalizer = new ContextFileFinalizationService(layout, cleanup, resolver());
  await expect(finalizer.finalizeDraftAttachments({ draftOwner, finalOwner: { ...finalOwner, teamRunId: "other" }, attachments: [{ storedFilename: filename, displayName: "notes.txt" }] })).rejects.toThrow();
  expect(await fs.readFile(draftFile, "utf8")).toBe("configured bytes");
  const [file] = await finalizer.finalizeDraftAttachments({ draftOwner, finalOwner, attachments: [{ storedFilename: filename, displayName: "notes.txt" }] });
  expect(file?.locator).toBe(`/rest/team-runs/team/agent-runs/configured/context-files/${filename}`);
  const reader = new ContextFileReadService(layout, cleanup, resolver());
  expect(await fs.readFile((await reader.getFinalFilePath(finalOwner, filename))!, "utf8")).toBe("configured bytes");
  expect(await fs.readFile((await reader.getFinalFilePath({ ...finalOwner, agentRunId: "task" }, filename))!, "utf8")).toBe("retained task bytes");
  const local = new ContextFileLocalPathResolver({ layout, ownerResolver: resolver(), baseUrl: "http://localhost:8000" });
  expect(await fs.readFile(local.resolve(file!.locator)!, "utf8")).toBe("configured bytes");
  expect(local.resolve(`/rest/team-runs/other/agent-runs/configured/context-files/${filename}`)).toBeNull();
});
