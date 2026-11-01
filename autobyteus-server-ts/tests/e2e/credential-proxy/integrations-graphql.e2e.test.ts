/**
 * The Integrations page's GraphQL on a real built server with its own data dir and vault (autobyteus-337): a fresh
 * node shows nothing; a folder is imported (cards with name, icon, state, skill, source and tools); every folder refusal
 * is coded; the sources view; the Skills page's "Integration" label (`integrationId`); removal from the Skills page or
 * the Integrations page removes the cards and leaves the folder's files; connect, test and disconnect refuse what they
 * must; and the GitHub card's API and the agent ticks are gone (AC-005). Needs no GitHub: connecting with a real token
 * is the live test's job (`github-credential-proxy-live.e2e.test.ts`).
 * Prerequisite: a current build (`pnpm -C autobyteus-server-ts build`).
 */
import fs from "node:fs";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  removeOwnedTestRuntime,
  resolveTestDatabaseLocation,
  startBuiltTestServer,
  testRuntimeRoot,
} from "../../../../test-support/live-e2e/test-runtime-bootstrap.mjs";

type RunningTestServer = Awaited<ReturnType<typeof startBuiltTestServer>>;
type GraphqlError = { message: string; extensions?: Record<string, unknown> };
type GraphqlBody<T> = { data?: T | null; errors?: GraphqlError[] };

const CARD_FIELDS = "id name description iconDataUrl state login connectedAt tokenHelp skillName source { sourceId kind label } tools { tool found }";
const SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><circle cx="8" cy="8" r="7"/></svg>';

describe("Integrations GraphQL (built server)", () => {
  const suffix = `${process.pid}-${Date.now()}`;
  const runtimeRoot = path.join(testRuntimeRoot, `integrations-graphql-${suffix}`);
  const database = resolveTestDatabaseLocation(`file:./db/integrations-graphql-${suffix}.db`);
  const folders = path.join(testRuntimeRoot, `integrations-graphql-folders-${suffix}`);
  const integrationFolder = path.join(folders, "my-integrations");
  const plainFolder = path.join(folders, "plain-skills");
  let server: RunningTestServer;

  const gql = async <T>(query: string, variables: Record<string, unknown> = {}): Promise<GraphqlBody<T>> => {
    const response = await fetch(`${server.serverUrl}/graphql`, {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ query, variables }),
    });
    return await response.json() as GraphqlBody<T>;
  };
  const errorOf = (body: GraphqlBody<unknown>) => body.errors?.[0]?.extensions ?? null;
  const importLocation = (location: string) => gql<{ importIntegrations: Array<Record<string, unknown>> }>(
    `mutation($location: String!) { importIntegrations(location: $location) { ${CARD_FIELDS} } }`, { location });

  beforeAll(async () => {
    fs.mkdirSync(path.join(integrationFolder, "github"), { recursive: true });
    fs.writeFileSync(path.join(integrationFolder, "github", "integration.json"), JSON.stringify({
      name: "GitHub", description: "Work with GitHub issues.",
      token: { help: "Create a token at https://github.com/settings/tokens." }, prerequisites: ["curl", "definitely-not-a-tool-337"],
    }));
    fs.writeFileSync(path.join(integrationFolder, "github", "SKILL.md"), "---\nname: github-integration\ndescription: GitHub.\n---\n\nBody.\n");
    fs.writeFileSync(path.join(integrationFolder, "github", "icon.svg"), SVG);
    fs.mkdirSync(path.join(integrationFolder, "notes"), { recursive: true });
    fs.writeFileSync(path.join(integrationFolder, "notes", "SKILL.md"), "---\nname: plain-notes-337\ndescription: Notes.\n---\n\nBody.\n");
    fs.mkdirSync(path.join(plainFolder, "only"), { recursive: true });
    fs.writeFileSync(path.join(plainFolder, "only", "SKILL.md"), "---\nname: only-a-skill-337\ndescription: Only.\n---\n\nBody.\n");
    server = await startBuiltTestServer({ runtimeRoot, databaseUrlOverride: database.databaseUrl });
  }, 180_000);

  afterAll(async () => {
    if (server?.child.exitCode === null) await server.stop();
    await removeOwnedTestRuntime(runtimeRoot, database);
    fs.rmSync(folders, { recursive: true, force: true });
  }, 60_000);

  it("shows nothing on a fresh node, and the GitHub card's API and agent ticks are gone", async () => {
    expect(await gql("query { integrations { id } integrationSources { sourceId } }"))
      .toEqual({ data: { integrations: [], integrationSources: [] } });
    for (const [removed, field] of [
      ["query { githubIntegration { connected } }", "githubIntegration"],
      ['mutation { setGitHubIntegrationAgentAccess(agentDefinitionIds: ["a"]) { connected } }', "setGitHubIntegrationAgentAccess"],
      ['mutation { connectGitHubIntegration(token: "x") { connected } }', "connectGitHubIntegration"],
    ] as const) {
      const body = await gql(removed);
      expect(body.data ?? null).toBeNull();
      expect(body.errors?.[0]?.message).toContain(`Cannot query field "${field}"`);
    }
  });

  it("refuses a folder import that is not a path, missing, or without integrations, with codes", async () => {
    expect(errorOf(await importLocation("relative/folder"))).toMatchObject({ code: "NOT_A_LINK_OR_PATH" });
    expect(errorOf(await importLocation("https://example.com/owner/repo"))).toMatchObject({ code: "NOT_A_LINK_OR_PATH" });
    const missing = path.join(folders, "missing");
    expect(errorOf(await importLocation(missing))).toMatchObject({ code: "DIRECTORY_NOT_FOUND", path: missing });
    expect(errorOf(await importLocation(plainFolder))).toMatchObject({ code: "NO_INTEGRATIONS_FOUND", kind: "LOCAL_PATH" });
    expect((await gql<{ integrations: unknown[] }>("query { integrations { id } }")).data?.integrations).toEqual([]);
  });

  it("imports a folder: a card per integration, the sources view, and the Skills page's integration label", async () => {
    const imported = await importLocation(integrationFolder);
    expect(imported.errors).toBeUndefined();
    expect(imported.data?.importIntegrations).toEqual([{
      id: "github", name: "GitHub", description: "Work with GitHub issues.",
      iconDataUrl: `data:image/svg+xml;base64,${Buffer.from(SVG).toString("base64")}`,
      state: "NEEDS_TOKEN", login: null, connectedAt: null, tokenHelp: "Create a token at https://github.com/settings/tokens.",
      skillName: "github-integration", source: { sourceId: `local:${integrationFolder}`, kind: "LOCAL_PATH", label: integrationFolder },
      tools: [{ tool: "curl", found: true }, { tool: "definitely-not-a-tool-337", found: false }],
    }]);
    expect(errorOf(await importLocation(integrationFolder))).toMatchObject({ code: "ALREADY_IMPORTED", kind: "LOCAL_PATH" });

    const sources = await gql<{ integrationSources: unknown[] }>(
      "query { integrationSources { sourceId kind label location skillCount integrationIds integrationNames github { status } } }");
    expect(sources.data?.integrationSources).toEqual([{ sourceId: `local:${integrationFolder}`, kind: "LOCAL_PATH",
      label: integrationFolder, location: integrationFolder, skillCount: 2, integrationIds: ["github"], integrationNames: ["GitHub"], github: null }]);

    const skills = await gql<{ skills: Array<{ name: string; integrationId: string | null }> }>("query { skills { name integrationId } }");
    const byName = new Map(skills.data!.skills.map((skill) => [skill.name, skill.integrationId]));
    expect(byName.get("github-integration")).toBe("github");
    expect(byName.get("plain-notes-337")).toBeNull();
  });

  it("refuses connect, test and disconnect where it must, without contacting GitHub", async () => {
    expect(errorOf(await gql('mutation { testIntegration(id: "github") { state } }'))).toMatchObject({ code: "INTEGRATION_NOT_CONNECTED" });
    expect(errorOf(await gql('mutation { connectIntegration(id: "github", token: "  ") { state } }'))).toMatchObject({ code: "TOKEN_REQUIRED" });
    expect(errorOf(await gql('mutation { connectIntegration(id: "jira", token: "x") { state } }'))).toMatchObject({ code: "INTEGRATION_NOT_FOUND" });
    expect((await gql('mutation { disconnectIntegration(id: "github") { id state } }')).data)
      .toEqual({ disconnectIntegration: { id: "github", state: "NEEDS_TOKEN" } });
  });

  it("removes the cards when the source is removed on the Skills page or the Integrations page; the files stay", async () => {
    const removedOnSkills = await gql('mutation($path: String!) { removeSkillSource(path: $path) { path } }', { path: integrationFolder });
    expect(removedOnSkills.errors).toBeUndefined();
    expect((await gql<{ integrations: unknown[] }>("query { integrations { id } }")).data?.integrations).toEqual([]);
    expect(fs.existsSync(path.join(integrationFolder, "github", "integration.json"))).toBe(true);

    await importLocation(integrationFolder);
    const removal = await gql('mutation($id: String!) { removeIntegrationSource(sourceId: $id) { removedConnectionNames } }',
      { id: `local:${integrationFolder}` });
    expect(removal).toEqual({ data: { removeIntegrationSource: { removedConnectionNames: [] } } });
    expect((await gql<{ integrationSources: unknown[] }>("query { integrationSources { sourceId } }")).data?.integrationSources).toEqual([]);
    expect(fs.existsSync(path.join(integrationFolder, "github", "SKILL.md"))).toBe(true);
  });
});
