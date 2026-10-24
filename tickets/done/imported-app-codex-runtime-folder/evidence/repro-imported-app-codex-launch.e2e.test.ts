/**
 * TEMPORARY reproduction probe (autobyteus-238); not committed in the test tree.
 * An application imported while the server runs, with Codex as its launch runtime, must be launchable without a restart.
 *
 * Command (resolved temp HOME, TESTING.md):
 *   env -i PATH="$PATH" HOME="$(cd "$(mktemp -d)" && pwd -P)" TMPDIR="$TMPDIR" \
 *     pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/zz-probe-imported-app-codex-launch.e2e.test.ts --no-watch
 */
import "reflect-metadata";
import fs from "node:fs";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type { FastifyInstance } from "fastify";
import { appConfigProvider } from "../../../src/config/app-config-provider.js";
import { startStudioE2eRuntimeServer } from "../helpers/studio-runtime-test-server.js";
import { createGraphqlClient, fakeRuntimeState, installVendorSourceStub } from "../helpers/agent-runtimes-e2e-harness.js";
import { until } from "../helpers/agy-runtime-error-fixture.js";

const fake = await vi.hoisted(async () => {
  const { prepareFakeRuntimes } = await import("../helpers/agent-runtimes-e2e-harness.js");
  return prepareFakeRuntimes({ label: "imported-app-codex-e2e", grokInstalled: true });
});

const BRIEF_STUDIO_PACKAGE = path.resolve(process.cwd(), "..", "applications/brief-studio/dist/importable-package");
const packageBuilt = fs.existsSync(path.join(BRIEF_STUDIO_PACKAGE, "applications", "brief-studio", "application.json"));
const MODEL = "gpt-5.6-luna";

describe.skipIf(!packageBuilt)("probe: Codex-default application imported while the server runs", () => {
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
  const rest = async (method: "GET" | "POST", route: string, body?: unknown) => {
    const response = await sources.realFetch(new URL(`/rest${route}`, url), {
      method, headers: body === undefined ? {} : { "content-type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const text = await response.text();
    return { status: response.status, body: text ? JSON.parse(text) : null };
  };
  const threadStarts = () => (states.read("app-server-requests.log") ?? "").split("\n").filter((m) => m === "thread/start").length;

  beforeAll(async () => {
    states.set("codex-account", "signedIn");
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

  it("imports Brief Studio, reads it as runnable and launches its Codex drafting team", async () => {
    const imported = await gql(`mutation($input: ImportApplicationPackageInput!) { importApplicationPackage(input: $input) { packageId applicationCount } }`,
      { input: { sourceKind: "LOCAL_PATH", source: BRIEF_STUDIO_PACKAGE } });
    expect(imported.importApplicationPackage.some((pkg: any) => pkg.applicationCount > 0)).toBe(true);
    const apps = await gql(`{ listApplications { id localApplicationId } }`);
    const applicationId = apps.listApplications.find((app: any) => app.localApplicationId === "brief-studio").id as string;
    const id = encodeURIComponent(applicationId);

    const view = await rest("GET", `/applications/${id}/execution-resource-configurations`);
    expect(view.status, JSON.stringify(view.body).slice(0, 2000)).toBe(200);
    expect(view.body.readiness).toEqual({ status: "RUNNABLE", issues: [] });

    const ensured = await rest("POST", `/applications/${id}/backend/ensure-ready`);
    expect(ensured.status, JSON.stringify(ensured.body)).toBe(200);
    const appGraphql = (query: string, variables: Record<string, unknown>) =>
      rest("POST", `/applications/${id}/backend/graphql`, { requestContext: { applicationId }, request: { query, variables } });
    const brief = await appGraphql(`mutation($input: CreateBriefInput!) { createBrief(input: $input) { briefId } }`, { input: { title: "Imported app brief" } });
    expect(brief.status, JSON.stringify(brief.body)).toBe(200);
    const before = threadStarts();
    const launched = await appGraphql(`mutation($input: LaunchDraftRunInput!) { launchDraftRun(input: $input) { runId status } }`,
      { input: { briefId: brief.body.result.data.createBrief.briefId } });
    expect(launched.status, JSON.stringify(launched.body)).toBe(200);
    expect(launched.body.result.errors).toBeUndefined();
    expect(launched.body.result.data.launchDraftRun.status).toBe("ATTACHED");
    await until(() => threadStarts() === before + 1, "the coordinator's Codex thread started");
  }, 180_000);
});
