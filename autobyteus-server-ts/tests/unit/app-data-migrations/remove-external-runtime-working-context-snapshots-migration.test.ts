import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SkillAccessMode } from "autobyteus-ts/agent/context/skill-access-mode.js";
import {
  RAW_TRACES_ACTIVE_MEMORY_FILE_NAME,
  WORKING_CONTEXT_SNAPSHOT_FILE_NAME,
} from "autobyteus-ts/memory/store/memory-file-names.js";
import { AgentMemoryService } from "../../../src/agent-memory/services/agent-memory-service.js";
import { MemoryFileStore } from "../../../src/agent-memory/store/memory-file-store.js";
import { ExternalRuntimeMemoryWriter } from "../../../src/agent-memory/store/external-runtime-memory-writer.js";
import { RemoveExternalRuntimeWorkingContextSnapshotsMigration } from "../../../src/app-data-migrations/migrations/remove-external-runtime-working-context-snapshots-migration.js";
import { RuntimeKind } from "../../../src/runtime-management/runtime-kind-enum.js";
import type { TeamRunNode } from "../../../src/agent-team-execution/domain/team-run-config.js";
import { testExecutionTree } from "../../fixtures/current-team-run-fixtures.js";

let memoryDir: string;

const writeText = async (filePath: string, content: string): Promise<void> => {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, content, "utf-8");
};

const writeJson = async (filePath: string, payload: unknown): Promise<void> =>
  writeText(filePath, JSON.stringify(payload, null, 2));

const snapshotPath = (runDir: string): string =>
  path.join(runDir, WORKING_CONTEXT_SNAPSHOT_FILE_NAME);

const writeSnapshot = async (runDir: string, content = "snapshot copy"): Promise<string> => {
  const filePath = snapshotPath(runDir);
  await writeJson(filePath, { messages: [{ role: "user", content }] });
  return filePath;
};

const standaloneDir = (runId: string): string => path.join(memoryDir, "agents", runId);

const writeStandaloneMetadata = async (input: {
  runId: string;
  runtimeKind: RuntimeKind | string;
  storedMemoryDir?: string;
  metadataRunId?: string;
}): Promise<void> => {
  const runDir = standaloneDir(input.runId);
  await writeJson(path.join(runDir, "run_metadata.json"), {
    runId: input.metadataRunId ?? input.runId,
    agentDefinitionId: `agent-${input.runId}`,
    workspaceRootPath: `/workspace/${input.runId}`,
    memoryDir: input.storedMemoryDir ?? runDir,
    llmModelIdentifier: "model-test",
    llmConfig: null,
    autoExecuteTools: false,
    skillAccessMode: SkillAccessMode.NONE,
    runtimeKind: input.runtimeKind,
    platformAgentRunId: null,
    startedAt: "2026-07-31T00:00:00.000Z",
  });
};

const agentMember = (input: {
  memberRunId: string;
  memberPath: string[];
  runtimeKind: RuntimeKind;
}) => ({
  kind: "agent" as const,
  address: `/${input.memberPath.join("/")}`,
  agentRunId: input.memberRunId,
  runtimeKind: input.runtimeKind,
  platformAgentRunId: null,
  agentDefinitionId: `agent-${input.memberRunId}`,
  llmModelIdentifier: "model-test",
  autoExecuteTools: false,
  skillAccessMode: SkillAccessMode.NONE,
  llmConfig: null,
  workspaceRootPath: "/workspace/team",
  applicationExecutionContext: null,
  role: null,
  description: null,
});

const subTeamMember = (input: {
  memberRunId: string;
  memberPath: string[];
  teamRunId: string;
  memberTree: unknown[];
}) => ({
  kind: "agent_team" as const,
  address: `/${input.memberPath.join("/")}`,
  teamDefinitionId: `team-def-${input.teamRunId}`,
  teamRunId: input.teamRunId,
  coordinatorAddress: (input.memberTree[0] as { address: string }).address,
  children: input.memberTree,
  role: null,
  description: null,
});

const writeTeamMetadata = async (teamRunId: string, memberTree: unknown[]): Promise<void> => {
  const teamDir = path.join(memoryDir, "agent_teams", teamRunId);
  await writeJson(path.join(teamDir, "team_run_execution_tree.json"),
    testExecutionTree({
      rootTeamRunId: teamRunId,
      rootTeamDefinitionId: `team-def-${teamRunId}`,
      teamDefinitionName: "Cleanup Fixture Team",
      coordinatorAddress: "/lead",
      createdAt: "2026-07-31T00:00:00.000Z",
      children: memberTree as TeamRunNode[],
    }));
  await writeJson(path.join(teamDir, "task_delegation_records.json"), {
    schemaVersion: 1,
    rootTeamRunId: teamRunId,
    records: [],
  });
  await writeJson(path.join(teamDir, "team_communication_messages.json"), {
    schemaVersion: 1,
    rootTeamRunId: teamRunId,
    messages: [],
  });
};

const exists = async (filePath: string): Promise<boolean> => {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
};

beforeEach(async () => {
  memoryDir = await fs.mkdtemp(path.join(os.tmpdir(), "external-snapshot-cleanup-"));
});

afterEach(async () => {
  vi.restoreAllMocks();
  await fs.rm(memoryDir, { recursive: true, force: true });
});

describe("RemoveExternalRuntimeWorkingContextSnapshotsMigration", () => {
  it("removes only exact standalone and recursive team Codex/Claude snapshots and is idempotent", async () => {
    const poisonRoot = path.join(memoryDir, "outside-owned-layout");
    const poisonSnapshot = await writeSnapshot(poisonRoot, "stored memoryDir must not be trusted");
    const standaloneFixtures = [
      { runId: "codex-run", runtimeKind: RuntimeKind.CODEX_APP_SERVER },
      { runId: "claude-run", runtimeKind: RuntimeKind.CLAUDE_AGENT_SDK },
      {
        runId: "path-injection-run",
        runtimeKind: RuntimeKind.CODEX_APP_SERVER,
        storedMemoryDir: poisonRoot,
      },
      { runId: "native-run", runtimeKind: RuntimeKind.AUTOBYTEUS },
      { runId: "future-run", runtimeKind: "future_runtime" },
    ];
    for (const fixture of standaloneFixtures) {
      await writeStandaloneMetadata(fixture);
      await writeSnapshot(standaloneDir(fixture.runId), `${fixture.runId} snapshot`);
    }
    const unclassifiedSnapshot = await writeSnapshot(standaloneDir("unclassified-run"), "unclassified");
    const importedSnapshot = await writeSnapshot(
      path.join(memoryDir, "imports", "source-node", "agents", "imported-run"),
      "imported",
    );

    const teamRunId = "team-run";
    const rootCodex = agentMember({
      memberRunId: "root-codex",
      memberPath: ["lead"],
      runtimeKind: RuntimeKind.CODEX_APP_SERVER,
    });
    const nestedClaude = agentMember({
      memberRunId: "nested-claude",
      memberPath: ["squad", "researcher"],
      runtimeKind: RuntimeKind.CLAUDE_AGENT_SDK,
    });
    const deepCodex = agentMember({
      memberRunId: "deep-codex",
      memberPath: ["squad", "nested", "reviewer"],
      runtimeKind: RuntimeKind.CODEX_APP_SERVER,
    });
    const nativeMember = agentMember({
      memberRunId: "native-member",
      memberPath: ["native"],
      runtimeKind: RuntimeKind.AUTOBYTEUS,
    });
    await writeTeamMetadata(teamRunId, [
      rootCodex,
      nativeMember,
      subTeamMember({
        memberRunId: "squad-member",
        memberPath: ["squad"],
        teamRunId: "child-team",
        memberTree: [
          nestedClaude,
          subTeamMember({
            memberRunId: "nested-team-member",
            memberPath: ["squad", "nested"],
            teamRunId: "grandchild-team",
            memberTree: [deepCodex],
          }),
        ],
      }),
    ]);

    const rootCodexDir = path.join(memoryDir, "agent_teams", teamRunId, "root-codex");
    const nativeMemberDir = path.join(memoryDir, "agent_teams", teamRunId, "native-member");
    const nestedClaudeDir = path.join(memoryDir, "agent_teams", teamRunId, "child-team", "nested-claude");
    const deepCodexDir = path.join(
      memoryDir,
      "agent_teams",
      teamRunId,
      "child-team",
      "grandchild-team",
      "deep-codex",
    );
    for (const runDir of [rootCodexDir, nativeMemberDir, nestedClaudeDir, deepCodexDir]) {
      await writeSnapshot(runDir, `${path.basename(runDir)} snapshot`);
    }
    const taskSnapshot = await writeSnapshot(
      path.join(rootCodexDir, "tasks", "unclassified-task-run"),
      "task history",
    );
    const preservedRaw = path.join(standaloneDir("codex-run"), RAW_TRACES_ACTIVE_MEMORY_FILE_NAME);
    const preservedArchive = path.join(standaloneDir("codex-run"), "raw_traces_segment_000001.jsonl");
    const preservedArtifact = path.join(standaloneDir("codex-run"), "artifacts", "evidence.txt");
    await writeText(preservedRaw, '{"id":"raw-1"}\n');
    await writeText(preservedArchive, '{"id":"archive-1"}\n');
    await writeText(preservedArtifact, "evidence");

    const first = await new RemoveExternalRuntimeWorkingContextSnapshotsMigration(memoryDir).execute();
    expect(first.status).toBe("SUCCEEDED");
    expect(first.summary.migratedCount).toBe(6);
    for (const runDir of [
      standaloneDir("codex-run"),
      standaloneDir("claude-run"),
      standaloneDir("path-injection-run"),
      rootCodexDir,
      nestedClaudeDir,
      deepCodexDir,
    ]) {
      expect(await exists(snapshotPath(runDir))).toBe(false);
    }
    for (const filePath of [
      snapshotPath(standaloneDir("native-run")),
      snapshotPath(standaloneDir("future-run")),
      snapshotPath(nativeMemberDir),
      unclassifiedSnapshot,
      importedSnapshot,
      taskSnapshot,
      poisonSnapshot,
      preservedRaw,
      preservedArchive,
      preservedArtifact,
      path.join(standaloneDir("codex-run"), "run_metadata.json"),
      path.join(memoryDir, "agent_teams", teamRunId, "team_run_execution_tree.json"),
    ]) {
      expect(await exists(filePath)).toBe(true);
    }

    const second = await new RemoveExternalRuntimeWorkingContextSnapshotsMigration(memoryDir).execute();
    expect(second.status).toBe("SUCCEEDED");
    expect(second.summary.migratedCount).toBe(0);
    expect(second.summary.failedCount).toBe(0);
    expect(second.summary.details).toEqual(expect.arrayContaining([
      expect.objectContaining({
        itemId: "agents/codex-run",
        status: "SKIPPED",
        message: "Eligible external runtime snapshot was already absent.",
      }),
    ]));
    expect(await exists(snapshotPath(standaloneDir("native-run")))).toBe(true);
    expect(await exists(importedSnapshot)).toBe(true);
    expect(await exists(taskSnapshot)).toBe(true);
  });

  it("does not traverse directory symlinks and unlinks only the eligible snapshot symlink, not its target", async () => {
    const outsideDir = path.join(memoryDir, "outside-symlink-target");
    const outsideSnapshot = await writeSnapshot(outsideDir, "outside target");
    await fs.mkdir(path.join(memoryDir, "agents"), { recursive: true });
    await fs.symlink(outsideDir, path.join(memoryDir, "agents", "linked-directory"));

    const runId = "codex-snapshot-symlink";
    await writeStandaloneMetadata({ runId, runtimeKind: RuntimeKind.CODEX_APP_SERVER });
    const exactSymlinkPath = snapshotPath(standaloneDir(runId));
    await fs.symlink(outsideSnapshot, exactSymlinkPath);

    const result = await new RemoveExternalRuntimeWorkingContextSnapshotsMigration(memoryDir).execute();

    expect(result.status).toBe("SUCCEEDED");
    expect(result.summary.migratedCount).toBe(1);
    expect(await exists(exactSymlinkPath)).toBe(false);
    expect(await exists(outsideSnapshot)).toBe(true);
    expect(await fs.readFile(outsideSnapshot, "utf-8")).toContain("outside target");
    expect(result.summary.details).toEqual(expect.arrayContaining([
      expect.objectContaining({
        itemId: "agents/linked-directory",
        status: "SKIPPED",
        message: "Symbolic-link directory was not traversed.",
      }),
    ]));
  });

  it("preserves snapshots when metadata is invalid or mismatched and reports actionable failures", async () => {
    const invalidRunDir = standaloneDir("invalid-run");
    const invalidSnapshot = await writeSnapshot(invalidRunDir, "invalid metadata");
    await writeText(path.join(invalidRunDir, "run_metadata.json"), "{not-json");

    const mismatchedRunId = "mismatched-directory";
    await writeStandaloneMetadata({
      runId: mismatchedRunId,
      metadataRunId: "different-run-id",
      runtimeKind: RuntimeKind.CODEX_APP_SERVER,
    });
    const mismatchedSnapshot = await writeSnapshot(standaloneDir(mismatchedRunId), "mismatched metadata");

    const result = await new RemoveExternalRuntimeWorkingContextSnapshotsMigration(memoryDir).execute();

    expect(result.status).toBe("SUCCEEDED_WITH_WARNINGS");
    expect(result.summary.failedCount).toBe(2);
    expect(await exists(invalidSnapshot)).toBe(true);
    expect(await exists(mismatchedSnapshot)).toBe(true);
    expect(result.summary.details).toEqual(expect.arrayContaining([
      expect.objectContaining({
        itemId: "agents/invalid-run:metadata",
        status: "FAILED",
        message: expect.stringContaining("not valid current run metadata"),
      }),
      expect.objectContaining({
        itemId: "agents/mismatched-directory:metadata",
        status: "FAILED",
        message: expect.stringContaining("does not match directory"),
      }),
    ]));
  });

  it("reports a failed unlink, retains stale generic inspection with independent raws, and removes it on retry", async () => {
    const failedRunId = "codex-unlink-failure";
    const successfulRunId = "claude-success-control";
    const nativeRunId = "native-control";
    for (const [runId, runtimeKind] of [
      [failedRunId, RuntimeKind.CODEX_APP_SERVER],
      [successfulRunId, RuntimeKind.CLAUDE_AGENT_SDK],
      [nativeRunId, RuntimeKind.AUTOBYTEUS],
    ] as const) {
      await writeStandaloneMetadata({ runId, runtimeKind });
      await writeSnapshot(standaloneDir(runId), `${runId} stale snapshot`);
    }
    const failedSnapshot = snapshotPath(standaloneDir(failedRunId));
    const snapshotBefore = await fs.readFile(failedSnapshot, "utf-8");
    const originalUnlink = fs.unlink.bind(fs);
    const unlinkSpy = vi.spyOn(fs, "unlink").mockImplementation(async (filePath) => {
      if (path.resolve(String(filePath)) === path.resolve(failedSnapshot)) {
        throw Object.assign(new Error("forced EPERM unlink failure"), { code: "EPERM" });
      }
      return originalUnlink(filePath);
    });

    const failed = await new RemoveExternalRuntimeWorkingContextSnapshotsMigration(memoryDir).execute();

    expect(failed.status).toBe("SUCCEEDED_WITH_WARNINGS");
    expect(failed.summary.migratedCount).toBe(1);
    expect(failed.summary.failedCount).toBe(1);
    expect(failed.errorMessage).toContain("1 snapshot cleanup item failed");
    expect(failed.summary.details).toEqual(expect.arrayContaining([
      expect.objectContaining({
        itemId: `agents/${failedRunId}`,
        filePath: failedSnapshot,
        status: "FAILED",
        message: expect.stringContaining("forced EPERM unlink failure"),
      }),
    ]));
    expect(await exists(failedSnapshot)).toBe(true);
    expect(await exists(snapshotPath(standaloneDir(successfulRunId)))).toBe(false);
    expect(await exists(snapshotPath(standaloneDir(nativeRunId)))).toBe(true);

    new ExternalRuntimeMemoryWriter({ memoryDir: standaloneDir(failedRunId) }).appendRawTrace({
      traceType: "assistant",
      turnId: "turn-after-failure",
      content: "current raw evidence",
      sourceEvent: "test-after-failed-cleanup",
    });
    expect(await fs.readFile(failedSnapshot, "utf-8")).toBe(snapshotBefore);
    const failedView = new AgentMemoryService(new MemoryFileStore(memoryDir)).getRunMemoryView(failedRunId, {
      includeRawTraces: true,
      includeEpisodic: false,
      includeSemantic: false,
    });
    expect(failedView.workingContext).toEqual([
      expect.objectContaining({ role: "user", content: `${failedRunId} stale snapshot` }),
    ]);
    expect(failedView.rawTraces).toEqual([
      expect.objectContaining({ traceType: "assistant", content: "current raw evidence" }),
    ]);

    unlinkSpy.mockRestore();
    const retried = await new RemoveExternalRuntimeWorkingContextSnapshotsMigration(memoryDir).execute();
    expect(retried.status).toBe("SUCCEEDED");
    expect(retried.summary.migratedCount).toBe(1);
    expect(retried.summary.failedCount).toBe(0);
    expect(await exists(failedSnapshot)).toBe(false);
    const retriedView = new AgentMemoryService(new MemoryFileStore(memoryDir)).getRunMemoryView(failedRunId, {
      includeRawTraces: true,
      includeEpisodic: false,
      includeSemantic: false,
    });
    expect(retriedView.workingContext).toBeNull();
    expect(retriedView.rawTraces).toEqual([
      expect.objectContaining({ traceType: "assistant", content: "current raw evidence" }),
    ]);
  });
});
