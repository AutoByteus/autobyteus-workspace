import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createDefinitionCatalogRuntime, type DefinitionCatalogRuntime } from "../../../src/definition-catalog/services/definition-catalog-runtime.js";
import { buildTeamLocalAgentDefinitionId } from "../../../src/agent-team-definition/utils/team-local-definition-id.js";
import { buildAgentOrgOwnedDefinitionId } from "../../../src/agent-org-definition/utils/agent-org-owned-definition-id.js";

let base: string;
let dataDir: string;
let packageA: string;
let packageB: string;
let registered: string[];
let runtime: DefinitionCatalogRuntime;

const write = async (filePath: string, content: string) => {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, content, "utf8");
};
const agentMd = (name: string, instructions = "Do things.") =>
  `---\nname: ${name}\ndescription: ${name} agent\n---\n\n${instructions}\n`;
const writeAgent = async (dir: string, name: string, instructions?: string) => {
  await write(path.join(dir, "agent.md"), agentMd(name, instructions));
  await write(path.join(dir, "agent-config.json"), JSON.stringify({ toolNames: [] }));
};
const teamMd = (name: string) => `---\nname: ${name}\ndescription: ${name} team\n---\n\nCoordinate.\n`;
const teamConfig = (members: Array<{ memberName: string; ref: string; refScope: string }>) => JSON.stringify({
  coordinatorMemberName: members[0]!.memberName, members, handoffs: [], avatarUrl: null, defaultLaunchConfig: null,
});
const writeTeam = async (dir: string, name: string, members = [{ memberName: "lead", ref: "lead", refScope: "team_local" }]) => {
  await write(path.join(dir, "team.md"), teamMd(name));
  await write(path.join(dir, "team-config.json"), teamConfig(members));
};
const orgMd = (name: string) => `---\nname: ${name}\ndescription: ${name} org\n---\n\nRun the org.\n`;
const orgConfig = (members: Array<{ memberName: string; ref: string; refType: string; refScope: string }>) => JSON.stringify({
  members, handoffs: [], avatarUrl: null, defaultLaunchConfig: null,
});

beforeEach(async () => {
  base = await fs.mkdtemp(path.join(os.tmpdir(), "apar-readers-"));
  dataDir = path.join(base, "data");
  packageA = path.join(base, "package-a");
  packageB = path.join(base, "package-b");
  await fs.mkdir(dataDir, { recursive: true });
  registered = [packageA, packageB];
  runtime = createDefinitionCatalogRuntime({
    appConfig: {
      getAgentsDir: () => path.join(dataDir, "agents"),
      getAgentTeamsDir: () => path.join(dataDir, "agent-teams"),
      getAgentOrgsDir: () => path.join(dataDir, "agent-orgs"),
      getRegisteredAgentPackageRoots: () => registered,
    },
    applicationOwnedSources: {
      listApplicationOwnedAgentSources: async () => [],
      getApplicationOwnedAgentSourceById: async () => null,
      listApplicationOwnedTeamSources: async () => [],
      getApplicationOwnedTeamSourceById: async () => null,
    },
  });
});

afterEach(async () => {
  runtime.sync.close();
  await fs.rm(base, { recursive: true, force: true });
});

describe("definition source readers", () => {
  it("isolates one invalid agent-config.json: the other agents stay readable (catalog bricking regression)", async () => {
    await fs.mkdir(packageA, { recursive: true });
    await writeAgent(path.join(packageA, "agents", "good"), "Good");
    await write(path.join(packageA, "agents", "broken", "agent.md"), agentMd("Broken"));
    await write(path.join(packageA, "agents", "broken", "agent-config.json"), "{ not json");
    await runtime.sync.settle();

    expect(runtime.catalog.getDefinition("agent", "good")?.name).toBe("Good");
    expect(runtime.catalog.getDefinition("agent", "broken")).toBeNull();
    expect(runtime.catalog.getEntry("agent", "broken")?.issue).toMatchObject({
      code: "DEFINITION_CONTRACT_INVALID",
      definitionPath: path.join(packageA, "agents", "broken", "agent-config.json"),
      packageRoot: packageA,
    });
  });

  it("treats a folder without definition files as absent and a missing agent.md as invalid", async () => {
    await fs.mkdir(path.join(packageA, "agents", "empty", "skills"), { recursive: true });
    await write(path.join(packageA, "agents", "half", "agent-config.json"), "{}");
    await runtime.sync.settle();
    expect(runtime.catalog.unitIds("agent")).toEqual(["half"]);
    expect(runtime.catalog.getEntry("agent", "half")?.issue?.reason).toBe("agent.md is missing.");
  });

  it("keeps agent precedence: the default package, then registered roots in order", async () => {
    await writeAgent(path.join(dataDir, "agents", "shared"), "From data");
    await fs.mkdir(packageA, { recursive: true });
    await writeAgent(path.join(packageA, "agents", "shared"), "From A");
    await writeAgent(path.join(packageA, "agents", "only-a"), "Only A");
    await runtime.sync.settle();
    expect(runtime.catalog.getDefinition("agent", "shared")?.name).toBe("From data");
    expect(runtime.catalog.getDefinition("agent", "only-a")?.name).toBe("Only A");
  });

  it("reads a Team unit with its team-local agents, and marks a Team in two packages as duplicated", async () => {
    await writeTeam(path.join(packageA, "agent-teams", "crew"), "Crew");
    await writeAgent(path.join(packageA, "agent-teams", "crew", "agents", "lead"), "Lead");
    await writeTeam(path.join(packageA, "agent-teams", "twin"), "Twin A");
    await writeTeam(path.join(packageB, "agent-teams", "twin"), "Twin B");
    await runtime.sync.settle();

    const localId = buildTeamLocalAgentDefinitionId("crew", "lead");
    expect(runtime.catalog.getDefinition("agent_team", "crew")?.name).toBe("Crew");
    expect(runtime.catalog.getDefinition("agent", localId)).toMatchObject({
      ownershipScope: "team_local", ownerTeamId: "crew", ownerTeamName: "Crew",
    });
    expect(runtime.catalog.getDefinition("agent_team", "twin")).toBeNull();
    expect(runtime.catalog.getEntry("agent_team", "twin")?.issue?.code).toBe("DEFINITION_IDENTITY_DUPLICATED");
  });

  it("does not report one physical Team folder registered twice as duplicated (N-4)", async () => {
    registered = [packageA, packageA];
    await writeTeam(path.join(packageA, "agent-teams", "crew"), "Crew");
    await runtime.sync.settle();
    expect(runtime.catalog.getDefinition("agent_team", "crew")?.name).toBe("Crew");
  });

  it("classifies a Team folder that holds an Org config as a family mismatch", async () => {
    await write(path.join(packageA, "agent-teams", "wrong", "team.md"), teamMd("Wrong"));
    await write(path.join(packageA, "agent-teams", "wrong", "org-config.json"), "{}");
    await runtime.sync.settle();
    expect(runtime.catalog.getEntry("agent_team", "wrong")?.issue?.code).toBe("DEFINITION_FAMILY_MISMATCH");
  });

  it("reads an Org unit with its org-owned agents, org-owned Teams and their local agents", async () => {
    const orgDir = path.join(packageA, "agent-orgs", "studio");
    const ownedAgentId = buildAgentOrgOwnedDefinitionId("agent", "studio", "writer");
    const ownedTeamId = buildAgentOrgOwnedDefinitionId("agent_team", "studio", "squad");
    await write(path.join(orgDir, "org.md"), orgMd("Studio"));
    await write(path.join(orgDir, "org-config.json"), orgConfig([
      { memberName: "writer", ref: ownedAgentId, refType: "agent", refScope: "org_local" },
      { memberName: "squad", ref: ownedTeamId, refType: "agent_team", refScope: "org_local" },
    ]));
    await writeAgent(path.join(orgDir, "agents", "writer"), "Writer");
    await writeAgent(path.join(orgDir, "agents", "unreferenced"), "Unreferenced");
    await writeTeam(path.join(orgDir, "agent-teams", "squad"), "Squad");
    await writeAgent(path.join(orgDir, "agent-teams", "squad", "agents", "lead"), "Squad Lead");
    await runtime.sync.settle();

    const localId = buildTeamLocalAgentDefinitionId(ownedTeamId, "lead");
    expect(runtime.catalog.getDefinition("agent_org", "studio")?.name).toBe("Studio");
    expect(runtime.catalog.getDefinition("agent", ownedAgentId)).toMatchObject({ ownershipScope: "agent_org_owned", ownerOrgId: "studio" });
    expect(runtime.catalog.getDefinition("agent_team", ownedTeamId)).toMatchObject({ ownershipScope: "agent_org_owned", ownerOrgName: "Studio" });
    expect(runtime.catalog.getDefinition("agent", localId)?.ownerTeamName).toBe("Squad");
    expect(runtime.catalog.getDefinition("agent", buildAgentOrgOwnedDefinitionId("agent", "studio", "unreferenced"))).toBeNull();
    expect(runtime.catalog.unitOf("agent", localId)).toEqual({ subject: "agent_org", unitId: "studio" });

    // A broken org-config.json keeps the Org and its owned nodes (correlated through the last good members).
    await write(path.join(orgDir, "org-config.json"), "{");
    await writeAgent(path.join(orgDir, "agents", "writer"), "Writer v2");
    runtime.sync.noteUnitChange("agent_org", "studio");
    await runtime.sync.settle();
    expect(runtime.catalog.getEntry("agent_org", "studio")?.issue?.code).toBe("DEFINITION_CONTRACT_INVALID");
    expect(runtime.catalog.getDefinition("agent_org", "studio")?.name).toBe("Studio");
    expect(runtime.catalog.getDefinition("agent", ownedAgentId)?.name).toBe("Writer v2");
    expect(runtime.catalog.getDefinition("agent_team", ownedTeamId)).not.toBeNull();
  });

  it("skips `_`-prefixed template folders", async () => {
    await writeAgent(path.join(packageA, "agents", "_template"), "Template");
    await writeTeam(path.join(packageA, "agent-teams", "_template"), "Template");
    await runtime.sync.settle();
    expect(runtime.catalog.unitIds("agent")).toEqual([]);
    expect(runtime.catalog.unitIds("agent_team")).toEqual([]);
  });
});
