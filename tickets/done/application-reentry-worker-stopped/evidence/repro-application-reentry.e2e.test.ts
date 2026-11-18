/**
 * TEMPORARY reproduction probe (autobyteus-296); not committed in the test tree.
 * Real studio server over HTTP, scripted runtime CLIs (no model, no account). Brief Studio's importable package is built
 * by `pnpm -C autobyteus-server-ts test:integration:prepare`.
 *   RR: an imported, ACTIVE Brief Studio stays usable after a package reload (GraphQL `reloadApplicationPackage`, as the
 *       devkit sends it) and after the app-scoped repair (`POST /rest/applications/:id/backend/reload`).
 *   SO: an application imported while Codex is signed out is quarantined with the reason; after sign-in, the repair
 *       returns it to ACTIVE without a restart.
 * Command: env -i PATH="$PATH" HOME="$(cd "$(mktemp -d)" && pwd -P)" TMPDIR="$TMPDIR" \
 *   pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/zz-probe-application-reentry.e2e.test.ts --no-watch
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
  return prepareFakeRuntimes({ label: "ab296-reentry", grokInstalled: true });
});
const BRIEF_STUDIO_PACKAGE = path.resolve(process.cwd(), "..", "applications/brief-studio/dist/importable-package");
const packageBuilt = fs.existsSync(path.join(BRIEF_STUDIO_PACKAGE, "applications", "brief-studio", "application.json"));

describe.skipIf(!packageBuilt)("probe: application reload and repair (autobyteus-296)", () => {
  const states = fakeRuntimeState(fake.stateDir);
  let fastify: FastifyInstance; let url: URL; let sources: ReturnType<typeof installVendorSourceStub>;
  let client: ReturnType<typeof createGraphqlClient>;
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
  const show = (label: string, r: { status: number; body: unknown }) =>
    console.log(`[AB296] ${label}`, r.status, JSON.stringify(r.body).replace(/bundle-app__[0-9a-f_]*/g, "<id>").slice(0, 400));
  const importBrief = async () => {
    const imported = await gql(`mutation($input: ImportApplicationPackageInput!) { importApplicationPackage(input: $input) { packageId applicationCount } }`,
      { input: { sourceKind: "LOCAL_PATH", source: BRIEF_STUDIO_PACKAGE } });
    const pkg = imported.importApplicationPackage.find((entry: any) => entry.applicationCount > 0);
    const apps = await gql(`{ listApplications { id localApplicationId packageId } }`);
    const app = apps.listApplications.find((entry: any) => entry.localApplicationId === "brief-studio");
    return { packageId: pkg.packageId as string, applicationId: app.id as string };
  };
  const usable = async (applicationId: string, label: string) => {
    const id = encodeURIComponent(applicationId);
    const view = await rest("GET", `/applications/${id}/execution-resource-configurations`); show(`${label}: launch settings`, view);
    expect(view.status, JSON.stringify(view.body).slice(0, 400)).toBe(200);
    const ensured = await rest("POST", `/applications/${id}/backend/ensure-ready`); show(`${label}: ensure-ready`, ensured);
    expect(ensured.status, JSON.stringify(ensured.body).slice(0, 400)).toBe(200);
    const brief = await rest("POST", `/applications/${id}/backend/graphql`, { requestContext: { applicationId },
      request: { query: `mutation($input: CreateBriefInput!) { createBrief(input: $input) { briefId } }`, variables: { input: { title: `AB296 ${label}` } } } });
    show(`${label}: app graphql`, brief);
    expect(brief.status).toBe(200);
    expect(brief.body.result.errors).toBeUndefined();
  };

  beforeAll(async () => {
    states.set("codex-account", "signedIn"); states.set("codex-models", "gpt-5.6-luna");
    fs.writeFileSync(path.join(fake.dataDir, ".env"), "AUTOBYTEUS_SERVER_HOST=http://localhost:8000\nAPP_ENV=test\n");
    appConfigProvider.config.setCustomAppDataDir(fake.dataDir);
    sources = installVendorSourceStub();
    const started = await startStudioE2eRuntimeServer(); fastify = started.fastify; url = started.mainUrl;
    client = createGraphqlClient(url, sources.realFetch);
  }, 120_000);
  afterAll(async () => { await fastify?.close(); sources?.restore(); await new Promise((r) => setTimeout(r, 500)); fake.dispose(); }, 120_000);

  it("RR: an ACTIVE application stays usable after a package reload and after a repair", async () => {
    const { packageId, applicationId } = await importBrief();
    try {
      await usable(applicationId, "after import");
      const reloaded = await client.post(`mutation($packageId: String!) { reloadApplicationPackage(packageId: $packageId) { packageId } }`, { packageId });
      console.log("[AB296] reload errors", JSON.stringify(reloaded.errors ?? null).slice(0, 300));
      const afterReload = await rest("GET", `/applications/${encodeURIComponent(applicationId)}/execution-resource-configurations`);
      show("after package reload: launch settings (soft)", afterReload);
      const repaired = await rest("POST", `/applications/${encodeURIComponent(applicationId)}/backend/reload`); show("repair", repaired);
      expect(afterReload.status, "package reload keeps it usable").toBe(200);
      expect(repaired.body?.state, JSON.stringify(repaired.body).slice(0, 400)).toBe("ACTIVE");
      await usable(applicationId, "after repair");
    } finally {
      await gql(`mutation($packageId: String!) { removeApplicationPackage(packageId: $packageId) { packageId } }`, { packageId });
    }
  }, 240_000);

  it("SO: imported while Codex is signed out, it says why; after sign-in, the repair returns it to ACTIVE", async () => {
    states.set("codex-account", "signedOut");
    const { applicationId } = await importBrief();
    const id = encodeURIComponent(applicationId);
    const quarantined = await rest("GET", `/applications/${id}/execution-resource-configurations`); show("signed-out import: launch settings", quarantined);
    expect(quarantined.status).toBe(503);
    expect(String(quarantined.body?.detail)).toContain("Codex authentication is unavailable");
    states.set("codex-account", "signedIn");
    const repaired = await rest("POST", `/applications/${id}/backend/reload`); show("repair after sign-in", repaired);
    expect(repaired.body?.state, JSON.stringify(repaired.body).slice(0, 400)).toBe("ACTIVE");
    await usable(applicationId, "after sign-in repair");
  }, 240_000);
});
