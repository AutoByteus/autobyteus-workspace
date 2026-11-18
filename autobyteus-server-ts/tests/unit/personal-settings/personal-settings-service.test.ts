import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AgentDefinition } from "../../../src/agent-definition/domain/models.js";
import { AgentTeamDefinition, TeamMember } from "../../../src/agent-team-definition/domain/agent-team-definition.js";
import { PersonalSettingsStore } from "../../../src/personal-settings/stores/personal-settings-store.js";
import { PersonalSettingsService } from "../../../src/personal-settings/services/personal-settings-service.js";

/**
 * PersonalSettingsService over a real store in a temporary folder: scope, apply (contract §5),
 * edits and resets (§6), capture (§7.2) and the announcements. The capture and apply cases are
 * those of evidence/validate-personal-settings-file.mjs (V-C, V-D).
 */
let dir: string;
let filePath: string;
let published: string[][];
let warn: ReturnType<typeof vi.fn>;

const create = () => {
  const service = new PersonalSettingsService({ store: new PersonalSettingsStore(() => filePath, { warn } as unknown as Console) });
  service.setPublisher((lists) => published.push([...lists]));
  return service;
};
const fileJson = () => JSON.parse(fs.readFileSync(filePath, "utf8")) as Record<string, unknown>;
const agent = (overrides: Partial<ConstructorParameters<typeof AgentDefinition>[0]> = {}) => new AgentDefinition({
  id: "solution-designer", name: "Solution Designer", description: "d", instructions: "i",
  toolNames: ["read_file", "write_file"], skillNames: ["design"], avatarUrl: null, defaultLaunchConfig: null, ...overrides,
});
const launch = { runtimeKind: "codex_app_server", llmModelIdentifier: "gpt-5.5", llmConfig: null };

beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), "personal-settings-"));
  filePath = path.join(dir, "agent-packages", "personal-settings.json");
  published = [];
  warn = vi.fn();
});
afterEach(() => fs.rmSync(dir, { recursive: true, force: true }));

describe("scope (contract §8)", () => {
  it("applies to registered packages and to the built-in agents, not to the user's own definitions", () => {
    const service = create();
    expect(service.baseOf("agent", "x", "registered_package")).toBe("PACKAGE");
    expect(service.baseOf("agent_org", "x", "registered_package")).toBe("PACKAGE");
    expect(service.baseOf("agent", "autobyteus-daily-assistant", "server_data")).toBe("BUILT_IN");
    expect(service.baseOf("agent", "autobyteus-model-router", "server_data")).toBe("BUILT_IN");
    expect(service.baseOf("agent", "my-agent", "server_data")).toBeNull();
    expect(service.baseOf("agent_team", "autobyteus-daily-assistant", "server_data")).toBeNull();
  });
});

describe("apply (contract §5)", () => {
  it("returns the base value unchanged when there is no record (V-D)", () => {
    const definition = agent();
    expect(create().apply("agent", definition, "registered_package")).toBe(definition);
  });

  it("removes, then appends added names; replaces avatar and runtime/model as one unit", () => {
    const service = create();
    service.setEdited("agent", "solution-designer", agent(), {
      toolNames: ["write_file", "github_create_issue"], avatarUrl: "/rest/files/images/mine.png", defaultLaunchConfig: launch,
    });
    // The author adds search_memory in the next revision; it arrives.
    const next = agent({ toolNames: ["read_file", "write_file", "search_memory"] });
    const effective = service.apply("agent", next, "registered_package");
    expect(effective).not.toBe(next);
    expect(effective).toBeInstanceOf(AgentDefinition);
    expect(effective.toolNames).toEqual(["write_file", "search_memory", "github_create_issue"]);
    expect(effective.skillNames).toEqual(["design"]);
    expect(effective.avatarUrl).toBe("/rest/files/images/mine.png");
    expect(effective.defaultLaunchConfig).toEqual(launch);
    expect(next.toolNames).toEqual(["read_file", "write_file", "search_memory"]);
  });

  it("never applies to a definition outside the scope, even with a record under its key", () => {
    const service = create();
    service.setEdited("agent", "my-agent", agent({ id: "my-agent" }), { toolNames: ["x"] });
    const own = agent({ id: "my-agent" });
    expect(service.apply("agent", own, "server_data")).toBe(own);
  });

  it("applies avatar and runtime/model to Teams", () => {
    const service = create();
    const team = new AgentTeamDefinition({
      id: "software-engineering-team", name: "T", description: "d", instructions: "i", nodes: [new TeamMember({ memberName: "a", ref: "a", refScope: "shared" })],
      coordinatorMemberName: "a", avatarUrl: "/package.png",
    });
    service.setEdited("agent_team", team.id!, { avatarUrl: team.avatarUrl ?? null, defaultLaunchConfig: null }, { defaultLaunchConfig: launch });
    const effective = service.apply("agent_team", team, "registered_package");
    expect(effective).toBeInstanceOf(AgentTeamDefinition);
    expect(effective.defaultLaunchConfig).toEqual(launch);
    expect(effective.avatarUrl).toBe("/package.png");
  });
});

describe("edits and resets (contract §6)", () => {
  it("stores differences from the base only, and writes nothing for a save equal to the base", () => {
    const service = create();
    service.setEdited("agent", "solution-designer", agent(), { toolNames: ["read_file", "write_file"], avatarUrl: null, defaultLaunchConfig: null });
    expect(fs.existsSync(filePath)).toBe(false);
    expect(published).toEqual([]);
    service.setEdited("agent", "solution-designer", agent(), { toolNames: ["read_file", "write_file", "mcp_x"] });
    expect(fileJson()).toEqual({ "agent:solution-designer": { toolsAdded: ["mcp_x"] } });
    expect(published).toEqual([["agents", "agent_teams", "agent_orgs"]]);
  });

  it("removes a field when the value returns to the base, and the record when it becomes empty", () => {
    const service = create();
    const base = agent({ avatarUrl: "/package.png" });
    service.setEdited("agent", "solution-designer", base, { avatarUrl: "/mine.png", toolNames: ["read_file"] });
    expect(fileJson()).toEqual({ "agent:solution-designer": { toolsRemoved: ["write_file"], avatarUrl: "/mine.png" } });
    service.setEdited("agent", "solution-designer", base, { avatarUrl: "/package.png" });
    expect(fileJson()).toEqual({ "agent:solution-designer": { toolsRemoved: ["write_file"] } });
    service.setEdited("agent", "solution-designer", base, { toolNames: ["write_file", "read_file"] });
    expect(fileJson()).toEqual({});
  });

  it("leaves an absent field as it is, and drops a runtime/model that does not name both", () => {
    const service = create();
    service.setEdited("agent", "solution-designer", agent(), { defaultLaunchConfig: launch });
    service.setEdited("agent", "solution-designer", agent(), { avatarUrl: "/mine.png" });
    expect(service.personalSettingsOf("agent", "solution-designer")).toEqual(["AVATAR", "DEFAULT_LAUNCH_CONFIG"]);
    service.setEdited("agent", "solution-designer", agent(), { defaultLaunchConfig: { runtimeKind: "codex_app_server", llmModelIdentifier: null, llmConfig: null } });
    expect(service.personalSettingsOf("agent", "solution-designer")).toEqual(["AVATAR"]);
  });

  it("resets one setting; refuses tools on a Team", () => {
    const service = create();
    service.setEdited("agent", "solution-designer", agent(), { toolNames: ["read_file", "mcp_x"], skillNames: [] });
    service.reset("agent", "solution-designer", "TOOLS");
    expect(fileJson()).toEqual({ "agent:solution-designer": { skillsRemoved: ["design"] } });
    expect(() => service.reset("agent_team", "t", "TOOLS")).toThrow("not personal for a agent_team");
    published = [];
    service.reset("agent", "solution-designer", "AVATAR");
    expect(published).toEqual([]);
  });

  it("keeps the semantic memory switch only when it differs from the base; reset removes it; agents only", () => {
    const service = create();
    service.setEdited("agent", "solution-designer", agent(), { semanticMemoryEnabled: false });
    expect(fs.existsSync(filePath)).toBe(false);
    service.setEdited("agent", "solution-designer", agent(), { semanticMemoryEnabled: true });
    expect(fileJson()).toEqual({ "agent:solution-designer": { semanticMemoryEnabled: true } });
    expect(service.personalSettingsOf("agent", "solution-designer")).toEqual(["SEMANTIC_MEMORY"]);
    expect(service.apply("agent", agent(), "registered_package").semanticMemoryEnabled).toBe(true);
    // A package that turns it on itself: the personal "off" is kept as a difference from that base.
    service.setEdited("agent", "solution-designer", agent({ semanticMemoryEnabled: true }), { semanticMemoryEnabled: false });
    expect(fileJson()).toEqual({ "agent:solution-designer": { semanticMemoryEnabled: false } });
    expect(service.apply("agent", agent({ semanticMemoryEnabled: true }), "registered_package").semanticMemoryEnabled).toBe(false);
    service.reset("agent", "solution-designer", "SEMANTIC_MEMORY");
    expect(fileJson()).toEqual({});
    expect(() => service.reset("agent_team", "t", "SEMANTIC_MEMORY")).toThrow("not personal for a agent_team");
  });

  it("announces only the lists of the changed kinds", () => {
    const service = create();
    service.setEdited("agent_org", "o", { avatarUrl: null, defaultLaunchConfig: null }, { avatarUrl: "/o.png" });
    expect(published).toEqual([["agent_orgs"]]);
  });
});

describe("capture of package-file edits (contract §7.2, V-C)", () => {
  const installed = { toolNames: ["read_file", "write_file"], skillNames: ["design"], avatarUrl: null, defaultLaunchConfig: null };

  it("turns the user's edits on the installed revision into a record, applied on top of the new revision", () => {
    const service = create();
    service.captureFromPackageEdits([{
      kind: "agent", definitionId: "agent-package-creator", installed,
      onDisk: { ...installed, toolNames: ["write_file", "github_create_issue"], avatarUrl: "/mine.png", defaultLaunchConfig: launch },
    }]);
    expect(fileJson()).toEqual({ "agent:agent-package-creator": {
      toolsAdded: ["github_create_issue"], toolsRemoved: ["read_file"], avatarUrl: "/mine.png", defaultLaunchConfig: launch,
    } });
    expect(published).toHaveLength(1);
    const effective = service.apply("agent", agent({ id: "agent-package-creator", toolNames: ["read_file", "write_file", "search_memory"] }), "registered_package");
    expect(effective.toolNames).toEqual(["write_file", "search_memory", "github_create_issue"]);
    expect(effective.skillNames).toEqual(["design"]);
  });

  it("yields nothing for an unchanged file and keeps an existing record (safe at every update)", () => {
    const service = create();
    service.captureFromPackageEdits([{ kind: "agent", definitionId: "a", installed, onDisk: installed }]);
    expect(fs.existsSync(filePath)).toBe(false);
    service.setEdited("agent", "a", installed, { toolNames: [...installed.toolNames, "mcp_x"], avatarUrl: "/personal.png" });
    const before = fs.readFileSync(filePath, "utf8");
    service.captureFromPackageEdits([{ kind: "agent", definitionId: "a", installed, onDisk: installed }]);
    expect(fs.readFileSync(filePath, "utf8")).toBe(before);
  });

  it("merges lists into the record and never overwrites an existing personal avatar or runtime/model", () => {
    const service = create();
    service.setEdited("agent", "a", installed, { toolNames: [...installed.toolNames, "mcp_x"], avatarUrl: "/personal.png" });
    service.captureFromPackageEdits([{
      kind: "agent", definitionId: "a", installed,
      onDisk: { ...installed, toolNames: ["read_file", "write_file", "mcp_y"], avatarUrl: "/stale-file.png" },
    }]);
    expect(fileJson()).toEqual({ "agent:a": { toolsAdded: ["mcp_x", "mcp_y"], avatarUrl: "/personal.png" } });
  });

  it("is idempotent: disk [a, c], installed [a, b] → +c −b, the same again on the next update", () => {
    const service = create();
    const edit = { kind: "agent" as const, definitionId: "a", installed: { ...installed, toolNames: ["a", "b"] }, onDisk: { ...installed, toolNames: ["a", "c"] } };
    service.captureFromPackageEdits([edit]);
    const first = fs.readFileSync(filePath, "utf8");
    service.captureFromPackageEdits([edit]);
    expect(fs.readFileSync(filePath, "utf8")).toBe(first);
    expect(service.apply("agent", agent({ id: "a", toolNames: ["a", "c"] }), "registered_package").toolNames).toEqual(["a", "c"]);
  });
});

describe("the file (contract §2, §4)", () => {
  it("is 2-space JSON with a trailing newline", () => {
    create().setEdited("agent_team", "t", { avatarUrl: null, defaultLaunchConfig: null }, { avatarUrl: "/t.png" });
    expect(fs.readFileSync(filePath, "utf8")).toBe('{\n  "agent_team:t": {\n    "avatarUrl": "/t.png"\n  }\n}\n');
  });

  it("an unreadable file means no personal settings, a warning, and a copy kept before the first rewrite (AC-007)", () => {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, "{ not json");
    const service = create();
    const definition = agent();
    expect(service.apply("agent", definition, "registered_package")).toBe(definition);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("PERSONAL_SETTINGS_FILE_UNREADABLE"));
    expect(fs.readFileSync(filePath, "utf8")).toBe("{ not json");
    service.setEdited("agent", "solution-designer", agent(), { avatarUrl: "/mine.png" });
    const copies = fs.readdirSync(path.dirname(filePath)).filter((name) => name.startsWith("personal-settings.json.unreadable-"));
    expect(copies).toHaveLength(1);
    expect(fs.readFileSync(path.join(path.dirname(filePath), copies[0]!), "utf8")).toBe("{ not json");
    expect(fileJson()).toEqual({ "agent:solution-designer": { avatarUrl: "/mine.png" } });
  });

  it("skips a semantic memory value that is not a boolean, and on a Team", () => {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify({
      "agent:a": { semanticMemoryEnabled: "yes", avatarUrl: "/a.png" },
      "agent:b": { semanticMemoryEnabled: true },
      "agent_team:t": { semanticMemoryEnabled: true, avatarUrl: "/t.png" },
    }));
    const service = create();
    expect(service.apply("agent", agent({ id: "a" }), "registered_package")).toMatchObject({ semanticMemoryEnabled: false, avatarUrl: "/a.png" });
    expect(service.apply("agent", agent({ id: "b" }), "registered_package").semanticMemoryEnabled).toBe(true);
    expect(service.personalSettingsOf("agent_team", "t")).toEqual(["AVATAR"]);
  });

  it("keeps entries it skips when it writes another record", () => {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify({ "unknown:thing": { avatarUrl: "x" }, "agent:bad": { toolsAdded: [] } }));
    create().setEdited("agent_org", "o", { avatarUrl: null, defaultLaunchConfig: null }, { avatarUrl: "/o.png" });
    expect(fileJson()).toEqual({ "unknown:thing": { avatarUrl: "x" }, "agent:bad": { toolsAdded: [] }, "agent_org:o": { avatarUrl: "/o.png" } });
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("PERSONAL_SETTINGS_ENTRY_SKIPPED:unknown:thing"));
  });

  it("without a publisher, changes are written and not announced", () => {
    const service = new PersonalSettingsService({ store: new PersonalSettingsStore(() => filePath) });
    service.setEdited("agent_org", "o", { avatarUrl: null, defaultLaunchConfig: null }, { avatarUrl: "/o.png" });
    expect(fileJson()).toEqual({ "agent_org:o": { avatarUrl: "/o.png" } });
  });
});
