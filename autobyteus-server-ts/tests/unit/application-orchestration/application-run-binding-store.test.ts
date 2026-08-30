import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ApplicationStorageLifecycleService } from "../../../src/application-storage/services/application-storage-lifecycle-service.js";
import { ApplicationPlatformStateStore } from "../../../src/application-storage/stores/application-platform-state-store.js";
import {
  APPLICATION_AGENT_TEAM_MEMBER_STORAGE_RUNTIME_KIND,
  ApplicationRunBindingStore,
} from "../../../src/application-orchestration/stores/application-run-binding-store.js";

const APPLICATION_ID = "local-package::binding-codec";

const buildTeamBinding = () => ({
  bindingId: "binding-1",
  applicationId: APPLICATION_ID,
  launchRequestId: "launch-1",
  status: "ATTACHED" as const,
  executionResourceRef: {
    source: "bundle" as const,
    kind: "AGENT_TEAM" as const,
    localId: "research-team",
  },
  runtime: {
    subject: "TEAM_RUN" as const,
    teamRunId: "team-run-1",
    definitionId: "team-definition-1",
    members: [{
      memberAddress: "/research/reviewer" as const,
      displayName: "Reviewer",
      agentRunId: "agent-run-1",
    }],
  },
  createdAt: "2026-08-26T08:00:00.000Z",
  updatedAt: "2026-08-26T08:00:00.000Z",
  terminatedAt: null,
  lastErrorMessage: null,
});

describe("ApplicationRunBindingStore current-schema projection", () => {
  let tempRoot: string;
  let platformStateStore: ApplicationPlatformStateStore;
  let store: ApplicationRunBindingStore;
  let databasePath: string;

  beforeEach(async () => {
    tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "application-binding-codec-"));
    const storageLifecycleService = new ApplicationStorageLifecycleService({
      appConfig: { getAppDataDir: () => tempRoot },
      applicationBundleService: {
        getApplicationById: async (applicationId: string) => (
          applicationId === APPLICATION_ID ? { id: applicationId } : null
        ),
      } as never,
    });
    platformStateStore = new ApplicationPlatformStateStore({
      appConfig: { getAppDataDir: () => tempRoot },
      storageLifecycleService,
    });
    store = new ApplicationRunBindingStore({ platformStateStore });
    databasePath = storageLifecycleService.getStorageLayout(APPLICATION_ID).platformDatabasePath;
  });

  afterEach(async () => {
    await fs.rm(tempRoot, { recursive: true, force: true });
  });

  it("does not create platform state while reading an absent binding catalog", async () => {
    await expect(store.getBinding(APPLICATION_ID, "missing")).resolves.toBeNull();
    await expect(store.listBindings(APPLICATION_ID)).resolves.toEqual([]);
    await expect(fs.stat(databasePath)).rejects.toMatchObject({ code: "ENOENT" });
  });

  it("writes only the current summary shape while retaining the private physical role constant", async () => {
    await store.persistBinding(buildTeamBinding());

    const db = new DatabaseSync(databasePath, { readOnly: true });
    try {
      const summary = JSON.parse(String((db.prepare(
        `SELECT summary_json FROM __autobyteus_run_bindings WHERE binding_id = ?`,
      ).get("binding-1") as { summary_json: string }).summary_json)) as Record<string, unknown>;
      const runtime = summary.runtime as { members: Array<Record<string, unknown>> };
      expect(runtime.members[0]).toEqual({
        memberAddress: "/research/reviewer",
        displayName: "Reviewer",
        agentRunId: "agent-run-1",
      });
      expect(runtime.members[0]).not.toHaveProperty("runtimeKind");

      const physicalMember = db.prepare(
        `SELECT runtime_kind FROM __autobyteus_run_binding_members WHERE binding_id = ?`,
      ).get("binding-1") as { runtime_kind: string };
      expect(physicalMember.runtime_kind).toBe(APPLICATION_AGENT_TEAM_MEMBER_STORAGE_RUNTIME_KIND);
    } finally {
      db.close();
    }
  });

  it("projects an old superset without rewriting it and rejects missing retained identity", async () => {
    await store.persistBinding(buildTeamBinding());
    const db = new DatabaseSync(databasePath);
    try {
      const row = db.prepare(
        `SELECT summary_json FROM __autobyteus_run_bindings WHERE binding_id = ?`,
      ).get("binding-1") as { summary_json: string };
      const oldSuperset = JSON.parse(row.summary_json) as {
        runtime: { members: Array<Record<string, unknown>> };
      } & Record<string, unknown>;
      oldSuperset.ignoredLegacyAttribute = "retained-on-disk";
      oldSuperset.runtime.members[0]!.runtimeKind = "AGENT_TEAM_MEMBER";
      oldSuperset.runtime.members[0]!.ignoredLegacyAttribute = true;
      db.prepare(
        `UPDATE __autobyteus_run_bindings SET summary_json = ? WHERE binding_id = ?`,
      ).run(JSON.stringify(oldSuperset), "binding-1");
    } finally {
      db.close();
    }
    const beforeRead = await fs.readFile(databasePath);

    await expect(store.getBinding(APPLICATION_ID, "binding-1")).resolves.toEqual(buildTeamBinding());
    expect(await fs.readFile(databasePath)).toEqual(beforeRead);

    const invalidDb = new DatabaseSync(databasePath);
    try {
      const row = invalidDb.prepare(
        `SELECT summary_json FROM __autobyteus_run_bindings WHERE binding_id = ?`,
      ).get("binding-1") as { summary_json: string };
      const invalid = JSON.parse(row.summary_json) as {
        runtime: { members: Array<Record<string, unknown>> };
      };
      delete invalid.runtime.members[0]!.agentRunId;
      invalidDb.prepare(
        `UPDATE __autobyteus_run_bindings SET summary_json = ? WHERE binding_id = ?`,
      ).run(JSON.stringify(invalid), "binding-1");
    } finally {
      invalidDb.close();
    }

    await expect(store.getBinding(APPLICATION_ID, "binding-1"))
      .rejects.toThrow("agentRunId must be a non-empty string");
  });
});
