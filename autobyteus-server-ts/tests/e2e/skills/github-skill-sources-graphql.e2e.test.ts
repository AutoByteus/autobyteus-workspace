import "reflect-metadata";
import { runtimeFixture } from "./github-skill-runtime-harness.js";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { create } from "tar";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { graphql as graphqlFn, GraphQLSchema } from "graphql";
import { buildGraphqlSchema } from "../../../src/api/graphql/schema.js";
import { appConfigProvider } from "../../../src/config/app-config-provider.js";
import { SkillService } from "../../../src/skills/services/skill-service.js";
import { SkillSourceService } from "../../../src/skills/services/skill-source-service.js";
import { GitHubSkillSourceStore } from "../../../src/skills/stores/github-skill-source-store.js";
import { GitHubSkillRepository } from "../../../src/skills/installers/github-skill-repository.js";
// Load the actual gql template text without importing Nuxt's graphql-tag alias into server tests.
const documentSource = fs.readFileSync(new URL("../../../../autobyteus-web/graphql/skillSources.ts", import.meta.url), "utf8");
const templates = Object.fromEntries([...documentSource.matchAll(/export const (\w+) = gql`([\s\S]*?)`/g)]
  .map((match) => [match[1]!, match[2]!]));
const documents = Object.fromEntries(Object.entries(templates).map(([key, body]) =>
  [key, body.replaceAll("${SKILL_SOURCE_FIELDS}", templates.SKILL_SOURCE_FIELDS!)]));

// AC-001–008: execute the actual renderer documents against the real schema/source owner,
// catalog, registry and archive extractor. Only GitHub HTTP responses are controlled.
// No real network/model calls, process restart, browser or production-adapter proof.
const url = "https://github.com/api-e2e/skills";
const a = "a".repeat(40), b = "b".repeat(40);
type Row = { sourceId: string; sourceKind: string; path: string; skillCount: number;
  github: null | { installedRevision: string; latestRevision: string; status: string } };
const writeSkill = (directory: string, name: string, content = "v1") => {
  fs.mkdirSync(directory, { recursive: true });
  fs.writeFileSync(path.join(directory, "SKILL.md"), `---\nname: ${name}\ndescription: API fixture\n---\n${content}\n`);
};

describe("GitHub skill sources through production GraphQL documents", () => {
  let schema: GraphQLSchema, graphql: typeof graphqlFn;
  let root: string, data: string, upstream: string, revision: string, offline: boolean;
  let requests: string[];
  const envKeys = ["AUTOBYTEUS_SKILLS_PATHS", "AUTOBYTEUS_AGENT_PACKAGE_ROOTS", "CODEX_HOME", "AUTOBYTEUS_MEMORY_DIR"];
  let env: Array<string | undefined>;
  beforeAll(async () => {
    schema = await buildGraphqlSchema();
    const require = createRequire(import.meta.url);
    const typeGraphqlRoot = path.dirname(require.resolve("type-graphql"));
    graphql = (await import(require.resolve("graphql", { paths: [typeGraphqlRoot] }))).graphql;
  });
  beforeEach(() => {
    env = envKeys.map(key => process.env[key]);
    for (const key of envKeys) delete process.env[key];
    root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "github-skill-api-")));
    data = path.join(root, "data");
    upstream = path.join(root, "wrapper");
    fs.mkdirSync(path.join(data, "skills"), { recursive: true });
    fs.writeFileSync(path.join(data, ".env"), "");
    process.env.CODEX_HOME = path.join(root, "codex-home");
    appConfigProvider.resetForTests();
    appConfigProvider.config.setCustomAppDataDir(data);
    SkillService.resetInstance(); SkillSourceService.resetInstance();
    writeSkill(upstream, "api-writer");
    revision = a; offline = false; requests = [];
    vi.stubGlobal("fetch", vi.fn(async (input: string | URL | Request) => {
      const target = String(input); requests.push(target);
      if (offline) throw new Error("controlled GitHub offline");
      if (target === "https://api.github.com/repos/api-e2e/skills") {
        return Response.json({ owner: { login: "api-e2e" }, name: "skills", private: false, default_branch: "main" });
      }
      if (target.endsWith("/branches/main")) return Response.json({ commit: { sha: revision } });
      if (target.startsWith("https://codeload.github.com/api-e2e/skills/tar.gz/")) {
        expect(target).toContain(revision);
        const archive = path.join(root, "remote.tar.gz");
        await create({ gzip: true, file: archive, cwd: root, portable: true }, ["wrapper"]);
        return new Response(fs.readFileSync(archive));
      }
      throw new Error(`Unexpected external request: ${target}`);
    }));
  });
  afterEach(() => {
    vi.restoreAllMocks(); vi.unstubAllGlobals();
    SkillSourceService.resetInstance(); SkillService.resetInstance(); appConfigProvider.resetForTests();
    envKeys.forEach((key, i) => { if (env[i] === undefined) delete process.env[key]; else process.env[key] = env[i]; });
    fs.rmSync(root, { recursive: true, force: true });
  });
  const run = (document: { loc?: { source: { body: string } } } | string, variables?: Record<string, unknown>) =>
    graphql({ schema, source: typeof document === "string" ? document : document.loc!.source.body, variableValues: variables });
  const exec = async (document: Parameters<typeof run>[0], variables?: Record<string, unknown>) => {
    const result = await run(document, variables);
    expect(result.errors).toBeUndefined();
    return result.data as Record<string, any>;
  };
  const imported = async () => {
    const result = await exec(documents.IMPORT_GITHUB_SKILL_SOURCE, { repositoryUrl: url });
    return result.importGitHubSkillSource.sources.find((row: Row) => row.github) as Row;
  };
  const catalog = async () => (await exec("{ skills { name content rootPath isDisabled } }")).skills;

  it("imports root/support files, reuses equivalent URLs, and retains all fields on query and Reload", async () => {
    writeSkill(path.join(upstream, "skills", "child"), "not-independent");
    fs.writeFileSync(path.join(upstream, "support.txt"), "support");
    const row = await imported();
    expect(row.skillCount).toBe(1);
    expect(row.sourceKind).toBe("GITHUB_REPOSITORY");
    expect(row.github).toMatchObject({ installedRevision: a, latestRevision: a, status: "UP_TO_DATE" });
    expect(fs.readFileSync(path.join(row.path, "support.txt"), "utf8")).toBe("support");
    expect((await catalog()).map((s: any) => s.name)).toEqual(["api-writer"]);
    const count = requests.length;
    const duplicate = await exec(documents.IMPORT_GITHUB_SKILL_SOURCE, { repositoryUrl: url + ".git/" });
    expect(duplicate.importGitHubSkillSource.warnings.join(" ")).toContain("Already imported");
    expect(requests).toHaveLength(count);
    const read = await exec(documents.GET_SKILL_SOURCES);
    expect(read.skillSources).toContainEqual(row); expect(read.skillSourceRegistryError).toBeNull();
    const reload = await exec(documents.RELOAD_SKILL_CATALOG);
    expect(reload.reloadSkillCatalog.skillSources).toContainEqual(row);
    expect(requests).toHaveLength(count); // Reload is local only.
    SkillSourceService.resetInstance(); SkillService.resetInstance(); // current-reader reconstruction, not process restart
    expect((await exec(documents.GET_SKILL_SOURCES)).skillSources).toContainEqual(row);
    expect(fs.existsSync(path.join(data, "agents"))).toBe(false);
  });

  it("checks without replacement, retains offline availability, and updates a collection with disabled choices", async () => {
    fs.rmSync(path.join(upstream, "SKILL.md"));
    writeSkill(path.join(upstream, "skills", "writer"), "api-writer");
    writeSkill(path.join(upstream, "removed"), "api-removed");
    const row = await imported();
    await exec('mutation { disableSkill(name: "api-writer") { name isDisabled } }');
    fs.writeFileSync(path.join(row.path, "local-edit"), "discard only on update");
    revision = b;
    const checked = await exec(documents.CHECK_GITHUB_SKILL_SOURCES, { sourceIds: [row.sourceId] });
    expect(checked.checkGitHubSkillSourceUpdates.sources.find((s: Row) => s.github).github.status).toBe("UPDATE_AVAILABLE");
    expect(requests.filter(u => u.includes("/tar.gz/"))).toHaveLength(1);
    offline = true;
    const failed = await exec(documents.CHECK_GITHUB_SKILL_SOURCES);
    expect(failed.checkGitHubSkillSourceUpdates.sources.find((s: Row) => s.github).github.status).toBe("CHECK_FAILED");
    const updateFailure = await run(documents.UPDATE_GITHUB_SKILL_SOURCE, { sourceId: row.sourceId });
    expect(updateFailure.errors?.[0]?.message).toContain("offline");
    expect(fs.readFileSync(path.join(row.path, "local-edit"), "utf8")).toContain("discard");
    expect((await catalog()).find((s: any) => s.name === "api-writer").isDisabled).toBe(true);
    offline = false;
    fs.rmSync(path.join(upstream, "removed"), { recursive: true });
    writeSkill(path.join(upstream, "skills", "writer"), "api-writer", "v2");
    writeSkill(path.join(upstream, "added"), "api-added");
    const updated = await exec(documents.UPDATE_GITHUB_SKILL_SOURCE, { sourceId: row.sourceId });
    expect(updated.updateGitHubSkillSource.sources.find((s: Row) => s.github).github.installedRevision).toBe(b);
    expect((await catalog()).map((s: any) => s.name).sort()).toEqual(["api-added", "api-writer"]);
    expect((await catalog()).find((s: any) => s.name === "api-writer")).toMatchObject({ content: "v2", isDisabled: true });
    expect(fs.existsSync(row.path)).toBe(false);
  });

  it("maps conflicts with both paths and rejects the whole source without partial publication", async () => {
    await exec('mutation { createSkill(input: {name: "api-writer", description: "local", content: "keep"}) { name } }');
    const result = await run(documents.IMPORT_GITHUB_SKILL_SOURCE, { repositoryUrl: url });
    expect(result.errors?.[0]?.extensions.code).toBe("SKILL_NAME_CONFLICT");
    expect(result.errors?.[0]?.extensions.conflicts).toEqual([expect.objectContaining({
      name: "api-writer", existingPath: path.join(data, "skills", "api-writer"), incomingPath: expect.any(String),
    })]);
    expect((await exec(documents.GET_SKILL_SOURCES)).skillSources.filter((s: Row) => s.github)).toEqual([]);
    expect((await catalog())[0].content).toBe("keep");
  });

  it("retains REMOVING after deletion fault and retries through the API after owner reconstruction", async () => {
    const row = await imported();
    const cleanup = vi.spyOn(GitHubSkillRepository.prototype, "cleanup").mockRejectedValue(new Error("controlled deletion denied"));
    const result = await run(documents.REMOVE_GITHUB_SKILL_SOURCE, { sourceId: row.sourceId });
    expect(result.errors?.[0]?.message).toContain("deletion denied");
    expect((await exec(documents.GET_SKILL_SOURCES)).skillSources.find((s: Row) => s.github).github.status).toBe("REMOVING");
    expect(await catalog()).toEqual([]);
    cleanup.mockRestore(); SkillSourceService.resetInstance(); SkillService.resetInstance();
    await exec(documents.REMOVE_GITHUB_SKILL_SOURCE, { sourceId: row.sourceId });
    expect((await exec(documents.GET_SKILL_SOURCES)).skillSources.filter((s: Row) => s.github)).toEqual([]);
    expect(fs.existsSync(row.path)).toBe(false); expect(fs.existsSync(upstream)).toBe(true);
  });

  it("keeps local mutations and Reload usable with a malformed managed registry without rewriting it", async () => {
    const store = new GitHubSkillSourceStore(data); store.ensureRoot();
    fs.writeFileSync(store.registryPath, "{invalid");
    const local = path.join(root, "local"); writeSkill(path.join(local, "reader"), "api-reader");
    const result = await exec(documents.ADD_SKILL_SOURCE, { path: local });
    expect(result.addSkillSource).toContainEqual(expect.objectContaining({ path: local, sourceKind: "LOCAL_PATH" }));
    const read = await exec(documents.GET_SKILL_SOURCES);
    expect(read.skillSourceRegistryError).toContain("unavailable");
    const reload = await exec(documents.RELOAD_SKILL_CATALOG);
    expect(reload.reloadSkillCatalog.skills.map((s: any) => s.name)).toEqual(["api-reader"]);
    expect(reload.reloadSkillCatalog.skillSourceRegistryError).toContain("unavailable");
    await exec(documents.REMOVE_SKILL_SOURCE, { path: local });
    expect(fs.existsSync(path.join(local, "reader", "SKILL.md"))).toBe(true);
    expect(fs.readFileSync(store.registryPath, "utf8")).toBe("{invalid");
  });
  it.each((["codex", "claude", "grok"] as const).flatMap(adapter =>
    (["CONFIGURED", "ALL_INSTALLED"] as const).flatMap(scope =>
      [false, true].flatMap(retain => [false, true].map(reverse => ({ adapter, scope, retain, reverse }))))))(
    "prepares later run after real API update: $adapter/$scope retain=$retain reverse=$reverse",
    async ({ adapter, scope, retain, reverse }) => {
      const row = await imported();
      const runtime = await runtimeFixture(root, adapter, scope);
      try {
        const first = await runtime.start("run-a");
        expect(fs.readFileSync(path.join(runtime.link, "SKILL.md"), "utf8")).toContain("v1");
        if (retain) vi.spyOn(GitHubSkillRepository.prototype, "cleanup").mockResolvedValue();
        writeSkill(upstream, "api-writer", "v2"); revision = b;
        await exec(documents.UPDATE_GITHUB_SKILL_SOURCE, { sourceId: row.sourceId });
        expect(fs.existsSync(first.root)).toBe(retain);
        // Codex's native-discovery branch must still reconcile an existing owned old link.
        if (adapter === "codex" && retain) runtime.setDiscoverCurrent();
        const second = await runtime.start("run-b");
        expect(second.root).not.toBe(first.root);
        expect(fs.readFileSync(path.join(runtime.link, "SKILL.md"), "utf8")).toContain("v2");
        const order = reverse ? [second, first] : [first, second];
        await order[0]!.cleanup();
        expect(fs.lstatSync(runtime.link).isSymbolicLink()).toBe(true);
        await order[1]!.cleanup();
        expect(fs.existsSync(runtime.link)).toBe(false);
      } finally { await runtime.close(); }
    }, 20000);

});
