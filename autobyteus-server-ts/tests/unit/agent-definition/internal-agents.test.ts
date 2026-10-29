import "reflect-metadata";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { AgentDefinition } from "../../../src/agent-definition/domain/models.js";
import {
  buildAgentConfigRecord, mergeAgentConfigRecord, normalizeAgentConfigRecord,
} from "../../../src/agent-definition/providers/agent-definition-config.js";
import { readAgentDefinitionNode } from "../../../src/agent-definition/providers/agent-definition-node-reader.js";
import { InternalAgentVisibility } from "../../../src/agent-definition/services/internal-agent-visibility.js";
import { AgentDefinitionService } from "../../../src/agent-definition/services/agent-definition-service.js";
import {
  normalizeShowInternalAgentsForPersistence, readShowInternalAgents,
} from "../../../src/config/show-internal-agents-setting.js";
import { AgentDefinitionConverter } from "../../../src/api/graphql/converters/agent-definition-converter.js";

/** autobyteus-308: the `internal` attribute, the "Show internal agents" setting and the one visibility rule. */
const definition = (id: string, internal = false) =>
  new AgentDefinition({ id, name: id, description: `${id} description`, instructions: "x", internal });

const directories: string[] = [];
afterEach(async () => { await Promise.all(directories.splice(0).map((dir) => fs.rm(dir, { recursive: true, force: true }))); });

describe("the internal attribute in agent-config.json (REQ-001)", () => {
  it("reads true as internal; absent or anything else as a normal agent", () => {
    expect(normalizeAgentConfigRecord({ internal: true }).internal).toBe(true);
    for (const value of [undefined, false, "true", 1, null]) {
      expect(normalizeAgentConfigRecord({ internal: value } as Record<string, unknown>).internal).toBe(false);
    }
  });

  it("is written only for an internal agent; a normal agent's file gains no key (AC-007)", () => {
    expect(buildAgentConfigRecord(definition("router", true))).toMatchObject({ internal: true });
    expect(buildAgentConfigRecord(definition("reviewer"))).not.toHaveProperty("internal");
  });

  it("saving an internal agent keeps \"internal\": true (AC-006)", async () => {
    const agentDir = await fs.mkdtemp(path.join(os.tmpdir(), "internal-agent-")); directories.push(agentDir);
    await fs.writeFile(path.join(agentDir, "agent.md"), "---\nname: Model Router\ndescription: Routes work\n---\nRoute.\n");
    await fs.writeFile(path.join(agentDir, "agent-config.json"), JSON.stringify({ internal: true, toolNames: ["list_available_agent_runtimes"] }));
    const read = await readAgentDefinitionNode({ agentDir, definitionId: "model-router", ownership: { ownershipScope: "shared" } });
    expect(read.status).toBe("valid");
    const loaded = (read as { definition: AgentDefinition }).definition;
    expect(loaded.internal).toBe(true);
    // An edit in the app patches the stored definition and writes it back through the merge.
    loaded.description = "Routes work, edited";
    const written = mergeAgentConfigRecord(JSON.parse(await fs.readFile(path.join(agentDir, "agent-config.json"), "utf8")), loaded);
    expect(written).toMatchObject({ internal: true, toolNames: ["list_available_agent_runtimes"] });
  });

  it("GraphQL carries it for the badge", async () => {
    expect((await AgentDefinitionConverter.toGraphql(definition("router", true))).internal).toBe(true);
    expect((await AgentDefinitionConverter.toGraphql(definition("reviewer"))).internal).toBe(false);
  });
});

describe("the \"Show internal agents\" setting (REQ-002)", () => {
  it("is off unless the value is true; persists true or false only", () => {
    expect(readShowInternalAgents(undefined)).toBe(false);
    expect(readShowInternalAgents("false")).toBe(false);
    expect(readShowInternalAgents("yes")).toBe(false);
    expect(readShowInternalAgents(" TRUE ")).toBe(true);
    expect(normalizeShowInternalAgentsForPersistence("True")).toEqual([true, "true"]);
    expect(normalizeShowInternalAgentsForPersistence("FALSE")).toEqual([true, "false"]);
    expect(normalizeShowInternalAgentsForPersistence("on")[0]).toBe(false);
  });
});

describe("InternalAgentVisibility, the one rule (REQ-003…007)", () => {
  const agents = [definition("reviewer"), definition("router", true)];
  const visibilityWith = (shown: { value: boolean }) => new InternalAgentVisibility({
    definitions: { getAgentDefinitionsWithTeamLocal: async () => agents },
    readShowInternalAgents: () => shown.value,
  });

  it("hides internal agents only while the setting is off, read on each call", async () => {
    const shown = { value: false };
    const visibility = visibilityWith(shown);
    expect(visibility.isHidden(agents[1]!)).toBe(true);
    expect(visibility.isHidden(agents[0]!)).toBe(false);
    expect([...await visibility.hiddenDefinitionIds()]).toEqual(["router"]);
    shown.value = true;
    expect(visibility.isHidden(agents[1]!)).toBe(false);
    expect([...await visibility.hiddenDefinitionIds()]).toEqual([]);
  });

  it("the visible agent list (Agents page, pickers, mobile, application resources) follows it (AC-001, AC-005)", async () => {
    const shown = { value: false };
    const service = new AgentDefinitionService({
      visibility: visibilityWith(shown),
      fileStore: { listApplicationOwnedAgents: async () => [], listApplicationOwnedTeamLocalAgents: async () => [] } as never,
      packageDefinitions: {
        reloader: { applyPendingChanges: async () => undefined },
        store: {
          listFolderRoots: () => agents.map((entry) => ({ definition: entry })),
          listNestedDefinitions: () => [],
        },
      } as never,
    });
    expect((await service.getVisibleAgentDefinitions()).map((entry) => entry.id)).toEqual(["reviewer"]);
    // Direct access by ID and the full list are not browsing: they keep the internal agent (REQ-008).
    expect((await service.getAgentDefinitionsWithTeamLocal()).map((entry) => entry.id)).toEqual(["reviewer", "router"]);
    shown.value = true;
    expect((await service.getVisibleAgentDefinitions()).map((entry) => entry.id)).toEqual(["reviewer", "router"]);
  });
});
