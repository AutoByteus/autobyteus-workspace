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
 * Command (resolved temp HOME, TESTING.md):
 *   env -i PATH="$PATH" HOME="$(cd "$(mktemp -d)" && pwd -P)" TMPDIR="$TMPDIR" \
 *     pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/application-reload-repair.e2e.test.ts --no-watch
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
  return prepareFakeRuntimes({ label: "application-reload-repair-e2e", grokInstalled: true });
});

const BRIEF_STUDIO_PACKAGE = path.resolve(process.cwd(), "..", "applications/brief-studio/dist/importable-package");
const packageBuilt = fs.existsSync(path.join(BRIEF_STUDIO_PACKAGE, "applications", "brief-studio", "application.json"));
const MODEL = "gpt-5.6-luna";

describe.skipIf(!packageBuilt)("Application reload and repair (real studio server, Brief Studio, scripted CLIs)", () => {
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

  beforeAll(async () => {
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
      const { applicationId } = await importBriefStudio();
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
});
