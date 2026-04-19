import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ApplicationRunBindingSummary } from "@autobyteus/application-sdk-contracts";
import { appConfigProvider } from "../../../src/config/app-config-provider.js";
import { ApplicationStorageLifecycleService } from "../../../src/application-storage/services/application-storage-lifecycle-service.js";
import { ApplicationPlatformStateStore } from "../../../src/application-storage/stores/application-platform-state-store.js";
import { ApplicationOrchestrationRecoveryService } from "../../../src/application-orchestration/services/application-orchestration-recovery-service.js";
import { ApplicationRunBindingStore } from "../../../src/application-orchestration/stores/application-run-binding-store.js";
import { ApplicationRunLookupStore } from "../../../src/application-orchestration/stores/application-run-lookup-store.js";

const applicationId = "bundle-app__pkg__brief-studio";

const buildBinding = (): ApplicationRunBindingSummary => ({
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
      {
        memberName: "writer",
        memberRouteKey: "writer",
        displayName: "Writer",
        teamPath: [],
        runId: "team-run-1::writer",
        runtimeKind: "AGENT_TEAM_MEMBER",
      },
    ],
  },
  createdAt: "2026-04-19T10:00:00.000Z",
  updatedAt: "2026-04-19T10:00:00.000Z",
  terminatedAt: null,
  lastErrorMessage: null,
});

describe("ApplicationOrchestrationRecoveryService", () => {
  let tempRoot: string;
  let storageLifecycleService: ApplicationStorageLifecycleService;
  let bindingStore: ApplicationRunBindingStore;
  let lookupStore: ApplicationRunLookupStore;

  beforeEach(async () => {
    tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "autobyteus-aor-recovery-"));
    appConfigProvider.resetForTests();
    appConfigProvider.initialize({ appDataDir: tempRoot });

    const fakeBundleService = {
      listApplications: vi.fn(async () => [{ id: applicationId }]),
      getApplicationById: vi.fn(async (requestedApplicationId: string) => (
        requestedApplicationId === applicationId
          ? ({ id: applicationId, backend: { migrationsDirPath: null } } as never)
          : null
      )),
    };

    storageLifecycleService = new ApplicationStorageLifecycleService({
      appConfig: {
        getAppDataDir: () => tempRoot,
      } as never,
      applicationBundleService: fakeBundleService as never,
    });

    const platformStateStore = new ApplicationPlatformStateStore({
      storageLifecycleService,
    });

    bindingStore = new ApplicationRunBindingStore({
      platformStateStore,
    });
    lookupStore = new ApplicationRunLookupStore();
  });

  afterEach(async () => {
    appConfigProvider.resetForTests();
    await fs.rm(tempRoot, { recursive: true, force: true });
  });

  it("rebuilds global lookups and reattaches nonterminal bindings during recovery", async () => {
    const binding = buildBinding();
    await bindingStore.persistBinding(binding);

    const runObserverService = {
      attachBinding: vi.fn(async () => true),
    };
    const ingressService = {
      appendBindingLifecycleEvent: vi.fn(),
    };

    const recoveryService = new ApplicationOrchestrationRecoveryService({
      applicationBundleService: {
        listApplications: async () => [{ id: applicationId }],
      } as never,
      bindingStore,
      lookupStore,
      runObserverService: runObserverService as never,
      ingressService: ingressService as never,
    });

    await recoveryService.resumeBindings();

    expect(runObserverService.attachBinding).toHaveBeenCalledWith(binding, {
      emitAttachedEvent: false,
    });
    expect(lookupStore.getLookupByRunId(binding.runtime.runId)).toEqual({
      runId: binding.runtime.runId,
      applicationId,
      bindingId: binding.bindingId,
    });
    expect(lookupStore.getLookupByRunId(binding.runtime.members[0]!.runId)).toEqual({
      runId: binding.runtime.members[0]!.runId,
      applicationId,
      bindingId: binding.bindingId,
    });
    expect(lookupStore.getLookupByRunId(binding.runtime.members[1]!.runId)).toEqual({
      runId: binding.runtime.members[1]!.runId,
      applicationId,
      bindingId: binding.bindingId,
    });
    expect(ingressService.appendBindingLifecycleEvent).not.toHaveBeenCalled();
  });

  it("marks bindings orphaned and removes lookups when reattachment is unavailable", async () => {
    const binding = buildBinding();
    await bindingStore.persistBinding(binding);

    const runObserverService = {
      attachBinding: vi.fn(async () => false),
      detachBinding: vi.fn(async () => undefined),
    };
    const ingressService = {
      appendBindingLifecycleEvent: vi.fn(async () => undefined),
    };

    const recoveryService = new ApplicationOrchestrationRecoveryService({
      applicationBundleService: {
        listApplications: async () => [{ id: applicationId }],
      } as never,
      bindingStore,
      lookupStore,
      runObserverService: runObserverService as never,
      ingressService: ingressService as never,
    });

    await recoveryService.resumeBindings();

    const persisted = await bindingStore.getBinding(applicationId, binding.bindingId);
    expect(persisted).not.toBeNull();
    expect(persisted).toMatchObject({
      status: "ORPHANED",
      bindingId: binding.bindingId,
      applicationId,
    });
    expect(persisted?.terminatedAt).toEqual(expect.any(String));
    expect(lookupStore.getLookupByRunId(binding.runtime.runId)).toBeNull();
    expect(lookupStore.getLookupByRunId(binding.runtime.members[0]!.runId)).toBeNull();
    expect(lookupStore.getLookupByRunId(binding.runtime.members[1]!.runId)).toBeNull();
    expect(runObserverService.detachBinding).toHaveBeenCalledWith(binding.bindingId);
    expect(ingressService.appendBindingLifecycleEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        family: "RUN_ORPHANED",
        payload: {
          reason: "recovery_unavailable",
          errorMessage: null,
        },
      }),
    );
  });
});
