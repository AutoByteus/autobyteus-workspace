// TEMPORARY PROBE (API/E2E API-08, run-file-change-owner-scoped-reads): deterministic reproduction of a live-cache race in
// RunFileChangeService.load. Removed after the run; the copy is kept in the ticket evidence.
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { AgentRunEventType } from "../../src/agent-execution/domain/agent-run-event.js";
import { RunFileChangeProjectionStore } from "../../src/services/run-file-changes/run-file-change-projection-store.js";
import { RunFileChangeService } from "../../src/services/run-file-changes/run-file-change-service.js";

describe("RunFileChangeService live cache vs a concurrent first read", () => {
  it("a read that started before the first FILE_CHANGE event and ends after it leaves the live projection without the entry", async () => {
    const memoryDir = await fs.mkdtemp(path.join(os.tmpdir(), "rfc-race-"));
    const realStore = new RunFileChangeProjectionStore();
    // The reader's stored read is slower than the event's (the window a polling or hydrating reader can hit).
    let readerGate: (() => void) | null = null;
    let reads = 0;
    const store = Object.assign(Object.create(realStore), {
      readProjection: async (dir: string) => {
        reads += 1;
        const result = await realStore.readProjection(dir);
        if (reads === 1) await new Promise<void>((resolve) => { readerGate = resolve; });
        return result;
      },
      writeProjection: (dir: string, projection: never) => realStore.writeProjection(dir, projection),
    });
    const service = new RunFileChangeService({ projectionStore: store as never, workspaceManager: { getWorkspaceById: () => null } as never });
    const listeners: Array<(event: unknown) => void> = [];
    const run = { runId: "member-1", config: { memoryDir, workspaceId: null }, subscribeToEvents: (l: (e: unknown) => void) => { listeners.push(l); return () => undefined; } };
    service.attachToRun(run as never);

    // 1. A reader (owner list query) starts: cache miss, its stored read is in flight.
    const reader = service.getProjectionForCollaborationMember({ agentRunId: "member-1", memoryDir, workspaceRootPath: null });
    await new Promise((resolve) => setTimeout(resolve, 20));
    // 2. The member's first file change arrives and is recorded (cache + file).
    listeners.forEach((l) => l({ eventType: AgentRunEventType.FILE_CHANGE, runId: "member-1", statusHint: null,
      payload: { path: "/abs/out.png", type: "image", status: "available", sourceTool: "generated_output", sourceInvocationId: "t1" } }));
    const deadline = Date.now() + 2000;
    while (!(await realStore.readProjection(memoryDir)).entries.length && Date.now() < deadline) await new Promise((r) => setTimeout(r, 10));
    const stored = (await realStore.readProjection(memoryDir)).entries.map((e) => e.path);
    // 3. The reader's stored read completes after the event.
    readerGate!();
    const readerSaw = (await reader).entries.map((e) => e.path);
    // 4. Every later read of the attached run.
    const later = (await service.getProjectionForCollaborationMember({ agentRunId: "member-1", memoryDir, workspaceRootPath: null })).entries.map((e) => e.path);
    console.log(JSON.stringify({ stored, readerSaw, later }));
    expect(stored).toEqual(["/abs/out.png"]);
    // The defect: the later reads of the running member miss the recorded entry.
    expect(later).toEqual([]);
    await fs.rm(memoryDir, { recursive: true, force: true });
  });
});
