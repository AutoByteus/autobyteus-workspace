/**
 * The integration catalog and the access rule over the real skill-source and skill services (temp folders, a GitHub
 * source downloaded from a local archive; no network): the cards and their states (DS-001), import of a folder or a
 * GitHub link with every coded outcome (DS-002), DEC-017's precedence, removal from either page disconnecting first
 * and refused when that fails (DS-005), an update that drops an integration (DEC-016), and access following the skill
 * in both scopes, checked again per call (DS-004). Dummy values only.
 */
import fs from "node:fs";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AgentDefinition } from "../../../src/agent-definition/domain/models.js";
import { DeliveryDefinitions } from "../../../src/credential-proxy/delivery-definitions.js";
import { IntegrationAccessRule } from "../../../src/credential-proxy/integration-access-rule.js";
import { IntegrationCatalog } from "../../../src/credential-proxy/integration-catalog.js";
import type { IntegrationCatalogError } from "../../../src/credential-proxy/integration-import-outcomes.js";
import { fixture, writeSkill } from "../../unit/skills/github/fixtures.js";

const writeIntegration = (root: string, id: string, skillName = `${id}-integration`, name = id.toUpperCase()) => {
  const folder = path.join(root, id);
  writeSkill(folder, skillName);
  fs.writeFileSync(path.join(folder, "integration.json"), JSON.stringify({
    name, description: `Use ${name}.`, token: { help: `Create a ${name} token.` }, prerequisites: ["curl"],
  }));
  return folder;
};

const codeOf = async (promise: Promise<unknown>): Promise<{ code: string; details: Record<string, string> }> => {
  try {
    await promise;
  } catch (error) {
    const coded = error as IntegrationCatalogError;
    return { code: coded.code, details: { ...coded.details } };
  }
  throw new Error("expected a refusal");
};

describe("integration catalog over imported skill sources", () => {
  let f: ReturnType<typeof fixture>;
  let catalog: IntegrationCatalog;
  let connected: Map<string, string>;
  let disconnectFails = false;
  const disconnect = vi.fn(async (id: string) => {
    if (disconnectFails) throw new Error("vault unavailable");
    connected.delete(id);
    return { connected: false, login: null, connectedAt: null };
  });
  const definitions = new DeliveryDefinitions();

  beforeEach(() => {
    f = fixture();
    fs.rmSync(path.join(f.upstream, "SKILL.md"));
    connected = new Map();
    disconnectFails = false;
    disconnect.mockClear();
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    vi.spyOn(console, "info").mockImplementation(() => undefined);
    catalog = new IntegrationCatalog({
      skillSources: f.service,
      skills: f.catalog,
      connections: {
        status: async (id: string) => connected.has(id)
          ? { connected: true, login: connected.get(id)!, connectedAt: "2026-11-01T00:00:00.000Z" }
          : { connected: false, login: null, connectedAt: null },
        disconnect,
      },
      definitions,
      tools: (tools) => tools.map((tool) => ({ tool, found: tool !== "jq" })),
      homeDir: () => f.root,
    });
    f.service.setSourceChangeObserver(catalog);
  });
  afterEach(() => {
    vi.restoreAllMocks();
    f.cleanup();
  });

  const localFolder = (name: string) => {
    const folder = path.join(f.root, name);
    fs.mkdirSync(folder, { recursive: true });
    return folder;
  };

  it("shows nothing before an import, then one card per integration in an imported folder", async () => {
    expect(await catalog.list()).toEqual([]);
    expect(catalog.sourceListings()).toEqual([]);
    const folder = localFolder("my-integrations");
    writeIntegration(folder, "github", "github-integration", "GitHub");
    writeSkill(path.join(folder, "notes"), "plain-notes");

    const imported = await catalog.import(folder);

    expect(imported.map((entry) => [entry.id, entry.state, entry.skillName, entry.source.kind, entry.source.label]))
      .toEqual([["github", "NEEDS_TOKEN", "github-integration", "LOCAL_PATH", folder]]);
    expect(imported[0]!.tools).toEqual([{ tool: "curl", found: true }]);
    expect(f.catalog.getSkill("github-integration")?.rootPath).toBe(path.join(folder, "github"));
    expect(f.catalog.getSkill("plain-notes")).not.toBeNull();
    expect(catalog.sourceListings()).toEqual([expect.objectContaining({
      kind: "LOCAL_PATH", label: folder, location: folder, skillCount: 2, integrations: [{ id: "github", name: "GitHub" }],
    })]);
    expect(catalog.integrationIdsBySkillRoot().get(fs.realpathSync(path.join(folder, "github")))).toBe("github");
  });

  it("states a connected card with its login, and an integration this app can't deliver as needing a newer app", async () => {
    const folder = localFolder("src");
    writeIntegration(folder, "github");
    writeIntegration(folder, "jira");
    await catalog.import(folder);
    connected.set("github", "octo");
    expect((await catalog.list()).map((entry) => [entry.id, entry.state, entry.login])).toEqual([
      ["github", "CONNECTED", "octo"], ["jira", "NEEDS_NEWER_APP", null],
    ]);
  });

  it("refuses each folder case with its code and imports nothing", async () => {
    expect((await codeOf(catalog.import("relative/path"))).code).toBe("NOT_A_LINK_OR_PATH");
    expect((await codeOf(catalog.import("https://example.com/owner/repo"))).code).toBe("NOT_A_LINK_OR_PATH");
    expect((await codeOf(catalog.import(""))).code).toBe("NOT_A_LINK_OR_PATH");
    const missing = path.join(f.root, "nope");
    expect(await codeOf(catalog.import(missing))).toEqual({ code: "DIRECTORY_NOT_FOUND", details: { path: missing } });

    const plain = localFolder("plain");
    writeSkill(path.join(plain, "only-a-skill"), "only-a-skill");
    expect(await codeOf(catalog.import(plain))).toEqual({ code: "NO_INTEGRATIONS_FOUND", details: { kind: "LOCAL_PATH" } });
    expect(f.config.getAdditionalSkillsDirs()).toEqual([]);

    const folder = localFolder("integrations");
    writeIntegration(folder, "github");
    await catalog.import(folder);
    expect(await codeOf(catalog.import(folder))).toEqual({ code: "ALREADY_IMPORTED", details: { kind: "LOCAL_PATH" } });

    const sameId = localFolder("other");
    writeIntegration(sameId, "github", "github-fork");
    expect(await codeOf(catalog.import(sameId))).toEqual({
      code: "INTEGRATION_ALREADY_IMPORTED", details: { id: "github", existingSource: folder },
    });

    const clash = localFolder("clash");
    writeIntegration(clash, "jira", "github-integration");
    expect(await codeOf(catalog.import(clash))).toEqual({ code: "SKILL_NAME_CONFLICT", details: { skill: "github-integration" } });
    expect(f.config.getAdditionalSkillsDirs()).toEqual([folder]);
  });

  it("expands a ~ path to the home folder", async () => {
    writeIntegration(localFolder("home-integrations"), "github");
    expect((await catalog.import("~/home-integrations")).map((entry) => entry.id)).toEqual(["github"]);
  });

  it("imports a GitHub repository link, and refuses a repeat, a repository without integrations, and an unreachable GitHub", async () => {
    writeIntegration(f.upstream, "github", "github-integration", "GitHub");
    const imported = await catalog.import("https://github.com/acme/skills");
    expect(imported.map((entry) => [entry.id, entry.source.kind, entry.source.label])).toEqual([["github", "GITHUB_REPOSITORY", "acme/skills"]]);
    expect(catalog.sourceListings()[0]).toMatchObject({ location: "https://github.com/acme/skills", github: { status: "UP_TO_DATE" } });
    expect(await codeOf(catalog.import("https://github.com/acme/skills"))).toEqual({ code: "ALREADY_IMPORTED", details: { kind: "GITHUB_REPOSITORY" } });
  });

  it("refuses a GitHub repository without integrations before publication, and reports GitHub unreachable with the reason", async () => {
    writeSkill(path.join(f.upstream, "only"), "only-a-skill");
    expect(await codeOf(catalog.import("https://github.com/acme/skills"))).toEqual({
      code: "NO_INTEGRATIONS_FOUND", details: { kind: "GITHUB_REPOSITORY" },
    });
    expect(f.store.read()).toEqual([]);
    expect(f.catalog.getSkill("only-a-skill")).toBeNull();

    f.setError(new Error("the request timed out after 30 seconds."));
    expect(await codeOf(catalog.import("https://github.com/acme/skills"))).toEqual({
      code: "GITHUB_UNREACHABLE", details: { reason: "the request timed out after 30 seconds" },
    });
  });

  it("keeps the entry of the source first in the skill catalog's precedence when two sources have one ID (DEC-017)", async () => {
    const first = localFolder("first");
    const second = localFolder("second");
    writeIntegration(first, "github", "github-a", "GitHub A");
    writeIntegration(second, "github", "github-b", "GitHub B");
    // Through the Skills page, which knows nothing of integration IDs.
    await f.service.addSkillSource(first);
    await f.service.addSkillSource(second);
    expect(catalog.entries().map((entry) => [entry.id, entry.name, entry.source.label])).toEqual([["github", "GitHub A", first]]);

    // Removing the source of the skipped entry disconnects nothing.
    connected.set("github", "octo");
    await f.service.removeSkillSource(second);
    expect(disconnect).not.toHaveBeenCalled();
  });

  it("disconnects a removed source's integrations first, from the Skills page or the Integrations page", async () => {
    const folder = localFolder("integrations");
    writeIntegration(folder, "github", "github-integration", "GitHub");
    await catalog.import(folder);
    connected.set("github", "octo");
    await f.service.removeSkillSource(folder);
    expect(disconnect).toHaveBeenCalledWith("github");
    expect(await catalog.list()).toEqual([]);
    expect(fs.existsSync(path.join(folder, "github", "integration.json"))).toBe(true);

    writeIntegration(f.upstream, "github", "github-integration", "GitHub");
    await catalog.import("https://github.com/acme/skills");
    connected.set("github", "octo");
    const sourceId = catalog.sourceListings()[0]!.sourceId;
    expect(await catalog.removeSource(sourceId)).toEqual(["GitHub"]);
    expect(disconnect).toHaveBeenCalledTimes(2);
    expect(f.store.read()).toEqual([]);
  });

  it("refuses a removal whose disconnect fails, so no token is left without a card", async () => {
    const folder = localFolder("integrations");
    writeIntegration(folder, "github");
    await catalog.import(folder);
    connected.set("github", "octo");
    disconnectFails = true;
    await expect(f.service.removeSkillSource(folder)).rejects.toThrow("vault unavailable");
    expect(f.config.getAdditionalSkillsDirs()).toEqual([folder]);
    expect((await codeOf(catalog.removeSource(catalog.sourceListings()[0]!.sourceId))).code).toBe("REMOVE_FAILED");
  });

  it("disconnects an integration an update drops, and refuses the update when that fails (DEC-016)", async () => {
    writeIntegration(f.upstream, "github");
    writeIntegration(f.upstream, "jira");
    await catalog.import("https://github.com/acme/skills");
    const sourceId = f.store.read()[0]!.id;
    connected.set("github", "octo");

    fs.rmSync(path.join(f.upstream, "github"), { recursive: true });
    f.setRevision("b".repeat(40));
    disconnectFails = true;
    await expect(f.service.updateGitHubSkillSource(sourceId)).rejects.toThrow("vault unavailable");
    expect(f.store.read()[0]!.installed.revision).toBe("a".repeat(40));
    expect(catalog.entries().map((entry) => entry.id)).toEqual(["github", "jira"]);

    disconnectFails = false;
    await catalog.updateSource(sourceId);
    expect(disconnect).toHaveBeenCalledWith("github");
    expect(catalog.entries().map((entry) => entry.id)).toEqual(["jira"]);
    expect((await codeOf(catalog.updateSource("local:/nowhere"))).code).toBe("SOURCE_NOT_FOUND");
  });

  describe("access follows the integration's skill (DS-004)", () => {
    const definitionsById = new Map<string, AgentDefinition>();
    const agent = (id: string, fields: Partial<AgentDefinition>) => {
      definitionsById.set(id, { id, name: id, description: "d", instructions: "i", ...fields } as AgentDefinition);
    };
    const rule = () => new IntegrationAccessRule({
      catalog, definitions, skills: f.catalog,
      agentDefinitions: { getAgentDefinitionById: async (id) => definitionsById.get(id) ?? null },
    });
    beforeEach(() => definitionsById.clear());

    it("grants an agent that has the skill configured, or all installed skills, and no one else", async () => {
      const folder = localFolder("integrations");
      writeIntegration(folder, "github");
      await catalog.import(folder);
      agent("configured", { skillNames: ["github-integration"] });
      agent("all", { skillScope: "ALL_INSTALLED" } as Partial<AgentDefinition>);
      agent("without", { skillNames: ["other"] });
      const sourceId = catalog.sourceListings()[0]!.sourceId;
      const grant = { integrationId: "github", skillName: "github-integration", sourceId };
      expect(await rule().grantsForAgent("configured")).toEqual([grant]);
      expect(await rule().grantsForAgent("all")).toEqual([grant]);
      expect(await rule().grantsForAgent("without")).toEqual([]);
      expect(await rule().grantsForAgent("unknown-agent")).toEqual([]);
    });

    it("grants nothing for a same-named skill that is not the integration's own copy", async () => {
      // A plain skill with the same name in a tier-3 folder wins over a tier-4 (runtime default) integration source.
      const plain = localFolder("plain");
      writeSkill(path.join(plain, "github-integration"), "github-integration");
      await f.service.addSkillSource(plain);
      const integrations = localFolder("runtime-default");
      writeIntegration(integrations, "github");
      await f.service.addSkillSource(integrations);
      expect(f.catalog.getSkill("github-integration")?.rootPath).toBe(path.join(plain, "github-integration"));
      agent("configured", { skillNames: ["github-integration"] });
      expect(await rule().grantsForAgent("configured")).toEqual([]);

      // An application-owned agent's own bundled copy of the name is not the integration's either.
      const bundle = localFolder("bundle/agents/app-agent");
      writeSkill(path.join(bundle, "skills", "github-integration"), "github-integration");
      agent("app", { skillNames: ["github-integration"], ownershipScope: "application_owned", sourceInfo: { agentDirPath: bundle } } as Partial<AgentDefinition>);
      expect(await rule().grantsForAgent("app")).toEqual([]);
    });

    it("refuses at preparation and on the next call once the skill is disabled, removed, or its source is gone", async () => {
      const folder = localFolder("integrations");
      writeIntegration(folder, "github");
      await catalog.import(folder);
      agent("configured", { skillNames: ["github-integration"] });
      const [grant] = await rule().grantsForAgent("configured");
      expect(await rule().allowsCall("configured", grant!)).toBe(true);

      f.catalog.disableSkill("github-integration");
      expect(await rule().allowsCall("configured", grant!)).toBe(false);
      expect(await rule().grantsForAgent("configured")).toEqual([]);
      f.catalog.enableSkill("github-integration");

      agent("configured", { skillNames: [] });
      expect(await rule().allowsCall("configured", grant!)).toBe(false);
      agent("configured", { skillScope: "ALL_INSTALLED" } as Partial<AgentDefinition>);
      expect(await rule().allowsCall("configured", grant!)).toBe(true);

      await f.service.removeSkillSource(folder);
      expect(await rule().allowsCall("configured", grant!)).toBe(false);
    });
  });
});
