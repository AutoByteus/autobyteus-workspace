/**
 * Reproduction (autobyteus-238 API/E2E, API-06; evidence only, not in the test tree): a package reload (GraphQL
 * `reloadApplicationPackage`, as the application devkit sends it) of an ACTIVE Brief Studio leaves it QUARANTINED with
 * "Application '<id>' is currently reentering. Please retry after repair/reload completes.", and so does the documented
 * app-scoped repair (`POST /rest/applications/:id/backend/reload`). The same on base 1138e8fbef and on the fix.
 * Cause (measured with a temporary stack diagnostic): during reentry, `ApplicationReentryService.recoverParticipants` runs
 * `engineLauncher.ensureReady`; the started Brief Studio worker calls the host's `listRunBindings`
 * (`ApplicationEngineClient.handleWorkerRequest` -> `ApplicationOrchestrationHostService.listRunBindings` ->
 * `requireApplicationActive`), which refuses because the application is REENTERING; the error quarantines it.
 * Brief Studio is loaded at startup here, so its runtime folder exists without the ticket's change.
 * Command: copy to autobyteus-server-ts/tests/e2e/runtime/, then
 *   env -i PATH="$PATH" HOME="$(cd "$(mktemp -d)" && pwd -P)" TMPDIR="$TMPDIR" pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/<file> --no-watch
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
  return prepareFakeRuntimes({ label: "repro-ab238-reload-reentry", grokInstalled: true });
});
const BRIEF_STUDIO_PACKAGE = path.resolve(process.cwd(), "..", "applications/brief-studio/dist/importable-package");

describe("reproduction: reload and repair of an ACTIVE Brief Studio keep it usable", () => {
  const states = fakeRuntimeState(fake.stateDir);
  let fastify: FastifyInstance; let url: URL; let sources: ReturnType<typeof installVendorSourceStub>; let client: ReturnType<typeof createGraphqlClient>;
  const rest = async (method: "GET" | "POST", route: string) => {
    const response = await sources.realFetch(new URL(`/rest${route}`, url), { method });
    const text = await response.text();
    return { status: response.status, body: text ? JSON.parse(text) : null };
  };
  const show = (label: string, r: { status: number; body: unknown }) =>
    console.log(`[AB238-PROBE] ${label}`, r.status, JSON.stringify(r.body).replace(/bundle-app__[0-9a-f_]*/g, "<id>").slice(0, 300));
  beforeAll(async () => {
    states.set("codex-account", "signedIn"); states.set("codex-models", "gpt-5.6-luna");
    fs.writeFileSync(path.join(fake.dataDir, ".env"), `AUTOBYTEUS_SERVER_HOST=http://localhost:8000\nAPP_ENV=test\nAUTOBYTEUS_APPLICATION_PACKAGE_ROOTS=${BRIEF_STUDIO_PACKAGE}\n`);
    appConfigProvider.config.setCustomAppDataDir(fake.dataDir);
    sources = installVendorSourceStub();
    const started = await startStudioE2eRuntimeServer(); fastify = started.fastify; url = started.mainUrl;
    client = createGraphqlClient(url, sources.realFetch);
  }, 120_000);
  afterAll(async () => { await fastify?.close(); sources?.restore(); await new Promise((r) => setTimeout(r, 500)); fake.dispose(); }, 120_000);
  it("a package reload, then a repair, leave the application ACTIVE and its launch settings readable", async () => {
    const apps = (await client.post(`{ listApplications { id packageId localApplicationId } }`)).data.listApplications;
    const app = apps.find((entry: any) => entry.localApplicationId === "brief-studio");
    const id = encodeURIComponent(app.id);
    const view = () => rest("GET", `/applications/${id}/execution-resource-configurations`);
    const before = await view(); show("startup view", before);
    expect(before.status).toBe(200);
    const reloaded = await client.post(`mutation($packageId: String!) { reloadApplicationPackage(packageId: $packageId) { packageId } }`, { packageId: app.packageId });
    console.log("[AB238-PROBE] reload errors", JSON.stringify(reloaded.errors ?? null).slice(0, 300));
    const afterReload = await view(); show("after package reload", afterReload);
    expect(afterReload.status, JSON.stringify(afterReload.body).slice(0, 400)).toBe(200);
    const repaired = await rest("POST", `/applications/${id}/backend/reload`); show("repair", repaired);
    expect(repaired.body.state, JSON.stringify(repaired.body).slice(0, 400)).toBe("ACTIVE");
  }, 180_000);
});
