import { afterEach, describe, expect, it, vi } from "vitest";
import { createCollaborationMemberExecutionIdentity } from "../../../src/agent-collaboration/execution/domain/root-execution-identity.js";
import { ProjectError } from "../../../src/projects/domain/project-errors.js";
import { buildOrg, cleanupDirectories } from "./helpers/org-collaborator-harness.js";

const FOLDER = "/projects/agents";

/** A new copy's folder on an Org root (autobyteus-97 AC-001, AC-002, AC-004, AC-006): real root; the Task side is the in-memory port. */
const setup = async () => {
  const f = await buildOrg();
  f.resources.addTask("task-1");
  const director = createCollaborationMemberExecutionIdentity({ root: f.root, memberAddress: "/director", agentRunId: "director" });
  const delegate = (input: Record<string, unknown>) => f.owner.delegateToNewCopy({ identity: director }, input as never);
  const copies = () => f.owner.getExecutionTreeSnapshot().rootOrg.taskExecutions as never as Array<{ address: string; source: never }>;
  return { f, delegate, copies };
};
type AgentSource = { launchConfiguration: { workspaceRootPath: string | null } };
type TeamSource = { defaultLaunchConfiguration: { workspaceRootPath: string | null }; members: Array<{ launchConfiguration: { workspaceRootPath: string | null } }> };
const teamFolders = (copy: { source: unknown }) => {
  const source = copy.source as TeamSource;
  return [source.defaultLaunchConfiguration, ...source.members.map((member) => member.launchConfiguration)].map((launch) => launch.workspaceRootPath);
};

afterEach(async () => {
  vi.restoreAllMocks();
  await cleanupDirectories();
});

describe("a new copy on an Org root runs in its Task's Project folder", () => {
  it("a catalog Agent copy and a catalog Team copy take the Project folder", async () => {
    const { f, delegate, copies } = await setup();
    f.resources.projectFolders.set("project_fixture", FOLDER);
    await delegate({ recipient_address: "/code_reviewer", task_id: "task-1" });
    await delegate({ recipient_address: "/product_team", task_id: "task-1" });
    expect((copies()[0]!.source as AgentSource).launchConfiguration.workspaceRootPath).toBe(FOLDER);
    expect(new Set(teamFolders(copies()[1]!))).toEqual(new Set([FOLDER]));
  });

  it("a configured placement's copy takes it too: its default and every member", async () => {
    const { f, delegate, copies } = await setup();
    f.resources.projectFolders.set("project_fixture", FOLDER);
    await delegate({ recipient_address: "/target", task_id: "task-1" });
    expect(new Set(teamFolders(copies()[0]!))).toEqual(new Set([FOLDER]));
  });

  it("no link and a description-only delegation keep today's folder", async () => {
    const { f, delegate, copies } = await setup();
    const rootFolder = f.owner.getExecutionTreeSnapshot().rootOrg.defaultLaunchConfiguration.workspaceRootPath;
    await delegate({ recipient_address: "/code_reviewer", task_id: "task-1" });
    await delegate({ recipient_address: "/designer", description: "Design it" });
    expect(copies().map((copy) => (copy.source as AgentSource).launchConfiguration.workspaceRootPath)).toEqual([rootFolder, rootFolder]);
  });

  it("an unusable first link refuses with the coded error: no Task link, no copy", async () => {
    const { f, delegate, copies } = await setup();
    f.resources.projectFolders.set("project_fixture", new ProjectError("TASK_PROJECT_FOLDER_UNAVAILABLE", "gone"));
    await expect(delegate({ recipient_address: "/target", task_id: "task-1" })).rejects.toMatchObject({ name: "TaskDelegationError", code: "TASK_PROJECT_FOLDER_UNAVAILABLE" });
    expect(f.resources.links).toEqual([]);
    expect(copies()).toEqual([]);
  });
});
