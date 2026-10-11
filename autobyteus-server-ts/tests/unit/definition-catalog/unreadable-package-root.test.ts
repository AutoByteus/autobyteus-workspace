import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createDiskDefinitionServices } from "../../helpers/definition-catalog-test-runtime.js";

/**
 * REQ-015 / BEH-008: a registered package folder that exists but cannot be read must not break
 * other packages' definitions, admission or startup; its own definitions keep their last loaded
 * version with an issue naming the folder (DEC-005).
 */
let base: string;
let dataDir: string;
let external: string;
let services: ReturnType<typeof createDiskDefinitionServices>;

const writeAgent = async (dir: string, name: string) => {
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, "agent.md"), `---\nname: ${name}\ndescription: ${name}\n---\n\nAct.\n`);
};
const writeTeam = async (dir: string, ref: string) => {
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, "team.md"), "---\nname: Crew\ndescription: Crew\n---\n\nCoordinate.\n");
  await fs.writeFile(path.join(dir, "team-config.json"), JSON.stringify({
    coordinatorMemberName: "lead", members: [{ memberName: "lead", ref, refScope: "shared" }],
    handoffs: [], avatarUrl: null, defaultLaunchConfig: null,
  }));
};
const chmod = (mode: number) => fs.chmod(path.join(external, "agents"), mode);

beforeEach(async () => {
  base = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), "apar-unreadable-")));
  dataDir = path.join(base, "data");
  external = path.join(base, "external");
  await writeAgent(path.join(dataDir, "agents", "alpha"), "Alpha");
  await writeTeam(path.join(dataDir, "agent-teams", "crew"), "alpha");
  await writeAgent(path.join(external, "agents", "ext"), "External");
  services = createDiskDefinitionServices({
    getAgentsDir: () => path.join(dataDir, "agents"),
    getAgentTeamsDir: () => path.join(dataDir, "agent-teams"),
    getAgentOrgsDir: () => path.join(dataDir, "agent-orgs"),
    externalRoots: [external],
  });
});

afterEach(async () => {
  services.close();
  await chmod(0o755).catch(() => undefined);
  await fs.rm(base, { recursive: true, force: true });
});

describe("an unreadable registered package folder", () => {
  it("does not block population: other packages, admission and Teams stay available", async () => {
    await chmod(0o000);
    expect((await services.agents.getAllAgentDefinitions()).map((definition) => definition.id)).toEqual(["alpha"]);
    await expect(services.admission.scan()).resolves.toBeDefined();
    expect((await services.admission.requireAvailable("agent_team", "crew")).status).toBe("available");
  });

  it("keeps the folder's definitions at their last loaded version with an issue naming it, then recovers", async () => {
    expect(await services.agents.getAgentDefinitionById("ext")).not.toBeNull();
    await chmod(0o000);
    await services.agents.refreshCache();

    expect((await services.agents.getAgentDefinitionById("ext"))?.name).toBe("External");
    expect(await services.agents.getDefinitionIssue("ext")).toMatchObject({
      code: "DEFINITION_SOURCE_MISSING",
      packageRoot: external,
      reason: expect.stringContaining("could not be read"),
    });
    expect(await services.agents.getDefinitionIssue("alpha")).toBeNull();

    // A root change for the unreadable folder (as the monitor reports it) also stays isolated.
    services.runtime.sync.noteRootChanged(external);
    await expect(services.admission.scan()).resolves.toBeDefined();

    await chmod(0o755);
    await services.agents.refreshCache();
    expect(await services.agents.getDefinitionIssue("ext")).toBeNull();
  });
});
