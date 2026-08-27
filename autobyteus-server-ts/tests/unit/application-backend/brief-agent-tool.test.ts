import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { afterEach, describe, expect, it } from "vitest";
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
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "brief-agent-tool-"));
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
    const insertBrief = database.prepare(
      `INSERT INTO briefs (
         brief_id, title, status, latest_binding_id, latest_run_id,
         latest_binding_status, last_error_message, created_at, updated_at,
         approved_at, rejected_at
       ) VALUES (?, ?, ?, ?, ?, ?, NULL, ?, ?, NULL, NULL)`,
    );
    const insertBinding = database.prepare(
      `INSERT INTO brief_bindings (
         binding_id, brief_id, launch_request_id, run_id,
         created_at, updated_at, artifact_catchup_completed_at
       ) VALUES (?, ?, ?, ?, ?, ?, NULL)`,
    );
    for (const record of [
      {
        briefId: "brief-a",
        bindingId: "binding-a",
        title: "Application-owned tools",
        status: "in_review",
        runId: "team-a",
      },
      {
        briefId: "brief-b",
        bindingId: "binding-b",
        title: "Unrelated brief",
        status: "drafting",
        runId: "team-b",
      },
    ]) {
      const timestamp = `2026-08-27T10:00:0${record.briefId === "brief-a" ? "1" : "2"}.000Z`;
      insertBrief.run(
        record.briefId,
        record.title,
        record.status,
        record.bindingId,
        record.runId,
        "ATTACHED",
        timestamp,
        timestamp,
      );
      insertBinding.run(
        record.bindingId,
        record.briefId,
        `launch-${record.briefId}`,
        record.runId,
        timestamp,
        timestamp,
      );
    }
  } finally {
    database.close();
  }
  return databasePath;
};

const context = (appDatabasePath: string, bindingId: string) => ({
  requestContext: null,
  storage: {
    rootPath: path.dirname(appDatabasePath),
    runtimePath: path.join(path.dirname(appDatabasePath), "runtime"),
    logsPath: path.join(path.dirname(appDatabasePath), "logs"),
    appDatabasePath,
    appDatabaseUrl: `file:${appDatabasePath}`,
    assetsPath: null,
  },
  caller: {
    applicationId: "built-in:applications__brief-studio",
    bindingId,
    agentRunId: "member-run",
    memberAddress: "/researcher",
  },
}) as never;

describe("Brief Studio get_brief_context application Agent Tool", () => {
  afterEach(async () => {
    await Promise.all(tempRoots.splice(0).map((root) =>
      fs.rm(root, { recursive: true, force: true })));
  });

  it("derives the owning brief from caller bindingId rather than another application record", async () => {
    const appDatabasePath = await createApplicationDatabase();
    const handler = briefStudioApplication.agentToolHandlers?.get_brief_context;
    expect(handler).toBeTypeOf("function");

    await expect(handler!({}, context(appDatabasePath, "binding-a"))).resolves.toEqual({
      content: [{ type: "text", text: "Current brief: Application-owned tools (in_review)." }],
      structuredContent: {
        briefId: "brief-a",
        title: "Application-owned tools",
        status: "in_review",
        latestBindingStatus: "ATTACHED",
        updatedAt: "2026-08-27T10:00:01.000Z",
      },
    });
  });

  it("returns an explicit safe error result when the caller binding has no brief", async () => {
    const appDatabasePath = await createApplicationDatabase();
    const handler = briefStudioApplication.agentToolHandlers!.get_brief_context;

    await expect(handler({}, context(appDatabasePath, "missing-binding"))).resolves.toEqual({
      content: [{
        type: "text",
        text: "No Brief Studio brief is associated with this application binding.",
      }],
      structuredContent: { bindingId: "missing-binding", brief: null },
      isError: true,
    });
  });
});
