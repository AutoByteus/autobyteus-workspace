import { afterEach, describe, expect, it, vi } from "vitest";
import { ProjectError } from "../../../src/projects/domain/project-errors.js";
import { getStandaloneRootDirPath } from "../../../src/standalone-agent-run-root/persistence/standalone-root-tree-path.js";
import { InMemoryTaskExecutionResources } from "../../fixtures/task-execution-resource-fixtures.js";
import { HOST, buildManager, cleanupDirectories } from "./helpers/standalone-root-harness.js";

const FOLDER = "/projects/agents";
const ROOT_FOLDER = "/work";

/** A new copy's folder on an Agent root (autobyteus-97): real root and persistence; the Task side is the in-memory port. */
const setup = async (folder: string | Error | null = FOLDER) => {
  const resources = new InMemoryTaskExecutionResources();
  resources.addTask("task-1");
  if (folder !== null) resources.projectFolders.set("project_fixture", folder);
  const f = await buildManager(resources);
  const root = (await f.manager.resolveRoot(HOST))!;
  const delegate = (input: Record<string, unknown>, identity = f.hostIdentity) =>
    root.delegateToNewCopy({ identity }, input as never);
  const copies = () => root.getExecutionTreeSnapshot().taskExecutions as never as Array<{ address: string; source: never } & Record<string, never>>;
  return { f, resources, root, delegate, copies };
};
const launchFolder = (copy: { source: unknown }) => (copy.source as { launchConfiguration: { workspaceRootPath: string | null } }).launchConfiguration.workspaceRootPath;

afterEach(async () => {
  vi.restoreAllMocks();
  await cleanupDirectories();
});

describe("a new copy on an Agent root runs in its Task's Project folder", () => {
  it("a saved Task's Agent copy records and activates in the Project folder; the host keeps its own (AC-001)", async () => {
    const { f, delegate, copies } = await setup();
    await expect(delegate({ recipient_address: "/code_reviewer", task_id: "task-1" })).resolves.toMatchObject({ delegated: true });
    expect(launchFolder(copies()[0]!)).toBe(FOLDER);
    // The record: what the copy restores from.
    const stored = await f.store.readTree(getStandaloneRootDirPath(f.memoryDir, HOST), HOST);
    expect(launchFolder(stored!.taskExecutions[0] as never)).toBe(FOLDER);
    // The activation: the copy's handle starts from that launch.
    expect(f.handles.get("code-reviewer-run-1")!.input.execution).toMatchObject({ workspaceRootPath: FOLDER });
  });

  it("a Team copy has one folder: its default and every member (AC-002)", async () => {
    const { delegate, copies } = await setup();
    await delegate({ recipient_address: "/product_team", task_id: "task-1" });
    const source = copies()[0]!.source as { defaultLaunchConfiguration: { workspaceRootPath: string }; members: Array<{ launchConfiguration: { workspaceRootPath: string } }> };
    expect(source.defaultLaunchConfiguration.workspaceRootPath).toBe(FOLDER);
    expect(source.members.map((member) => member.launchConfiguration.workspaceRootPath)).toEqual([FOLDER, FOLDER]);
  });

  it("a Project with no link and a description-only delegation inherit the root's folder (AC-004)", async () => {
    const noLink = await setup(null);
    await noLink.delegate({ recipient_address: "/code_reviewer", task_id: "task-1" });
    expect(launchFolder(noLink.copies()[0]!)).toBe(ROOT_FOLDER);
    const temp = await setup();
    await temp.delegate({ recipient_address: "/code_reviewer", description: "Review" });
    expect(launchFolder(temp.copies()[0]!)).toBe(ROOT_FOLDER);
  });

  it("an unusable first link refuses with the coded error: no Task link, no copy (AC-006)", async () => {
    const { f, resources, delegate, copies } = await setup(new ProjectError("TASK_PROJECT_FOLDER_UNAVAILABLE", "Project \"P\" has the linked folder \"/gone\"."));
    await expect(delegate({ recipient_address: "/code_reviewer", task_id: "task-1" }))
      .rejects.toMatchObject({ name: "TaskDelegationError", code: "TASK_PROJECT_FOLDER_UNAVAILABLE", message: expect.stringContaining("/gone") });
    expect(resources.links).toEqual([]);
    expect(copies()).toEqual([]);
    expect(f.handles.size).toBe(0);
  });
});
