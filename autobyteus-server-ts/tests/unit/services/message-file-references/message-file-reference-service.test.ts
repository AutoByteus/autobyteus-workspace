import os from "node:os";
import path from "node:path";
import fs from "node:fs/promises";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AgentRunEventType } from "../../../../src/agent-execution/domain/agent-run-event.js";
import { TeamRunEventSourceType } from "../../../../src/agent-team-execution/domain/team-run-event.js";
import { RuntimeKind } from "../../../../src/runtime-management/runtime-kind-enum.js";
import { MessageFileReferenceService } from "../../../../src/services/message-file-references/message-file-reference-service.js";

const waitFor = async (predicate: () => boolean | Promise<boolean>, label: string): Promise<void> => {
  const deadline = Date.now() + 1000;
  while (Date.now() < deadline) {
    if (await predicate()) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  throw new Error(`Timed out waiting for ${label}`);
};

describe("MessageFileReferenceService", () => {
  let memoryDir: string;

  beforeEach(async () => {
    memoryDir = await fs.mkdtemp(path.join(os.tmpdir(), "message-ref-service-"));
  });

  afterEach(async () => {
    await fs.rm(memoryDir, { recursive: true, force: true });
  });

  it("persists canonical team-level projections and dedupes repeated sender/receiver/path declarations", async () => {
    const listenerRefs: Array<(event: any) => void> = [];
    const teamRun = {
      runId: "team-1",
      subscribeToEvents: vi.fn((listener: (event: any) => void) => {
        listenerRefs.push(listener);
        return () => undefined;
      }),
    };
    const service = new MessageFileReferenceService({ memoryDir });
    service.attachToTeamRun(teamRun as any);

    const emitReference = (updatedAt: string, messageType: string) => {
      listenerRefs[0]({
        eventSourceType: TeamRunEventSourceType.AGENT,
        teamRunId: "team-1",
        data: {
          runtimeKind: RuntimeKind.CODEX_APP_SERVER,
          memberName: "Receiver",
          memberRunId: "receiver-run-1",
          agentEvent: {
            eventType: AgentRunEventType.MESSAGE_FILE_REFERENCE_DECLARED,
            runId: "receiver-run-1",
            payload: {
              referenceId: "ref-1",
              teamRunId: "team-1",
              senderRunId: "sender-run-1",
              senderMemberName: "Sender",
              receiverRunId: "receiver-run-1",
              receiverMemberName: "Receiver",
              path: "/tmp/report.md",
              type: "file",
              messageType,
              createdAt: "2026-04-08T00:00:00.000Z",
              updatedAt,
            },
            statusHint: null,
          },
        },
      });
    };

    emitReference("2026-04-08T00:00:00.000Z", "handoff");
    emitReference("2026-04-08T00:00:01.000Z", "revision");

    const activeProjection = await service.getProjectionForTeamRun(teamRun as any);
    expect(activeProjection.entries).toEqual([
      expect.objectContaining({
        referenceId: "ref-1",
        teamRunId: "team-1",
        senderRunId: "sender-run-1",
        receiverRunId: "receiver-run-1",
        messageType: "revision",
        createdAt: "2026-04-08T00:00:00.000Z",
        updatedAt: "2026-04-08T00:00:01.000Z",
      }),
    ]);

    const projectionPath = path.join(memoryDir, "agent_teams", "team-1", "message_file_references.json");
    await waitFor(async () => {
      try {
        const parsed = JSON.parse(await fs.readFile(projectionPath, "utf-8"));
        return parsed.entries?.[0]?.updatedAt === "2026-04-08T00:00:01.000Z";
      } catch {
        return false;
      }
    }, "team-level message reference persistence");

    const parsed = JSON.parse(await fs.readFile(projectionPath, "utf-8"));
    expect(parsed.entries).toEqual([
      expect.objectContaining({
        referenceId: "ref-1",
        teamRunId: "team-1",
        senderRunId: "sender-run-1",
        receiverRunId: "receiver-run-1",
        messageType: "revision",
        createdAt: "2026-04-08T00:00:00.000Z",
        updatedAt: "2026-04-08T00:00:01.000Z",
      }),
    ]);
  });
});
