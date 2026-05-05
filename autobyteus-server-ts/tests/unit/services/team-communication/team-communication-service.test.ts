import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { AgentRunEventType, type AgentRunEvent } from "../../../../src/agent-execution/domain/agent-run-event.js";
import { TeamRunEventSourceType, type TeamRunEvent } from "../../../../src/agent-team-execution/domain/team-run-event.js";
import type { TeamRun } from "../../../../src/agent-team-execution/domain/team-run.js";
import { TeamCommunicationService } from "../../../../src/services/team-communication/team-communication-service.js";

const waitForCondition = async (
  predicate: () => boolean | Promise<boolean>,
  timeoutMs = 2000,
): Promise<void> => {
  const deadline = Date.now() + timeoutMs;
  let lastValue = false;
  while (Date.now() < deadline) {
    lastValue = await predicate();
    if (lastValue) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  expect(lastValue).toBe(true);
};

describe("TeamCommunicationService", () => {
  const tempDirs: string[] = [];

  const createTempDir = async (): Promise<string> => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "team-communication-service-"));
    tempDirs.push(dir);
    return dir;
  };

  const createFakeTeamRun = (teamRunId: string) => {
    let listener: ((event: TeamRunEvent) => void) | null = null;
    const teamRun = {
      runId: teamRunId,
      subscribeToEvents(callback: (event: TeamRunEvent) => void) {
        listener = callback;
        return () => {
          listener = null;
        };
      },
    } as unknown as TeamRun;

    return {
      teamRun,
      emit(agentEvent: AgentRunEvent) {
        listener?.({
          eventSourceType: TeamRunEventSourceType.AGENT,
          teamRunId,
          data: {
            runtimeKind: "codex_app_server",
            memberName: "receiver",
            memberRunId: agentEvent.runId,
            agentEvent,
          },
        } as TeamRunEvent);
      },
    };
  };

  afterEach(async () => {
    await Promise.all(tempDirs.splice(0).map((dir) => fs.rm(dir, { recursive: true, force: true })));
  });

  it("persists normalized team communication messages with child reference files by message id", async () => {
    const memoryDir = await createTempDir();
    const service = new TeamCommunicationService({ memoryDir });
    const { teamRun, emit } = createFakeTeamRun("team-1");
    const unsubscribe = service.attachToTeamRun(teamRun);

    emit({
      eventType: AgentRunEventType.TEAM_COMMUNICATION_MESSAGE,
      runId: "receiver-run-1",
      payload: {
        messageId: "message-1",
        teamRunId: "team-1",
        senderRunId: "sender-run-1",
        senderMemberName: "Sender",
        receiverRunId: "receiver-run-1",
        receiverMemberName: "Receiver",
        content: "Please review the attached report.",
        messageType: "handoff",
        referenceFiles: [
          {
            referenceId: "ref-1",
            path: "/tmp/report.md",
            type: "file",
            createdAt: "2026-04-08T00:00:00.000Z",
            updatedAt: "2026-04-08T00:00:00.000Z",
          },
        ],
        createdAt: "2026-04-08T00:00:00.000Z",
      },
      statusHint: null,
    });

    const projectionPath = path.join(
      memoryDir,
      "agent_teams",
      "team-1",
      "team_communication_messages.json",
    );
    await waitForCondition(async () => {
      try {
        return (await fs.readFile(projectionPath, "utf-8")).includes("message-1");
      } catch {
        return false;
      }
    });

    unsubscribe();

    const projection = JSON.parse(await fs.readFile(projectionPath, "utf-8"));
    expect(projection.messages).toEqual([
      expect.objectContaining({
        messageId: "message-1",
        teamRunId: "team-1",
        senderRunId: "sender-run-1",
        senderMemberName: "Sender",
        receiverRunId: "receiver-run-1",
        receiverMemberName: "Receiver",
        content: "Please review the attached report.",
        messageType: "handoff",
        referenceFiles: [expect.objectContaining({ referenceId: "ref-1", path: "/tmp/report.md" })],
      }),
    ]);
  });

  it("does not derive references by scanning natural message content", async () => {
    const memoryDir = await createTempDir();
    const service = new TeamCommunicationService({ memoryDir });
    const { teamRun, emit } = createFakeTeamRun("team-1");
    service.attachToTeamRun(teamRun);

    emit({
      eventType: AgentRunEventType.TEAM_COMMUNICATION_MESSAGE,
      runId: "receiver-run-1",
      payload: {
        messageId: "message-with-prose-path",
        teamRunId: "team-1",
        senderRunId: "sender-run-1",
        receiverRunId: "receiver-run-1",
        content: "The prose may mention /tmp/not-an-artifact.md, but reference_files is the only source.",
        messageType: "handoff",
        createdAt: "2026-04-08T00:00:00.000Z",
      },
      statusHint: null,
    });

    const projection = await service.getProjectionForTeamRun(teamRun);
    expect(projection.messages).toEqual([
      expect.objectContaining({
        messageId: "message-with-prose-path",
        referenceFiles: [],
      }),
    ]);
  });
});
