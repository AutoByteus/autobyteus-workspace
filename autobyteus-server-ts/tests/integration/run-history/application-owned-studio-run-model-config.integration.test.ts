import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { SkillAccessMode } from "autobyteus-ts/agent/context/skill-access-mode.js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ApplicationExecutionResourceRef } from "@autobyteus/application-sdk-contracts";
import { appConfigProvider } from "../../../src/config/app-config-provider.js";
import { RuntimeKind } from "../../../src/runtime-management/runtime-kind-enum.js";
import { ApplicationStorageLifecycleService } from "../../../src/application-storage/services/application-storage-lifecycle-service.js";
import { ApplicationPlatformStateStore } from "../../../src/application-storage/stores/application-platform-state-store.js";
import { ApplicationOrchestrationHostService } from "../../../src/application-orchestration/services/application-orchestration-host-service.js";
import { ApplicationOrchestrationStartupGate } from "../../../src/application-orchestration/services/application-orchestration-startup-gate.js";
import { ApplicationRunBindingLaunchService } from "../../../src/application-orchestration/services/application-run-binding-launch-service.js";
import { ApplicationRunBindingLifecycleHub } from "../../../src/application-orchestration/services/application-run-binding-lifecycle-hub.js";
import { ApplicationRunBindingTerminalTransitionService } from "../../../src/application-orchestration/services/application-run-binding-terminal-transition-service.js";
import { ApplicationRunOwnershipService } from "../../../src/application-orchestration/services/application-run-ownership-service.js";
import { ApplicationRunBindingStore } from "../../../src/application-orchestration/stores/application-run-binding-store.js";
import { ApplicationRunLookupStore } from "../../../src/application-orchestration/stores/application-run-lookup-store.js";
import { StudioRunModelConfigService } from "../../../src/run-history/services/studio-run-model-config-service.js";
import { testAgentNode, testExecutionTree } from "../../fixtures/current-team-run-fixtures.js";

const APPLICATION_ID = "built-in:applications__studio-ownership";
const WORKSPACE_ROOT = "/workspace/application";
const MODEL_ID = "model-1";

const AGENT_RESOURCE = Object.freeze({
  source: "bundle",
  kind: "AGENT",
  localId: "application-agent",
  definitionId: "agent-def-1",
  name: "Application Agent",
  applicationId: APPLICATION_ID,
});
const TEAM_RESOURCE = Object.freeze({
  source: "bundle",
  kind: "AGENT_TEAM",
  localId: "application-team",
  definitionId: "team-def-1",
  name: "Application Team",
  applicationId: APPLICATION_ID,
});

type Subject = "AGENT" | "TEAM";

describe("Application-owned Studio run-model configuration integration", () => {
  let tempRoot: string;
  let bindingStore: ApplicationRunBindingStore;
  let lookupStore: ApplicationRunLookupStore;

  beforeEach(async () => {
    tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "autobyteus-studio-ownership-"));
    appConfigProvider.resetForTests();
    appConfigProvider.initialize({ appDataDir: tempRoot });

    const storageLifecycleService = new ApplicationStorageLifecycleService({
      appConfig: { getAppDataDir: () => tempRoot } as never,
      applicationBundleService: {
        getApplicationById: vi.fn(async (applicationId: string) => applicationId === APPLICATION_ID
          ? ({ id: APPLICATION_ID, backend: { migrationsDirPath: null } } as never)
          : null),
      } as never,
    });
    const platformStateStore = new ApplicationPlatformStateStore({ storageLifecycleService });
    bindingStore = new ApplicationRunBindingStore({ platformStateStore });
    lookupStore = new ApplicationRunLookupStore();
  });

  afterEach(async () => {
    appConfigProvider.resetForTests();
    await fs.rm(tempRoot, { recursive: true, force: true });
  });

  const createHarness = async () => {
    const agentResumeConfigs = new Map<string, object>();
    const teamResumeConfigs = new Map<string, object>();
    const generalAgentUpdate = vi.fn(async () => ({ subject: "GENERAL_AGENT" }));
    const generalTeamUpdate = vi.fn(async () => ({ subject: "GENERAL_TEAM" }));
    const terminateAgentRun = vi.fn(async () => undefined);
    const terminateTeamRun = vi.fn(async () => undefined);

    const executionResourceResolver = {
      resolveExecutionResource: vi.fn(async (
        applicationId: string,
        ref: ApplicationExecutionResourceRef,
      ) => {
        if (applicationId !== APPLICATION_ID || ref.source !== "bundle") {
          throw new Error("Execution resource fixture was not found.");
        }
        if (ref.kind === "AGENT" && ref.localId === AGENT_RESOURCE.localId) return AGENT_RESOURCE;
        if (ref.kind === "AGENT_TEAM" && ref.localId === TEAM_RESOURCE.localId) return TEAM_RESOURCE;
        throw new Error("Execution resource fixture was not found.");
      }),
    };

    const agentRunService = {
      createAgentRun: vi.fn(async (input: {
        agentDefinitionId: string;
        workspaceRootPath: string;
        llmModelIdentifier: string;
        llmConfig?: Record<string, unknown> | null;
        autoExecuteTools: boolean;
        skillAccessMode: SkillAccessMode;
        applicationBinding: {
          applicationId: string;
          bindingId: string;
          displayName: string | null;
          runtimeKind: "AGENT";
        };
      }) => {
        const runId = "application-agent-run-1";
        agentResumeConfigs.set(runId, Object.freeze({
          runId,
          isActive: false,
          metadataConfig: {
            runId,
            agentDefinitionId: input.agentDefinitionId,
            workspaceRootPath: input.workspaceRootPath,
            memoryDir: "/memory/application-agent-run-1",
            llmModelIdentifier: input.llmModelIdentifier,
            llmConfig: input.llmConfig ?? null,
            autoExecuteTools: input.autoExecuteTools,
            skillAccessMode: input.skillAccessMode,
            runtimeKind: RuntimeKind.AUTOBYTEUS,
            platformAgentRunId: null,
            applicationExecutionContext: {
              applicationId: input.applicationBinding.applicationId,
              bindingId: input.applicationBinding.bindingId,
              producer: {
                agentRunId: runId,
                displayName: input.applicationBinding.displayName,
                runtimeKind: input.applicationBinding.runtimeKind,
              },
            },
            runtimeReference: {
              runtimeKind: RuntimeKind.AUTOBYTEUS,
              sessionId: null,
              threadId: null,
              metadata: null,
            },
          },
          modelConfigEditability: { editable: true, reason: null },
        }));
        return { runId };
      }),
      terminateAgentRun,
      resolveAgentRun: vi.fn(),
      updateStoppedModelConfig: generalAgentUpdate,
    };

    const teamRunService = {
      createTeamRun: vi.fn(async (input: {
        applicationBinding: { applicationId: string; bindingId: string };
      }) => {
        const teamRunId = "application-team-run-1";
        const executionTree = Object.freeze({
          ...testExecutionTree({
            rootTeamRunId: teamRunId,
            rootTeamDefinitionId: TEAM_RESOURCE.definitionId,
            teamDefinitionName: TEAM_RESOURCE.name,
            coordinatorAddress: "/coordinator",
            children: [testAgentNode("/coordinator", {
              agentRunId: "application-team-member-run-1",
              agentDefinitionId: AGENT_RESOURCE.definitionId,
              workspaceRootPath: WORKSPACE_ROOT,
            })],
          }),
          applicationBinding: Object.freeze({ ...input.applicationBinding }),
        });
        teamResumeConfigs.set(teamRunId, Object.freeze({
          teamRunId,
          isActive: false,
          executionTree,
          modelConfigEditability: { editable: true, reason: null },
        }));
        return {
          teamRunId,
          getExecutionTreeSnapshot: () => executionTree,
        };
      }),
      terminateTeamRun,
      resolveActiveTeamRun: vi.fn(),
      updateStoppedModelConfigs: generalTeamUpdate,
    };

    const runBindingLaunchService = new ApplicationRunBindingLaunchService({
      executionResourceResolver: executionResourceResolver as never,
      bindingStore,
      lookupStore,
      agentRunService: agentRunService as never,
      teamRunService: teamRunService as never,
      agentDefinitionService: {
        getAgentDefinitionById: vi.fn(async () => ({ id: AGENT_RESOURCE.definitionId, name: AGENT_RESOURCE.name })),
      } as never,
      currentModelSelectionPolicy: {
        requireCurrentSelection: vi.fn(async () => RuntimeKind.AUTOBYTEUS),
        normalizeRuntimeKind: vi.fn(() => RuntimeKind.AUTOBYTEUS),
      } as never,
    });

    const startupGate = new ApplicationOrchestrationStartupGate();
    await startupGate.runStartupRecovery(async () => undefined);
    const lifecycleHub = new ApplicationRunBindingLifecycleHub();
    const terminalTransitionService = new ApplicationRunBindingTerminalTransitionService({
      bindingStore,
      lookupStore,
      ingressService: { appendBindingLifecycleEvent: vi.fn(async () => undefined) } as never,
      lifecycleHub,
    });
    const host = new ApplicationOrchestrationHostService({
      startupGate,
      availabilityService: { requireApplicationActive: vi.fn(async () => undefined) },
      executionResourceResolver,
      launchConfigurationService: {},
      runBindingLaunchService,
      bindingStore,
      lookupStore,
      runObserverService: {
        attachBinding: vi.fn(async () => true),
        detachBinding: vi.fn(async () => undefined),
      },
      agentRunService,
      teamRunService,
      ingressService: {},
      publishedArtifactProjectionService: {},
      memoryLocationService: {},
      agentTargetAuthorizationService: {
        authorizeTarget: vi.fn(async (_applicationId: string, address: unknown) => ({ address })),
      },
      terminalTransitionService,
    } as never);

    const studioFor = (gate: ApplicationOrchestrationStartupGate) => new StudioRunModelConfigService({
      applicationRunOwnership: new ApplicationRunOwnershipService({
        startupGate: gate,
        lookupStore,
        bindingStore,
      }),
      agentResumeConfigService: {
        getAgentRunResumeConfig: vi.fn(async (runId: string) => {
          const result = agentResumeConfigs.get(runId);
          if (!result) throw new Error(`Agent resume fixture '${runId}' was not found.`);
          return result;
        }),
      } as never,
      teamResumeConfigService: {
        getTeamRunResumeConfig: vi.fn(async (runId: string) => {
          const result = teamResumeConfigs.get(runId);
          if (!result) throw new Error(`Team resume fixture '${runId}' was not found.`);
          return result;
        }),
      } as never,
      agentRunService: agentRunService as never,
      teamRunService: teamRunService as never,
    });

    return {
      host,
      startupGate,
      studioFor,
      generalAgentUpdate,
      generalTeamUpdate,
      terminateAgentRun,
      terminateTeamRun,
    };
  };

  const startSubject = async (
    subject: Subject,
    host: ApplicationOrchestrationHostService,
  ) => subject === "AGENT"
    ? host.startAgent(APPLICATION_ID, {
        launchRequestId: "application-agent-launch-1",
        executionResourceRef: {
          source: "bundle",
          kind: "AGENT",
          localId: AGENT_RESOURCE.localId,
        },
        launch: {
          kind: "AGENT",
          workspaceRootPath: WORKSPACE_ROOT,
          llmModelIdentifier: MODEL_ID,
          llmConfig: { reasoning_effort: "medium" },
          autoExecuteTools: true,
          skillAccessMode: SkillAccessMode.PRELOADED_ONLY,
          runtimeKind: RuntimeKind.AUTOBYTEUS,
        },
      })
    : host.startAgentTeam(APPLICATION_ID, {
        launchRequestId: "application-team-launch-1",
        executionResourceRef: {
          source: "bundle",
          kind: "AGENT_TEAM",
          localId: TEAM_RESOURCE.localId,
        },
        launch: {
          kind: "AGENT_TEAM",
          mode: "memberConfigs",
          teamConfigs: [{
            teamAddress: "/",
            workspaceRootPath: WORKSPACE_ROOT,
            llmModelIdentifier: MODEL_ID,
            llmConfig: null,
            autoExecuteTools: true,
            skillAccessMode: SkillAccessMode.PRELOADED_ONLY,
            runtimeKind: RuntimeKind.AUTOBYTEUS,
          }],
          memberConfigs: [{
            memberAddress: "/coordinator",
            displayName: "Coordinator",
            agentDefinitionId: AGENT_RESOURCE.definitionId,
            workspaceRootPath: WORKSPACE_ROOT,
            llmModelIdentifier: MODEL_ID,
            llmConfig: null,
            autoExecuteTools: true,
            skillAccessMode: SkillAccessMode.PRELOADED_ONLY,
            runtimeKind: RuntimeKind.AUTOBYTEUS,
          }],
        },
      });

  it.each(["AGENT", "TEAM"] as const)(
    "keeps a normally launched Application %s locked through startup-ready reentry, then releases it after termination",
    async (subject) => {
      const harness = await createHarness();
      const binding = await startSubject(subject, harness.host);
      const runId = binding.runtime.subject === "AGENT_RUN"
        ? binding.runtime.agentRunId
        : binding.runtime.teamRunId;
      const generalUpdate = subject === "AGENT" ? harness.generalAgentUpdate : harness.generalTeamUpdate;
      const updateInput = subject === "AGENT"
        ? { agentRunId: runId, llmConfig: { reasoning_effort: "high" } }
        : {
            teamRunId: runId,
            patches: [{ scopeKind: "CONFIGURED_AGENT" as const, scopeAddress: "/coordinator", llmConfig: null }],
          };
      const read = (studio: StudioRunModelConfigService) => subject === "AGENT"
        ? studio.getAgentRunResumeConfig(runId)
        : studio.getTeamRunResumeConfig(runId);
      const update = (studio: StudioRunModelConfigService) => subject === "AGENT"
        ? studio.updateStoppedAgentRunModelConfig(updateInput as never)
        : studio.updateStoppedTeamRunModelConfigs(updateInput as never);

      expect(lookupStore.getLookupByRunId(runId)).toEqual({
        runId,
        applicationId: APPLICATION_ID,
        bindingId: binding.bindingId,
      });
      await expect(bindingStore.getBinding(APPLICATION_ID, binding.bindingId))
        .resolves.toMatchObject({ status: "ATTACHED", runtime: { subject: binding.runtime.subject } });

      const studio = harness.studioFor(harness.startupGate);
      await expect(read(studio)).resolves.toMatchObject({
        isActive: true,
        modelConfigEditability: { editable: false, reason: "RUN_ACTIVE" },
      });
      const lockedUpdate = await update(studio);
      expect(lockedUpdate).toMatchObject({
        success: false,
        outcome: "RUN_ACTIVE",
        isActive: true,
        editability: { editable: false, reason: "RUN_ACTIVE" },
      });
      if (subject === "AGENT") {
        expect(lockedUpdate).toMatchObject({
          canonical: {
            runId,
            llmConfig: { reasoning_effort: "medium" },
            applicationExecutionContext: {
              applicationId: APPLICATION_ID,
              bindingId: binding.bindingId,
              producer: { agentRunId: runId, runtimeKind: "AGENT" },
            },
          },
        });
      } else {
        expect(lockedUpdate).toMatchObject({
          canonical: {
            applicationBinding: {
              applicationId: APPLICATION_ID,
              bindingId: binding.bindingId,
            },
            rootTeam: { teamRunId: runId },
          },
        });
      }
      expect(generalUpdate).not.toHaveBeenCalled();

      // Recovery clears global lookup rows before rebuilding them. Persisted canonical
      // provenance must keep the nonterminal binding authoritative during that window.
      lookupStore.clearApplication(APPLICATION_ID);
      expect(lookupStore.getLookupByRunId(runId)).toBeNull();

      const recoveryGate = new ApplicationOrchestrationStartupGate();
      const recoveryStudio = harness.studioFor(recoveryGate);
      let readSettled = false;
      const pendingRead = read(recoveryStudio).finally(() => { readSettled = true; });
      await new Promise((resolve) => setTimeout(resolve, 10));
      expect(readSettled).toBe(false);
      await recoveryGate.runStartupRecovery(async () => undefined);
      await expect(pendingRead).resolves.toMatchObject({
        isActive: true,
        modelConfigEditability: { editable: false, reason: "RUN_ACTIVE" },
      });
      await expect(update(recoveryStudio)).resolves.toMatchObject({ outcome: "RUN_ACTIVE" });
      expect(generalUpdate).not.toHaveBeenCalled();

      const terminated = await harness.host.terminateRunBinding(APPLICATION_ID, binding.bindingId);
      expect(terminated).toMatchObject({ status: "TERMINATED" });
      await expect(bindingStore.getBinding(APPLICATION_ID, binding.bindingId))
        .resolves.toMatchObject({ status: "TERMINATED", terminatedAt: expect.any(String) });
      expect(lookupStore.getLookupByRunId(runId)).toBeNull();
      if (subject === "AGENT") {
        expect(harness.terminateAgentRun).toHaveBeenCalledWith(runId);
      } else {
        expect(harness.terminateTeamRun).toHaveBeenCalledWith(runId);
      }

      await expect(read(studio)).resolves.toMatchObject({
        isActive: false,
        modelConfigEditability: { editable: true, reason: null },
      });
      await expect(update(studio)).resolves.toEqual({
        subject: subject === "AGENT" ? "GENERAL_AGENT" : "GENERAL_TEAM",
      });
      expect(generalUpdate).toHaveBeenCalledOnce();
      expect(generalUpdate).toHaveBeenCalledWith(updateInput);

      const address = binding.runtime.subject === "AGENT_RUN"
        ? { bindingId: binding.bindingId, target: { kind: "AGENT_RUN" as const } }
        : {
            bindingId: binding.bindingId,
            target: { kind: "AGENT_TEAM_MEMBER" as const, agentRunId: binding.runtime.members[0]!.agentRunId },
          };
      await expect(harness.host.sendRunInput(APPLICATION_ID, {
        address,
        input: { text: "must not dispatch" },
      })).rejects.toThrow("is not live");
    },
  );

  it("fails a stopped update closed when Application startup ownership recovery fails", async () => {
    const harness = await createHarness();
    const binding = await startSubject("AGENT", harness.host);
    if (binding.runtime.subject !== "AGENT_RUN") throw new Error("Agent binding fixture was expected.");

    const failedGate = new ApplicationOrchestrationStartupGate();
    const studio = harness.studioFor(failedGate);
    const pendingUpdate = studio.updateStoppedAgentRunModelConfig({
      agentRunId: binding.runtime.agentRunId,
      llmConfig: null,
    });
    await expect(failedGate.runStartupRecovery(async () => {
      throw new Error("startup recovery fixture failed");
    })).rejects.toThrow("startup recovery fixture failed");

    await expect(pendingUpdate).resolves.toMatchObject({
      success: false,
      outcome: "INTERNAL_ERROR",
      editability: { editable: false, reason: "INTERNAL_ERROR" },
      canonical: { runId: binding.runtime.agentRunId },
    });
    expect(harness.generalAgentUpdate).not.toHaveBeenCalled();
  });
});
