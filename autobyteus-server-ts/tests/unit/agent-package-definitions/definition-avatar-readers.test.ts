import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createAgentPackageDefinitions, type AgentPackageDefinitions } from "../../../src/agent-package-definitions/services/agent-package-definitions.js";

/** A synthetic 1×1 PNG, and a second one with other bytes. */
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGP4z8DwHwAFAAH/iZk9HQAAAABJRU5ErkJggg==", "base64");
const PNG_2 = Buffer.concat([PNG, Buffer.from("second")]);

let base: string;
let packageRoot: string;
let packageDefinitions: AgentPackageDefinitions;
let announced: string[][];

const write = async (filePath: string, content: string | Buffer) => {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, content);
};
const writeAgent = async (dir: string, name: string) => {
  await write(path.join(dir, "agent.md"), `---\nname: ${name}\ndescription: ${name} agent\n---\n\nDo things.\n`);
  await write(path.join(dir, "agent-config.json"), JSON.stringify({ toolNames: [] }));
};

beforeEach(async () => {
  base = await fs.mkdtemp(path.join(os.tmpdir(), "definition-avatar-readers-"));
  packageRoot = path.join(base, "package");
  const dataDir = path.join(base, "data");
  await fs.mkdir(dataDir, { recursive: true });
  packageDefinitions = createAgentPackageDefinitions({
    appConfig: {
      getAgentsDir: () => path.join(dataDir, "agents"),
      getAgentTeamsDir: () => path.join(dataDir, "agent-teams"),
      getAgentOrgsDir: () => path.join(dataDir, "agent-orgs"),
      getRegisteredAgentPackageRoots: () => [packageRoot],
    },
  });
  announced = [];
  packageDefinitions.reloader.setPublisher((lists) => { announced.push([...lists]); });
  // An agent, a team with a team-local member, and an org, each with its picture beside its definition file.
  await writeAgent(path.join(packageRoot, "agents", "writer"), "Writer");
  await write(path.join(packageRoot, "agents", "writer", "avatar.png"), PNG);
  const teamDir = path.join(packageRoot, "agent-teams", "crew");
  await write(path.join(teamDir, "team.md"), "---\nname: Crew\ndescription: Crew team\n---\n\nCoordinate.\n");
  await write(path.join(teamDir, "team-config.json"), JSON.stringify({
    coordinatorMemberName: "lead", members: [{ memberName: "lead", ref: "lead", refScope: "team_local" }], handoffs: [], avatarUrl: null, defaultLaunchConfig: null,
  }));
  await writeAgent(path.join(teamDir, "agents", "lead"), "Lead");
  await write(path.join(teamDir, "avatar.png"), PNG);
  const orgDir = path.join(packageRoot, "agent-orgs", "studio");
  await write(path.join(orgDir, "org.md"), "---\nname: Studio\ndescription: Studio org\n---\n\nRun the org.\n");
  await write(path.join(orgDir, "org-config.json"), JSON.stringify({
    members: [{ memberName: "writer", ref: "writer", refType: "agent", refScope: "shared" }], handoffs: [], avatarUrl: null, defaultLaunchConfig: null,
  }));
  await write(path.join(orgDir, "avatar.png"), PNG);
  await packageDefinitions.reloader.applyPendingChanges();
});

afterEach(async () => {
  packageDefinitions.reloader.close();
  vi.restoreAllMocks();
  await fs.rm(base, { recursive: true, force: true });
});

// autobyteus-669 S-1 (REQ-001, REQ-002, AC-001, AC-002): an agent, team or org package carries its picture in its folder.
describe("definition readers and the package picture", () => {
  it("reads the picture of an agent, a team and an org from their own folders", () => {
    expect(packageDefinitions.store.getDefinition("agent", "writer")?.packageAvatar).toMatchObject({
      folder: path.join(packageRoot, "agents", "writer"), fileName: "avatar.png", mimeType: "image/png",
    });
    expect(packageDefinitions.store.getDefinition("agent_team", "crew")?.packageAvatar).toMatchObject({
      folder: path.join(packageRoot, "agent-teams", "crew"), fileName: "avatar.png",
    });
    expect(packageDefinitions.store.getDefinition("agent_org", "studio")?.packageAvatar).toMatchObject({
      folder: path.join(packageRoot, "agent-orgs", "studio"), fileName: "avatar.png",
    });
  });

  it.each([
    ["agent", "writer", path.join("agents", "writer")],
    ["agent_team", "crew", path.join("agent-teams", "crew")],
    ["agent_org", "studio", path.join("agent-orgs", "studio")],
  ] as const)("a replaced %s picture reloads the definition, like a changed definition file, with a new version", async (kind, id, folder) => {
    const before = packageDefinitions.store.getDefinition(kind, id)!.packageAvatar!.version;
    announced = [];
    await write(path.join(packageRoot, folder, "avatar.png"), PNG_2);
    await packageDefinitions.reloader.reloadFoldersNow(kind, [id]);
    expect(packageDefinitions.store.getDefinition(kind, id)!.packageAvatar!.version).not.toBe(before);
    expect(announced.flat()).toContain(kind === "agent" ? "agents" : kind === "agent_team" ? "agent_teams" : "agent_orgs");
  });

  it("an unchanged picture reloads nothing", async () => {
    announced = [];
    await packageDefinitions.reloader.reloadFoldersNow("agent", ["writer"]);
    expect(announced.flat()).not.toContain("agents");
  });

  it("an invalid picture is ignored: the definition loads, with no picture, and the reason is logged once", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    await write(path.join(packageRoot, "agents", "writer", "avatar.webp"), "not a picture");
    await packageDefinitions.reloader.reloadFoldersNow("agent", ["writer"]);
    await packageDefinitions.reloader.reloadFoldersNow("agent", ["writer"]);
    const writer = packageDefinitions.store.getDefinition("agent", "writer");
    expect(writer?.name).toBe("Writer");
    expect(writer?.packageAvatar).toBeNull();
    expect(packageDefinitions.store.getEntry("agent", "writer")?.issue ?? null).toBeNull();
    expect(warn.mock.calls.filter(([line]) => String(line).includes("DEFINITION_AVATAR_IGNORED"))).toHaveLength(1);
  });

  it("a definition without a picture has none", async () => {
    await writeAgent(path.join(packageRoot, "agents", "plain"), "Plain");
    await packageDefinitions.reloader.reloadFoldersNow("agent", ["plain"]);
    expect(packageDefinitions.store.getDefinition("agent", "plain")?.packageAvatar).toBeNull();
  });
});
