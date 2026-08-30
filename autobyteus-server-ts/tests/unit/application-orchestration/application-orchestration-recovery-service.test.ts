import type { ApplicationAgentBindingRecord } from "../../../src/application-orchestration/domain/models.js";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { appConfigProvider } from "../../../src/config/app-config-provider.js";
import { ApplicationStorageLifecycleService } from "../../../src/application-storage/services/application-storage-lifecycle-service.js";
import { ApplicationPlatformStateStore } from "../../../src/application-storage/stores/application-platform-state-store.js";
import { ApplicationOrchestrationRecoveryService } from "../../../src/application-orchestration/services/application-orchestration-recovery-service.js";
import { ApplicationRunBindingLifecycleHub } from "../../../src/application-orchestration/services/application-run-binding-lifecycle-hub.js";
import { ApplicationRunBindingTerminalTransitionService } from "../../../src/application-orchestration/services/application-run-binding-terminal-transition-service.js";
import { ApplicationRunBindingStore } from "../../../src/application-orchestration/stores/application-run-binding-store.js";
import { ApplicationRunLookupStore } from "../../../src/application-orchestration/stores/application-run-lookup-store.js";

const applicationId = "bundle-app__pkg__brief-studio";

const buildBinding = (): ApplicationAgentBindingRecord => ({
  bindingId: "binding-1",
  applicationId,
  launchRequestId: "launch-request-1",
  status: "ATTACHED",
  executionResourceRef: {
    source: "bundle",
    kind: "AGENT_TEAM",
    localId: "brief-studio-team",
  },
  runtime: {
    subject: "TEAM_RUN",
    teamRunId: "team-run-1",
    definitionId: "bundle-team__pkg__brief-studio__brief-studio-team",
    members: [
      {
        memberAddress: "/researcher",
        displayName: "Researcher",
        agentRunId: "team-run-1::researcher",
      },
      {
        memberAddress: "/writer",
        displayName: "Writer",
        agentRunId: "team-run-1::writer",
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
  let platformStateStore: ApplicationPlatformStateStore;

  beforeEach(async () => {
    tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "autobyteus-aor-recovery-"));
    appConfigProvider.resetForTests();
    appConfigProvider.initialize({ appDataDir: tempRoot });

    const fakeBundleService = {
      listApplications: vi.fn(async () => [{ id: applicationId }]),
      getCatalogSnapshot: vi.fn(async () => ({
        applications: [{ id: applicationId }],
        diagnostics: [],
      })),
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

    platformStateStore = new ApplicationPlatformStateStore({
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
    const terminalTransitionService = new ApplicationRunBindingTerminalTransitionService({
      bindingStore,
      lookupStore,
      ingressService: ingressService as never,
      lifecycleHub: new ApplicationRunBindingLifecycleHub(),
    });

    const recoveryService = new ApplicationOrchestrationRecoveryService({
      applicationBundleService: {
        getCatalogSnapshot: async () => ({
          applications: [{ id: applicationId }],
          diagnostics: [],
        }),
      } as never,
      platformStateStore,
      bindingStore,
      lookupStore,
      runObserverService: runObserverService as never,
      ingressService: ingressService as never,
      terminalTransitionService,
    });

    await recoveryService.resumeBindings();

    expect(runObserverService.attachBinding).toHaveBeenCalledWith(binding, {
      emitAttachedEvent: false,
    });
    expect(lookupStore.getLookupByRunId(binding.runtime.teamRunId)).toEqual({
      runId: binding.runtime.teamRunId,
      applicationId,
      bindingId: binding.bindingId,
    });
    expect(lookupStore.getLookupByRunId(binding.runtime.members[0]!.agentRunId)).toEqual({
      runId: binding.runtime.members[0]!.agentRunId,
      applicationId,
      bindingId: binding.bindingId,
    });
    expect(lookupStore.getLookupByRunId(binding.runtime.members[1]!.agentRunId)).toEqual({
      runId: binding.runtime.members[1]!.agentRunId,
      applicationId,
      bindingId: binding.bindingId,
    });
    expect(ingressService.appendBindingLifecycleEvent).not.toHaveBeenCalled();
  });

  it("returns NO_PERSISTED_STATE without preparing a new platform database during startup recovery", async () => {
    const runObserverService = {
      attachBinding: vi.fn(async () => true),
    };
    const ingressService = {
      appendBindingLifecycleEvent: vi.fn(),
    };
    const terminalTransitionService = new ApplicationRunBindingTerminalTransitionService({
      bindingStore,
      lookupStore,
      ingressService: ingressService as never,
      lifecycleHub: new ApplicationRunBindingLifecycleHub(),
    });

    const recoveryService = new ApplicationOrchestrationRecoveryService({
      applicationBundleService: {
        getCatalogSnapshot: async () => ({
          applications: [{ id: applicationId }],
          diagnostics: [],
        }),
      } as never,
      platformStateStore,
      bindingStore,
      lookupStore,
      runObserverService: runObserverService as never,
      ingressService: ingressService as never,
      terminalTransitionService,
    });

    const outcomes = await recoveryService.resumeBindings();

    expect(outcomes).toContainEqual({
      applicationId,
      status: "NO_PERSISTED_STATE",
      detail: null,
    });
    await expect(
      new ApplicationPlatformStateStore({ storageLifecycleService }).getExistingStatePresence(applicationId),
    ).resolves.toBe("ABSENT");
    expect(runObserverService.attachBinding).not.toHaveBeenCalled();
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
    const terminalTransitionService = new ApplicationRunBindingTerminalTransitionService({
      bindingStore,
      lookupStore,
      ingressService: ingressService as never,
      lifecycleHub: new ApplicationRunBindingLifecycleHub(),
    });

    const recoveryService = new ApplicationOrchestrationRecoveryService({
      applicationBundleService: {
        getCatalogSnapshot: async () => ({
          applications: [{ id: applicationId }],
          diagnostics: [],
        }),
      } as never,
      platformStateStore,
      bindingStore,
      lookupStore,
      runObserverService: runObserverService as never,
      ingressService: ingressService as never,
      terminalTransitionService,
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
    expect(lookupStore.getLookupByRunId(binding.runtime.teamRunId)).toBeNull();
    expect(lookupStore.getLookupByRunId(binding.runtime.members[0]!.agentRunId)).toBeNull();
    expect(lookupStore.getLookupByRunId(binding.runtime.members[1]!.agentRunId)).toBeNull();
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
