import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  adoptedAgentRunFile,
  adoptedTeamRunFile,
  handStartedAgentRunFile,
  handStartedTeamRunFile,
} from "../../../../src/run-history/store/hand-started-run-adoption-shape.js";
import { AgentMemoryLayout } from "../../../../src/agent-memory/store/agent-memory-layout.js";
import { AgentRunMetadataStore } from "../../../../src/run-history/store/agent-run-metadata-store.js";
import type { TaskAgentSection } from "../../../../src/run-history/store/agent-run-metadata-types.js";
import { TaskAgentOwnFiles } from "../../../../src/run-history/store/task-agent-own-files.js";
import { TeamRunExecutionTreeStore } from "../../../../src/run-history/store/team-run-execution-tree-store.js";
import { validateTeamRunExecutionTreePayload } from "../../../../src/run-history/store/team-run-execution-tree-schema.js";
import { getTeamRunExecutionTreePath } from "../../../../src/run-history/store/team-run-execution-tree-path.js";

/** Design SR-008 "Step 3 keeps every fact and is exactly reversible" (DI-001: a team run is rooted at `/`). */

const T0 = "2026-10-18T09:00:00.000Z";
const launch = { runtimeKind: "codex_app_server", llmModelIdentifier: "gpt-5", llmConfig: null, autoExecuteTools: true, workspaceRootPath: "/work/superrepo" };
const section = (address: string): TaskAgentSection => ({
  coordinatingRun: { kind: "agent", runId: "pm-run" }, delegatorAgentRunId: "pm-run", address: address as never, origin: "catalog",
});

/** A team run the user started, as the team-run store writes it: rooted at `/`, with names, roles, descriptions and handoffs. */
const handStartedTeamTree = (teamRunId: string) => ({
  createdAt: T0, archivedAt: null, applicationBinding: null,
  handoffs: [{ from: "/solution_designer", to: "/implementation_engineer", rules: ["When the design is ready."] }],
  rootTeam: {
    address: "/", teamDefinitionId: "software-engineering-team", teamDefinitionName: "Software Engineering Team", teamRunId,
    coordinatorAddress: "/solution_designer", defaultLaunchConfiguration: launch,
    members: [
      { address: "/solution_designer", agentDefinitionId: "solution-designer", role: "Designer", description: "Designs.", agentRunId: `${teamRunId}-sd`,
        platformAgentRunId: "thread-sd", launchConfiguration: launch },
      { address: "/implementation_engineer", agentDefinitionId: "implementation-engineer", role: "Engineer", description: "Builds.", agentRunId: `${teamRunId}-ie`,
        platformAgentRunId: null, launchConfiguration: { ...launch, llmModelIdentifier: "gpt-5-mini" } },
    ],
    taskExecutions: [],
  },
});

const handStartedAgentMetadata = (memory: string, runId: string) => ({
  runId, agentDefinitionId: "solution-designer", workspaceRootPath: "/work/superrepo", memoryDir: path.join(memory, "agents", runId),
  llmModelIdentifier: "gpt-5", llmConfig: { reasoning_effort: "high" }, autoExecuteTools: true, runtimeKind: "codex_app_server",
  platformAgentRunId: "thread-a", startedAt: T0, preparedAt: T0, applicationExecutionContext: null,
});

const roots: string[] = [];
afterEach(async () => { await Promise.all(roots.splice(0).map((root) => fs.rm(root, { recursive: true, force: true }))); });
const memoryRoot = async () => { const root = await fs.mkdtemp(path.join(os.tmpdir(), "adoption-shape-")); roots.push(root); return root; };
const readJson = async (file: string) => JSON.parse(await fs.readFile(file, "utf8"));

describe("the adoption's own-file change is exact and reversible (pure)", () => {
  it("rebases a team tree from `/` to the catalog address, keeps every other key, and the inverse restores it exactly", () => {
    const tree = handStartedTeamTree("team-1");
    const adopted = adoptedTeamRunFile(tree, section("/software_engineering_team"));
    expect(adopted).toMatchObject({
      handoffs: [{ from: "/software_engineering_team/solution_designer", to: "/software_engineering_team/implementation_engineer", rules: ["When the design is ready."] }],
      rootTeam: {
        address: "/software_engineering_team", coordinatorAddress: "/software_engineering_team/solution_designer",
        teamDefinitionName: "Software Engineering Team",
        members: [
          expect.objectContaining({ address: "/software_engineering_team/solution_designer", role: "Designer", description: "Designs." }),
          expect.objectContaining({ address: "/software_engineering_team/implementation_engineer", role: "Engineer" }),
        ],
      },
      taskAgent: section("/software_engineering_team"),
    });
    expect(handStartedTeamRunFile(adopted)).toEqual(tree);
  });

  it("adds and removes only `taskAgent` on an agent run's metadata", () => {
    const metadata = handStartedAgentMetadata("/memory", "agent-1");
    const adopted = adoptedAgentRunFile(metadata, section("/solution_designer"));
    expect(adopted).toEqual({ ...metadata, taskAgent: section("/solution_designer") });
    expect(handStartedAgentRunFile(adopted)).toEqual(metadata);
  });

  it("refuses a team address outside the frame it is moved out of", () => {
    const adopted = adoptedTeamRunFile(handStartedTeamTree("team-1"), section("/software_engineering_team"));
    const foreign = { ...adopted, handoffs: [{ from: "/elsewhere/a", to: "/software_engineering_team/solution_designer", rules: [] }] };
    expect(() => handStartedTeamRunFile(foreign)).toThrow("handoffs[0].from is not inside '/software_engineering_team'.");
  });
});

describe("TaskAgentOwnFiles.adoptOwnFile / restoreHandStartedFile on disk", () => {
  it("makes a team run a task agent team the task-agent reader reads, and restoring it makes it a team run again (parsed-identical)", async () => {
    const memory = await memoryRoot();
    const files = new TaskAgentOwnFiles(memory);
    const teamDir = new AgentMemoryLayout(memory).getTeamDirPath({ rootTeamRunId: "team-1", ancestorTeamRunIds: [] });
    const original = handStartedTeamTree("team-1");
    await fs.mkdir(teamDir, { recursive: true });
    await fs.writeFile(getTeamRunExecutionTreePath(teamDir), JSON.stringify(original));
    const teamRuns = new TeamRunExecutionTreeStore();
    const asTeamRun = await teamRuns.read(teamDir, "team-1");
    expect(asTeamRun).toEqual(validateTeamRunExecutionTreePayload(original, "team-1"));

    expect((await files.adoptOwnFile({ teamRunId: "team-1" }, section("/software_engineering_team"))).outcome).toBe("committed");
    expect(await teamRuns.read(teamDir, "team-1")).toBeNull(); // G2: no longer a team run
    expect(await files.coordinatingRunOf({ teamRunId: "team-1" })).toEqual({ kind: "agent", runId: "pm-run" });
    const own = await files.readTeam("team-1");
    expect(own.kind).toBe("present");
    expect(own.kind === "present" && own.tree.rootTeam).toMatchObject({ address: "/software_engineering_team",
      members: [expect.objectContaining({ address: "/software_engineering_team/solution_designer", agentRunId: "team-1-sd", platformAgentRunId: "thread-sd" }),
        expect.objectContaining({ address: "/software_engineering_team/implementation_engineer" })] });
    // Every fact the task-agent shape does not model is still in the file.
    expect((await readJson(getTeamRunExecutionTreePath(teamDir))).rootTeam).toMatchObject({ teamDefinitionName: "Software Engineering Team",
      members: [expect.objectContaining({ role: "Designer", description: "Designs." }), expect.objectContaining({ role: "Engineer" })] });

    // A stop inside step 3 and a close: the undo restores a team run the team-run reader opens, parsed-identical.
    expect((await files.restoreHandStartedFile({ teamRunId: "team-1" })).outcome).toBe("committed");
    expect(await readJson(getTeamRunExecutionTreePath(teamDir))).toEqual(original);
    expect(await teamRuns.read(teamDir, "team-1")).toEqual(asTeamRun);
    expect(await files.coordinatingRunOf({ teamRunId: "team-1" })).toBeNull();
  });

  it("makes an agent run a task agent hidden from the standalone reader, and restoring it makes it a standalone run again", async () => {
    const memory = await memoryRoot();
    const files = new TaskAgentOwnFiles(memory);
    const metadataStore = new AgentRunMetadataStore(memory);
    const original = handStartedAgentMetadata(memory, "agent-1");
    await fs.mkdir(path.join(memory, "agents", "agent-1"), { recursive: true });
    await fs.writeFile(metadataStore.getMetadataPath("agent-1"), JSON.stringify(original));
    expect(await metadataStore.readMetadata("agent-1")).toMatchObject({ runId: "agent-1", agentDefinitionId: "solution-designer" });

    expect((await files.adoptOwnFile({ agentRunId: "agent-1" }, section("/solution_designer"))).outcome).toBe("committed");
    expect(await metadataStore.readMetadata("agent-1")).toBeNull(); // G1
    expect(await readJson(metadataStore.getMetadataPath("agent-1"))).toEqual({ ...original, taskAgent: section("/solution_designer") });
    const own = await files.readAgent("agent-1");
    expect(own.kind === "present" && own.metadata).toMatchObject({ runId: "agent-1", startedAt: T0, taskAgent: section("/solution_designer") });

    expect((await files.restoreHandStartedFile({ agentRunId: "agent-1" })).outcome).toBe("committed");
    expect(await readJson(metadataStore.getMetadataPath("agent-1"))).toEqual(original);
    expect(await metadataStore.readMetadata("agent-1")).toMatchObject({ runId: "agent-1" });
  });
});
