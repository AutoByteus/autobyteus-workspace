/**
 * Application reload and repair return a previously ACTIVE application to service (autobyteus-296).
 *
 * Reentry (package reload, repair) recovers bindings, makes the application ACTIVE with its worker stopped, resumes
 * pending-event dispatch and opens its tools; the worker starts on demand, so its own host calls on start are
 * admitted. A live catalog change that finds an application not ready quarantines it with its readiness reason.
 *
 * Real studio server over HTTP, started without the package. The Brief Studio sample application (its importable
 * package, built by `pnpm -C autobyteus-server-ts test:integration:prepare`) is imported through GraphQL, reloaded
 * through GraphQL `reloadApplicationPackage` (as the devkit sends it) and repaired through
 * `POST /rest/applications/:id/backend/reload`; its launch settings are read through REST and its own backend GraphQL
 * is called as its UI does (Brief Studio's worker calls the host when it starts). The runtime CLIs are the scripted
 * `tests/fixtures/agent-runtimes-fake-cli.mjs`; no model, no account, no network.
 *
 * Cases (in order; each uses the application the previous one left ACTIVE):
 *   RE-01 package reload of an ACTIVE application; RE-02 repair of an ACTIVE application; RE-03 import while Codex is
 *   signed out (quarantined with the reason), then sign-in and repair; RE-04 the application's worker crashes (the real
 *   worker process is killed): a repair resets it to stopped and the application is usable again; RE-05 a run event
 *   recorded while the application is quarantined (a signed-out package reload, then the drafting run's runtime process
 *   dies) is dispatched once a repair makes it ACTIVE: the dispatch drain starts the worker and the brief shows the event.
 *
 * Command (resolved temp HOME, TESTING.md):
 *   env -i PATH="$PATH" HOME="$(cd "$(mktemp -d)" && pwd -P)" TMPDIR="$TMPDIR" \
 *     pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/application-reload-repair.e2e.test.ts --no-watch
 */
import "reflect-metadata";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type { FastifyInstance } from "fastify";
import { appConfigProvider } from "../../../src/config/app-config-provider.js";
import { startStudioE2eRuntimeServer } from "../helpers/studio-runtime-test-server.js";
import { assertBriefStudioPackageBuilt, BRIEF_STUDIO_PACKAGE } from "../helpers/brief-studio-package.js";
import { createGraphqlClient, fakeRuntimeState, installVendorSourceStub } from "../helpers/agent-runtimes-e2e-harness.js";

const fake = await vi.hoisted(async () => {
  const { prepareFakeRuntimes } = await import("../helpers/agent-runtimes-e2e-harness.js");
  return prepareFakeRuntimes({ label: "application-reload-repair-e2e", grokInstalled: true });
});

const MODEL = "gpt-5.6-luna";

describe("Application reload and repair (real studio server, Brief Studio, scripted CLIs)", () => {
  const states = fakeRuntimeState(fake.stateDir);
  let fastify: FastifyInstance;
  let url: URL;
  let sources: ReturnType<typeof installVendorSourceStub>;
  let client: ReturnType<typeof createGraphqlClient>;
  let imported: { packageId: string; applicationId: string } | null = null;

  const gql = async (query: string, variables?: Record<string, unknown>) => {
    const result = await client.post(query, variables);
    if (result.errors?.length) throw new Error(JSON.stringify(result.errors));
    return result.data;
  };
  const rest = async (method: "GET" | "POST", route: string, body?: unknown) => {
    const response = await sources.realFetch(new URL(`/rest${route}`, url), {
      method, headers: body === undefined ? {} : { "content-type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const text = await response.text();
    return { status: response.status, body: text ? JSON.parse(text) : null };
  };
  const brief = (body: unknown) => JSON.stringify(body).slice(0, 600);
  const importBriefStudio = async () => {
    const result = await gql(`mutation($input: ImportApplicationPackageInput!) { importApplicationPackage(input: $input) { packageId applicationCount } }`,
      { input: { sourceKind: "LOCAL_PATH", source: BRIEF_STUDIO_PACKAGE } });
    const pkg = result.importApplicationPackage.find((entry: any) => entry.applicationCount > 0);
    const apps = await gql(`{ listApplications { id localApplicationId } }`);
    const app = apps.listApplications.find((entry: any) => entry.localApplicationId === "brief-studio");
    return { packageId: pkg.packageId as string, applicationId: app.id as string };
  };
  const repair = (applicationId: string) => rest("POST", `/applications/${encodeURIComponent(applicationId)}/backend/reload`);
  /** Launch settings read, the worker gets ready on demand, and the app's own GraphQL works (its worker calls the host). */
  const expectUsable = async (applicationId: string, label: string) => {
    const id = encodeURIComponent(applicationId);
    const view = await rest("GET", `/applications/${id}/execution-resource-configurations`);
    expect(view.status, `${label}: launch settings ${brief(view.body)}`).toBe(200);
    const ensured = await rest("POST", `/applications/${id}/backend/ensure-ready`);
    expect(ensured.status, `${label}: ensure-ready ${brief(ensured.body)}`).toBe(200);
    expect(ensured.body.state).toBe("ready");
    const created = await rest("POST", `/applications/${id}/backend/graphql`, { requestContext: { applicationId },
      request: { query: `mutation($input: CreateBriefInput!) { createBrief(input: $input) { briefId } }`, variables: { input: { title: `Brief ${label}` } } } });
    expect(created.status, `${label}: createBrief ${brief(created.body)}`).toBe(200);
    expect(created.body.result.errors, `${label}: createBrief ${brief(created.body)}`).toBeUndefined();
    expect(created.body.result.data.createBrief.briefId).toEqual(expect.any(String));
  };

  const status = async (applicationId: string) =>
    (await rest("GET", `/applications/${encodeURIComponent(applicationId)}/backend/status`)).body as { state: string; lastFailure: string | null };
  const appGraphql = (applicationId: string, query: string, variables: Record<string, unknown>) =>
    rest("POST", `/applications/${encodeURIComponent(applicationId)}/backend/graphql`, { requestContext: { applicationId }, request: { query, variables } });
  /** Processes this test's server spawned (it runs in this process), optionally only those whose command has `needle`. */
  const childPids = (needle = ""): number[] => execFileSync("ps", ["-A", "-o", "pid=,ppid=,command="], { encoding: "utf8" }).split("\n")
    .map((line) => line.trim().match(/^(\d+)\s+(\d+)\s+(.*)$/)).filter((m): m is RegExpMatchArray => Boolean(m))
    .filter((m) => Number(m[2]) === process.pid && m[3].includes(needle)).map((m) => Number(m[1]));
  /** The application's worker process. */
  const workerPids = () => childPids("application-worker-entry");
  const until = async <T>(read: () => Promise<T>, done: (value: T) => boolean, label: string, timeoutMs = 30_000): Promise<T> => {
    const deadline = Date.now() + timeoutMs;
    let value = await read();
    while (!done(value)) {
      if (Date.now() > deadline) throw new Error(`${label}: last value ${JSON.stringify(value).slice(0, 400)}`);
      await new Promise((resolve) => setTimeout(resolve, 250));
      value = await read();
    }
    return value;
  };

  beforeAll(async () => {
    assertBriefStudioPackageBuilt();
    states.set("codex-account", "signedIn");
    states.set("codex-models", MODEL);
    // No AUTOBYTEUS_APPLICATION_PACKAGE_ROOTS: the application is imported while the server runs.
    fs.writeFileSync(path.join(fake.dataDir, ".env"), "AUTOBYTEUS_SERVER_HOST=http://localhost:8000\nAPP_ENV=test\n");
    appConfigProvider.config.setCustomAppDataDir(fake.dataDir);
    sources = installVendorSourceStub();
    const started = await startStudioE2eRuntimeServer();
    fastify = started.fastify;
    url = started.mainUrl;
    client = createGraphqlClient(url, sources.realFetch);
  }, 120_000);

  afterAll(async () => {
    await fastify?.close();
    sources?.restore();
    // Let workers that were still starting finish before their commands are removed.
    await new Promise((resolve) => setTimeout(resolve, 500));
    fake.dispose();
  }, 120_000);

  it("RE-01 an ACTIVE application stays usable after a package reload (AC-001)", async () => {
    imported = await importBriefStudio();
    await expectUsable(imported.applicationId, "after import");

    await gql(`mutation($packageId: String!) { reloadApplicationPackage(packageId: $packageId) { packageId } }`,
      { packageId: imported.packageId });
    await expectUsable(imported.applicationId, "after package reload");
  }, 240_000);

  it("RE-02 a repair of an ACTIVE application answers ACTIVE and keeps it usable (AC-002)", async () => {
    expect(imported, "RE-01 imported the application").not.toBeNull();
    try {
      const repaired = await repair(imported!.applicationId);
      expect(repaired.status, brief(repaired.body)).toBe(200);
      expect(repaired.body, brief(repaired.body)).toMatchObject({ applicationId: imported!.applicationId, state: "ACTIVE", detail: null });
      await expectUsable(imported!.applicationId, "after repair");
    } finally {
      // RE-03 imports the package again, signed out.
      await gql(`mutation($packageId: String!) { removeApplicationPackage(packageId: $packageId) { packageId } }`,
        { packageId: imported!.packageId });
    }
  }, 240_000);

  it("RE-03 imported while Codex is signed out, it is quarantined with the reason; after sign-in a repair returns it to ACTIVE (AC-003, AC-004)", async () => {
    states.set("codex-account", "signedOut");
    try {
      imported = await importBriefStudio();
      const { applicationId } = imported;
      const quarantined = await rest("GET", `/applications/${encodeURIComponent(applicationId)}/execution-resource-configurations`);
      expect(quarantined.status, brief(quarantined.body)).toBe(503);
      expect(quarantined.body.availabilityState).toBe("QUARANTINED");
      expect(String(quarantined.body.detail)).toContain("Application setup is required:");
      expect(String(quarantined.body.detail)).toContain("Codex authentication is unavailable");

      states.set("codex-account", "signedIn");
      const repaired = await repair(applicationId);
      expect(repaired.status, brief(repaired.body)).toBe(200);
      expect(repaired.body, brief(repaired.body)).toMatchObject({ applicationId, state: "ACTIVE", detail: null });
      await expectUsable(applicationId, "after sign-in repair");
    } finally {
      states.set("codex-account", "signedIn");
    }
  }, 240_000);
  it("RE-04 after the worker process crashes, a repair resets it to stopped and the application is usable again (MP-001)", async () => {
    expect(imported, "RE-03 left the application ACTIVE").not.toBeNull();
    const { applicationId } = imported!;
    const ready = await rest("POST", `/applications/${encodeURIComponent(applicationId)}/backend/ensure-ready`);
    expect(ready.body.state, brief(ready.body)).toBe("ready");
    const pids = workerPids();
    expect(pids, "exactly one worker process of this server").toHaveLength(1);
    process.kill(pids[0]!, "SIGKILL");
    const crashed = await until(() => status(applicationId), (value) => value.state === "failed", "worker reported failed");
    expect(crashed.lastFailure).toContain("Application worker exited unexpectedly");

    const repaired = await repair(applicationId);
    expect(repaired.body, brief(repaired.body)).toMatchObject({ applicationId, state: "ACTIVE", detail: null });
    expect((await status(applicationId)).state).toBe("stopped");
    await expectUsable(applicationId, "after crash and repair");
    expect(workerPids(), "a new worker process").toHaveLength(1);
    expect(workerPids()[0]).not.toBe(pids[0]);
  }, 240_000);

  it("RE-05 a run event recorded while the application is quarantined is dispatched after a repair makes it ACTIVE (BEH-002)", async () => {
    expect(imported, "RE-04 left the application ACTIVE").not.toBeNull();
    const { applicationId, packageId } = imported!;
    const created = await appGraphql(applicationId, `mutation($input: CreateBriefInput!) { createBrief(input: $input) { briefId } }`,
      { input: { title: "Pending event brief" } });
    const briefId = created.body.result.data.createBrief.briefId as string;
    const before = new Set(childPids());
    const launched = await appGraphql(applicationId, `mutation($input: LaunchDraftRunInput!) { launchDraftRun(input: $input) { runId status } }`,
      { input: { briefId } });
    expect(launched.body.result.data.launchDraftRun.status, brief(launched.body)).toBe("ATTACHED");
    const runId = launched.body.result.data.launchDraftRun.runId as string;
    const readBrief = async () => (await appGraphql(applicationId, `query($briefId: String!) { brief(briefId: $briefId) { briefId latestRunId latestBindingStatus lastErrorMessage } }`, { briefId })).body.result.data.brief;
    await until(readBrief, (value) => value?.latestRunId === runId && value?.latestBindingStatus === "ATTACHED", "the brief records the live run");
    // The drafting run's Codex runtime: the app-server process this server started for the run.
    const runtimePids = await until(async () => childPids("app-server").filter((pid) => !before.has(pid)), (pids) => pids.length === 1, "the run's runtime process");

    states.set("codex-account", "signedOut");
    try {
      // A package reload while Codex is signed out quarantines the application with its reason.
      await gql(`mutation($packageId: String!) { reloadApplicationPackage(packageId: $packageId) { packageId } }`, { packageId });
      const quarantined = await rest("GET", `/applications/${encodeURIComponent(applicationId)}/execution-resource-configurations`);
      expect(quarantined.status, brief(quarantined.body)).toBe(503);
      expect(String(quarantined.body.detail)).toContain("Codex authentication is unavailable");
      // The run's runtime process dies while the application is quarantined: the run's event waits for dispatch.
      process.kill(runtimePids[0]!, "SIGKILL");
      await until(async () => childPids("app-server").includes(runtimePids[0]!), (alive) => !alive, "the runtime process is gone");
    } finally {
      states.set("codex-account", "signedIn");
    }

    const repaired = await repair(applicationId);
    expect(repaired.body, brief(repaired.body)).toMatchObject({ applicationId, state: "ACTIVE", detail: null });
    // No application call after the repair: only the resumed dispatch starts the worker.
    await until(() => status(applicationId), (value) => value.state === "ready", "the dispatch drain started the worker");
    const projected = await until(readBrief, (value) => value?.latestBindingStatus !== "ATTACHED", "the brief shows the run's end");
    expect(projected, JSON.stringify(projected)).toMatchObject({ briefId, latestRunId: runId, latestBindingStatus: "FAILED" });
    expect(String(projected.lastErrorMessage)).toContain("Codex app server process closed unexpectedly");
  }, 240_000);
});
