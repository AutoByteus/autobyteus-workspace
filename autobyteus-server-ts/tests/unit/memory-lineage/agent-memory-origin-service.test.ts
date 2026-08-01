import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Message, MessageRole } from "autobyteus-ts/llm/utils/messages.js";
import type { WorkingContextCompactionProposal } from "autobyteus-ts/memory/compaction/working-context-compaction-proposal.js";
import type { CompactionLineageScope } from "autobyteus-ts/memory/lineage/compaction-lineage-scope.js";
import { MemoryManager } from "autobyteus-ts/memory/memory-manager.js";
import { RawTraceItem } from "autobyteus-ts/memory/models/raw-trace-item.js";
import { FileCompactionLineageStore } from "autobyteus-ts/memory/store/file-compaction-lineage-store.js";
import { FileMemoryStore } from "autobyteus-ts/memory/store/file-store.js";
import {
  createNaturalUserMessageProvenance,
  WorkingContextFinalizer,
} from "autobyteus-ts/memory/working-context-finalizer.js";
import { AgentMemoryOriginService } from "../../../src/memory-lineage/services/agent-memory-origin-service.js";

const tempDirs: string[] = [];
afterEach(() => {
  tempDirs.splice(0).forEach((dir) => fs.rmSync(dir, { recursive: true, force: true }));
});

const seedAcceptedCompaction = (
  runDir: string,
  scope: CompactionLineageScope,
): { episodeId: string; semanticId: string; compactionId: string } => {
  const store = new FileMemoryStore(runDir, "ignored", { agentRootSubdir: "" });
  const lineageStore = new FileCompactionLineageStore(runDir, scope);
  store.add([new RawTraceItem({
    id: "raw-origin",
    ts: 10,
    turnId: "turn-origin",
    seq: 1,
    traceType: "user",
    content: "origin source",
    sourceEvent: "UserMessageReceivedEvent",
  })]);
  const context = new WorkingContextFinalizer().finalize({
    messages: [
      new Message(MessageRole.SYSTEM, { content: "System" }),
      createNaturalUserMessageProvenance(
        new Message(MessageRole.USER, { content: "origin source" }),
        {
          kind: "current_user",
          rawTraceIds: ["raw-origin"],
          turnId: "turn-origin",
        },
      ),
    ],
  });
  const manager = new MemoryManager({
    store,
    lineageStore,
    lineageScope: scope,
    workingContext: context,
    agentId: "member-run",
  });
  const compactionId = manager.requestCompaction("turn-origin");
  const proposal: WorkingContextCompactionProposal = {
    selectedNewRawTraceIds: ["raw-origin"],
    retainedMessages: [],
    output: {
      episodes: [{ summary: "Origin episode" }],
      semanticEntries: [{
        category: "durable_fact",
        fact: "Origin fact",
        salience: 200,
      }],
    },
    execution: {
      runtimeKind: "autobyteus",
      provider: "openai",
      modelIdentifier: "current-model",
      taskId: "origin-task",
      renderedInputSha256: "a".repeat(64),
    },
  };
  const accepted = manager.prepareCompaction(
    manager.captureCompactionBaseline(),
    proposal,
  );
  manager.commitAcceptedCompaction(accepted);
  return {
    episodeId: accepted.episodicItems[0]!.id,
    semanticId: accepted.semanticItems[0]!.id,
    compactionId,
  };
};

describe("AgentMemoryOriginService", () => {
  it("resolves a team-member artifact through its run-local scope, outputs, and raw archive", async () => {
    const runDir = fs.mkdtempSync(path.join(os.tmpdir(), "member-origin-service-"));
    tempDirs.push(runDir);
    const scope: CompactionLineageScope = {
      targetKind: "team_member",
      runId: "team-run",
      memberId: "member-run",
    };
    const seeded = seedAcceptedCompaction(runDir, scope);
    const resolveTeamMemberLocation = vi.fn(async () => ({ memoryDir: runDir }));
    const service = new AgentMemoryOriginService({
      getStandaloneLocation: vi.fn() as any,
      resolveTeamMemberLocation,
    } as any, {
      readMetadata: vi.fn(),
    } as any);

    const result = await service.resolve({
      targetKind: "team_member",
      runId: "team-run",
      memberId: "member-run",
    }, {
      kind: "episode",
      id: seeded.episodeId,
    });

    expect(resolveTeamMemberLocation).toHaveBeenCalledWith({
      teamRunId: "team-run",
      memberRunId: "member-run",
    });
    expect(result).toMatchObject({
      status: "complete",
      scope,
      artifact: { kind: "episode", id: seeded.episodeId },
      producingCompactionId: seeded.compactionId,
      direct: { previousCompactionId: null },
    });
    if (result.status !== "complete") throw new Error("expected complete");
    expect(result.direct.rawTraces.map(({ id }) => id)).toEqual(["raw-origin"]);
    expect(result.roots.map(({ trace }) => trace.id)).toEqual(["raw-origin"]);
  });

  it("uses persisted standalone memory location and returns typed not_found", async () => {
    const runDir = fs.mkdtempSync(path.join(os.tmpdir(), "standalone-origin-service-"));
    tempDirs.push(runDir);
    const getStandaloneLocation = vi.fn(() => ({ memoryDir: runDir }));
    const readMetadata = vi.fn(async () => ({ memoryDir: "/stored/location" }));
    const service = new AgentMemoryOriginService({
      getStandaloneLocation,
      resolveTeamMemberLocation: vi.fn(),
    } as any, {
      readMetadata,
    } as any);

    await expect(service.resolve({
      targetKind: "agent_run",
      runId: "standalone-run",
      memberId: null,
    }, {
      kind: "semantic",
      id: "missing",
    })).resolves.toEqual({
      status: "not_found",
      scope: {
        targetKind: "agent_run",
        runId: "standalone-run",
        memberId: null,
      },
      artifact: { kind: "semantic", id: "missing" },
    });
    expect(readMetadata).toHaveBeenCalledWith("standalone-run");
    expect(getStandaloneLocation).toHaveBeenCalledWith({
      agentRunId: "standalone-run",
      storedMemoryDir: "/stored/location",
    });
  });

  it("fails explicitly when a team member has no run-local memory location", async () => {
    const service = new AgentMemoryOriginService({
      getStandaloneLocation: vi.fn(),
      resolveTeamMemberLocation: vi.fn(async () => null),
    } as any, {
      readMetadata: vi.fn(),
    } as any);

    await expect(service.resolve({
      targetKind: "team_member",
      runId: "team-run",
      memberId: "missing-member",
    }, {
      kind: "episode",
      id: "episode",
    })).rejects.toThrow(/No run-local memory location/);
  });
});
