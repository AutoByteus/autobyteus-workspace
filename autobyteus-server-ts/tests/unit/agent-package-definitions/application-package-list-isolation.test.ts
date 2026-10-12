import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ApplicationOwnedDefinitionSource } from "../../../src/application-bundles/domain/models.js";
import {
  buildCanonicalApplicationOwnedAgentId,
  buildCanonicalApplicationOwnedTeamId,
} from "../../../src/application-bundles/utils/application-bundle-identity.js";
import { createDiskDefinitionServices } from "../../helpers/agent-package-definitions-test-support.js";

// SR-009 / N-7: application-package agents and Teams are read on demand for the lists, one by one,
// so a malformed one is skipped and never fails the whole list.

const PACKAGE_ID = "pkg";
const APP_ID = "studio";

let base: string;
let dataDir: string;
let appRoot: string;
let services: ReturnType<typeof createDiskDefinitionServices> | null = null;

const write = async (filePath: string, content: string) => {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, content, "utf8");
};
const agentFiles = async (dir: string, md: string, config = JSON.stringify({ toolNames: [], skillNames: [] })) => {
  await write(path.join(dir, "agent.md"), md);
  await write(path.join(dir, "agent-config.json"), config);
};
const agentMd = (name: string) => `---\nname: ${name}\ndescription: ${name} agent\n---\n\nWork.\n`;
const source = (kind: "agent" | "agent_team", localId: string): ApplicationOwnedDefinitionSource => ({
  definitionId: kind === "agent"
    ? buildCanonicalApplicationOwnedAgentId(PACKAGE_ID, APP_ID, localId)
    : buildCanonicalApplicationOwnedTeamId(PACKAGE_ID, APP_ID, localId),
  applicationId: `application:${PACKAGE_ID}:${APP_ID}`,
  applicationName: "Studio",
  packageId: PACKAGE_ID,
  localApplicationId: APP_ID,
  localDefinitionId: localId,
  applicationRootPath: appRoot,
  packageRootPath: path.dirname(appRoot),
  writable: false,
});

beforeEach(async () => {
  base = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), "apar-app-lists-")));
  dataDir = path.join(base, "data");
  appRoot = path.join(base, "app-package", "applications", APP_ID);
  await agentFiles(path.join(dataDir, "agents", "shared"), agentMd("Shared"));
  await agentFiles(path.join(appRoot, "agents", "good"), agentMd("Good"));
  await agentFiles(path.join(appRoot, "agents", "bad-md"), "no front matter");
  await agentFiles(path.join(appRoot, "agents", "bad-config"), agentMd("Bad Config"), "{ not json");
  const goodAgentId = buildCanonicalApplicationOwnedAgentId(PACKAGE_ID, APP_ID, "good");
  await write(path.join(appRoot, "agent-teams", "crew", "team.md"), "---\nname: Crew\ndescription: Crew team\n---\n\nCoordinate.\n");
  await write(path.join(appRoot, "agent-teams", "crew", "team-config.json"), JSON.stringify({
    coordinatorMemberName: "lead",
    members: [{ memberName: "lead", ref: goodAgentId, refScope: "application_owned" }],
    handoffs: [], avatarUrl: null, defaultLaunchConfig: null,
  }));
  await write(path.join(appRoot, "agent-teams", "broken", "team.md"), "---\nname: Broken\ndescription: Broken team\n---\n\nX.\n");
  await write(path.join(appRoot, "agent-teams", "broken", "team-config.json"), "{ not json");
});

afterEach(async () => {
  services?.close();
  services = null;
  await fs.rm(base, { recursive: true, force: true });
});

const create = (bundle: Parameters<typeof createDiskDefinitionServices>[1]) => {
  services = createDiskDefinitionServices({
    getAgentsDir: () => path.join(dataDir, "agents"),
    getAgentTeamsDir: () => path.join(dataDir, "agent-teams"),
    getAgentOrgsDir: () => path.join(dataDir, "agent-orgs"),
  }, bundle);
  return services;
};

describe("application-package definitions in the lists (N-7)", () => {
  it("lists valid application-package agents and Teams beside a malformed one, skipping only the malformed", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const { agents, teams } = create({
      listApplicationOwnedAgentSources: async () => [source("agent", "good"), source("agent", "bad-md"), source("agent", "bad-config")],
      listApplicationOwnedTeamSources: async () => [source("agent_team", "crew"), source("agent_team", "broken")],
    });

    const agentIds = (await agents.getAllAgentDefinitions()).map((definition) => definition.id);
    expect(agentIds).toEqual(["shared", source("agent", "good").definitionId]);
    expect((await agents.getVisibleAgentDefinitions()).map((definition) => definition.id)).toContain(source("agent", "good").definitionId);
    expect((await teams.getAllDefinitions()).map((definition) => definition.id)).toEqual([source("agent_team", "crew").definitionId]);

    const warnings = warn.mock.calls.map((call) => String(call[0]));
    expect(warnings.some((line) => line.startsWith(`APPLICATION_PACKAGE_AGENT_SKIPPED:${source("agent", "bad-md").definitionId}`))).toBe(true);
    expect(warnings.some((line) => line.startsWith(`APPLICATION_PACKAGE_AGENT_SKIPPED:${source("agent", "bad-config").definitionId}`))).toBe(true);
    expect(warnings.some((line) => line.startsWith(`APPLICATION_PACKAGE_TEAM_SKIPPED:${source("agent_team", "broken").definitionId}`))).toBe(true);
    warn.mockRestore();
  });

  it("keeps the agent package definitions listed when the application packages cannot be listed", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const { agents, teams } = create({
      listApplicationOwnedAgentSources: async () => { throw new Error("bundle index unavailable"); },
      listApplicationOwnedTeamSources: async () => { throw new Error("bundle index unavailable"); },
    });

    expect((await agents.getAllAgentDefinitions()).map((definition) => definition.id)).toEqual(["shared"]);
    expect((await agents.getVisibleAgentDefinitions()).map((definition) => definition.id)).toEqual(["shared"]);
    expect(await teams.getAllDefinitions()).toEqual([]);
    warn.mockRestore();
  });

  it("does not hold application-package definitions in the agent package definition store", async () => {
    const { agents, packageDefinitions } = create({
      listApplicationOwnedAgentSources: async () => [source("agent", "good")],
      listApplicationOwnedTeamSources: async () => [source("agent_team", "crew")],
    });
    await agents.getAllAgentDefinitions();
    expect(packageDefinitions.store.folderIds("agent")).toEqual(["shared"]);
    expect(packageDefinitions.store.folderIds("agent_team")).toEqual([]);
  });
});
