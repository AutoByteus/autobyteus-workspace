import "reflect-metadata";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { buildSchema } from "type-graphql";
import type { AppConfig } from "../../../src/config/app-config.js";
import type { ApplicationBundleService } from "../../../src/application-bundles/services/application-bundle-service.js";
import { createBundleBackedDefinitionServices } from "../../../src/application-platform/definitions/create-bundle-backed-definition-services.js";
import { AgentOrgDefinitionService } from "../../../src/agent-org-definition/services/agent-org-definition-service.js";
import { FileAgentOrgDefinitionProvider } from "../../../src/agent-org-definition/providers/file-agent-org-definition-provider.js";
import { AgentTeamDefinitionUpdate } from "../../../src/agent-team-definition/domain/agent-team-definition.js";
import { configureStudioApplicationApiServices } from "../../../src/api/graphql/studio-application-api-services.js";
import { AgentOrgDefinitionResolver } from "../../../src/api/graphql/types/agent-org-definition.js";

const { graphql } = createRequire(import.meta.url)("graphql") as typeof import("graphql");

/**
 * The design's "Write Forms Per Kind" on package fixtures, through the real file stores and
 * services: a save of a package definition starts from its base value, sends the four settings to
 * the personal settings file, and writes the definition's files only when they would change.
 */
const bundleService = {
  listApplicationOwnedAgentSources: async () => [], listApplicationOwnedTeamSources: async () => [],
  getApplicationOwnedAgentSourceById: async () => null, getApplicationOwnedTeamSourceById: async () => null,
} as unknown as ApplicationBundleService;
const launch = { runtimeKind: "codex_app_server", llmModelIdentifier: "gpt-5.5", llmConfig: null };
const agentMd = (name: string, description: string) => `---\nname: ${name}\ndescription: ${description}\nrole: ${name}\n---\n\nWork.\n`;
const agentConfig = (toolNames: string[]) => JSON.stringify({
  toolNames, skillNames: ["design"], inputProcessorNames: [], llmResponseProcessorNames: [], toolExecutionResultProcessorNames: [],
  toolInvocationPreprocessorNames: [], lifecycleProcessorNames: [], avatarUrl: null, defaultLaunchConfig: null,
}, null, 2);

let root: string, data: string, pkg: string;
let definitions: ReturnType<typeof createBundleBackedDefinitionServices>;
let orgs: AgentOrgDefinitionService;

const write = async (file: string, text: string) => { await fs.mkdir(path.dirname(file), { recursive: true }); await fs.writeFile(file, text); };
const read = (file: string) => fs.readFile(file, "utf8");
/** Every file of a folder with its bytes, to prove a save left it untouched. */
const snapshot = async (dir: string): Promise<Record<string, string>> => {
  const output: Record<string, string> = {};
  for (const entry of await fs.readdir(dir, { recursive: true, withFileTypes: true })) {
    if (entry.isFile()) { const file = path.join(entry.parentPath, entry.name); output[path.relative(dir, file)] = await read(file); }
  }
  return output;
};
const personalFile = () => path.join(data, "agent-packages", "personal-settings.json");
const personalJson = async () => JSON.parse(await read(personalFile())) as Record<string, unknown>;

beforeEach(async () => {
  root = await fs.mkdtemp(path.join(os.tmpdir(), "personal-settings-write-forms-"));
  data = path.join(root, "data");
  pkg = path.join(root, "autobyteus-agents");
  await write(path.join(pkg, "agents", "solution-designer", "agent.md"), agentMd("Solution Designer", "Designs"));
  await write(path.join(pkg, "agents", "solution-designer", "agent-config.json"), agentConfig(["read_file", "write_file"]));
  const teamDir = path.join(pkg, "agent-teams", "se-team");
  await write(path.join(teamDir, "team.md"), "---\nname: SE Team\ndescription: From the package\n---\n\nShip software.\n");
  await write(path.join(teamDir, "team-config.json"), JSON.stringify({ coordinatorMemberName: "lead",
    members: [{ memberName: "lead", ref: "lead", refScope: "team_local" }], handoffs: [], avatarUrl: null, defaultLaunchConfig: null }, null, 2));
  await write(path.join(teamDir, "agents", "lead", "agent.md"), agentMd("Lead", "Leads"));
  await write(path.join(teamDir, "agents", "lead", "agent-config.json"), agentConfig([]));
  const orgDir = path.join(pkg, "agent-orgs", "my-org");
  await write(path.join(orgDir, "org.md"), "---\nname: My Org\ndescription: Runs things\n---\n\nRun.\n");
  await write(path.join(orgDir, "org-config.json"), JSON.stringify({ avatarUrl: null,
    members: [
      { memberName: "designer", ref: "solution-designer", refType: "agent", refScope: "shared" },
      { memberName: "helper", ref: "agent-org-owned-agent:my-org:helper", refType: "agent", refScope: "org_local" },
    ], handoffs: [], defaultLaunchConfig: null }, null, 2));
  await write(path.join(orgDir, "agents", "helper", "agent.md"), agentMd("Helper", "Helps"));
  await write(path.join(orgDir, "agents", "helper", "agent-config.json"), agentConfig(["read_file"]));
  await write(path.join(data, "agents", "autobyteus-daily-assistant", "agent.md"), agentMd("Daily Assistant", "Helps daily"));
  await write(path.join(data, "agents", "autobyteus-daily-assistant", "agent-config.json"), agentConfig(["read_file"]));
  await write(path.join(data, "agents", "my-agent", "agent.md"), agentMd("My Agent", "Mine"));
  await write(path.join(data, "agents", "my-agent", "agent-config.json"), agentConfig(["read_file"]));
  const config = {
    getAppDataDir: () => data,
    getAgentsDir: () => path.join(data, "agents"),
    getAgentMdPath: (id: string) => path.join(data, "agents", id, "agent.md"),
    getAgentConfigPath: (id: string) => path.join(data, "agents", id, "agent-config.json"),
    getAgentTeamsDir: () => path.join(data, "agent-teams"),
    getAgentOrgsDir: () => path.join(data, "agent-orgs"),
    getAdditionalAgentPackageRoots: () => [pkg],
    getRegisteredAgentPackageRoots: () => [pkg],
  } as unknown as AppConfig;
  definitions = createBundleBackedDefinitionServices({ appConfig: config, bundleService });
  orgs = new AgentOrgDefinitionService(new FileAgentOrgDefinitionProvider(config), definitions.agentDefinitionService,
    definitions.agentTeamDefinitionService, definitions.packageDefinitions, definitions.personalSettings);
});
afterEach(async () => {
  definitions.packageDefinitions.reloader.close();
  await fs.rm(root, { recursive: true, force: true });
});

describe("agents (shared, team-local, Org-owned; built-in; the user's own)", () => {
  /** What the agent form sends (AgentDefinitionForm handleSubmit): every field of the loaded effective definition, with the user's edits. */
  const formSave = async (id: string, edits: Record<string, unknown>) => {
    const loaded = (await definitions.agentDefinitionService.getAgentDefinitionById(id))!;
    return definitions.agentDefinitionService.updateAgentDefinition(id, {
      name: loaded.name, role: loaded.role || undefined, category: loaded.category || undefined, description: loaded.description,
      instructions: loaded.instructions, avatarUrl: loaded.avatarUrl ?? null, skillNames: loaded.skillNames, skillScope: loaded.skillScope,
      toolNames: loaded.toolNames, inputProcessorNames: loaded.inputProcessorNames, llmResponseProcessorNames: loaded.llmResponseProcessorNames,
      toolExecutionResultProcessorNames: loaded.toolExecutionResultProcessorNames, toolInvocationPreprocessorNames: loaded.toolInvocationPreprocessorNames,
      lifecycleProcessorNames: loaded.lifecycleProcessorNames, defaultLaunchConfig: loaded.defaultLaunchConfig ?? null, ...edits,
    });
  };

  it("a personal-only save writes no package file; the effective definition has the personal tool (AC-001)", async () => {
    const before = await snapshot(pkg);
    const saved = await formSave("solution-designer", { toolNames: ["read_file", "write_file", "mcp_x"] });
    expect(await snapshot(pkg)).toEqual(before);
    expect(await personalJson()).toEqual({ "agent:solution-designer": { toolsAdded: ["mcp_x"] } });
    expect(saved.toolNames).toEqual(["read_file", "write_file", "mcp_x"]);
    expect((await definitions.agentDefinitionService.getAgentDefinitionById("solution-designer"))?.toolNames).toEqual(["read_file", "write_file", "mcp_x"]);
    expect(await definitions.agentDefinitionService.getPersonalSettingsView("solution-designer")).toEqual({ base: "PACKAGE", settings: ["TOOLS"] });
  });

  it("a description change with a personal tool writes the description; the file keeps the base tools", async () => {
    await formSave("solution-designer", { toolNames: ["read_file", "write_file", "mcp_x"] });
    await formSave("solution-designer", { description: "Designs well", toolNames: ["read_file", "write_file", "mcp_x"], avatarUrl: "/mine.png" });
    expect(await read(path.join(pkg, "agents", "solution-designer", "agent.md"))).toContain("description: Designs well");
    const config = JSON.parse(await read(path.join(pkg, "agents", "solution-designer", "agent-config.json")));
    expect(config.toolNames).toEqual(["read_file", "write_file"]);
    expect(config.avatarUrl).toBeNull();
    expect(await personalJson()).toEqual({ "agent:solution-designer": { toolsAdded: ["mcp_x"], avatarUrl: "/mine.png" } });
  });

  it("reset removes the field; the effective value is the base again (AC-005)", async () => {
    await formSave("solution-designer", { toolNames: ["write_file"], defaultLaunchConfig: launch });
    const reset = await definitions.agentDefinitionService.resetPersonalSetting("solution-designer", "TOOLS");
    expect(reset.toolNames).toEqual(["read_file", "write_file"]);
    expect(reset.defaultLaunchConfig).toEqual(launch);
    expect(await personalJson()).toEqual({ "agent:solution-designer": { defaultLaunchConfig: launch } });
  });

  it("team-local and Org-owned agents use personal settings; an Org-owned personal-only save now succeeds (R-7)", async () => {
    const teamLocalId = "team-local-agent:se-team:lead";
    const orgOwnedId = "agent-org-owned-agent:my-org:helper";
    const before = await snapshot(pkg);
    await formSave(teamLocalId, { toolNames: ["mcp_x"] });
    await formSave(orgOwnedId, { toolNames: [] });
    expect(await snapshot(pkg)).toEqual(before);
    expect(await personalJson()).toEqual({
      [`agent:${teamLocalId}`]: { toolsAdded: ["mcp_x"] },
      [`agent:${orgOwnedId}`]: { toolsRemoved: ["read_file"] },
    });
    await expect(formSave(orgOwnedId, { description: "Changed" }))
      .rejects.toThrow("AgentOrg-owned Agent definitions can only be changed through their atomic parent AgentOrg save.");
  });

  it("a built-in agent keeps its tools personally; the user's own agent is written to its files as before", async () => {
    const builtInDir = path.join(data, "agents", "autobyteus-daily-assistant");
    const builtInBefore = await snapshot(builtInDir);
    await formSave("autobyteus-daily-assistant", { toolNames: ["read_file", "mcp_x"] });
    expect(await snapshot(builtInDir)).toEqual(builtInBefore);
    expect(await definitions.agentDefinitionService.getPersonalSettingsView("autobyteus-daily-assistant")).toEqual({ base: "BUILT_IN", settings: ["TOOLS"] });

    await formSave("my-agent", { toolNames: ["read_file", "mcp_x"] });
    expect(JSON.parse(await read(path.join(data, "agents", "my-agent", "agent-config.json"))).toolNames).toEqual(["read_file", "mcp_x"]);
    expect(await personalJson()).toEqual({ "agent:autobyteus-daily-assistant": { toolsAdded: ["mcp_x"] } });
    expect(await definitions.agentDefinitionService.getPersonalSettingsView("my-agent")).toEqual({ base: null, settings: [] });
  });
});

describe("Teams", () => {
  const teamUpdate = async (values: ConstructorParameters<typeof AgentTeamDefinitionUpdate>[0]) => {
    const current = (await definitions.agentTeamDefinitionService.getDefinitionById("se-team"))!;
    return definitions.agentTeamDefinitionService.updateDefinition("se-team", new AgentTeamDefinitionUpdate({
      name: current.name, description: current.description, instructions: current.instructions, nodes: current.nodes,
      coordinatorMemberName: current.coordinatorMemberName, handoffs: current.handoffs, expectedRevision: current.revision, ...values,
    }));
  };

  it("an avatar-only save writes no file; the avatar is personal", async () => {
    const before = await snapshot(pkg);
    const current = (await definitions.agentTeamDefinitionService.getDefinitionById("se-team"))!;
    expect(current.instructions).toBe("Ship software.\n"); // team.md ends with a newline
    // What AgentTeamDefinitionForm sends: trimmed name, description and instructions.
    const saved = await teamUpdate({ avatarUrl: "/team.png", name: current.name.trim(), description: current.description.trim(),
      instructions: current.instructions.trim() });
    expect(await snapshot(pkg)).toEqual(before);
    expect(saved.avatarUrl).toBe("/team.png");
    expect(await personalJson()).toEqual({ "agent_team:se-team": { avatarUrl: "/team.png" } });
  });

  it("a personal avatar with a description change: team-config.json keeps the base avatar (MP-001)", async () => {
    await teamUpdate({ avatarUrl: "/team.png", defaultLaunchConfig: launch });
    const saved = await teamUpdate({ description: "Edited", avatarUrl: "/team.png" });
    expect(await read(path.join(pkg, "agent-teams", "se-team", "team.md"))).toContain("description: Edited");
    const config = JSON.parse(await read(path.join(pkg, "agent-teams", "se-team", "team-config.json")));
    expect(config.avatarUrl).toBeNull();
    expect(config.defaultLaunchConfig).toBeNull();
    expect(saved).toMatchObject({ description: "Edited", avatarUrl: "/team.png", defaultLaunchConfig: launch });
    expect(await definitions.agentTeamDefinitionService.getPersonalSettingsView("se-team")).toEqual({ base: "PACKAGE", settings: ["AVATAR", "DEFAULT_LAUNCH_CONFIG"] });
  });

  it("admission (the GraphQL lists and run starts) reads the effective Team", async () => {
    await teamUpdate({ avatarUrl: "/team.png" });
    const entry = (await definitions.agentTeamDefinitionService.listAdmissionEntries()).find((candidate) => candidate.definitionId === "se-team");
    expect(entry?.definition?.avatarUrl).toBe("/team.png");
  });
});

describe("Orgs", () => {
  const unused = new Proxy({}, { get: (_target, key) => { throw new Error(`Unexpected service operation ${String(key)}`); } });
  /** The Org editor's save through GraphQL: name, description, members and handoffs, the avatar only when it changed. */
  const editorSave = async (extra: Record<string, unknown>) => {
    const registration = configureStudioApplicationApiServices({ ...definitions, bundleService, agentOrgDefinitionService: orgs,
      agentRunService: unused, teamRunService: unused, agentOrgRunService: unused, definitionAdmissionService: unused,
      collaborationRootHistoryService: unused, runModelConfigService: unused, delegatedLaunchSelectionService: unused,
      capabilityService: unused, packageQueries: unused, packageCommands: unused } as never);
    try {
      const schema = await buildSchema({ resolvers: [AgentOrgDefinitionResolver], validate: false });
      const current = (await orgs.getDefinitionById("my-org"))!;
      const result = await graphql({ schema, source: `mutation($input: UpdateAgentOrgDefinitionInput!) {
        updateAgentOrgDefinition(input: $input) { id avatarUrl personalSettings personalSettingsBase members { memberName } } }`,
      variableValues: { input: {
        id: "my-org", expectedRevision: current.revision, name: current.name.trim(), description: current.description.trim(),
        members: current.members.map((member) => ({ memberName: member.memberName, ref: member.ref, refType: member.refType.toUpperCase(), refScope: member.refScope === "org_local" ? "AGENT_ORG_OWNED" : "SHARED" })),
        handoffs: [], ...extra,
      } } });
      expect(result.errors).toBeUndefined();
      return result.data?.updateAgentOrgDefinition as Record<string, unknown>;
    } finally {
      registration.close();
    }
  };

  it("an avatar-only save from the editor payload writes no file; the avatar is personal (MP-002)", async () => {
    const before = await snapshot(pkg);
    const saved = await editorSave({ avatarUrl: "/org.png" });
    expect(await snapshot(pkg)).toEqual(before);
    expect(saved).toMatchObject({ avatarUrl: "/org.png", personalSettings: ["AVATAR"], personalSettingsBase: "PACKAGE" });
  });

  it("a personal avatar with a member change: org-config.json keeps the base avatar", async () => {
    await editorSave({ avatarUrl: "/org.png" });
    await editorSave({ members: [
      { memberName: "designer", ref: "solution-designer", refType: "AGENT", refScope: "SHARED" },
      { memberName: "helper", ref: "agent-org-owned-agent:my-org:helper", refType: "AGENT", refScope: "AGENT_ORG_OWNED" },
      { memberName: "second_designer", ref: "solution-designer", refType: "AGENT", refScope: "SHARED" },
    ] });
    const config = JSON.parse(await read(path.join(pkg, "agent-orgs", "my-org", "org-config.json")));
    expect(config.avatarUrl).toBeNull();
    expect(config.members.map((member: { memberName: string }) => member.memberName)).toEqual(["designer", "helper", "second_designer"]);
    expect((await orgs.getDefinitionById("my-org"))?.avatarUrl).toBe("/org.png");
    expect((await orgs.listAdmissionEntries())[0]?.definition?.avatarUrl).toBe("/org.png");
  });

  it("reset of the avatar returns to the package's", async () => {
    await editorSave({ avatarUrl: "/org.png" });
    expect((await orgs.resetPersonalSetting("my-org", "AVATAR")).avatarUrl).toBeNull();
    expect(await personalJson()).toEqual({});
    await expect(orgs.resetPersonalSetting("my-org", "TOOLS")).rejects.toThrow("not personal for a agent_org");
  });
});
