import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { AppDataMigrationRegistry } from "../../../src/app-data-migrations/app-data-migration-registry.js";
import {
  TeamCommunicationProjectionAddressMigration,
  TEAM_COMMUNICATION_PROJECTION_ADDRESS_MIGRATION_ID,
} from "../../../src/app-data-migrations/migrations/team-communication-projection-address-migration.js";

let memoryDir: string;

const executionAddress = (rootTeamRunId: string, memberAddress: string) => ({
  rootTeamRunId,
  taskTeamRunIds: [],
  memberAddress,
  taskAgentRunId: null,
});

const writeProjection = async (teamRunId: string, payload: unknown): Promise<string> => {
  const teamDir = path.join(memoryDir, "agent_teams", teamRunId);
  await fs.mkdir(teamDir, { recursive: true });
  const projectionPath = path.join(teamDir, "team_communication_messages.json");
  await fs.writeFile(projectionPath, `${JSON.stringify(payload, null, 2)}\n`, "utf-8");
  return projectionPath;
};

const readJson = async (filePath: string): Promise<Record<string, unknown>> => (
  JSON.parse(await fs.readFile(filePath, "utf-8")) as Record<string, unknown>
);

const listBackups = async (projectionPath: string): Promise<string[]> => (
  await fs.readdir(path.dirname(projectionPath))
).filter((entry) => entry.startsWith(`${path.basename(projectionPath)}.backup-`));

describe("TeamCommunicationProjectionAddressMigration", () => {
  beforeEach(async () => {
    memoryDir = await fs.mkdtemp(path.join(os.tmpdir(), "team-communication-address-migration-"));
  });

  afterEach(async () => {
    await fs.rm(memoryDir, { recursive: true, force: true });
  });

  it("converts old flat projection files to the address-first shape and records a backup", async () => {
    const projectionPath = await writeProjection("team-legacy", {
      version: 1,
      updatedAt: "2026-04-08T00:00:01.000Z",
      messages: [
        {
          messageId: "message-1",
          teamRunId: "team-legacy",
          senderRunId: "sender-run",
          senderMemberRouteKey: "sender",
          receiverRunId: "receiver-run",
          receiverMemberPath: ["BuildSquad", "review_lead"],
          content: "Please review the attached report.",
          messageType: "handoff",
          createdAt: "2026-04-08T00:00:00.000Z",
          updatedAt: "2026-04-08T00:00:01.000Z",
          referenceFiles: [
            {
              referenceId: "ref-1",
              path: "/tmp/report.md",
              type: "file",
              createdAt: "2026-04-08T00:00:00.000Z",
              updatedAt: "2026-04-08T00:00:01.000Z",
            },
          ],
        },
      ],
    });

    const result = await new TeamCommunicationProjectionAddressMigration(memoryDir).execute();

    expect(result.status).toBe("SUCCEEDED");
    expect(result.summary).toMatchObject({ scannedCount: 1, migratedCount: 1, skippedCount: 0, failedCount: 0 });
    expect(result.summary.details[0]).toMatchObject({
      itemId: "team-legacy",
      status: "MIGRATED",
      filePath: projectionPath,
      backupPath: expect.stringContaining("team_communication_messages.json.backup-"),
    });
    const converted = await readJson(projectionPath);
    expect(converted).toEqual({
      teamRunId: "team-legacy",
      messages: [
        {
          messageId: "message-1",
          senderAddress: executionAddress("team-legacy", "/sender"),
          receiverAddress: executionAddress("team-legacy", "/BuildSquad/review_lead"),
          content: "Please review the attached report.",
          messageType: "handoff",
          createdAt: "2026-04-08T00:00:00.000Z",
          referenceFiles: [
            {
              referenceId: "ref-1",
              path: "/tmp/report.md",
              type: "file",
              createdAt: "2026-04-08T00:00:00.000Z",
              updatedAt: "2026-04-08T00:00:01.000Z",
            },
          ],
        },
      ],
    });
    const convertedMessage = (converted.messages as Record<string, unknown>[])[0];
    expect(converted).not.toHaveProperty("version");
    expect(converted).not.toHaveProperty("updatedAt");
    expect(convertedMessage).not.toHaveProperty("teamRunId");
    expect(convertedMessage).not.toHaveProperty("senderRunId");
    expect(convertedMessage).not.toHaveProperty("receiverRunId");
    expect(convertedMessage).not.toHaveProperty("updatedAt");
    await expect(listBackups(projectionPath)).resolves.toHaveLength(1);
  });

  it("skips already-current address-first projection files without creating a backup", async () => {
    const projectionPath = await writeProjection("team-current", {
      teamRunId: "team-current",
      messages: [
        {
          messageId: "message-current",
          senderAddress: executionAddress("team-current", "/sender"),
          receiverAddress: executionAddress("team-current", "/receiver"),
          content: "Already current.",
          messageType: "agent_message",
          createdAt: "2026-04-08T00:00:00.000Z",
          referenceFiles: [],
        },
      ],
    });

    const result = await new TeamCommunicationProjectionAddressMigration(memoryDir).execute();

    expect(result.status).toBe("SUCCEEDED");
    expect(result.summary).toMatchObject({ scannedCount: 1, migratedCount: 0, skippedCount: 1, failedCount: 0 });
    expect(result.summary.details[0]).toMatchObject({ itemId: "team-current", status: "SKIPPED" });
    await expect(readJson(projectionPath)).resolves.toMatchObject({ teamRunId: "team-current" });
    await expect(listBackups(projectionPath)).resolves.toHaveLength(0);
  });

  it("converts stored released segment addresses through the shared normalizer", async () => {
    const projectionPath = await writeProjection("team-segments", {
      teamRunId: "team-segments",
      messages: [
        {
          messageId: "message-segments",
          senderAddress: {
            segments: [
              { kind: "member", memberPath: ["sender"] },
              { kind: "task_team", taskTeamRunId: "task-team-1" },
            ],
          },
          receiver_address: {
            segments: [
              { kind: "member", member_path: ["review", "receiver"], member_route_key: "review/receiver" },
              { kind: "task_agent", task_agent_run_id: "task-agent-1" },
            ],
          },
          content: "Released address evidence.",
          messageType: "agent_message",
          createdAt: "2026-04-08T00:00:00.000Z",
          referenceFiles: [],
        },
      ],
    });

    const result = await new TeamCommunicationProjectionAddressMigration(memoryDir).execute();

    expect(result.status).toBe("SUCCEEDED");
    expect(result.summary).toMatchObject({ migratedCount: 1, failedCount: 0 });
    const converted = await readJson(projectionPath);
    expect((converted.messages as Record<string, unknown>[])[0]).toMatchObject({
      senderAddress: {
        rootTeamRunId: "team-segments",
        taskTeamRunIds: ["task-team-1"],
        memberAddress: "/sender",
        taskAgentRunId: null,
      },
      receiverAddress: {
        rootTeamRunId: "team-segments",
        taskTeamRunIds: [],
        memberAddress: "/review/receiver",
        taskAgentRunId: "task-agent-1",
      },
    });
    await expect(listBackups(projectionPath)).resolves.toHaveLength(1);
  });

  it("reports unconvertible old flat files as failures without rewriting the original file", async () => {
    const original = {
      version: 1,
      messages: [
        {
          messageId: "message-bad",
          teamRunId: "team-bad",
          senderMemberRouteKey: "sender",
          content: "Missing receiver identity.",
          messageType: "agent_message",
          createdAt: "2026-04-08T00:00:00.000Z",
        },
      ],
    };
    const projectionPath = await writeProjection("team-bad", original);

    const result = await new TeamCommunicationProjectionAddressMigration(memoryDir).execute();

    expect(result.status).toBe("FAILED");
    expect(result.summary).toMatchObject({ scannedCount: 1, migratedCount: 0, skippedCount: 0, failedCount: 1 });
    expect(result.summary.details[0]).toMatchObject({
      itemId: "team-bad",
      status: "FAILED",
      message: expect.stringContaining("receiverAddress.segments[0] member identity is missing"),
    });
    await expect(readJson(projectionPath)).resolves.toEqual(original);
    await expect(listBackups(projectionPath)).resolves.toHaveLength(0);
  });

  it("rejects an exact address for another root without rewriting the source", async () => {
    const original = {
      teamRunId: "team-root",
      messages: [
        {
          messageId: "message-root-mismatch",
          senderAddress: executionAddress("other-root", "/sender"),
          receiverAddress: executionAddress("team-root", "/receiver"),
          content: "Wrong root.",
          messageType: "agent_message",
          createdAt: "2026-04-08T00:00:00.000Z",
          referenceFiles: [],
        },
      ],
    };
    const projectionPath = await writeProjection("team-root", original);

    const result = await new TeamCommunicationProjectionAddressMigration(memoryDir).execute();

    expect(result.status).toBe("FAILED");
    expect(result.summary.details[0]).toMatchObject({
      status: "FAILED",
      message: expect.stringContaining("does not match expected root 'team-root'"),
    });
    await expect(readJson(projectionPath)).resolves.toEqual(original);
    await expect(listBackups(projectionPath)).resolves.toHaveLength(0);
  });

  it("is registered as a startup-required app-data migration", () => {
    const registered = new AppDataMigrationRegistry()
      .getDefinition(TEAM_COMMUNICATION_PROJECTION_ADDRESS_MIGRATION_ID);

    expect(registered).toBeInstanceOf(TeamCommunicationProjectionAddressMigration);
    expect(registered?.requiredOnStartup).toBe(true);
  });
});
