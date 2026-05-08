import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { afterEach, describe, expect, it, vi } from "vitest";
import type {
  ApplicationExecutionEventEnvelope,
  ApplicationHandlerContext,
  ApplicationPublishedArtifactEvent,
  ApplicationRunBindingSummary,
} from "@autobyteus/application-sdk-contracts";
import { createBriefRunLaunchService } from "../../../../applications/brief-studio/backend-src/services/brief-run-launch-service.ts";
import { createBriefArtifactReconciliationService } from "../../../../applications/brief-studio/backend-src/services/brief-artifact-reconciliation-service.ts";
import { createLessonRuntimeService } from "../../../../applications/socratic-math-teacher/backend-src/services/lesson-runtime-service.ts";
import { createLessonArtifactReconciliationService } from "../../../../applications/socratic-math-teacher/backend-src/services/lesson-artifact-reconciliation-service.ts";
import { projectLessonExecutionEvent } from "../../../../applications/socratic-math-teacher/backend-src/services/lesson-projection-service.ts";

const tempRoots: string[] = [];
type StartRunRequest = Parameters<ApplicationHandlerContext["runtimeControl"]["startRun"]>[0];

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

const buildRuntimeControl = (
  overrides: Partial<ApplicationHandlerContext["runtimeControl"]> = {},
): ApplicationHandlerContext["runtimeControl"] => ({
  listAvailableResources: vi.fn(async () => []),
  getConfiguredResource: vi.fn(async (slotKey: string) => {
    if (slotKey === "lessonTutorTeam") {
      return {
        slotKey,
        resourceRef: {
          owner: "bundle",
          kind: "AGENT_TEAM",
          localId: "socratic-math-team",
        },
        launchProfile: null,
      };
    }
    if (slotKey === "draftingTeam") {
      return {
        slotKey,
        resourceRef: {
          owner: "bundle",
          kind: "AGENT_TEAM",
          localId: "brief-studio-team",
        },
        launchProfile: null,
      };
    }
    return null;
  }),
  startRun: vi.fn(async () => {
    throw new Error("runtimeControl.startRun was not mocked for this test.");
  }),
  getRunBinding: vi.fn(async () => null),
  getRunBindingByIntentId: vi.fn(async () => null),
  listRunBindings: vi.fn(async () => []),
  getRunPublishedArtifacts: vi.fn(async () => []),
  getPublishedArtifactRevisionText: vi.fn(async () => null),
  postRunInput: vi.fn(async () => {
    throw new Error("runtimeControl.postRunInput was not mocked for this test.");
  }),
  terminateRunBinding: vi.fn(async () => null),
  ...overrides,
});

const createHandlerContext = (input: {
  appDatabasePath: string;
  runtimeControl?: Partial<ApplicationHandlerContext["runtimeControl"]>;
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
  runtimeControl: buildRuntimeControl(input.runtimeControl),
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

const buildBriefBinding = (bindingIntentId: string): ApplicationRunBindingSummary => ({
  bindingId: "binding-brief-1",
  applicationId: "brief-studio",
  bindingIntentId,
  status: "ATTACHED",
  resourceRef: {
    owner: "bundle",
    kind: "AGENT_TEAM",
    localId: "brief-studio-team",
  },
  runtime: {
    subject: "TEAM_RUN",
    runId: "team-run-brief-1",
    definitionId: "brief-team-definition",
    members: [
      {
        memberName: "researcher",
        memberRouteKey: "researcher",
        displayName: "Researcher",
        teamPath: [],
        runId: "team-run-brief-1::researcher",
        runtimeKind: "AGENT_TEAM_MEMBER",
      },
      {
        memberName: "writer",
        memberRouteKey: "writer",
        displayName: "Writer",
        teamPath: [],
        runId: "team-run-brief-1::writer",
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
  bindingIntentId: string,
  overrides: Partial<Pick<ApplicationRunBindingSummary, "status" | "updatedAt" | "terminatedAt" | "lastErrorMessage">> = {},
): ApplicationRunBindingSummary => ({
  bindingId: "binding-lesson-1",
  applicationId: "socratic-math-teacher",
  bindingIntentId,
  status: overrides.status ?? "ATTACHED",
  resourceRef: {
    owner: "bundle",
    kind: "AGENT_TEAM",
    localId: "socratic-math-team",
  },
  runtime: {
    subject: "TEAM_RUN",
    runId: "team-run-lesson-1",
    definitionId: "socratic-team-definition",
    members: [
      {
        memberName: "tutor",
        memberRouteKey: "tutor",
        displayName: "Tutor",
        teamPath: [],
        runId: "team-run-lesson-1::tutor",
        runtimeKind: "AGENT_TEAM_MEMBER",
      },
    ],
  },
  createdAt: "2026-04-19T12:10:00.000Z",
  updatedAt: overrides.updatedAt ?? "2026-04-19T12:10:00.000Z",
  terminatedAt: overrides.terminatedAt ?? null,
  lastErrorMessage: overrides.lastErrorMessage ?? null,
});

const buildRevisionTextRuntimeControl = (entries: Record<string, string>) => ({
  getPublishedArtifactRevisionText: vi.fn(async ({ revisionId }: { revisionId: string }) =>
    entries[revisionId] ?? null),
});

const buildBriefArtifactEvent = (
  binding: ApplicationRunBindingSummary,
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
    memberRouteKey: "researcher",
    memberName: "researcher",
    displayName: "Researcher",
    teamPath: [],
    runId: "team-run-brief-1::researcher",
    runtimeKind: "AGENT_TEAM_MEMBER",
  },
});

const buildBriefFinalArtifactEvent = (
  binding: ApplicationRunBindingSummary,
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
    memberRouteKey: "writer",
    memberName: "writer",
    displayName: "Writer",
    teamPath: [],
    runId: "team-run-brief-1::writer",
    runtimeKind: "AGENT_TEAM_MEMBER",
  },
});

const buildLessonArtifactEvent = (
  binding: ApplicationRunBindingSummary,
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
    memberRouteKey: "tutor",
    memberName: "tutor",
    displayName: "Tutor",
    teamPath: [],
    runId: "team-run-lesson-1::tutor",
    runtimeKind: "AGENT_TEAM_MEMBER",
  },
});

const buildLessonHintArtifactEvent = (
  binding: ApplicationRunBindingSummary,
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
    memberRouteKey: "tutor",
    memberName: "tutor",
    displayName: "Tutor",
    teamPath: [],
    runId: "team-run-lesson-1::tutor",
    runtimeKind: "AGENT_TEAM_MEMBER",
  },
});

const buildLessonLifecycleEnvelope = (
  binding: ApplicationRunBindingSummary,
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

describe("App-owned bindingIntentId correlation", () => {
  it("fails Brief Studio launch before startRun when configured-resource readback rejects an invalid slot selection", async () => {
    const appDatabasePath = await createTempDatabase("autobyteus-brief-invalid-slot-", BRIEF_MIGRATIONS_DIR);
    const runtimeControl = buildRuntimeControl({
      getConfiguredResource: vi.fn(async () => {
        throw new Error(
          "Application resource slot 'draftingTeam' has invalid persisted override: Application resource slot 'draftingTeam' does not allow resource kind 'AGENT'.",
        );
      }),
      startRun: vi.fn(async () => buildBriefBinding("unused-binding-intent")),
    });
    const context = createHandlerContext({
      appDatabasePath,
      runtimeControl,
    });

    const service = createBriefRunLaunchService(context);
    const createdBrief = await service.createBrief({ title: "Invalid Slot Brief" });

    await expect(
      service.launchDraftRun({
        briefId: createdBrief.briefId,
        llmModelIdentifier: "gpt-test",
      }),
    ).rejects.toThrow("Application resource slot 'draftingTeam' has invalid persisted override");

    expect(runtimeControl.startRun).not.toHaveBeenCalled();
  });

  it("reconciles Brief Studio launch failures through getRunBindingByIntentId", async () => {
    const appDatabasePath = await createTempDatabase("autobyteus-brief-binding-intent-", BRIEF_MIGRATIONS_DIR);
    const runtimeControl = buildRuntimeControl({
      startRun: vi.fn(async () => {
        throw new Error("startRun failed after binding creation");
      }),
      getRunBindingByIntentId: vi.fn(async (bindingIntentId: string) => buildBriefBinding(bindingIntentId)),
    });
    const context = createHandlerContext({
      appDatabasePath,
      runtimeControl,
    });

    const service = createBriefRunLaunchService(context);
    const createdBrief = await service.createBrief({ title: "Market Entry Brief" });

    await expect(
      service.launchDraftRun({
        briefId: createdBrief.briefId,
        llmModelIdentifier: "gpt-test",
      }),
    ).rejects.toThrow("startRun failed after binding creation");

    expect(runtimeControl.startRun).toHaveBeenCalledWith(expect.objectContaining({
      launch: expect.objectContaining({
        kind: "AGENT_TEAM",
        mode: "preset",
        launchPreset: expect.objectContaining({
          llmModelIdentifier: "gpt-test",
          autoExecuteTools: true,
        }),
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
        `SELECT status, binding_id, committed_at FROM pending_binding_intents LIMIT 1`,
      ).get() as { status: string; binding_id: string | null; committed_at: string | null };

      expect(runtimeControl.getRunBindingByIntentId).toHaveBeenCalledOnce();
      expect(briefRow).toEqual({
        status: "blocked",
        latest_binding_id: "binding-brief-1",
        latest_run_id: "team-run-brief-1",
        latest_binding_status: "ATTACHED",
        last_error_message: "startRun failed after binding creation",
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
    const runtimeControl = buildRuntimeControl({
      getConfiguredResource: vi.fn(async () => ({
        slotKey: "draftingTeam",
        resourceRef: {
          owner: "shared",
          kind: "AGENT_TEAM",
          definitionId: "shared-writing-team",
        },
        launchProfile: {
          kind: "AGENT_TEAM",
          defaults: {
            runtimeKind: "lmstudio",
            llmModelIdentifier: "qwen3.6-35b-a3b:lmstudio@127.0.0.1:1234",
            workspaceRootPath: "/tmp/brief-studio",
          },
          memberProfiles: [
            {
              memberRouteKey: "researcher",
              memberName: "researcher",
              agentDefinitionId: "bundle-agent__researcher",
            },
            {
              memberRouteKey: "writer",
              memberName: "writer",
              agentDefinitionId: "bundle-agent__writer",
              runtimeKind: "lmstudio",
              llmModelIdentifier: "qwen3.6-35b-a3b:lmstudio@127.0.0.1:1234",
            },
          ],
        },
      })),
      startRun: vi.fn(async (input: StartRunRequest) => buildBriefBinding(input.bindingIntentId)),
    });
    const context = createHandlerContext({
      appDatabasePath,
      runtimeControl,
    });

    const service = createBriefRunLaunchService(context);
    const createdBrief = await service.createBrief({ title: "Saved Setup Brief" });
    await service.launchDraftRun({
      briefId: createdBrief.briefId,
    });

    expect(runtimeControl.startRun).toHaveBeenCalledWith(expect.objectContaining({
      resourceRef: {
        owner: "shared",
        kind: "AGENT_TEAM",
        definitionId: "shared-writing-team",
      },
      launch: expect.objectContaining({
        kind: "AGENT_TEAM",
        mode: "memberConfigs",
        memberConfigs: expect.arrayContaining([
          expect.objectContaining({
            memberRouteKey: "researcher",
            runtimeKind: "lmstudio",
            llmModelIdentifier: "qwen3.6-35b-a3b:lmstudio@127.0.0.1:1234",
            workspaceRootPath: "/tmp/brief-studio",
            autoExecuteTools: true,
          }),
          expect.objectContaining({
            memberRouteKey: "writer",
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
    const runtimeControl = buildRuntimeControl({
      getConfiguredResource: vi.fn(async () => ({
        slotKey: "draftingTeam",
        resourceRef: {
          owner: "shared",
          kind: "AGENT_TEAM",
          definitionId: "shared-writing-team",
        },
        launchProfile: {
          kind: "AGENT_TEAM",
          defaults: null,
          memberProfiles: [
            {
              memberRouteKey: "researcher",
              memberName: "researcher",
              agentDefinitionId: "bundle-agent__researcher",
              runtimeKind: "autobyteus",
              llmModelIdentifier: "openai/gpt-5",
            },
            {
              memberRouteKey: "writer",
              memberName: "writer",
              agentDefinitionId: "bundle-agent__writer",
              runtimeKind: "lmstudio",
              llmModelIdentifier: "qwen3.6-35b-a3b:lmstudio@127.0.0.1:1234",
            },
          ],
        },
      })),
      startRun: vi.fn(async (input: StartRunRequest) => buildBriefBinding(input.bindingIntentId)),
    });
    const context = createHandlerContext({
      appDatabasePath,
      runtimeControl,
    });

    const service = createBriefRunLaunchService(context);
    const createdBrief = await service.createBrief({ title: "Explicit Member Setup Brief" });
    await service.launchDraftRun({
      briefId: createdBrief.briefId,
    });

    expect(runtimeControl.startRun).toHaveBeenCalledWith(expect.objectContaining({
      resourceRef: {
        owner: "shared",
        kind: "AGENT_TEAM",
        definitionId: "shared-writing-team",
      },
      launch: expect.objectContaining({
        kind: "AGENT_TEAM",
        mode: "memberConfigs",
        memberConfigs: [
          expect.objectContaining({
            memberRouteKey: "researcher",
            runtimeKind: "autobyteus",
            llmModelIdentifier: "openai/gpt-5",
            workspaceRootPath: context.storage.runtimePath,
            autoExecuteTools: true,
          }),
          expect.objectContaining({
            memberRouteKey: "writer",
            runtimeKind: "lmstudio",
            llmModelIdentifier: "qwen3.6-35b-a3b:lmstudio@127.0.0.1:1234",
            workspaceRootPath: context.storage.runtimePath,
            autoExecuteTools: true,
          }),
        ],
      }),
    }));
  });

  it("reconciles Brief Studio early events through bindingIntentId without event.executionRef", async () => {
    const appDatabasePath = await createTempDatabase("autobyteus-brief-event-intent-", BRIEF_MIGRATIONS_DIR);
    const artifactEvent = buildBriefArtifactEvent(buildBriefBinding("brief-pending-intent-1"));
    const context = createHandlerContext({
      appDatabasePath,
      runtimeControl: buildRevisionTextRuntimeControl({
        [artifactEvent.revisionId]: "Research summary",
      }),
    });
    const launchService = createBriefRunLaunchService(context);
    const createdBrief = await launchService.createBrief({ title: "Strategy Brief" });

    const db = new DatabaseSync(appDatabasePath);
    try {
      db.prepare(
        `INSERT INTO pending_binding_intents (
           binding_intent_id, brief_id, status, binding_id, created_at, updated_at, committed_at
         ) VALUES (?, ?, 'PENDING_START', NULL, ?, ?, NULL)`,
      ).run(
        "brief-pending-intent-1",
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
        `SELECT status, binding_id FROM pending_binding_intents LIMIT 1`,
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

  it("preserves Brief Studio early same-binding final artifacts when startRun succeeds after projection", async () => {
    const appDatabasePath = await createTempDatabase("autobyteus-brief-launch-race-", BRIEF_MIGRATIONS_DIR);
    let context!: ApplicationHandlerContext;
    const artifactEvent = buildBriefFinalArtifactEvent(buildBriefBinding("brief-pending-intent-1"));
    const runtimeControl = buildRuntimeControl({
      startRun: vi.fn(async (startRunInput: StartRunRequest) => {
        const binding = buildBriefBinding(startRunInput.bindingIntentId);
        await createBriefArtifactReconciliationService(context).handlePersistedArtifact({
          ...artifactEvent,
          binding,
          runId: "team-run-brief-1::writer",
          artifactId: "team-run-brief-1::writer:/tmp/downloads/final-brief.md",
        });
        return binding;
      }),
      ...buildRevisionTextRuntimeControl({
        [artifactEvent.revisionId]: "Final review-ready brief body.",
      }),
    });
    context = createHandlerContext({
      appDatabasePath,
      runtimeControl,
    });

    const service = createBriefRunLaunchService(context);
    const createdBrief = await service.createBrief({ title: "Launch Race Draft" });

    await expect(service.launchDraftRun({
      briefId: createdBrief.briefId,
      llmModelIdentifier: "gpt-test",
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

  it("reconciles Socratic startLesson failures through getRunBindingByIntentId", async () => {
    const appDatabasePath = await createTempDatabase("autobyteus-lesson-binding-intent-", SOCRATIC_MIGRATIONS_DIR);
    const runtimeControl = buildRuntimeControl({
      startRun: vi.fn(async () => {
        throw new Error("lesson start failed after binding creation");
      }),
      getRunBindingByIntentId: vi.fn(async (bindingIntentId: string) => buildLessonBinding(bindingIntentId)),
    });
    const context = createHandlerContext({
      appDatabasePath,
      runtimeControl,
    });

    await expect(
      createLessonRuntimeService(context).startLesson({
        prompt: "Solve 2x + 3 = 11",
        llmModelIdentifier: "gpt-test",
      }),
    ).rejects.toThrow("lesson start failed after binding creation");

    expect(runtimeControl.startRun).toHaveBeenCalledWith(expect.objectContaining({
      launch: expect.objectContaining({
        kind: "AGENT_TEAM",
        mode: "preset",
        launchPreset: expect.objectContaining({
          llmModelIdentifier: "gpt-test",
          autoExecuteTools: true,
        }),
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
        `SELECT status, binding_id, committed_at FROM pending_binding_intents LIMIT 1`,
      ).get() as { status: string; binding_id: string | null; committed_at: string | null };

      expect(runtimeControl.getRunBindingByIntentId).toHaveBeenCalledOnce();
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

  it("launches Socratic lessons from host-saved launch profiles when no inline llmModelIdentifier is provided", async () => {
    const appDatabasePath = await createTempDatabase("autobyteus-lesson-launch-defaults-", SOCRATIC_MIGRATIONS_DIR);
    const runtimeControl = buildRuntimeControl({
      getConfiguredResource: vi.fn(async () => ({
        slotKey: "lessonTutorTeam",
        resourceRef: {
          owner: "bundle",
          kind: "AGENT_TEAM",
          localId: "socratic-math-team",
        },
        launchProfile: {
          kind: "AGENT_TEAM",
          defaults: {
            runtimeKind: "lmstudio",
            llmModelIdentifier: "qwen3.6-35b-a3b:lmstudio@127.0.0.1:1234",
            workspaceRootPath: "/tmp/lessons",
          },
          memberProfiles: [
            {
              memberRouteKey: "tutor",
              memberName: "tutor",
              agentDefinitionId: "bundle-agent__tutor",
            },
          ],
        },
      })),
      startRun: vi.fn(async (input: StartRunRequest) => buildLessonBinding(input.bindingIntentId)),
    });
    const context = createHandlerContext({
      appDatabasePath,
      runtimeControl,
    });

    await createLessonRuntimeService(context).startLesson({
      prompt: "Solve 2x + 3 = 11",
    });

    expect(runtimeControl.startRun).toHaveBeenCalledWith(expect.objectContaining({
      launch: expect.objectContaining({
        kind: "AGENT_TEAM",
        mode: "memberConfigs",
        memberConfigs: [
          expect.objectContaining({
            memberRouteKey: "tutor",
            runtimeKind: "lmstudio",
            llmModelIdentifier: "qwen3.6-35b-a3b:lmstudio@127.0.0.1:1234",
            workspaceRootPath: "/tmp/lessons",
            autoExecuteTools: true,
          }),
        ],
      }),
    }));
  });

  it("launches Socratic lessons from explicit per-member team profiles when defaults are null", async () => {
    const appDatabasePath = await createTempDatabase("autobyteus-lesson-member-launch-configs-", SOCRATIC_MIGRATIONS_DIR);
    const runtimeControl = buildRuntimeControl({
      getConfiguredResource: vi.fn(async () => ({
        slotKey: "lessonTutorTeam",
        resourceRef: {
          owner: "bundle",
          kind: "AGENT_TEAM",
          localId: "socratic-math-team",
        },
        launchProfile: {
          kind: "AGENT_TEAM",
          defaults: null,
          memberProfiles: [
            {
              memberRouteKey: "tutor",
              memberName: "tutor",
              agentDefinitionId: "bundle-agent__tutor",
              runtimeKind: "autobyteus",
              llmModelIdentifier: "openai/gpt-5",
            },
          ],
        },
      })),
      startRun: vi.fn(async (input: StartRunRequest) => buildLessonBinding(input.bindingIntentId)),
    });
    const context = createHandlerContext({
      appDatabasePath,
      runtimeControl,
    });

    await createLessonRuntimeService(context).startLesson({
      prompt: "Solve 2x + 3 = 11",
    });

    expect(runtimeControl.startRun).toHaveBeenCalledWith(expect.objectContaining({
      launch: expect.objectContaining({
        kind: "AGENT_TEAM",
        mode: "memberConfigs",
        memberConfigs: [
          expect.objectContaining({
            memberRouteKey: "tutor",
            runtimeKind: "autobyteus",
            llmModelIdentifier: "openai/gpt-5",
            workspaceRootPath: context.storage.runtimePath,
            autoExecuteTools: true,
          }),
        ],
      }),
    }));
  });

  it("reconciles Socratic early tutor events through bindingIntentId without event.executionRef", async () => {
    const appDatabasePath = await createTempDatabase("autobyteus-lesson-event-intent-", SOCRATIC_MIGRATIONS_DIR);
    const binding = buildLessonBinding("lesson-pending-intent-1");
    const artifactEvent = buildLessonArtifactEvent(binding);
    const hintArtifactEvent = buildLessonHintArtifactEvent(binding);
    const publishNotification = vi.fn(async () => undefined);
    const context = createHandlerContext({
      appDatabasePath,
      publishNotification,
      runtimeControl: buildRevisionTextRuntimeControl({
        [artifactEvent.revisionId]: "Try isolating x first.",
        [hintArtifactEvent.revisionId]: "Think about dividing both sides by 3.",
      }),
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
        `INSERT INTO pending_binding_intents (
           binding_intent_id, lesson_id, status, binding_id, created_at, updated_at, committed_at
         ) VALUES (?, ?, 'PENDING_START', NULL, ?, ?, NULL)`,
      ).run(
        "lesson-pending-intent-1",
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
        `SELECT status, binding_id FROM pending_binding_intents LIMIT 1`,
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
    const runtimeControl = buildRuntimeControl({
      startRun: vi.fn(async (startRunInput: StartRunRequest) => {
        await projectLessonExecutionEvent(
          buildLessonLifecycleEnvelope(
            buildLessonBinding(startRunInput.bindingIntentId, {
              status: "FAILED",
              updatedAt: "2026-04-19T12:26:00.000Z",
              lastErrorMessage: "Tutor session failed before launch completion.",
            }),
            "RUN_FAILED",
          ),
          context,
        );

        return buildLessonBinding(startRunInput.bindingIntentId);
      }),
    });
    context = createHandlerContext({
      appDatabasePath,
      runtimeControl,
    });

    const lesson = await createLessonRuntimeService(context).startLesson({
      prompt: "Solve 2x + 3 = 11",
      llmModelIdentifier: "gpt-test",
    });

    expect(lesson).toMatchObject({
      status: "blocked",
      latestBindingId: "binding-lesson-1",
      latestBindingStatus: "FAILED",
      lastErrorMessage: "Tutor session failed before launch completion.",
      closedAt: null,
    });
  });

  it("fails Socratic startLesson before startRun when configured-resource readback rejects an invalid slot selection", async () => {
    const appDatabasePath = await createTempDatabase("autobyteus-lesson-invalid-slot-", SOCRATIC_MIGRATIONS_DIR);
    const runtimeControl = buildRuntimeControl({
      getConfiguredResource: vi.fn(async () => {
        throw new Error(
          "Application resource slot 'lessonTutorTeam' has invalid manifest default: Application runtime resource could not be resolved for application 'test-app'.",
        );
      }),
      startRun: vi.fn(async () => buildLessonBinding("unused-binding-intent")),
    });
    const context = createHandlerContext({
      appDatabasePath,
      runtimeControl,
    });

    await expect(
      createLessonRuntimeService(context).startLesson({
        prompt: "Solve 2x + 3 = 11",
        llmModelIdentifier: "gpt-test",
      }),
    ).rejects.toThrow("Application resource slot 'lessonTutorTeam' has invalid manifest default");

    expect(runtimeControl.startRun).not.toHaveBeenCalled();
  });
});
