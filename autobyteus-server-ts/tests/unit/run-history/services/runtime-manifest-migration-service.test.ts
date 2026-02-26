import { describe, expect, it } from "vitest";
import { RuntimeManifestMigrationService } from "../../../../src/run-history/services/runtime-manifest-migration-service.js";

describe("RuntimeManifestMigrationService", () => {
  const service = new RuntimeManifestMigrationService();

  it("migrates legacy manifest by backfilling runtime fields", () => {
    const migrated = service.migrateAndValidate("run-1", {
      agentDefinitionId: "agent-1",
      workspaceRootPath: "/tmp/project",
      llmModelIdentifier: "gpt",
      llmConfig: null,
      autoExecuteTools: false,
      skillAccessMode: null,
    });

    expect(migrated).toBeTruthy();
    expect(migrated?.runtimeKind).toBe("autobyteus");
    expect(migrated?.runtimeReference.sessionId).toBe("run-1");
  });

  it("keeps valid runtime metadata for v2 manifests", () => {
    const migrated = service.migrateAndValidate("run-2", {
      agentDefinitionId: "agent-2",
      workspaceRootPath: "/tmp/project",
      llmModelIdentifier: "gpt",
      llmConfig: { temperature: 0.2 },
      autoExecuteTools: true,
      skillAccessMode: null,
      runtimeKind: "codex_app_server",
      runtimeReference: {
        runtimeKind: "codex_app_server",
        sessionId: "sess-1",
        threadId: "thread-1",
        metadata: { shard: "a" },
      },
    });

    expect(migrated).toBeTruthy();
    expect(migrated?.runtimeKind).toBe("codex_app_server");
    expect(migrated?.runtimeReference.threadId).toBe("thread-1");
    expect(migrated?.runtimeReference.metadata?.shard).toBe("a");
  });

  it("rejects manifest when runtime reference kind mismatches runtime kind", () => {
    const migrated = service.migrateAndValidate("run-3", {
      agentDefinitionId: "agent-3",
      workspaceRootPath: "/tmp/project",
      llmModelIdentifier: "gpt",
      llmConfig: null,
      autoExecuteTools: false,
      skillAccessMode: null,
      runtimeKind: "autobyteus",
      runtimeReference: {
        runtimeKind: "codex_app_server",
        sessionId: "sess-1",
        threadId: null,
        metadata: null,
      },
    });

    expect(migrated).toBeNull();
  });
});
