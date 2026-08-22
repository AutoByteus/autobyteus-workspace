import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { afterEach, describe, expect, it, vi } from "vitest";
import type {
  ApplicationAgentTeamBinding,
  ApplicationHandlerContext,
  ApplicationPublishedArtifactSummary,
} from "@autobyteus/application-sdk-contracts";
import briefStudioApplication from "../../../../applications/brief-studio/backend-src/index.ts";

const migrationsDirectory = path.resolve(
  process.cwd(),
  "..",
  "applications",
  "brief-studio",
  "backend-src",
  "migrations",
);
const tempRoots: string[] = [];

const createApplicationDatabase = async (): Promise<string> => {
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "brief-artifact-startup-catchup-"));
  tempRoots.push(tempRoot);
  const databasePath = path.join(tempRoot, "app.sqlite");
  const database = new DatabaseSync(databasePath);
  try {
    const migrations = (await fs.readdir(migrationsDirectory))
      .filter((fileName) => fileName.endsWith(".sql"))
      .sort((left, right) => left.localeCompare(right));
    for (const migration of migrations) {
      database.exec(await fs.readFile(path.join(migrationsDirectory, migration), "utf8"));
    }
  } finally {
    database.close();
  }
  return databasePath;
};

const buildBinding = (): ApplicationAgentTeamBinding => ({
  bindingId: "binding-brief-catchup-1",
  applicationId: "brief-studio",
  launchRequestId: "launch-brief-catchup-1",
  status: "ATTACHED",
  executionResourceRef: {
    source: "bundle",
    kind: "AGENT_TEAM",
    localId: "brief-studio-team",
  },
  runtime: {
    subject: "TEAM_RUN",
    teamRunId: "team-run-brief-catchup-1",
    definitionId: "brief-team-definition",
    members: [
      {
        memberAddress: "/researcher",
        displayName: "Researcher",
        agentRunId: "team-run-brief-catchup-1::researcher",
        runtimeKind: "AGENT_TEAM_MEMBER",
      },
      {
        memberAddress: "/writer",
        displayName: "Writer",
        agentRunId: "team-run-brief-catchup-1::writer",
        runtimeKind: "AGENT_TEAM_MEMBER",
      },
    ],
  },
  createdAt: "2026-08-13T10:00:00.000Z",
  updatedAt: "2026-08-13T10:00:00.000Z",
  terminatedAt: null,
  lastErrorMessage: null,
});

const buildArtifact = (input: {
  runId: string;
  path: string;
  revisionId: string;
  publishedAt: string;
}): ApplicationPublishedArtifactSummary => ({
  id: `${input.runId}:${input.path}`,
  runId: input.runId,
  path: input.path,
  type: "file",
  status: "available",
  description: input.revisionId,
  revisionId: input.revisionId,
  createdAt: input.publishedAt,
  updatedAt: input.publishedAt,
});

describe("Brief persisted-artifact startup catch-up", () => {
  afterEach(async () => {
    await Promise.all(tempRoots.splice(0).map((root) => fs.rm(root, { recursive: true, force: true })));
  });

  it("starts with valid history around an ineligible retained researcher/final revision", async () => {
    const appDatabasePath = await createApplicationDatabase();
    const binding = buildBinding();
    const researcherRunId = binding.runtime.members[0].agentRunId;
    const writerRunId = binding.runtime.members[1].agentRunId;
    const artifactsByRun = new Map<string, ApplicationPublishedArtifactSummary[]>([
      [
        researcherRunId,
        [
          buildArtifact({
            runId: researcherRunId,
            path: "brief-studio/research.md",
            revisionId: "research-revision-1",
            publishedAt: "2026-08-13T10:01:00.000Z",
          }),
          buildArtifact({
            runId: researcherRunId,
            path: "brief-studio/final-brief.md",
            revisionId: "ineligible-final-revision-1",
            publishedAt: "2026-08-13T10:02:00.000Z",
          }),
        ],
      ],
      [
        writerRunId,
        [
          buildArtifact({
            runId: writerRunId,
            path: "brief-studio/final-brief.md",
            revisionId: "writer-final-revision-1",
            publishedAt: "2026-08-13T10:03:00.000Z",
          }),
        ],
      ],
    ]);
    const readRevision = vi.fn(async (input: { runId: string; revisionId: string }) => {
      const revisions: Record<string, string> = {
        "research-revision-1": "Verified research body",
        "writer-final-revision-1": "Verified final brief body",
      };
      return revisions[input.revisionId] ?? null;
    });
    const publishNotification = vi.fn(async () => undefined);
    const context: ApplicationHandlerContext = {
      requestContext: null,
      storage: {
        rootPath: path.dirname(appDatabasePath),
        runtimePath: path.join(path.dirname(appDatabasePath), "runtime"),
        logsPath: path.join(path.dirname(appDatabasePath), "logs"),
        appDatabasePath,
        appDatabaseUrl: `file:${appDatabasePath}`,
        assetsPath: null,
      },
      publishNotification,
      agentExecution: {
        list: vi.fn(async () => [binding]),
        startAgent: vi.fn(async () => { throw new Error("not used"); }),
        startAgentTeam: vi.fn(async () => { throw new Error("not used"); }),
        sendInput: vi.fn(async () => { throw new Error("not used"); }),
        subscribeEventStream: vi.fn(async () => { throw new Error("not used"); }),
        terminate: vi.fn(async () => null),
        get: vi.fn(async () => null),
        findByLaunchRequestId: vi.fn(async () => null),
      },
      agentResources: {
        listAvailable: vi.fn(async () => []),
        requireRunnable: vi.fn(async () => { throw new Error("not used"); }),
      },
      publishedArtifacts: {
        list: vi.fn(async (runId) => artifactsByRun.get(runId) ?? []),
        readRevision,
      },
    };

    const database = new DatabaseSync(appDatabasePath);
    try {
      database.prepare(
        `INSERT INTO briefs (
           brief_id, title, status, latest_binding_id, latest_run_id,
           latest_binding_status, last_error_message, created_at, updated_at,
           approved_at, rejected_at
         ) VALUES (?, ?, 'not_started', NULL, NULL, NULL, NULL, ?, ?, NULL, NULL)`,
      ).run(
        "brief-catchup-1",
        "Restart-safe catch-up",
        "2026-08-13T09:59:00.000Z",
        "2026-08-13T09:59:00.000Z",
      );
      database.prepare(
        `INSERT INTO pending_launch_requests (
           launch_request_id, brief_id, status, binding_id,
           created_at, updated_at, committed_at
         ) VALUES (?, ?, 'PENDING_START', NULL, ?, ?, NULL)`,
      ).run(
        binding.launchRequestId,
        "brief-catchup-1",
        "2026-08-13T09:59:30.000Z",
        "2026-08-13T09:59:30.000Z",
      );
    } finally {
      database.close();
    }

    const onStart = briefStudioApplication.lifecycle?.onStart;
    expect(onStart).toBeTypeOf("function");
    await expect(onStart!(context)).resolves.toBeUndefined();

    expect(readRevision.mock.calls.map(([input]) => input.revisionId)).toEqual([
      "research-revision-1",
      "writer-final-revision-1",
    ]);
    expect(publishNotification).toHaveBeenCalledTimes(1);

    const verifiedDatabase = new DatabaseSync(appDatabasePath);
    try {
      expect(
        verifiedDatabase.prepare(
          "SELECT status, latest_binding_id, latest_run_id FROM briefs WHERE brief_id = ?",
        ).get("brief-catchup-1"),
      ).toEqual({
        status: "in_review",
        latest_binding_id: binding.bindingId,
        latest_run_id: binding.runtime.teamRunId,
      });
      expect(
        verifiedDatabase.prepare(
          "SELECT revision_id FROM brief_artifact_revisions ORDER BY published_at ASC",
        ).all(),
      ).toEqual([
        { revision_id: "research-revision-1" },
        { revision_id: "writer-final-revision-1" },
      ]);
      expect(
        verifiedDatabase.prepare(
          "SELECT artifact_kind, publication_kind, revision_id, body FROM brief_artifacts ORDER BY artifact_kind ASC",
        ).all(),
      ).toEqual([
        {
          artifact_kind: "researcher",
          publication_kind: "research",
          revision_id: "research-revision-1",
          body: "Verified research body",
        },
        {
          artifact_kind: "writer",
          publication_kind: "final",
          revision_id: "writer-final-revision-1",
          body: "Verified final brief body",
        },
      ]);
    } finally {
      verifiedDatabase.close();
    }
  });
});
