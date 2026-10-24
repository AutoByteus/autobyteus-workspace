/**
 * An application imported while its Codex runtime is signed out recovers without a server restart once Codex is
 * signed in (autobyteus-238, SCN-001 alternate and SCN-003). The catalog transition prepares the application's runtime
 * folder before launch readiness on import and on reload, so the documented repair (app-scoped reload, `POST
 * /rest/applications/:id/backend/reload`) and a package reload (GraphQL `reloadApplicationPackage`, as the application
 * devkit's studio client sends it) read Codex's real sign-in instead of failing to spawn Codex in a missing folder (ENOENT).
 *
 * Real studio server over HTTP, started without the package (no AUTOBYTEUS_APPLICATION_PACKAGE_ROOTS) on its own data
 * root, so the application's runtime folder does not exist before the import. Brief Studio's importable package is
 * built by `pnpm -C autobyteus-server-ts test:integration:prepare`. The runtime CLIs are the scripted
 * `tests/fixtures/agent-runtimes-fake-cli.mjs`; no model, no account, no network.
 *
 * Cases:
 *   IR-01 Import while Codex is signed out: the application is quarantined (503); a repair while still signed out keeps
 *         it blocked; after sign-in the repair makes it ACTIVE and its launch settings read RUNNABLE; a package Reload
 *         keeps it RUNNABLE.
 *
 * Command (resolved temp HOME, TESTING.md):
 *   env -i PATH="$PATH" HOME="$(cd "$(mktemp -d)" && pwd -P)" TMPDIR="$TMPDIR" \
 *     pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/application-import-signed-out-recovery.e2e.test.ts --no-watch
 */
import "reflect-metadata";
import fs from "node:fs";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type { FastifyInstance } from "fastify";
import { appConfigProvider } from "../../../src/config/app-config-provider.js";
import { startStudioE2eRuntimeServer } from "../helpers/studio-runtime-test-server.js";
import { createGraphqlClient, fakeRuntimeState, installVendorSourceStub } from "../helpers/agent-runtimes-e2e-harness.js";

const fake = await vi.hoisted(async () => {
  const { prepareFakeRuntimes } = await import("../helpers/agent-runtimes-e2e-harness.js");
  return prepareFakeRuntimes({ label: "imported-app-signed-out-e2e", grokInstalled: true });
});

const BRIEF_STUDIO_PACKAGE = path.resolve(process.cwd(), "..", "applications/brief-studio/dist/importable-package");
const packageBuilt = fs.existsSync(path.join(BRIEF_STUDIO_PACKAGE, "applications", "brief-studio", "application.json"));
const MODEL = "gpt-5.6-luna";

describe.skipIf(!packageBuilt)("Codex-default application imported while Codex is signed out (real studio server, Brief Studio, scripted CLIs)", () => {
  const states = fakeRuntimeState(fake.stateDir);
  let fastify: FastifyInstance;
  let url: URL;
  let sources: ReturnType<typeof installVendorSourceStub>;
  let client: ReturnType<typeof createGraphqlClient>;

  const gql = async (query: string, variables?: Record<string, unknown>) => {
    const result = await client.post(query, variables);
    if (result.errors?.length) throw new Error(JSON.stringify(result.errors));
    return result.data;
  };
  const rest = async (method: "GET" | "POST", route: string) => {
    const response = await sources.realFetch(new URL(`/rest${route}`, url), { method });
    const text = await response.text();
    return { status: response.status, body: text ? JSON.parse(text) : null };
  };

  beforeAll(async () => {
    states.set("codex-account", "signedOut");
    states.set("codex-models", MODEL);
    // No AUTOBYTEUS_APPLICATION_PACKAGE_ROOTS: the application is not present at startup.
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
    await new Promise((resolve) => setTimeout(resolve, 500));
    fake.dispose();
  }, 120_000);

  it("IR-01 is quarantined on a signed-out import and becomes runnable after sign-in through repair and package Reload, without a restart", async () => {
    await gql(`mutation($input: ImportApplicationPackageInput!) { importApplicationPackage(input: $input) { packageId } }`,
      { input: { sourceKind: "LOCAL_PATH", source: BRIEF_STUDIO_PACKAGE } });
    const apps = await gql(`{ listApplications { id localApplicationId packageId } }`);
    const app = apps.listApplications.find((entry: any) => entry.localApplicationId === "brief-studio");
    const id = encodeURIComponent(app.id as string);
    const view = () => rest("GET", `/applications/${id}/execution-resource-configurations`);

    // Signed out at import: the transition finds the application not ready (today's generic detail, FU-002).
    const quarantined = await view();
    expect(quarantined.status).toBe(503);
    expect(quarantined.body.availabilityState, JSON.stringify(quarantined.body)).toBe("QUARANTINED");

    // A repair while Codex is still signed out keeps it blocked (a really signed-out Codex still blocks).
    const stillSignedOut = await rest("POST", `/applications/${id}/backend/reload`);
    expect(stillSignedOut.status, JSON.stringify(stillSignedOut.body)).toBe(200);
    expect(stillSignedOut.body.state, JSON.stringify(stillSignedOut.body)).toBe("QUARANTINED");
    expect((await view()).status).toBe(503);

    // Signed in: the same repair reads the real sign-in in the runtime folder and returns the application to service.
    states.set("codex-account", "signedIn");
    const repaired = await rest("POST", `/applications/${id}/backend/reload`);
    expect(repaired.status, JSON.stringify(repaired.body)).toBe(200);
    expect(repaired.body.state, JSON.stringify(repaired.body)).toBe("ACTIVE");
    const runnable = await view();
    expect(runnable.status, JSON.stringify(runnable.body).slice(0, 2000)).toBe(200);
    expect(runnable.body.readiness).toEqual({ status: "RUNNABLE", issues: [] });

    // A package reload (the devkit's GraphQL `reloadApplicationPackage`) keeps it runnable.
    await gql(`mutation($packageId: String!) { reloadApplicationPackage(packageId: $packageId) { packageId } }`,
      { packageId: app.packageId });
    const reloaded = await view();
    expect(reloaded.status, JSON.stringify(reloaded.body).slice(0, 2000)).toBe(200);
    expect(reloaded.body.readiness).toEqual({ status: "RUNNABLE", issues: [] });
  }, 180_000);
});
