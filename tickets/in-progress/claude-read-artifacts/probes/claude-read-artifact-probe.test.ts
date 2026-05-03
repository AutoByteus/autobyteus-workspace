import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AgentRunEventType, type AgentRunEvent } from "../../../../src/agent-execution/domain/agent-run-event.js";
import { ClaudeSessionEventConverter } from "../../../../src/agent-execution/backends/claude/events/claude-session-event-converter.js";
import { ClaudeSessionEventName } from "../../../../src/agent-execution/backends/claude/events/claude-session-event-name.js";
import { RunFileChangeService } from "../../../../src/services/run-file-changes/run-file-change-service.js";

// Temporary investigation probe for tickets/in-progress/claude-read-artifacts.
describe("Claude read-file artifact pollution probe", () => {
  const tempDirs: string[] = [];

  afterEach(async () => {
    vi.restoreAllMocks();
    await Promise.all(tempDirs.splice(0).map((dir) => fs.rm(dir, { recursive: true, force: true })));
  });

  const createTempDir = async (): Promise<string> => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "claude-read-artifact-probe-"));
    tempDirs.push(tempDir);
    return tempDir;
  };

  it("keeps Claude Read tool events activity-only and out of run file changes", async () => {
    const workspaceRoot = await createTempDir();
    const memoryDir = await createTempDir();
    const readPath = path.join(workspaceRoot, "src", "server.py");
    await fs.mkdir(path.dirname(readPath), { recursive: true });
    await fs.writeFile(readPath, "print('hello')\n", "utf-8");

    const listeners = new Set<(event: unknown) => void>();
    const localEvents: AgentRunEvent[] = [];
    const run = {
      runId: "run-claude-read-probe",
      config: { memoryDir, workspaceId: "workspace-1" },
      subscribeToEvents(listener: (event: unknown) => void) {
        listeners.add(listener);
        return () => listeners.delete(listener);
      },
      emitLocalEvent(event: AgentRunEvent) {
        localEvents.push(event);
      },
    } as any;

    const service = new RunFileChangeService({
      workspaceManager: {
        getWorkspaceById: vi.fn().mockReturnValue({ getBasePath: () => workspaceRoot }),
      } as any,
    });
    const converter = new ClaudeSessionEventConverter(run.runId);
    service.attachToRun(run);

    const convertedEvents = [
      ...converter.convert({
        method: ClaudeSessionEventName.ITEM_COMMAND_EXECUTION_STARTED,
        params: {
          invocation_id: "read-1",
          tool_name: "Read",
          arguments: { file_path: readPath },
        },
      }),
      ...converter.convert({
        method: ClaudeSessionEventName.ITEM_COMMAND_EXECUTION_COMPLETED,
        params: {
          invocation_id: "read-1",
          tool_name: "Read",
          arguments: { file_path: readPath },
          result: "print('hello')\n",
        },
      }),
    ];

    for (const event of convertedEvents) {
      for (const listener of listeners) {
        listener(event);
      }
      await new Promise((resolve) => setTimeout(resolve, 0));
      await new Promise((resolve) => setTimeout(resolve, 0));
    }

    const projection = await service.getProjectionForRun(run);
    console.log("CLAUDE_READ_PROBE_EVENTS", JSON.stringify(convertedEvents, null, 2));
    console.log("CLAUDE_READ_PROBE_FILE_CHANGE_EVENTS", JSON.stringify(localEvents, null, 2));
    console.log("CLAUDE_READ_PROBE_PROJECTION", JSON.stringify(projection, null, 2));

    expect(convertedEvents.map((event) => event.eventType)).toEqual([
      AgentRunEventType.TOOL_EXECUTION_STARTED,
      AgentRunEventType.TOOL_EXECUTION_SUCCEEDED,
    ]);
    expect(localEvents).toHaveLength(0);
    expect(projection.entries).toEqual([]);
  });
});
