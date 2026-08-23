import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type {
  ApplicationBundle,
} from "../../../src/application-bundles/domain/models.js";
import type {
  ApplicationExecutionResourceRef,
  ApplicationExecutionResourceSummary,
  ApplicationAgentBinding,
  ApplicationAgentTeamBinding,
} from "@autobyteus/application-sdk-contracts";
import { ApplicationStorageLifecycleService } from "../../../src/application-storage/services/application-storage-lifecycle-service.js";
import { ApplicationPlatformStateStore } from "../../../src/application-storage/stores/application-platform-state-store.js";
import { ApplicationOrchestrationHostService } from "../../../src/application-orchestration/services/application-orchestration-host-service.js";
import { ApplicationRunBindingLaunchService } from "../../../src/application-orchestration/services/application-run-binding-launch-service.js";
import { ApplicationCurrentModelSelectionPolicy } from "../../../src/application-platform/launch-configuration/application-current-model-selection-policy.js";
import { ApplicationRunBindingLifecycleHub } from "../../../src/application-orchestration/services/application-run-binding-lifecycle-hub.js";
import { ApplicationRunBindingTerminalTransitionService } from "../../../src/application-orchestration/services/application-run-binding-terminal-transition-service.js";
import { ApplicationAgentTargetAuthorizationService } from "../../../src/application-orchestration/services/application-agent-target-authorization-service.js";
import { ApplicationExecutionEventJournalStore } from "../../../src/application-orchestration/stores/application-execution-event-journal-store.js";
import { ApplicationRunBindingStore } from "../../../src/application-orchestration/stores/application-run-binding-store.js";
import { ApplicationRunLookupStore } from "../../../src/application-orchestration/stores/application-run-lookup-store.js";
import { createApplicationEngineTestRuntime } from "./application-engine-test-runtime.js";

const APPLICATION_ID = "built-in:applications__context-capability-app";
const REMOVED_CORRELATION_PROPERTY = ["binding", "Intent", "Id"].join("");
const REMOVED_CORRELATION_COLUMN = ["binding", "intent", "id"].join("_");
const REMOVED_PENDING_TABLE = ["pending", "binding", "intents"].join("_");
const AGENT_RESOURCE_REF = {
  source: "bundle",
  kind: "AGENT",
  localId: "sample-agent",
} as const satisfies ApplicationExecutionResourceRef;
const TEAM_RESOURCE_REF = {
  source: "bundle",
  kind: "AGENT_TEAM",
  localId: "sample-team",
} as const satisfies ApplicationExecutionResourceRef;

const AGENT_RESOURCE: ApplicationExecutionResourceSummary = {
  source: "bundle",
  kind: "AGENT",
  localId: "sample-agent",
  definitionId: "agent-def-1",
  name: "Sample Agent",
  applicationId: APPLICATION_ID,
};
const TEAM_RESOURCE: ApplicationExecutionResourceSummary = {
  source: "bundle",
  kind: "AGENT_TEAM",
  localId: "sample-team",
  definitionId: "team-def-1",
  name: "Sample Team",
  applicationId: APPLICATION_ID,
};

const applyMigrations = async (databasePath: string, migrationsDirectory: string): Promise<void> => {
  const db = new DatabaseSync(databasePath);
  try {
    const migrationFiles = (await fs.readdir(migrationsDirectory))
      .filter((entry) => entry.endsWith(".sql"))
      .sort((left, right) => left.localeCompare(right));
    for (const migrationFile of migrationFiles) {
      db.exec(await fs.readFile(path.join(migrationsDirectory, migrationFile), "utf8"));
    }
  } finally {
    db.close();
  }
};

const readColumnNames = (db: DatabaseSync, tableName: string): string[] =>
  (db.prepare(`PRAGMA table_info(${tableName})`).all() as Array<{ name: string }>).map((column) => column.name);

const readTableNames = (db: DatabaseSync): string[] =>
  (db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name").all() as Array<{ name: string }>)
    .map((table) => table.name);

const createBundle = (applicationRootPath: string): ApplicationBundle => ({
  id: APPLICATION_ID,
  localApplicationId: "context-capability-app",
  packageId: "built-in:applications",
  name: "Context Capability App",
  description: "Exercises every application backend context capability",
  iconAssetPath: null,
  entryHtmlAssetPath: "/application-bundles/context-capability-app/assets/ui/index.html",
  runtimeTarget: {
    kind: "AGENT",
    localId: "sample-agent",
    definitionId: "agent-def-1",
  },
  writable: true,
  applicationRootPath,
  packageRootPath: path.dirname(path.dirname(applicationRootPath)),
  localAgentIds: ["sample-agent"],
  localTeamIds: ["sample-team"],
  entryHtmlRelativePath: "ui/index.html",
  iconRelativePath: null,
  backend: {
    manifestPath: path.join(applicationRootPath, "backend", "bundle.json"),
    manifestRelativePath: "backend/bundle.json",
    entryModulePath: path.join(applicationRootPath, "backend", "dist", "entry.mjs"),
    entryModuleRelativePath: "backend/dist/entry.mjs",
    moduleFormat: "esm",
    distribution: "self-contained",
    targetRuntime: { engine: "node", semver: ">=22 <23" },
    sdkCompatibility: {
      backendDefinitionContractVersion: "6",
      frontendSdkContractVersion: "6",
    },
    supportedExposures: {
      queries: false,
      commands: true,
      routes: false,
      graphql: false,
      notifications: false,
      eventHandlers: false,
      webSockets: false,
    },
    migrationsDirPath: null,
    migrationsDirRelativePath: null,
    assetsDirPath: null,
    assetsDirRelativePath: null,
  },
});

const writeCapabilityBackend = async (applicationRootPath: string): Promise<void> => {
  await fs.mkdir(path.join(applicationRootPath, "backend", "dist"), { recursive: true });
  await fs.mkdir(path.join(applicationRootPath, "ui"), { recursive: true });
  await fs.writeFile(path.join(applicationRootPath, "ui", "index.html"), "<!doctype html><html></html>", "utf8");
  await fs.writeFile(
    path.join(applicationRootPath, "backend", "dist", "entry.mjs"),
    `import { DatabaseSync } from 'node:sqlite'

export default {
  definitionContractVersion: '6',
  commands: {
    'capabilities.exercise': async (_input, context) => {
      const resources = await context.agentResources.listAvailable({ source: 'bundle' })
      const configured = await context.agentResources.requireRunnable('primaryAgent')

      const agent = await context.agentExecution.startAgent({
        launchRequestId: 'agent-launch-request-1',
        executionResourceRef: { source: 'bundle', kind: 'AGENT', localId: 'sample-agent' },
        launch: {
          kind: 'AGENT',
          workspaceRootPath: context.storage.runtimePath,
          llmModelIdentifier: 'gpt-test',
          autoExecuteTools: true,
        },
        initialInput: {
          text: 'agent initial input',
          metadata: { phase: 'initial-agent' },
        },
      })

      const team = await context.agentExecution.startAgentTeam({
        launchRequestId: 'team-launch-request-1',
        executionResourceRef: { source: 'bundle', kind: 'AGENT_TEAM', localId: 'sample-team' },
        launch: {
          kind: 'AGENT_TEAM',
          mode: 'memberConfigs',
          memberConfigs: [{
            memberAddress: '/researcher',
            llmModelIdentifier: 'gpt-test',
            autoExecuteTools: true,
            skillAccessMode: 'PRELOADED_ONLY',
            workspaceRootPath: context.storage.runtimePath,
          }],
        },
        initialInput: {
          text: 'team initial input',
          targetMemberAddress: '/researcher',
          metadata: { phase: 'initial-team' },
        },
      })

      const teamAddress = {
        bindingId: team.bindingId,
        target: { kind: 'AGENT_TEAM_MEMBER', agentRunId: team.runtime.members[0].agentRunId },
      }
      const sent = await context.agentExecution.sendInput({
        address: teamAddress,
        input: {
          text: 'team follow-up input',
          contextFiles: [{
            uri: 'file:///tmp/context.md',
            fileType: 'markdown',
            fileName: 'context.md',
            metadata: { source: 'fixture' },
          }],
          metadata: { phase: 'follow-up' },
        },
      })
      const observedEvents = []
      let observerCallbackBeforeSubscribeResolved = false
      let subscribeResolved = false
      const subscription = await context.agentExecution.subscribeEventStream(teamAddress, {
        onEvent(event) {
          if (!subscribeResolved) observerCallbackBeforeSubscribeResolved = true
          observedEvents.push(event)
        },
      })
      subscribeResolved = true
      for (let attempt = 0; attempt < 100 && observedEvents.length === 0; attempt += 1) {
        await new Promise((resolve) => setTimeout(resolve, 5))
      }
      await subscription.unsubscribe()
      const fetched = await context.agentExecution.get(agent.bindingId)
      const missing = await context.agentExecution.get('missing-binding')
      const listed = await context.agentExecution.list({ status: 'ATTACHED' })
      const found = await context.agentExecution.findByLaunchRequestId('team-launch-request-1')
      const notFound = await context.agentExecution.findByLaunchRequestId('missing-launch-request')
      const artifacts = await context.publishedArtifacts.list(agent.runtime.agentRunId)
      const revision = await context.publishedArtifacts.readRevision({
        runId: agent.runtime.agentRunId,
        revisionId: 'revision-1',
      })

      const recoveryDb = new DatabaseSync(context.storage.appDatabasePath)
      try {
        recoveryDb.exec(\`
          CREATE TABLE recovery_objects (
            object_id TEXT PRIMARY KEY,
            binding_id TEXT
          );
          CREATE TABLE pending_launch_requests (
            launch_request_id TEXT PRIMARY KEY,
            object_id TEXT NOT NULL,
            status TEXT NOT NULL,
            binding_id TEXT
          );
        \`)
        recoveryDb.prepare('INSERT INTO recovery_objects (object_id, binding_id) VALUES (?, NULL)')
          .run('object-1')
        recoveryDb.prepare(
          "INSERT INTO pending_launch_requests (launch_request_id, object_id, status, binding_id) VALUES (?, ?, 'PENDING_START', NULL)"
        ).run('recovery-launch-request-1', 'object-1')
      } finally {
        recoveryDb.close()
      }

      let recoveryLaunchFailure = null
      let recovered = null
      try {
        await context.agentExecution.startAgentTeam({
          launchRequestId: 'recovery-launch-request-1',
          executionResourceRef: { source: 'bundle', kind: 'AGENT_TEAM', localId: 'sample-team' },
          launch: {
            kind: 'AGENT_TEAM',
            mode: 'memberConfigs',
            memberConfigs: [{
              memberAddress: '/researcher',
              llmModelIdentifier: 'gpt-test',
              autoExecuteTools: true,
              skillAccessMode: 'PRELOADED_ONLY',
              workspaceRootPath: context.storage.runtimePath,
            }],
          },
        })
        throw new Error('Expected the simulated post-persist launch handoff failure.')
      } catch (error) {
        recoveryLaunchFailure = error instanceof Error ? error.message : String(error)
        recovered = await context.agentExecution.findByLaunchRequestId('recovery-launch-request-1')
        if (!recovered) {
          throw error
        }
        const db = new DatabaseSync(context.storage.appDatabasePath)
        try {
          db.exec('BEGIN IMMEDIATE')
          db.prepare('UPDATE recovery_objects SET binding_id = ? WHERE object_id = ?')
            .run(recovered.bindingId, 'object-1')
          db.prepare(
            "UPDATE pending_launch_requests SET status = 'COMMITTED', binding_id = ? WHERE launch_request_id = ?"
          ).run(recovered.bindingId, 'recovery-launch-request-1')
          db.exec('COMMIT')
        } catch (dbError) {
          try { db.exec('ROLLBACK') } catch {}
          throw dbError
        } finally {
          db.close()
        }
      }

      const recoveryStateDb = new DatabaseSync(context.storage.appDatabasePath)
      let recoveryState
      try {
        recoveryState = recoveryStateDb.prepare(\`
          SELECT p.status,
                 p.binding_id AS pendingBindingId,
                 o.binding_id AS objectBindingId
            FROM pending_launch_requests p
            JOIN recovery_objects o ON o.object_id = p.object_id
           WHERE p.launch_request_id = ?
        \`).get('recovery-launch-request-1')
      } finally {
        recoveryStateDb.close()
      }

      const terminatedAgent = await context.agentExecution.terminate(agent.bindingId)
      const terminatedTeam = await context.agentExecution.terminate(team.bindingId)

      return {
        requestContext: context.requestContext,
        resources,
        configured,
        agent,
        team,
        sent,
        observedEvents,
        observerCallbackBeforeSubscribeResolved,
        fetched,
        missing,
        listed,
        found,
        notFound,
        artifacts,
        revision,
        recoveryLaunchFailure,
        recovered,
        recoveryState,
        terminatedAgent,
        terminatedTeam,
      }
    },
  },
}\n`,
    "utf8",
  );
};

describe("Application context capability integration", () => {
  let tempRoot: string;
  let applicationRootPath: string;
  let engineRuntime: ReturnType<typeof createApplicationEngineTestRuntime> | null;

  beforeEach(async () => {
    tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "autobyteus-context-capabilities-"));
    applicationRootPath = path.join(tempRoot, "bundle", "applications", "context-capability-app");
    engineRuntime = null;
    await writeCapabilityBackend(applicationRootPath);
  });

  afterEach(async () => {
    if (engineRuntime) {
      await engineRuntime.engineLauncher.stop(APPLICATION_ID);
      engineRuntime.backendGateway.dispose();
    }
    await fs.rm(tempRoot, { recursive: true, force: true });
  });

  it("executes all named capabilities and both explicit starts through the real worker/host boundary", async () => {
    const bundle = createBundle(applicationRootPath);
    const bundleService = {
      getApplicationById: vi.fn(async (applicationId: string) => applicationId === APPLICATION_ID ? bundle : null),
    };
    const storageLifecycleService = new ApplicationStorageLifecycleService({
      appConfig: { getAppDataDir: () => tempRoot } as never,
      applicationBundleService: bundleService as never,
    });
    const platformStateStore = new ApplicationPlatformStateStore({
      appConfig: { getAppDataDir: () => tempRoot } as never,
      storageLifecycleService,
    });
    const bindingStore = new ApplicationRunBindingStore({ platformStateStore });
    const journalStore = new ApplicationExecutionEventJournalStore({ platformStateStore });
    const lookupStore = new ApplicationRunLookupStore();

    const resources = [AGENT_RESOURCE, TEAM_RESOURCE];
    const executionResourceResolver = {
      listAvailableExecutionResources: vi.fn(async (
        _applicationId: string,
        filter?: { source?: "bundle" | "shared" | null; kind?: "AGENT" | "AGENT_TEAM" | null } | null,
      ) => resources.filter((resource) => (
        (!filter?.source || resource.source === filter.source)
        && (!filter?.kind || resource.kind === filter.kind)
      ))),
      resolveExecutionResource: vi.fn(async (
        _applicationId: string,
        executionResourceRef: ApplicationExecutionResourceRef,
      ) => {
        const resource = resources.find((candidate) => (
          candidate.source === executionResourceRef.source
          && candidate.kind === executionResourceRef.kind
          && candidate.localId === (executionResourceRef.source === "bundle" ? executionResourceRef.localId : null)
        ));
        if (!resource) {
          throw new Error("Execution resource fixture was not found.");
        }
        return resource;
      }),
    };

    const agentPostUserMessage = vi.fn(async () => ({ accepted: true }));
    const teamPostMessage = vi.fn(async () => ({ accepted: true }));
    const agentRunService = {
      createAgentRun: vi.fn(async () => ({ runId: "agent-run-1" })),
      resolveAgentRun: vi.fn(async (runId: string) => runId === "agent-run-1" ? { postUserMessage: agentPostUserMessage } : null),
      terminateAgentRun: vi.fn(async () => undefined),
    };
    let teamRunCount = 0;
    const teamRunService = {
      allocateTeamRunId: vi.fn(async () => `team-run-${teamRunCount + 1}`),
      createTeamRun: vi.fn(async ({
        teamRunId,
        memberConfigs,
      }: {
        teamRunId: string;
        memberConfigs: Array<{ memberAddress: string }>;
      }) => {
        teamRunCount += 1;
        return {
          teamRunId,
          getExecutionTreeSnapshot: () => ({
            rootTeam: {
              kind: "configured_team",
              address: "/",
              members: memberConfigs.map((memberConfig) => ({
                kind: "configured_agent",
                address: memberConfig.memberAddress,
                agentRunId: `${teamRunId}::researcher`,
              })),
            },
          }),
        };
      }),
      resolveActiveTeamRun: vi.fn(async (runId: string) => runId === "team-run-1" ? { postMessage: teamPostMessage } : null),
      terminateTeamRun: vi.fn(async () => undefined),
    };
    const runBindingLaunchService = new ApplicationRunBindingLaunchService({
      executionResourceResolver: executionResourceResolver as never,
      bindingStore,
      lookupStore,
      agentRunService: agentRunService as never,
      teamRunService: teamRunService as never,
      agentDefinitionService: {
        getAgentDefinitionById: vi.fn(async (definitionId: string) => ({ id: definitionId, name: "Sample Agent" })),
      } as never,
      currentModelSelectionPolicy: new ApplicationCurrentModelSelectionPolicy({
        requireCurrentAutoByteusModelIdentifier: async () => undefined,
      }),
    });

    let journalSequence = 0;
    const ingressService = {
      appendBindingLifecycleEvent: vi.fn(async (input: {
        family: "RUN_TERMINATED";
        binding: ApplicationAgentBinding | ApplicationAgentTeamBinding;
        payload: unknown;
      }) => journalStore.appendEventAwaitable(input.binding.applicationId, {
        eventId: `termination-${++journalSequence}`,
        applicationId: input.binding.applicationId,
        family: input.family,
        publishedAt: new Date().toISOString(),
        binding: input.binding,
        producer: null,
        payload: input.payload,
      })),
    };
    const artifactSummary = {
      id: "agent-run-1:result.md",
      runId: "agent-run-1",
      path: "result.md",
      type: "file" as const,
      status: "available" as const,
      description: "Deterministic fixture artifact",
      revisionId: "revision-1",
      createdAt: "2026-07-20T10:00:00.000Z",
      updatedAt: "2026-07-20T10:00:00.000Z",
    };
    const publishedArtifactProjectionService = {
      getRunPublishedArtifacts: vi.fn(async () => [artifactSummary]),
      getPublishedArtifactRevisionText: vi.fn(async () => "# deterministic revision"),
    };
    const startupGate = { awaitReady: vi.fn(async () => undefined) };
    const availabilityService = { requireApplicationActive: vi.fn(async () => undefined) };
    const lifecycleHub = new ApplicationRunBindingLifecycleHub();
    const terminalTransitionService = new ApplicationRunBindingTerminalTransitionService({
      bindingStore,
      lookupStore,
      ingressService: ingressService as never,
      lifecycleHub,
    });
    const agentTargetAuthorizationService = new ApplicationAgentTargetAuthorizationService({
      startupGate: startupGate as never,
      availabilityService: availabilityService as never,
      bindingStore,
      lifecycleHub,
    });
    const orchestrationHostService = new ApplicationOrchestrationHostService({
      startupGate: startupGate as never,
      availabilityService: availabilityService as never,
      executionResourceResolver: executionResourceResolver as never,
      launchConfigurationService: {
        requireRunnableConfiguration: vi.fn(async (_applicationId: string, slotKey: string) => ({
          slotKey,
          executionResourceRef: AGENT_RESOURCE_REF,
          resourceDefinitionId: AGENT_RESOURCE.definitionId,
          resourceKind: "AGENT",
          leaves: [{
            memberRouteKey: null,
            memberName: "Sample Agent",
            agentDefinitionId: AGENT_RESOURCE.definitionId,
            runtimeKind: "autobyteus",
            llmModelIdentifier: "gpt-test",
            llmConfig: null,
            workspaceRootPath: tempRoot,
            provenance: {
              runtimeKind: {
                kind: "PACKAGE_AGENT_DEFAULT",
                agentDefinitionId: AGENT_RESOURCE.definitionId,
              },
              llmModelIdentifier: {
                kind: "PACKAGE_AGENT_DEFAULT",
                agentDefinitionId: AGENT_RESOURCE.definitionId,
              },
              llmConfig: null,
              workspaceRootPath: "APPLICATION_RUNTIME",
            },
          }],
        })),
      } as never,
      runBindingLaunchService,
      bindingStore,
      lookupStore,
      runObserverService: {
        attachBinding: vi.fn(async (binding: ApplicationAgentBinding | ApplicationAgentTeamBinding) => {
          if (binding.launchRequestId === "recovery-launch-request-1") {
            throw new Error("simulated post-persist launch handoff failure");
          }
          return true;
        }),
        detachBinding: vi.fn(async () => undefined),
      } as never,
      agentRunService: agentRunService as never,
      teamRunService: teamRunService as never,
      teamRunMetadataService: { readMetadata: vi.fn(async () => null) } as never,
      ingressService: ingressService as never,
      publishedArtifactProjectionService: publishedArtifactProjectionService as never,
      memoryLocationService: {
        resolveTeamMemberLocationFromMetadata: vi.fn(() => null),
      } as never,
      agentTargetAuthorizationService,
      terminalTransitionService,
    });

    engineRuntime = createApplicationEngineTestRuntime({
      applicationBundleService: bundleService as never,
      storageLifecycleService,
      orchestrationHostService,
      agentStreamingService: {
        subscribe: vi.fn(async (input: {
          applicationId: string;
          subscriptionId: string;
          address: { bindingId: string; target: { kind: string; agentRunId?: string } };
          emitter: { emitEvent: (event: unknown) => Promise<void> };
        }) => {
          await input.emitter.emitEvent({
            sequence: 1,
            observedAt: "2026-07-21T10:00:00.000Z",
            applicationId: input.applicationId,
            address: input.address,
            runtimeSubject: "TEAM_RUN",
            producer: {
              agentRunId: "team-run-1::researcher",
              runtimeKind: "AGENT_TEAM_MEMBER",
              displayName: "researcher",
            },
            event: { type: "TURN_STARTED" },
          });
          return { subscriptionId: input.subscriptionId };
        }),
        unsubscribe: vi.fn(async () => undefined),
        stopApplication: vi.fn(),
      } as never,
    });

    const result = await engineRuntime.backendGateway.invokeApplicationCommand(
      APPLICATION_ID,
      "capabilities.exercise",
      { applicationId: APPLICATION_ID },
      null,
    ) as {
      requestContext: { applicationId: string };
      resources: ApplicationExecutionResourceSummary[];
      configured: { slotKey: string; executionResourceRef: ApplicationExecutionResourceRef };
      agent: ApplicationAgentBinding | ApplicationAgentTeamBinding;
      team: ApplicationAgentBinding | ApplicationAgentTeamBinding;
      sent: ApplicationAgentBinding | ApplicationAgentTeamBinding;
      observedEvents: Array<{
        sequence: number;
        applicationId: string;
        address: { bindingId: string; target: { kind: string; agentRunId?: string } };
        runtimeSubject: string;
        producer: unknown;
        event: { type: string };
      }>;
      observerCallbackBeforeSubscribeResolved: boolean;
      fetched: ApplicationAgentBinding | ApplicationAgentTeamBinding | null;
      missing: ApplicationAgentBinding | ApplicationAgentTeamBinding | null;
      listed: Array<ApplicationAgentBinding | ApplicationAgentTeamBinding>;
      found: ApplicationAgentBinding | ApplicationAgentTeamBinding | null;
      notFound: ApplicationAgentBinding | ApplicationAgentTeamBinding | null;
      artifacts: typeof artifactSummary[];
      revision: string | null;
      recoveryLaunchFailure: string | null;
      recovered: ApplicationAgentBinding | ApplicationAgentTeamBinding | null;
      recoveryState: {
        status: string;
        pendingBindingId: string;
        objectBindingId: string;
      };
      terminatedAgent: ApplicationAgentBinding | ApplicationAgentTeamBinding | null;
      terminatedTeam: ApplicationAgentBinding | ApplicationAgentTeamBinding | null;
    };

    expect(result.requestContext).toEqual({ applicationId: APPLICATION_ID });
    expect(result.resources).toEqual(resources);
    expect(result.configured).toMatchObject({
      slotKey: "primaryAgent",
      executionResourceRef: AGENT_RESOURCE_REF,
    });
    expect(result.agent).toMatchObject({
      applicationId: APPLICATION_ID,
      launchRequestId: "agent-launch-request-1",
      status: "ATTACHED",
      runtime: { subject: "AGENT_RUN", agentRunId: "agent-run-1" },
    });
    expect(result.team).toMatchObject({
      applicationId: APPLICATION_ID,
      launchRequestId: "team-launch-request-1",
      status: "ATTACHED",
      runtime: {
        subject: "TEAM_RUN",
        teamRunId: "team-run-1",
        members: [expect.objectContaining({ memberAddress: "/researcher", agentRunId: "team-run-1::researcher" })],
      },
    });
    expect(result.sent.bindingId).toBe(result.team.bindingId);
    expect(result.observerCallbackBeforeSubscribeResolved).toBe(false);
    expect(result.observedEvents).toEqual([{
      sequence: 1,
      observedAt: "2026-07-21T10:00:00.000Z",
      applicationId: APPLICATION_ID,
      address: {
        bindingId: result.team.bindingId,
        target: { kind: "AGENT_TEAM_MEMBER", agentRunId: "team-run-1::researcher" },
      },
      runtimeSubject: "TEAM_RUN",
      producer: {
        agentRunId: "team-run-1::researcher",
        runtimeKind: "AGENT_TEAM_MEMBER",
        displayName: "researcher",
      },
      event: { type: "TURN_STARTED" },
    }]);
    expect(result.fetched?.bindingId).toBe(result.agent.bindingId);
    expect(result.missing).toBeNull();
    expect(result.listed).toHaveLength(2);
    expect(result.listed.map((binding) => binding.launchRequestId).sort()).toEqual([
      "agent-launch-request-1",
      "team-launch-request-1",
    ]);
    expect(result.found?.bindingId).toBe(result.team.bindingId);
    expect(result.notFound).toBeNull();
    expect(result.artifacts).toEqual([artifactSummary]);
    expect(result.revision).toBe("# deterministic revision");
    expect(result.recoveryLaunchFailure).toBe("simulated post-persist launch handoff failure");
    expect(result.recovered).toMatchObject({
      launchRequestId: "recovery-launch-request-1",
      runtime: { subject: "TEAM_RUN", teamRunId: "team-run-2" },
    });
    expect(result.recoveryState).toEqual({
      status: "COMMITTED",
      pendingBindingId: result.recovered?.bindingId,
      objectBindingId: result.recovered?.bindingId,
    });
    expect(result.terminatedAgent).toMatchObject({ status: "TERMINATED", terminatedAt: expect.any(String) });
    expect(result.terminatedTeam).toMatchObject({ status: "TERMINATED", terminatedAt: expect.any(String) });

    expect(agentRunService.createAgentRun).toHaveBeenCalledWith(expect.objectContaining({
      agentDefinitionId: "agent-def-1",
      llmModelIdentifier: "gpt-test",
      applicationBinding: expect.objectContaining({ applicationId: APPLICATION_ID }),
    }));
    expect(teamRunService.createTeamRun).toHaveBeenCalledTimes(2);
    expect(agentPostUserMessage).toHaveBeenCalledWith(expect.objectContaining({
      content: "agent initial input",
      metadata: { phase: "initial-agent" },
    }));
    expect(teamPostMessage).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ content: "team initial input", metadata: { phase: "initial-team" } }),
      "team-run-1::researcher",
    );
    expect(teamPostMessage).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        content: "team follow-up input",
        contextFiles: [expect.objectContaining({
          uri: "file:///tmp/context.md",
          fileType: "markdown",
          fileName: "context.md",
          metadata: { source: "fixture" },
        })],
        metadata: { phase: "follow-up" },
      }),
      "team-run-1::researcher",
    );
    expect(agentRunService.terminateAgentRun).toHaveBeenCalledWith("agent-run-1");
    expect(teamRunService.terminateTeamRun).toHaveBeenCalledWith("team-run-1");
    expect(publishedArtifactProjectionService.getRunPublishedArtifacts).toHaveBeenCalledWith("agent-run-1");
    expect(publishedArtifactProjectionService.getPublishedArtifactRevisionText).toHaveBeenCalledWith({
      runId: "agent-run-1",
      revisionId: "revision-1",
    });

    const layout = storageLifecycleService.getStorageLayout(APPLICATION_ID);
    await storageLifecycleService.ensureStoragePrepared(APPLICATION_ID);
    const platformDb = new DatabaseSync(layout.platformDatabasePath);
    try {
      const bindingColumns = readColumnNames(platformDb, "__autobyteus_run_bindings");
      expect(bindingColumns).toContain("launch_request_id");
      expect(bindingColumns).not.toContain(REMOVED_CORRELATION_COLUMN);
      const bindingIndexRows = platformDb
        .prepare("PRAGMA index_info(__autobyteus_run_bindings_by_launch_request_id)")
        .all() as Array<{ name: string }>;
      const bindingIndexColumns = bindingIndexRows.map((column) => column.name);
      expect(bindingIndexColumns).toEqual(["launch_request_id"]);

      const bindingRows = platformDb.prepare(
        "SELECT launch_request_id, summary_json FROM __autobyteus_run_bindings ORDER BY launch_request_id",
      ).all() as Array<{ launch_request_id: string; summary_json: string }>;
      expect(bindingRows.map((row) => row.launch_request_id)).toEqual([
        "agent-launch-request-1",
        "recovery-launch-request-1",
        "team-launch-request-1",
      ]);
      for (const row of bindingRows) {
        expect(JSON.parse(row.summary_json)).toMatchObject({ launchRequestId: row.launch_request_id });
        expect(row.summary_json).not.toContain(REMOVED_CORRELATION_PROPERTY);
      }

      const journalColumns = readColumnNames(platformDb, "__autobyteus_execution_event_journal");
      expect(journalColumns).toContain("launch_request_id");
      expect(journalColumns).toContain("binding_json");
      expect(journalColumns).not.toContain(REMOVED_CORRELATION_COLUMN);
      const journalRows = platformDb.prepare(
        "SELECT launch_request_id, binding_json FROM __autobyteus_execution_event_journal ORDER BY journal_sequence",
      ).all() as Array<{ launch_request_id: string; binding_json: string }>;
      expect(journalRows.map((row) => row.launch_request_id)).toEqual([
        "agent-launch-request-1",
        "team-launch-request-1",
      ]);
      for (const row of journalRows) {
        expect(JSON.parse(row.binding_json)).toMatchObject({
          launchRequestId: row.launch_request_id,
          status: "TERMINATED",
        });
        expect(row.binding_json).not.toContain(REMOVED_CORRELATION_PROPERTY);
      }

      const schemaVersion = platformDb.prepare(
        "SELECT meta_value FROM __autobyteus_storage_meta WHERE meta_key = 'schema_version'",
      ).get() as { meta_value: string };
      expect(schemaVersion.meta_value).toBe("1");
    } finally {
      platformDb.close();
    }
  }, 20_000);

  it("creates only canonical launch-request tables and columns from both built-in fresh baselines", async () => {
    const repoRoot = path.resolve(process.cwd(), "..");
    const cases = [
      {
        name: "Brief Studio",
        migrationsDirectory: path.join(repoRoot, "applications", "brief-studio", "backend-src", "migrations"),
        additionalTable: "brief_bindings",
      },
      {
        name: "Socratic Math Teacher",
        migrationsDirectory: path.join(repoRoot, "applications", "socratic-math-teacher", "backend-src", "migrations"),
        additionalTable: null,
      },
    ];

    for (const fixture of cases) {
      const databasePath = path.join(tempRoot, `${fixture.name.replaceAll(" ", "-").toLowerCase()}.sqlite`);
      await applyMigrations(databasePath, fixture.migrationsDirectory);
      const db = new DatabaseSync(databasePath);
      try {
        const tables = readTableNames(db);
        expect(tables, fixture.name).toContain("pending_launch_requests");
        expect(tables, fixture.name).not.toContain(REMOVED_PENDING_TABLE);

        const pendingColumns = readColumnNames(db, "pending_launch_requests");
        expect(pendingColumns, fixture.name).toContain("launch_request_id");
        expect(pendingColumns, fixture.name).not.toContain(REMOVED_CORRELATION_COLUMN);

        if (fixture.additionalTable) {
          const bindingColumns = readColumnNames(db, fixture.additionalTable);
          expect(bindingColumns, fixture.name).toContain("launch_request_id");
          expect(bindingColumns, fixture.name).not.toContain(REMOVED_CORRELATION_COLUMN);
        }
      } finally {
        db.close();
      }

      const migrationFiles = await fs.readdir(fixture.migrationsDirectory);
      expect(migrationFiles.some((entry) => entry.includes("pending_launch_requests")), fixture.name).toBe(true);
      expect(migrationFiles.some((entry) => entry.includes("binding_intent")), fixture.name).toBe(false);
    }
  });
});
