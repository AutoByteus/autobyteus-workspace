import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApplicationStorageLifecycleService } from "../../../src/application-storage/services/application-storage-lifecycle-service.js";
import { ApplicationPlatformStateStore } from "../../../src/application-storage/stores/application-platform-state-store.js";
import { ApplicationExecutionResourceConfigurationStore } from "../../../src/application-orchestration/stores/application-execution-resource-configuration-store.js";
import { ApplicationRunBindingStore } from "../../../src/application-orchestration/stores/application-run-binding-store.js";

const applicationId = "bundle-app__pkg__brief-studio";

describe("application execution-resource stale old-shape state handling", () => {
  let tempRoot: string;
  let storageLifecycleService: ApplicationStorageLifecycleService;
  let platformStateStore: ApplicationPlatformStateStore;
  let configurationStore: ApplicationExecutionResourceConfigurationStore;
  let bindingStore: ApplicationRunBindingStore;

  beforeEach(async () => {
    tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "autobyteus-aer-stale-state-"));
    storageLifecycleService = new ApplicationStorageLifecycleService({
      appConfig: {
        getAppDataDir: () => tempRoot,
      },
      applicationBundleService: {
        getApplicationById: vi.fn(async (requestedApplicationId: string) => (
          requestedApplicationId === applicationId
            ? ({ id: applicationId, backend: { migrationsDirPath: null } } as never)
            : null
        )),
      } as never,
    });
    platformStateStore = new ApplicationPlatformStateStore({ storageLifecycleService });
    configurationStore = new ApplicationExecutionResourceConfigurationStore({ platformStateStore });
    bindingStore = new ApplicationRunBindingStore({ platformStateStore });
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await fs.rm(tempRoot, { recursive: true, force: true });
  });

  const withPlatformDb = async <T>(fn: (db: DatabaseSync) => T): Promise<T> => {
    await storageLifecycleService.ensurePlatformStatePrepared(applicationId);
    const layout = storageLifecycleService.getStorageLayout(applicationId);
    const db = new DatabaseSync(layout.platformDatabasePath);
    try {
      return fn(db);
    } finally {
      db.close();
    }
  };

  it("resets saved setup refs that still use old owner shape instead of converting them", async () => {
    await withPlatformDb((db) => {
      db.exec(`
        CREATE TABLE __autobyteus_resource_configurations (
          slot_key TEXT PRIMARY KEY,
          resource_ref_json TEXT,
          updated_at TEXT NOT NULL
        );
      `);
      db.prepare(
        `INSERT INTO __autobyteus_resource_configurations (
           slot_key,
           resource_ref_json,
           updated_at
         ) VALUES (?, ?, ?)`,
      ).run(
        "draftingTeam",
        JSON.stringify({
          owner: "shared",
          kind: "AGENT_TEAM",
          definitionId: "shared-writing-team",
        }),
        "2026-05-08T10:00:00.000Z",
      );
    });

    await expect(configurationStore.getConfiguration(applicationId, "draftingTeam")).resolves.toBeNull();
    await expect(configurationStore.listConfigurations(applicationId)).resolves.toEqual([]);

    const remainingRows = await withPlatformDb((db) => db.prepare(
      `SELECT slot_key, resource_ref_json FROM __autobyteus_resource_configurations`,
    ).all());
    expect(remainingRows).toEqual([]);
  });

  it("preserves valid setup refs whose identity values equal old field names", async () => {
    await withPlatformDb((db) => {
      db.exec(`
        CREATE TABLE __autobyteus_resource_configurations (
          slot_key TEXT PRIMARY KEY,
          resource_ref_json TEXT,
          updated_at TEXT NOT NULL
        );
      `);
      const insertConfiguration = db.prepare(
        `INSERT INTO __autobyteus_resource_configurations (
           slot_key,
           resource_ref_json,
           updated_at
         ) VALUES (?, ?, ?)`,
      );
      insertConfiguration.run(
        "bundleOwner",
        JSON.stringify({
          source: "bundle",
          kind: "AGENT_TEAM",
          localId: "owner",
        }),
        "2026-05-08T10:05:00.000Z",
      );
      insertConfiguration.run(
        "sharedResourceRef",
        JSON.stringify({
          source: "shared",
          kind: "AGENT",
          definitionId: "resourceRef",
        }),
        "2026-05-08T10:06:00.000Z",
      );
    });

    await expect(configurationStore.getConfiguration(applicationId, "bundleOwner")).resolves.toMatchObject({
      slotKey: "bundleOwner",
      executionResourceRef: {
        source: "bundle",
        kind: "AGENT_TEAM",
        localId: "owner",
      },
    });
    await expect(configurationStore.getConfiguration(applicationId, "sharedResourceRef")).resolves.toMatchObject({
      slotKey: "sharedResourceRef",
      executionResourceRef: {
        source: "shared",
        kind: "AGENT",
        definitionId: "resourceRef",
      },
    });
    await expect(configurationStore.listConfigurations(applicationId)).resolves.toHaveLength(2);
  });

  it("drops run-binding summaries that still use old resourceRef/owner shape instead of converting them", async () => {
    const staleSummary = {
      bindingId: "binding-1",
      applicationId,
      bindingIntentId: "binding-intent-1",
      status: "ATTACHED",
      resourceRef: {
        owner: "bundle",
        kind: "AGENT_TEAM",
        localId: "brief-studio-team",
      },
      runtime: {
        subject: "TEAM_RUN",
        runId: "team-run-1",
        definitionId: "bundle-team__pkg__brief-studio__brief-studio-team",
        members: [
          {
            memberName: "researcher",
            memberRouteKey: "researcher",
            displayName: "Researcher",
            teamPath: [],
            runId: "team-run-1::researcher",
            runtimeKind: "AGENT_TEAM_MEMBER",
          },
        ],
      },
      createdAt: "2026-05-08T10:30:00.000Z",
      updatedAt: "2026-05-08T10:30:00.000Z",
      terminatedAt: null,
      lastErrorMessage: null,
    };

    await withPlatformDb((db) => {
      db.exec(`
        CREATE TABLE __autobyteus_run_bindings (
          binding_id TEXT PRIMARY KEY,
          binding_intent_id TEXT,
          execution_ref TEXT NOT NULL,
          status TEXT NOT NULL,
          runtime_subject TEXT NOT NULL,
          run_id TEXT NOT NULL,
          definition_id TEXT NOT NULL,
          resource_owner TEXT NOT NULL,
          resource_kind TEXT NOT NULL,
          resource_local_id TEXT,
          resource_definition_id TEXT,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          terminated_at TEXT,
          last_error_message TEXT,
          summary_json TEXT NOT NULL
        );
        CREATE TABLE __autobyteus_run_binding_members (
          binding_id TEXT NOT NULL,
          member_name TEXT NOT NULL,
          member_route_key TEXT NOT NULL,
          display_name TEXT NOT NULL,
          team_path_json TEXT NOT NULL,
          run_id TEXT NOT NULL,
          runtime_kind TEXT NOT NULL,
          PRIMARY KEY (binding_id, member_route_key)
        );
      `);
      db.prepare(
        `INSERT INTO __autobyteus_run_bindings (
           binding_id,
           binding_intent_id,
           execution_ref,
           status,
           runtime_subject,
           run_id,
           definition_id,
           resource_owner,
           resource_kind,
           resource_local_id,
           resource_definition_id,
           created_at,
           updated_at,
           terminated_at,
           last_error_message,
           summary_json
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ).run(
        staleSummary.bindingId,
        staleSummary.bindingIntentId,
        staleSummary.bindingIntentId,
        staleSummary.status,
        staleSummary.runtime.subject,
        staleSummary.runtime.runId,
        staleSummary.runtime.definitionId,
        "bundle",
        "AGENT_TEAM",
        "brief-studio-team",
        null,
        staleSummary.createdAt,
        staleSummary.updatedAt,
        null,
        null,
        JSON.stringify(staleSummary),
      );
      db.prepare(
        `INSERT INTO __autobyteus_run_binding_members (
           binding_id,
           member_name,
           member_route_key,
           display_name,
           team_path_json,
           run_id,
           runtime_kind
         ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      ).run(
        staleSummary.bindingId,
        "researcher",
        "researcher",
        "Researcher",
        "[]",
        "team-run-1::researcher",
        "AGENT_TEAM_MEMBER",
      );
    });

    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);

    await expect(bindingStore.getBinding(applicationId, "binding-1")).resolves.toBeNull();
    expect(warnSpy).toHaveBeenCalledWith(
      "Dropped 1 stale application run binding row(s) that used old execution-resource summary fields. Re-run state must be recreated with the new execution-resource contract.",
    );
    await expect(bindingStore.getBindingByIntentId(applicationId, "binding-intent-1")).resolves.toBeNull();
    await expect(bindingStore.listBindings(applicationId)).resolves.toEqual([]);

    const remainingRows = await withPlatformDb((db) => ({
      bindings: db.prepare(`SELECT binding_id, summary_json FROM __autobyteus_run_bindings`).all(),
      members: db.prepare(`SELECT binding_id FROM __autobyteus_run_binding_members`).all(),
    }));
    expect(remainingRows).toEqual({ bindings: [], members: [] });
  });

  it("preserves valid run-binding summaries whose identity values equal old field names", async () => {
    const buildSummary = (input: {
      bindingId: string;
      bindingIntentId: string;
      executionResourceRef: Record<string, unknown>;
    }) => ({
      bindingId: input.bindingId,
      applicationId,
      bindingIntentId: input.bindingIntentId,
      status: "ATTACHED",
      executionResourceRef: input.executionResourceRef,
      runtime: {
        subject: "TEAM_RUN",
        runId: `${input.bindingId}-run`,
        definitionId: `${input.bindingId}-definition`,
        members: [
          {
            memberName: "researcher",
            memberRouteKey: "researcher",
            displayName: "Researcher",
            teamPath: [],
            runId: `${input.bindingId}-run::researcher`,
            runtimeKind: "AGENT_TEAM_MEMBER",
          },
        ],
      },
      createdAt: "2026-05-08T10:40:00.000Z",
      updatedAt: "2026-05-08T10:40:00.000Z",
      terminatedAt: null,
      lastErrorMessage: null,
    });
    const bundleOwnerSummary = buildSummary({
      bindingId: "binding-owner-value",
      bindingIntentId: "intent-owner-value",
      executionResourceRef: {
        source: "bundle",
        kind: "AGENT_TEAM",
        localId: "owner",
      },
    });
    const sharedResourceRefSummary = buildSummary({
      bindingId: "binding-resource-ref-value",
      bindingIntentId: "intent-resource-ref-value",
      executionResourceRef: {
        source: "shared",
        kind: "AGENT",
        definitionId: "resourceRef",
      },
    });

    await withPlatformDb((db) => {
      db.exec(`
        CREATE TABLE __autobyteus_run_bindings (
          binding_id TEXT PRIMARY KEY,
          binding_intent_id TEXT,
          execution_ref TEXT NOT NULL,
          status TEXT NOT NULL,
          runtime_subject TEXT NOT NULL,
          run_id TEXT NOT NULL,
          definition_id TEXT NOT NULL,
          resource_owner TEXT NOT NULL,
          resource_kind TEXT NOT NULL,
          resource_local_id TEXT,
          resource_definition_id TEXT,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          terminated_at TEXT,
          last_error_message TEXT,
          summary_json TEXT NOT NULL
        );
        CREATE TABLE __autobyteus_run_binding_members (
          binding_id TEXT NOT NULL,
          member_name TEXT NOT NULL,
          member_route_key TEXT NOT NULL,
          display_name TEXT NOT NULL,
          team_path_json TEXT NOT NULL,
          run_id TEXT NOT NULL,
          runtime_kind TEXT NOT NULL,
          PRIMARY KEY (binding_id, member_route_key)
        );
      `);
      const insertBinding = db.prepare(
        `INSERT INTO __autobyteus_run_bindings (
           binding_id,
           binding_intent_id,
           execution_ref,
           status,
           runtime_subject,
           run_id,
           definition_id,
           resource_owner,
           resource_kind,
           resource_local_id,
           resource_definition_id,
           created_at,
           updated_at,
           terminated_at,
           last_error_message,
           summary_json
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      );
      const insertMember = db.prepare(
        `INSERT INTO __autobyteus_run_binding_members (
           binding_id,
           member_name,
           member_route_key,
           display_name,
           team_path_json,
           run_id,
           runtime_kind
         ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      );
      for (const summary of [bundleOwnerSummary, sharedResourceRefSummary]) {
        const ref = summary.executionResourceRef as {
          source: "bundle" | "shared";
          kind: "AGENT" | "AGENT_TEAM";
          localId?: string;
          definitionId?: string;
        };
        insertBinding.run(
          summary.bindingId,
          summary.bindingIntentId,
          summary.bindingIntentId,
          summary.status,
          summary.runtime.subject,
          summary.runtime.runId,
          summary.runtime.definitionId,
          ref.source,
          ref.kind,
          ref.source === "bundle" ? ref.localId ?? null : null,
          ref.source === "shared" ? ref.definitionId ?? null : null,
          summary.createdAt,
          summary.updatedAt,
          null,
          null,
          JSON.stringify(summary),
        );
        insertMember.run(
          summary.bindingId,
          "researcher",
          "researcher",
          "Researcher",
          "[]",
          `${summary.bindingId}-run::researcher`,
          "AGENT_TEAM_MEMBER",
        );
      }
    });

    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);

    await expect(bindingStore.getBinding(applicationId, "binding-owner-value")).resolves.toMatchObject({
      bindingId: "binding-owner-value",
      executionResourceRef: {
        source: "bundle",
        kind: "AGENT_TEAM",
        localId: "owner",
      },
    });
    await expect(bindingStore.getBindingByIntentId(applicationId, "intent-resource-ref-value")).resolves.toMatchObject({
      bindingId: "binding-resource-ref-value",
      executionResourceRef: {
        source: "shared",
        kind: "AGENT",
        definitionId: "resourceRef",
      },
    });
    await expect(bindingStore.listBindings(applicationId)).resolves.toHaveLength(2);
    expect(warnSpy).not.toHaveBeenCalled();

    const remainingRows = await withPlatformDb((db) => ({
      bindings: db.prepare(`SELECT binding_id FROM __autobyteus_run_bindings ORDER BY binding_id ASC`).all(),
      members: db.prepare(`SELECT binding_id FROM __autobyteus_run_binding_members ORDER BY binding_id ASC`).all(),
    }));
    expect(remainingRows).toEqual({
      bindings: [
        { binding_id: "binding-owner-value" },
        { binding_id: "binding-resource-ref-value" },
      ],
      members: [
        { binding_id: "binding-owner-value" },
        { binding_id: "binding-resource-ref-value" },
      ],
    });
  });
});
