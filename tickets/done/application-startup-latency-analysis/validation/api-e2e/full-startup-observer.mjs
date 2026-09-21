import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

const output = process.env.STARTUP_PROBE_OUTPUT;
const worktree = process.env.STARTUP_PROBE_WORKTREE;
const isServer = process.argv.some((value) => /autobyteus-server-ts\/dist\/app\.js$/.test(value));
if (!output || !worktree) throw new Error("STARTUP_PROBE_OUTPUT and STARTUP_PROBE_WORKTREE are required.");

let sequence = 0;
const record = (event) => fs.appendFileSync(output, `${JSON.stringify({
  sequence: ++sequence,
  pid: process.pid,
  at: new Date().toISOString(),
  uptimeMs: Number((process.uptime() * 1000).toFixed(3)),
  ...event,
})}\n`);

record({ type: "process-start", argv: process.argv.slice(1), isServer });

if (isServer) {
  const originalReadFile = fsp.readFile.bind(fsp);
  fsp.readFile = async (...args) => {
    const file = String(args[0]);
    const rawTrace = /raw_traces_(?:active|\d+)\.jsonl$/.test(file);
    const started = rawTrace ? process.hrtime.bigint() : null;
    try {
      const value = await originalReadFile(...args);
      if (rawTrace) {
        const bytes = typeof value === "string" ? Buffer.byteLength(value) : value.byteLength;
        record({
          type: "raw-trace-read",
          fileBasename: path.basename(file),
          bytes,
          durationMs: Number((Number(process.hrtime.bigint() - started) / 1e6).toFixed(3)),
          stack: new Error().stack?.split("\n").slice(2, 8).map((line) => line.trim()),
        });
      }
      return value;
    } catch (error) {
      if (rawTrace) record({ type: "raw-trace-read-error", fileBasename: path.basename(file), error: String(error) });
      throw error;
    }
  };

  const readinessUrl = pathToFileURL(path.join(
    worktree,
    "autobyteus-server-ts/dist/run-history/services/root-run-package-readiness-index.js",
  )).href;
  const migrationUrl = pathToFileURL(path.join(
    worktree,
    "autobyteus-server-ts/dist/app-data-migrations/app-data-migration-runner.js",
  )).href;
  const [{ RootRunPackageReadinessIndex }, { AppDataMigrationRunner }] = await Promise.all([
    import(readinessUrl),
    import(migrationUrl),
  ]);

  const originalRebuild = RootRunPackageReadinessIndex.prototype.rebuild;
  RootRunPackageReadinessIndex.prototype.rebuild = function (...args) {
    const id = `readiness-${sequence + 1}`;
    record({ type: "readiness-start", id, memoryDirRedacted: true });
    let value;
    try { value = originalRebuild.apply(this, args); }
    catch (error) { record({ type: "readiness-error", id, error: String(error) }); throw error; }
    Promise.resolve(value).then(
      () => record({
        type: "readiness-end",
        id,
        admittedTeams: this.listAdmitted("agent_team").length,
        admittedOrgs: this.listAdmitted("agent_org").length,
        diagnostics: this.listDiagnostics().length,
      }),
      (error) => record({ type: "readiness-error", id, error: String(error) }),
    );
    return value;
  };

  const originalRunPending = AppDataMigrationRunner.prototype.runPending;
  AppDataMigrationRunner.prototype.runPending = async function (...args) {
    const id = `migrations-${sequence + 1}`;
    record({ type: "app-data-migrations-start", id });
    try {
      const statuses = await originalRunPending.apply(this, args);
      record({
        type: "app-data-migrations-end",
        id,
        statuses: statuses.map((item) => ({
          migrationId: item.migrationId,
          status: item.status,
          attempts: item.attempts,
          detailCount: item.summary?.details?.length ?? null,
        })),
      });
      return statuses;
    } catch (error) {
      record({ type: "app-data-migrations-error", id, error: String(error) });
      throw error;
    }
  };

  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (...args) => {
    const input = args[0];
    const rawUrl = typeof input === "string" ? input : input instanceof URL ? input.href : input?.url;
    let url;
    try { url = new URL(rawUrl); } catch { return originalFetch(...args); }
    const local = ["127.0.0.1", "localhost", "::1"].includes(url.hostname);
    if (!local) record({ type: "external-fetch", origin: url.origin, pathname: url.pathname });
    return originalFetch(...args);
  };

  record({ type: "observer-ready" });
}
