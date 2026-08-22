import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { afterEach, describe, expect, it, vi } from "vitest";
import type {
  ApplicationExecutionEventEnvelope,
  ApplicationHandlerContext,
  ApplicationPublishedArtifactEvent,
  ApplicationAgentBinding,
  ApplicationAgentTeamBinding,
  ApplicationEffectiveLaunchConfiguration,
} from "@autobyteus/application-sdk-contracts";
import { createBriefRunLaunchService } from "../../../../applications/brief-studio/backend-src/services/brief-run-launch-service.ts";
import { createBriefArtifactReconciliationService } from "../../../../applications/brief-studio/backend-src/services/brief-artifact-reconciliation-service.ts";
import { createLessonRuntimeService } from "../../../../applications/socratic-math-teacher/backend-src/services/lesson-runtime-service.ts";
import { createLessonArtifactReconciliationService } from "../../../../applications/socratic-math-teacher/backend-src/services/lesson-artifact-reconciliation-service.ts";
import { projectLessonExecutionEvent } from "../../../../applications/socratic-math-teacher/backend-src/services/lesson-projection-service.ts";

const tempRoots: string[] = [];
type StartAgentTeamRequest = Parameters<ApplicationHandlerContext["agentExecution"]["startAgentTeam"]>[0];

const BRIEF_MIGRATIONS_DIR = path.resolve(
  process.cwd(),
  "..",
  "applications",
  "brief-studio",
  "backend-src",
  "migrations",
);

const SOCRATIC_MIGRATIONS_DIR = path.resolve(
  process.cwd(),
  "..",
  "applications",
  "socratic-math-teacher",
  "backend-src",
  "migrations",
);

type CapabilityOverrides = {
  startAgentTeam?: ApplicationHandlerContext["agentExecution"]["startAgentTeam"];
  get?: ApplicationHandlerContext["agentExecution"]["get"];
  findByLaunchRequestId?: ApplicationHandlerContext["agentExecution"]["findByLaunchRequestId"];
  listBindings?: ApplicationHandlerContext["agentExecution"]["list"];
  sendInput?: ApplicationHandlerContext["agentExecution"]["sendInput"];
  terminate?: ApplicationHandlerContext["agentExecution"]["terminate"];
  requireRunnable?: ApplicationHandlerContext["agentResources"]["requireRunnable"];
  listArtifacts?: ApplicationHandlerContext["publishedArtifacts"]["list"];
  readRevision?: ApplicationHandlerContext["publishedArtifacts"]["readRevision"];
};

const buildRunnableTeamConfiguration = (input: {
  slotKey: string;
  localId?: string;
  definitionId?: string;
  leaves: Array<{
    memberAddress: string;
    displayName: string;
    agentDefinitionId: string;
    runtimeKind: string;
    llmModelIdentifier: string;
    llmConfig?: Record<string, unknown> | null;
    workspaceRootPath: string;
  }>;
}): ApplicationEffectiveLaunchConfiguration => {
  const executionResourceRef = input.definitionId
    ? {
        source: "shared" as const,
        kind: "AGENT_TEAM" as const,
        definitionId: input.definitionId,
      }
    : {
        source: "bundle" as const,
        kind: "AGENT_TEAM" as const,
        localId: input.localId!,
      };
  return {
    slotKey: input.slotKey,
    executionResourceRef,
    resourceDefinitionId: input.definitionId ?? `bundle-team__${input.localId}`,
    resourceKind: "AGENT_TEAM",
    leaves: input.leaves.map((leaf) => ({
      ...leaf,
      llmConfig: leaf.llmConfig ?? null,
      provenance: {
        runtimeKind: { kind: "HOST_SLOT_OVERRIDE" },
        llmModelIdentifier: { kind: "HOST_SLOT_OVERRIDE" },
        llmConfig: leaf.llmConfig ? { kind: "HOST_SLOT_OVERRIDE" } : null,
        workspaceRootPath: "HOST_OVERRIDE",
      },
    })),
  };
};

const buildDefaultRunnableTeamConfiguration = (
  slotKey: string,
): ApplicationEffectiveLaunchConfiguration => {
  if (slotKey === "lessonTutorTeam") {
    return buildRunnableTeamConfiguration({
      slotKey,
      localId: "socratic-math-team",
      leaves: [{
        memberAddress: "/tutor",
        displayName: "Tutor",
        agentDefinitionId: "bundle-agent__tutor",
        runtimeKind: "autobyteus",
        llmModelIdentifier: "gpt-test",
        llmConfig: { reasoning_effort: "high" },
        workspaceRootPath: "/tmp/application-test-runtime",
      }],
    });
  }
  if (slotKey === "draftingTeam") {
    return buildRunnableTeamConfiguration({
      slotKey,
      localId: "brief-studio-team",
      leaves: [
        {
          memberAddress: "/researcher",
          displayName: "Researcher",
          agentDefinitionId: "bundle-agent__researcher",
          runtimeKind: "autobyteus",
          llmModelIdentifier: "gpt-test",
          workspaceRootPath: "/tmp/application-test-runtime",
        },
        {
          memberAddress: "/writer",
          displayName: "Writer",
          agentDefinitionId: "bundle-agent__writer",
          runtimeKind: "autobyteus",
          llmModelIdentifier: "gpt-test",
          workspaceRootPath: "/tmp/application-test-runtime",
        },
      ],
    });
  }
  throw new Error(`Unexpected application resource slot '${slotKey}'.`);
};

const buildCapabilities = (overrides: CapabilityOverrides = {}) => ({
  agentExecution: {
    startAgent: vi.fn(async () => {
      throw new Error("agentExecution.startAgent was not mocked for this test.");
    }),
    startAgentTeam: overrides.startAgentTeam ?? vi.fn(async () => {
      throw new Error("agentExecution.startAgentTeam was not mocked for this test.");
    }),
    get: overrides.get ?? vi.fn(async () => null),
    findByLaunchRequestId: overrides.findByLaunchRequestId ?? vi.fn(async () => null),
    list: overrides.listBindings ?? vi.fn(async () => []),
    sendInput: overrides.sendInput ?? vi.fn(async () => {
      throw new Error("agentExecution.sendInput was not mocked for this test.");
    }),
    subscribeEventStream: vi.fn(async () => {
      throw new Error("agentExecution.subscribeEventStream was not mocked for this test.");
    }),
    terminate: overrides.terminate ?? vi.fn(async () => null),
  },
  agentResources: {
    listAvailable: vi.fn(async () => []),
    requireRunnable: overrides.requireRunnable
      ?? vi.fn(async (slotKey: string) => buildDefaultRunnableTeamConfiguration(slotKey)),
  },
  publishedArtifacts: {
    list: overrides.listArtifacts ?? vi.fn(async () => []),
    readRevision: overrides.readRevision ?? vi.fn(async () => null),
  },
});

const createHandlerContext = (input: {
  appDatabasePath: string;
  capabilities?: ReturnType<typeof buildCapabilities>;
  publishNotification?: ApplicationHandlerContext["publishNotification"];
}): ApplicationHandlerContext => ({
  requestContext: {
    applicationId: "test-app",
  },
  storage: {
    rootPath: path.dirname(input.appDatabasePath),
    runtimePath: path.join(path.dirname(input.appDatabasePath), "runtime"),
    logsPath: path.join(path.dirname(input.appDatabasePath), "logs"),
    appDatabasePath: input.appDatabasePath,
    appDatabaseUrl: `file:${input.appDatabasePath}`,
    assetsPath: path.join(path.dirname(input.appDatabasePath), "assets"),
  },
  publishNotification: input.publishNotification ?? vi.fn(async () => undefined),
  ...(input.capabilities ?? buildCapabilities()),
});

const applyMigrations = async (dbPath: string, migrationsDir: string): Promise<void> => {
  const db = new DatabaseSync(dbPath);
  try {
    const migrationFiles = (await fs.readdir(migrationsDir))
      .filter((entry) => entry.endsWith(".sql"))
      .sort((left, right) => left.localeCompare(right));
    for (const migrationFile of migrationFiles) {
      db.exec(await fs.readFile(path.join(migrationsDir, migrationFile), "utf8"));
    }
  } finally {
    db.close();
  }
};

const createTempDatabase = async (prefix: string, migrationsDir: string): Promise<string> => {
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), prefix));
  tempRoots.push(tempRoot);
  const dbPath = path.join(tempRoot, "app.sqlite");
  await applyMigrations(dbPath, migrationsDir);
  return dbPath;
};

const seedActiveLesson = (dbPath: string, lessonId = "lesson-1"): void => {
  const db = new DatabaseSync(dbPath);
  try {
    db.prepare(
      `INSERT INTO lessons (
         lesson_id,
         prompt,
         status,
         latest_binding_id,
         latest_run_id,
         latest_binding_status,
         last_error_message,
         created_at,
         updated_at,
         closed_at
       ) VALUES (?, ?, 'active', ?, ?, 'ATTACHED', NULL, ?, ?, NULL)`,
    ).run(
      lessonId,
      "Solve 3x + 5 = 20",
      "binding-lesson-1",
      "team-run-lesson-1",
      "2026-07-22T12:00:00.000Z",
      "2026-07-22T12:00:00.000Z",
    );
  } finally {
    db.close();
  }
};

const buildBriefBinding = (launchRequestId: string): ApplicationAgentBinding | ApplicationAgentTeamBinding => ({
  bindingId: "binding-brief-1",
  applicationId: "brief-studio",
  launchRequestId,
  status: "ATTACHED",
  executionResourceRef: {
    source: "bundle",
    kind: "AGENT_TEAM",
    localId: "brief-studio-team",
  },
  runtime: {
    subject: "TEAM_RUN",
    teamRunId: "team-run-brief-1",
    definitionId: "brief-team-definition",
    members: [
      {
        memberAddress: "/researcher",
        displayName: "Researcher",
        agentRunId: "team-run-brief-1::researcher",
        runtimeKind: "AGENT_TEAM_MEMBER",
      },
      {
        memberAddress: "/writer",
        displayName: "Writer",
        agentRunId: "team-run-brief-1::writer",
        runtimeKind: "AGENT_TEAM_MEMBER",
      },
    ],
  },
  createdAt: "2026-04-19T12:00:00.000Z",
  updatedAt: "2026-04-19T12:00:00.000Z",
  terminatedAt: null,
  lastErrorMessage: null,
});

const buildLessonBinding = (
  launchRequestId: string,
  overrides: Partial<Pick<ApplicationAgentBinding | ApplicationAgentTeamBinding, "status" | "updatedAt" | "terminatedAt" | "lastErrorMessage">> = {},
): ApplicationAgentBinding | ApplicationAgentTeamBinding => ({
  bindingId: "binding-lesson-1",
  applicationId: "socratic-math-teacher",
  launchRequestId,
  status: overrides.status ?? "ATTACHED",
  executionResourceRef: {
    source: "bundle",
    kind: "AGENT_TEAM",
    localId: "socratic-math-team",
  },
  runtime: {
    subject: "TEAM_RUN",
    teamRunId: "team-run-lesson-1",
    definitionId: "socratic-team-definition",
    members: [
      {
        memberAddress: "/tutor",
        displayName: "Tutor",
        agentRunId: "team-run-lesson-1::tutor",
        runtimeKind: "AGENT_TEAM_MEMBER",
      },
    ],
  },
  createdAt: "2026-04-19T12:10:00.000Z",
  updatedAt: overrides.updatedAt ?? "2026-04-19T12:10:00.000Z",
  terminatedAt: overrides.terminatedAt ?? null,
  lastErrorMessage: overrides.lastErrorMessage ?? null,
});

const buildRevisionReader = (entries: Record<string, string>) => ({
  readRevision: vi.fn(async ({ revisionId }: { revisionId: string }) =>
    entries[revisionId] ?? null),
});

const buildBriefArtifactEvent = (
  binding: ApplicationAgentBinding | ApplicationAgentTeamBinding,
): ApplicationPublishedArtifactEvent => ({
  runId: "team-run-brief-1::researcher",
  artifactId: "team-run-brief-1::researcher:/tmp/downloads/brief-studio/research.md",
  revisionId: "brief-revision-1",
  path: "/tmp/downloads/brief-studio/research.md",
  description: "Audience and sources collected.",
  fileKind: "file",
  publishedAt: "2026-04-19T12:15:00.000Z",
  binding,
  producer: {
    agentRunId: "team-run-brief-1::researcher",
    displayName: "Researcher",
    runtimeKind: "AGENT_TEAM_MEMBER",
  },
});

const buildBriefFinalArtifactEvent = (
  binding: ApplicationAgentBinding | ApplicationAgentTeamBinding,
): ApplicationPublishedArtifactEvent => ({
  runId: "team-run-brief-1::writer",
  artifactId: "team-run-brief-1::writer:/tmp/downloads/final-brief.md",
  revisionId: "brief-revision-final-1",
  path: "/tmp/downloads/final-brief.md",
  description: "Final draft ready for review.",
  fileKind: "file",
  publishedAt: "2026-04-19T12:16:00.000Z",
  binding,
  producer: {
    agentRunId: "team-run-brief-1::writer",
    displayName: "Writer",
    runtimeKind: "AGENT_TEAM_MEMBER",
  },
});

const buildLessonArtifactEvent = (
  binding: ApplicationAgentBinding | ApplicationAgentTeamBinding,
): ApplicationPublishedArtifactEvent => ({
  runId: "team-run-lesson-1::tutor",
  artifactId: "team-run-lesson-1::tutor:/tmp/downloads/socratic-math/lesson-response.md",
  revisionId: "lesson-revision-1",
  path: "/tmp/downloads/socratic-math/lesson-response.md",
  description: "Try isolating x first.",
  fileKind: "file",
  publishedAt: "2026-04-19T12:25:00.000Z",
  binding,
  producer: {
    agentRunId: "team-run-lesson-1::tutor",
    displayName: "Tutor",
    runtimeKind: "AGENT_TEAM_MEMBER",
  },
});

const buildLessonHintArtifactEvent = (
  binding: ApplicationAgentBinding | ApplicationAgentTeamBinding,
): ApplicationPublishedArtifactEvent => ({
  runId: "team-run-lesson-1::tutor",
  artifactId: "team-run-lesson-1::tutor:/tmp/downloads/lesson-hint.md",
  revisionId: "lesson-hint-revision-1",
  path: "/tmp/downloads/lesson-hint.md",
  description: "A small hint for the next step.",
  fileKind: "file",
  publishedAt: "2026-04-19T12:26:00.000Z",
  binding,
  producer: {
    agentRunId: "team-run-lesson-1::tutor",
    displayName: "Tutor",
    runtimeKind: "AGENT_TEAM_MEMBER",
  },
});

const buildLessonLifecycleEnvelope = (
  binding: ApplicationAgentBinding | ApplicationAgentTeamBinding,
  family: "RUN_FAILED" | "RUN_STARTED" | "RUN_ORPHANED" | "RUN_TERMINATED",
): ApplicationExecutionEventEnvelope => ({
  event: {
    eventId: "lesson-lifecycle-event-1",
    journalSequence: 2,
    applicationId: binding.applicationId,
    family,
    publishedAt: "2026-04-19T12:26:00.000Z",
    binding,
    producer: null,
    payload: null,
  },
  delivery: {
    semantics: "AT_LEAST_ONCE",
    attemptNumber: 1,
    dispatchedAt: "2026-04-19T12:26:00.000Z",
  },
});

afterEach(async () => {
  await Promise.all(tempRoots.splice(0).map((tempRoot) => fs.rm(tempRoot, { recursive: true, force: true })));
});

describe("App-owned launchRequestId correlation", () => {
  it("fails Brief Studio launch before startAgentTeam when configured-resource readback rejects an invalid slot selection", async () => {
    const appDatabasePath = await createTempDatabase("autobyteus-brief-invalid-slot-", BRIEF_MIGRATIONS_DIR);
    const capabilities = buildCapabilities({
      requireRunnable: vi.fn(async () => {
        throw new Error(
          "Application execution resource slot 'draftingTeam' has invalid persisted override: Application execution resource slot 'draftingTeam' does not allow resource kind 'AGENT'.",
        );
      }),
      startAgentTeam: vi.fn(async () => buildBriefBinding("unused-launch-request")),
    });
    const context = createHandlerContext({
      appDatabasePath,
      capabilities,
    });

    const service = createBriefRunLaunchService(context);
    const createdBrief = await service.createBrief({ title: "Invalid Slot Brief" });

    await expect(
      service.launchDraftRun({
        briefId: createdBrief.briefId,
      }),
    ).rejects.toThrow("Application execution resource slot 'draftingTeam' has invalid persisted override");

    expect(capabilities.agentExecution.startAgentTeam).not.toHaveBeenCalled();
  });

  it("reconciles Brief Studio launch failures through findByLaunchRequestId", async () => {
    const appDatabasePath = await createTempDatabase("autobyteus-brief-launch-request-", BRIEF_MIGRATIONS_DIR);
    const capabilities = buildCapabilities({
      startAgentTeam: vi.fn(async () => {
        throw new Error("startAgentTeam failed after binding creation");
      }),
      findByLaunchRequestId: vi.fn(async (launchRequestId: string) => buildBriefBinding(launchRequestId)),
    });
    const context = createHandlerContext({
      appDatabasePath,
      capabilities,
    });

    const service = createBriefRunLaunchService(context);
    const createdBrief = await service.createBrief({ title: "Market Entry Brief" });

    await expect(
      service.launchDraftRun({
        briefId: createdBrief.briefId,
      }),
    ).rejects.toThrow("startAgentTeam failed after binding creation");

    expect(capabilities.agentExecution.startAgentTeam).toHaveBeenCalledWith(expect.objectContaining({
      launch: expect.objectContaining({
        kind: "AGENT_TEAM",
        mode: "memberConfigs",
        memberConfigs: expect.arrayContaining([
          expect.objectContaining({ memberAddress: "/researcher", llmModelIdentifier: "gpt-test" }),
          expect.objectContaining({ memberAddress: "/writer", llmModelIdentifier: "gpt-test" }),
        ]),
      }),
    }));

    const db = new DatabaseSync(appDatabasePath);
    try {
      const briefRow = db.prepare(
        `SELECT status, latest_binding_id, latest_run_id, latest_binding_status, last_error_message
           FROM briefs
          WHERE brief_id = ?`,
      ).get(createdBrief.briefId) as {
        status: string;
        latest_binding_id: string | null;
        latest_run_id: string | null;
        latest_binding_status: string | null;
        last_error_message: string | null;
      };
      const briefBindingRow = db.prepare(
        `SELECT brief_id, binding_id, run_id FROM brief_bindings LIMIT 1`,
      ).get() as { brief_id: string; binding_id: string; run_id: string };
      const pendingIntentRow = db.prepare(
        `SELECT status, binding_id, committed_at FROM pending_launch_requests LIMIT 1`,
      ).get() as { status: string; binding_id: string | null; committed_at: string | null };

      expect(capabilities.agentExecution.findByLaunchRequestId).toHaveBeenCalledOnce();
      expect(briefRow).toEqual({
        status: "blocked",
        latest_binding_id: "binding-brief-1",
        latest_run_id: "team-run-brief-1",
        latest_binding_status: "ATTACHED",
        last_error_message: "startAgentTeam failed after binding creation",
      });
      expect(briefBindingRow).toEqual({
        brief_id: createdBrief.briefId,
        binding_id: "binding-brief-1",
        run_id: "team-run-brief-1",
      });
      expect(pendingIntentRow).toMatchObject({
        status: "COMMITTED",
        binding_id: "binding-brief-1",
        committed_at: expect.any(String),
      });
    } finally {
      db.close();
    }
  });

  it("launches Brief Studio from host-saved launch profiles when no inline llmModelIdentifier is provided", async () => {
    const appDatabasePath = await createTempDatabase("autobyteus-brief-launch-defaults-", BRIEF_MIGRATIONS_DIR);
    const capabilities = buildCapabilities({
      requireRunnable: vi.fn(async () => buildRunnableTeamConfiguration({
        slotKey: "draftingTeam",
        definitionId: "shared-writing-team",
        leaves: [
          {
            memberAddress: "/researcher",
            displayName: "Researcher",
            agentDefinitionId: "bundle-agent__researcher",
            runtimeKind: "lmstudio",
            llmModelIdentifier: "qwen3.6-35b-a3b:lmstudio@127.0.0.1:1234",
            workspaceRootPath: "/tmp/brief-studio",
          },
          {
            memberAddress: "/writer",
            displayName: "Writer",
            agentDefinitionId: "bundle-agent__writer",
            runtimeKind: "lmstudio",
            llmModelIdentifier: "qwen3.6-35b-a3b:lmstudio@127.0.0.1:1234",
            workspaceRootPath: "/tmp/brief-studio",
          },
        ],
      })),
      startAgentTeam: vi.fn(async (input: StartAgentTeamRequest) => buildBriefBinding(input.launchRequestId)),
    });
    const context = createHandlerContext({
      appDatabasePath,
      capabilities,
    });

    const service = createBriefRunLaunchService(context);
    const createdBrief = await service.createBrief({ title: "Saved Setup Brief" });
    await service.launchDraftRun({
      briefId: createdBrief.briefId,
    });

    expect(capabilities.agentExecution.startAgentTeam).toHaveBeenCalledWith(expect.objectContaining({
      executionResourceRef: {
        source: "shared",
        kind: "AGENT_TEAM",
        definitionId: "shared-writing-team",
      },
      launch: expect.objectContaining({
        kind: "AGENT_TEAM",
        mode: "memberConfigs",
        memberConfigs: expect.arrayContaining([
          expect.objectContaining({
            memberAddress: "/researcher",
            runtimeKind: "lmstudio",
            llmModelIdentifier: "qwen3.6-35b-a3b:lmstudio@127.0.0.1:1234",
            workspaceRootPath: "/tmp/brief-studio",
            autoExecuteTools: true,
          }),
          expect.objectContaining({
            memberAddress: "/writer",
            runtimeKind: "lmstudio",
            llmModelIdentifier: "qwen3.6-35b-a3b:lmstudio@127.0.0.1:1234",
            workspaceRootPath: "/tmp/brief-studio",
            autoExecuteTools: true,
          }),
        ]),
      }),
    }));
  });

  it("launches Brief Studio from explicit per-member team profiles when defaults are null", async () => {
    const appDatabasePath = await createTempDatabase("autobyteus-brief-member-launch-configs-", BRIEF_MIGRATIONS_DIR);
    const capabilities = buildCapabilities({
      requireRunnable: vi.fn(async () => buildRunnableTeamConfiguration({
        slotKey: "draftingTeam",
        definitionId: "shared-writing-team",
        leaves: [
          {
            memberAddress: "/researcher",
            displayName: "Researcher",
            agentDefinitionId: "bundle-agent__researcher",
            runtimeKind: "autobyteus",
            llmModelIdentifier: "openai/gpt-5",
            workspaceRootPath: path.join(path.dirname(appDatabasePath), "runtime"),
          },
          {
            memberAddress: "/writer",
            displayName: "Writer",
            agentDefinitionId: "bundle-agent__writer",
            runtimeKind: "lmstudio",
            llmModelIdentifier: "qwen3.6-35b-a3b:lmstudio@127.0.0.1:1234",
            workspaceRootPath: path.join(path.dirname(appDatabasePath), "runtime"),
          },
        ],
      })),
      startAgentTeam: vi.fn(async (input: StartAgentTeamRequest) => buildBriefBinding(input.launchRequestId)),
    });
    const context = createHandlerContext({
      appDatabasePath,
      capabilities,
    });

    const service = createBriefRunLaunchService(context);
    const createdBrief = await service.createBrief({ title: "Explicit Member Setup Brief" });
    await service.launchDraftRun({
      briefId: createdBrief.briefId,
    });

    expect(capabilities.agentExecution.startAgentTeam).toHaveBeenCalledWith(expect.objectContaining({
      executionResourceRef: {
        source: "shared",
        kind: "AGENT_TEAM",
        definitionId: "shared-writing-team",
      },
      launch: expect.objectContaining({
        kind: "AGENT_TEAM",
        mode: "memberConfigs",
        memberConfigs: [
          expect.objectContaining({
            memberAddress: "/researcher",
            runtimeKind: "autobyteus",
            llmModelIdentifier: "openai/gpt-5",
            workspaceRootPath: context.storage.runtimePath,
            autoExecuteTools: true,
          }),
          expect.objectContaining({
            memberAddress: "/writer",
            runtimeKind: "lmstudio",
            llmModelIdentifier: "qwen3.6-35b-a3b:lmstudio@127.0.0.1:1234",
            workspaceRootPath: context.storage.runtimePath,
            autoExecuteTools: true,
          }),
        ],
      }),
    }));
  });

  it("reconciles Brief Studio early events through launchRequestId without event.executionRef", async () => {
    const appDatabasePath = await createTempDatabase("autobyteus-brief-event-launch-request-", BRIEF_MIGRATIONS_DIR);
    const artifactEvent = buildBriefArtifactEvent(buildBriefBinding("brief-pending-launch-request-1"));
    const context = createHandlerContext({
      appDatabasePath,
      capabilities: buildCapabilities(buildRevisionReader({
        [artifactEvent.revisionId]: "Research summary",
      })),
    });
    const launchService = createBriefRunLaunchService(context);
    const createdBrief = await launchService.createBrief({ title: "Strategy Brief" });

    const db = new DatabaseSync(appDatabasePath);
    try {
      db.prepare(
        `INSERT INTO pending_launch_requests (
           launch_request_id, brief_id, status, binding_id, created_at, updated_at, committed_at
         ) VALUES (?, ?, 'PENDING_START', NULL, ?, ?, NULL)`,
      ).run(
        "brief-pending-launch-request-1",
        createdBrief.briefId,
        "2026-04-19T12:14:00.000Z",
        "2026-04-19T12:14:00.000Z",
      );
    } finally {
      db.close();
    }

    await createBriefArtifactReconciliationService(context).handlePersistedArtifact(artifactEvent);

    const verifiedDb = new DatabaseSync(appDatabasePath);
    try {
      const briefRow = verifiedDb.prepare(
        `SELECT status, latest_binding_id, latest_run_id, latest_binding_status
           FROM briefs
          WHERE brief_id = ?`,
      ).get(createdBrief.briefId) as {
        status: string;
        latest_binding_id: string | null;
        latest_run_id: string | null;
        latest_binding_status: string | null;
      };
      const artifactCount = Number(
        (verifiedDb.prepare(`SELECT COUNT(*) AS count FROM brief_artifacts`).get() as { count: number }).count,
      );
      const artifactRow = verifiedDb.prepare(
        `SELECT path, publication_kind FROM brief_artifacts LIMIT 1`,
      ).get() as { path: string; publication_kind: string };
      const briefBindingCount = Number(
        (verifiedDb.prepare(`SELECT COUNT(*) AS count FROM brief_bindings`).get() as { count: number }).count,
      );
      const pendingIntentRow = verifiedDb.prepare(
        `SELECT status, binding_id FROM pending_launch_requests LIMIT 1`,
      ).get() as { status: string; binding_id: string | null };

      expect(briefRow).toEqual({
        status: "researching",
        latest_binding_id: "binding-brief-1",
        latest_run_id: "team-run-brief-1",
        latest_binding_status: "ATTACHED",
      });
      expect(artifactCount).toBe(1);
      expect(artifactRow).toEqual({
        path: "/tmp/downloads/brief-studio/research.md",
        publication_kind: "research",
      });
      expect(briefBindingCount).toBe(1);
      expect(pendingIntentRow).toEqual({
        status: "COMMITTED",
        binding_id: "binding-brief-1",
      });
    } finally {
      verifiedDb.close();
    }
  });

  it("preserves Brief Studio early same-binding final artifacts when startAgentTeam succeeds after projection", async () => {
    const appDatabasePath = await createTempDatabase("autobyteus-brief-launch-race-", BRIEF_MIGRATIONS_DIR);
    let context!: ApplicationHandlerContext;
    const artifactEvent = buildBriefFinalArtifactEvent(buildBriefBinding("brief-pending-launch-request-1"));
    const capabilities = buildCapabilities({
      startAgentTeam: vi.fn(async (startAgentTeamInput: StartAgentTeamRequest) => {
        const binding = buildBriefBinding(startAgentTeamInput.launchRequestId);
        await createBriefArtifactReconciliationService(context).handlePersistedArtifact({
          ...artifactEvent,
          binding,
          runId: "team-run-brief-1::writer",
          artifactId: "team-run-brief-1::writer:/tmp/downloads/final-brief.md",
        });
        return binding;
      }),
      ...buildRevisionReader({
        [artifactEvent.revisionId]: "Final review-ready brief body.",
      }),
    });
    context = createHandlerContext({
      appDatabasePath,
      capabilities,
    });

    const service = createBriefRunLaunchService(context);
    const createdBrief = await service.createBrief({ title: "Launch Race Draft" });

    await expect(service.launchDraftRun({
      briefId: createdBrief.briefId,
    })).resolves.toEqual({
      briefId: createdBrief.briefId,
      bindingId: "binding-brief-1",
      runId: "team-run-brief-1",
      status: "ATTACHED",
    });

    const db = new DatabaseSync(appDatabasePath);
    try {
      const briefRow = db.prepare(
        `SELECT title, status, latest_binding_id, latest_binding_status, last_error_message
           FROM briefs
          WHERE brief_id = ?`,
      ).get(createdBrief.briefId) as {
        title: string;
        status: string;
        latest_binding_id: string | null;
        latest_binding_status: string | null;
        last_error_message: string | null;
      };

      expect(briefRow).toEqual({
        title: "Launch Race Draft",
        status: "in_review",
        latest_binding_id: "binding-brief-1",
        latest_binding_status: "ATTACHED",
        last_error_message: null,
      });
    } finally {
      db.close();
    }
  });

  it("reconciles Socratic startLesson failures through findByLaunchRequestId", async () => {
    const appDatabasePath = await createTempDatabase("autobyteus-lesson-launch-request-", SOCRATIC_MIGRATIONS_DIR);
    const capabilities = buildCapabilities({
      startAgentTeam: vi.fn(async () => {
        throw new Error("lesson start failed after binding creation");
      }),
      findByLaunchRequestId: vi.fn(async (launchRequestId: string) => buildLessonBinding(launchRequestId)),
    });
    const context = createHandlerContext({
      appDatabasePath,
      capabilities,
    });

    await expect(
      createLessonRuntimeService(context).startLesson({
        prompt: "Solve 2x + 3 = 11",
      }),
    ).rejects.toThrow("lesson start failed after binding creation");

    const startRequest = vi.mocked(capabilities.agentExecution.startAgentTeam).mock.calls[0]?.[0];
    expect(startRequest).not.toHaveProperty("initialInput");
    expect(capabilities.agentExecution.startAgentTeam).toHaveBeenCalledWith(expect.objectContaining({
      launch: expect.objectContaining({
        kind: "AGENT_TEAM",
        mode: "memberConfigs",
        memberConfigs: [expect.objectContaining({
          memberAddress: "/tutor",
          llmModelIdentifier: "gpt-test",
          autoExecuteTools: true,
          llmConfig: { reasoning_effort: "high" },
        })],
      }),
    }));

    const db = new DatabaseSync(appDatabasePath);
    try {
      const lessonRow = db.prepare(
        `SELECT status, latest_binding_id, latest_run_id, latest_binding_status, last_error_message
           FROM lessons
          LIMIT 1`,
      ).get() as {
        status: string;
        latest_binding_id: string | null;
        latest_run_id: string | null;
        latest_binding_status: string | null;
        last_error_message: string | null;
      };
      const pendingIntentRow = db.prepare(
        `SELECT status, binding_id, committed_at FROM pending_launch_requests LIMIT 1`,
      ).get() as { status: string; binding_id: string | null; committed_at: string | null };

      expect(capabilities.agentExecution.findByLaunchRequestId).toHaveBeenCalledOnce();
      expect(lessonRow).toEqual({
        status: "blocked",
        latest_binding_id: "binding-lesson-1",
        latest_run_id: "team-run-lesson-1",
        latest_binding_status: "ATTACHED",
        last_error_message: "lesson start failed after binding creation",
      });
      expect(pendingIntentRow).toMatchObject({
        status: "COMMITTED",
        binding_id: "binding-lesson-1",
        committed_at: expect.any(String),
      });
    } finally {
      db.close();
    }
  });

  it("keeps askFollowUp on the inline whole-team DTO without a pre-send binding fetch", async () => {
    const appDatabasePath = await createTempDatabase("autobyteus-lesson-follow-up-", SOCRATIC_MIGRATIONS_DIR);
    seedActiveLesson(appDatabasePath);
    const binding = buildLessonBinding("lesson-launch-request-1");
    const sendInput = vi.fn(async () => binding);
    const get = vi.fn(async () => binding);
    const capabilities = buildCapabilities({ sendInput, get });
    const context = createHandlerContext({ appDatabasePath, capabilities });

    const lesson = await createLessonRuntimeService(context).askFollowUp({
      lessonId: "lesson-1",
      text: "Why should I subtract five first?",
    });

    expect(sendInput).toHaveBeenCalledWith({
      address: {
        bindingId: "binding-lesson-1",
        target: { kind: "AGENT_TEAM_RUN" },
      },
      input: {
        text: "Why should I subtract five first?",
        metadata: { lessonId: "lesson-1" },
      },
    });
    expect(get).toHaveBeenCalledOnce();
    expect(get).toHaveBeenCalledWith("binding-lesson-1");
    expect(sendInput.mock.invocationCallOrder[0]).toBeLessThan(get.mock.invocationCallOrder[0]!);
    expect(lesson).toMatchObject({
      tutorTargetAddress: {
        bindingId: "binding-lesson-1",
        target: { kind: "AGENT_TEAM_MEMBER", agentRunId: "team-run-lesson-1::tutor" },
      },
      messages: [expect.objectContaining({
        role: "student",
        kind: "follow_up",
        body: "Why should I subtract five first?",
      })],
    });
  });

  it("keeps requestHint on the inline whole-team DTO without a pre-send binding fetch", async () => {
    const appDatabasePath = await createTempDatabase("autobyteus-lesson-hint-", SOCRATIC_MIGRATIONS_DIR);
    seedActiveLesson(appDatabasePath);
    const binding = buildLessonBinding("lesson-launch-request-1");
    const sendInput = vi.fn(async () => binding);
    const get = vi.fn(async () => binding);
    const capabilities = buildCapabilities({ sendInput, get });
    const context = createHandlerContext({ appDatabasePath, capabilities });

    const lesson = await createLessonRuntimeService(context).requestHint({
      lessonId: "lesson-1",
      text: "Help with the first step.",
    });

    expect(sendInput).toHaveBeenCalledWith({
      address: {
        bindingId: "binding-lesson-1",
        target: { kind: "AGENT_TEAM_RUN" },
      },
      input: {
        text: "The student requests a hint. Help with the first step.",
        metadata: { lessonId: "lesson-1", requestKind: "hint" },
      },
    });
    expect(get).toHaveBeenCalledOnce();
    expect(get).toHaveBeenCalledWith("binding-lesson-1");
    expect(sendInput.mock.invocationCallOrder[0]).toBeLessThan(get.mock.invocationCallOrder[0]!);
    expect(lesson).toMatchObject({
      tutorTargetAddress: {
        bindingId: "binding-lesson-1",
        target: { kind: "AGENT_TEAM_MEMBER", agentRunId: "team-run-lesson-1::tutor" },
      },
      messages: [expect.objectContaining({
        role: "student",
        kind: "hint_request",
        body: "Help with the first step.",
      })],
    });
  });

  it("launches Socratic lessons from host-saved launch profiles when no inline llmModelIdentifier is provided", async () => {
    const appDatabasePath = await createTempDatabase("autobyteus-lesson-launch-defaults-", SOCRATIC_MIGRATIONS_DIR);
    const capabilities = buildCapabilities({
      requireRunnable: vi.fn(async () => buildRunnableTeamConfiguration({
        slotKey: "lessonTutorTeam",
        localId: "socratic-math-team",
        leaves: [{
          memberAddress: "/tutor",
          displayName: "Tutor",
          agentDefinitionId: "bundle-agent__tutor",
            runtimeKind: "lmstudio",
            llmModelIdentifier: "qwen3.6-35b-a3b:lmstudio@127.0.0.1:1234",
            llmConfig: { reasoning_effort: "high" },
            workspaceRootPath: "/tmp/lessons",
        }],
      })),
      startAgentTeam: vi.fn(async (input: StartAgentTeamRequest) => buildLessonBinding(input.launchRequestId)),
      get: vi.fn(async () => buildLessonBinding("lesson-launch-request-1")),
    });
    const context = createHandlerContext({
      appDatabasePath,
      capabilities,
    });

    const lesson = await createLessonRuntimeService(context).startLesson({
      prompt: "Solve 2x + 3 = 11",
    });

    const startRequest = vi.mocked(capabilities.agentExecution.startAgentTeam).mock.calls[0]?.[0];
    expect(startRequest).not.toHaveProperty("initialInput");
    expect(capabilities.agentExecution.startAgentTeam).toHaveBeenCalledWith(expect.objectContaining({
      launch: expect.objectContaining({
        kind: "AGENT_TEAM",
        mode: "memberConfigs",
        memberConfigs: [
          expect.objectContaining({
            memberAddress: "/tutor",
            runtimeKind: "lmstudio",
            llmModelIdentifier: "qwen3.6-35b-a3b:lmstudio@127.0.0.1:1234",
            workspaceRootPath: "/tmp/lessons",
            autoExecuteTools: true,
            llmConfig: { reasoning_effort: "high" },
          }),
        ],
      }),
    }));
    expect(lesson).toMatchObject({
      lessonId: expect.any(String),
      tutorTargetAddress: {
        bindingId: "binding-lesson-1",
        target: {
          kind: "AGENT_TEAM_MEMBER",
          agentRunId: "team-run-lesson-1::tutor",
        },
      },
    });
    expect(capabilities.agentExecution.get).toHaveBeenCalledOnce();
    expect(capabilities.agentExecution.get).toHaveBeenCalledWith("binding-lesson-1");
  });

  it("launches Socratic lessons from explicit per-member team profiles when defaults are null", async () => {
    const appDatabasePath = await createTempDatabase("autobyteus-lesson-member-launch-configs-", SOCRATIC_MIGRATIONS_DIR);
    const capabilities = buildCapabilities({
      requireRunnable: vi.fn(async () => buildRunnableTeamConfiguration({
        slotKey: "lessonTutorTeam",
        localId: "socratic-math-team",
        leaves: [{
          memberAddress: "/tutor",
          displayName: "Tutor",
          agentDefinitionId: "bundle-agent__tutor",
          runtimeKind: "autobyteus",
          llmModelIdentifier: "openai/gpt-5",
          llmConfig: { reasoning_effort: "high" },
          workspaceRootPath: path.join(path.dirname(appDatabasePath), "runtime"),
        }],
      })),
      startAgentTeam: vi.fn(async (input: StartAgentTeamRequest) => buildLessonBinding(input.launchRequestId)),
    });
    const context = createHandlerContext({
      appDatabasePath,
      capabilities,
    });

    await createLessonRuntimeService(context).startLesson({
      prompt: "Solve 2x + 3 = 11",
    });

    const startRequest = vi.mocked(capabilities.agentExecution.startAgentTeam).mock.calls[0]?.[0];
    expect(startRequest).not.toHaveProperty("initialInput");
    expect(capabilities.agentExecution.startAgentTeam).toHaveBeenCalledWith(expect.objectContaining({
      launch: expect.objectContaining({
        kind: "AGENT_TEAM",
        mode: "memberConfigs",
        memberConfigs: [
          expect.objectContaining({
            memberAddress: "/tutor",
            runtimeKind: "autobyteus",
            llmModelIdentifier: "openai/gpt-5",
            workspaceRootPath: context.storage.runtimePath,
            autoExecuteTools: true,
            llmConfig: { reasoning_effort: "high" },
          }),
        ],
      }),
    }));
  });

  it("reconciles Socratic early tutor events through launchRequestId without event.executionRef", async () => {
    const appDatabasePath = await createTempDatabase("autobyteus-lesson-event-launch-request-", SOCRATIC_MIGRATIONS_DIR);
    const binding = buildLessonBinding("lesson-pending-launch-request-1");
    const artifactEvent = buildLessonArtifactEvent(binding);
    const hintArtifactEvent = buildLessonHintArtifactEvent(binding);
    const publishNotification = vi.fn(async () => undefined);
    const context = createHandlerContext({
      appDatabasePath,
      publishNotification,
      capabilities: buildCapabilities(buildRevisionReader({
        [artifactEvent.revisionId]: "Try isolating x first.",
        [hintArtifactEvent.revisionId]: "Think about dividing both sides by 3.",
      })),
    });

    const db = new DatabaseSync(appDatabasePath);
    try {
      db.prepare(
        `INSERT INTO lessons (
           lesson_id,
           prompt,
           status,
           latest_binding_id,
           latest_run_id,
           latest_binding_status,
           last_error_message,
           created_at,
           updated_at,
           closed_at
         ) VALUES (?, ?, ?, NULL, NULL, NULL, NULL, ?, ?, NULL)`,
      ).run(
        "lesson-1",
        "Solve 3x = 12",
        "active",
        "2026-04-19T12:20:00.000Z",
        "2026-04-19T12:20:00.000Z",
      );
      db.prepare(
        `INSERT INTO pending_launch_requests (
           launch_request_id, lesson_id, status, binding_id, created_at, updated_at, committed_at
         ) VALUES (?, ?, 'PENDING_START', NULL, ?, ?, NULL)`,
      ).run(
        "lesson-pending-launch-request-1",
        "lesson-1",
        "2026-04-19T12:21:00.000Z",
        "2026-04-19T12:21:00.000Z",
      );
    } finally {
      db.close();
    }

    await createLessonArtifactReconciliationService(context).handlePersistedArtifact(artifactEvent);
    await createLessonArtifactReconciliationService(context).handlePersistedArtifact(hintArtifactEvent);

    const verifiedDb = new DatabaseSync(appDatabasePath);
    try {
      const lessonRow = verifiedDb.prepare(
        `SELECT status, latest_binding_id, latest_run_id, latest_binding_status
           FROM lessons
          WHERE lesson_id = 'lesson-1'`,
      ).get() as {
        status: string;
        latest_binding_id: string | null;
        latest_run_id: string | null;
        latest_binding_status: string | null;
      };
      const messageCount = Number(
        (verifiedDb.prepare(`SELECT COUNT(*) AS count FROM lesson_messages`).get() as { count: number }).count,
      );
      const messageRows = verifiedDb.prepare(
        `SELECT role, kind, body, source_revision_id
           FROM lesson_messages
          ORDER BY datetime(created_at) ASC, kind ASC`,
      ).all() as Array<{
        role: string;
        kind: string;
        body: string;
        source_revision_id: string | null;
      }>;
      const pendingIntentRow = verifiedDb.prepare(
        `SELECT status, binding_id FROM pending_launch_requests LIMIT 1`,
      ).get() as { status: string; binding_id: string | null };

      expect(lessonRow).toEqual({
        status: "active",
        latest_binding_id: "binding-lesson-1",
        latest_run_id: "team-run-lesson-1",
        latest_binding_status: "ATTACHED",
      });
      expect(messageCount).toBe(2);
      expect(messageRows).toEqual([
        {
          role: "tutor",
          kind: "lesson_response",
          body: "Try isolating x first.",
          source_revision_id: artifactEvent.revisionId,
        },
        {
          role: "tutor",
          kind: "lesson_hint",
          body: "Think about dividing both sides by 3.",
          source_revision_id: hintArtifactEvent.revisionId,
        },
      ]);
      expect(pendingIntentRow).toEqual({
        status: "COMMITTED",
        binding_id: "binding-lesson-1",
      });
      expect(publishNotification).toHaveBeenCalledTimes(2);
      expect(publishNotification).toHaveBeenNthCalledWith(1, "lesson.response_received", {
        lessonId: "lesson-1",
        bindingId: "binding-lesson-1",
        revisionId: artifactEvent.revisionId,
        runId: artifactEvent.runId,
      });
      expect(publishNotification).toHaveBeenNthCalledWith(2, "lesson.hint_received", {
        lessonId: "lesson-1",
        bindingId: "binding-lesson-1",
        revisionId: hintArtifactEvent.revisionId,
        runId: hintArtifactEvent.runId,
      });
    } finally {
      verifiedDb.close();
    }
  });

  it("preserves Socratic early same-binding failure state when startLesson succeeds after projection", async () => {
    const appDatabasePath = await createTempDatabase("autobyteus-lesson-launch-race-", SOCRATIC_MIGRATIONS_DIR);
    let context!: ApplicationHandlerContext;
    const capabilities = buildCapabilities({
      startAgentTeam: vi.fn(async (startAgentTeamInput: StartAgentTeamRequest) => {
        await projectLessonExecutionEvent(
          buildLessonLifecycleEnvelope(
            buildLessonBinding(startAgentTeamInput.launchRequestId, {
              status: "FAILED",
              updatedAt: "2026-04-19T12:26:00.000Z",
              lastErrorMessage: "Tutor session failed before launch completion.",
            }),
            "RUN_FAILED",
          ),
          context,
        );

        return buildLessonBinding(startAgentTeamInput.launchRequestId);
      }),
    });
    context = createHandlerContext({
      appDatabasePath,
      capabilities,
    });

    const lesson = await createLessonRuntimeService(context).startLesson({
      prompt: "Solve 2x + 3 = 11",
    });

    expect(lesson).toMatchObject({
      status: "blocked",
      latestBindingId: "binding-lesson-1",
      latestBindingStatus: "FAILED",
      lastErrorMessage: "Tutor session failed before launch completion.",
      closedAt: null,
      tutorTargetAddress: null,
    });
  });

  it("fails Socratic startLesson before startAgentTeam when configured-resource readback rejects an invalid slot selection", async () => {
    const appDatabasePath = await createTempDatabase("autobyteus-lesson-invalid-slot-", SOCRATIC_MIGRATIONS_DIR);
    const capabilities = buildCapabilities({
      requireRunnable: vi.fn(async () => {
        throw new Error(
          "Application execution resource slot 'lessonTutorTeam' has invalid manifest default: Application execution resource could not be resolved for application 'test-app'.",
        );
      }),
      startAgentTeam: vi.fn(async () => buildLessonBinding("unused-launch-request")),
    });
    const context = createHandlerContext({
      appDatabasePath,
      capabilities,
    });

    await expect(
      createLessonRuntimeService(context).startLesson({
        prompt: "Solve 2x + 3 = 11",
      }),
    ).rejects.toThrow("Application execution resource slot 'lessonTutorTeam' has invalid manifest default");

    expect(capabilities.agentExecution.startAgentTeam).not.toHaveBeenCalled();
  });
});
