import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { TeamMemberRunManifestStore } from "../../../src/run-history/store/team-member-run-manifest-store.js";

describe("TeamMemberRunManifestStore", () => {
  let memoryDir: string;
  let store: TeamMemberRunManifestStore;

  beforeEach(async () => {
    memoryDir = await fs.mkdtemp(path.join(os.tmpdir(), "autobyteus-member-run-manifest-"));
    store = new TeamMemberRunManifestStore(memoryDir);
  });

  afterEach(async () => {
    await fs.rm(memoryDir, { recursive: true, force: true });
  });

  it("writes and reads normalized team member run manifest payloads", async () => {
    await store.writeManifest("team_a", {
      version: 1,
      teamRunId: "team_a",
      runVersion: 1,
      memberRouteKey: " student ",
      memberName: "student",
      memberRunId: "student_abc123",
      agentDefinitionId: "agent-student",
      llmModelIdentifier: "model-student",
      autoExecuteTools: false,
      llmConfig: { temperature: 0.2 },
      workspaceRootPath: "/tmp/../tmp/workspace/student",
      lastKnownStatus: "ACTIVE",
      createdAt: "2026-02-24T00:00:00.000Z",
      updatedAt: "2026-02-24T00:00:00.000Z",
    });

    const loaded = await store.readManifest("team_a", "student_abc123");
    expect(loaded).toMatchObject({
      version: 1,
      teamRunId: "team_a",
      memberRouteKey: "student",
      memberRunId: "student_abc123",
      workspaceRootPath: path.resolve("/tmp/workspace/student"),
      lastKnownStatus: "ACTIVE",
    });
  });

  it("returns null for missing manifests", async () => {
    const loaded = await store.readManifest("team_missing", "member_missing");
    expect(loaded).toBeNull();
  });
});
