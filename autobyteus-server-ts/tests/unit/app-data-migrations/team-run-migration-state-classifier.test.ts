import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { TeamRunMigrationStateClassifier } from "../../../src/app-data-migrations/migrations/team-run-migration-state-classifier.js";

const disposableDirectories: string[] = [];
const scenarioRoot = path.resolve(
  process.cwd(),
  "tests/fixtures/app-data-migrations/team-run-execution-tree-v1/case-001-persistent-only",
);

const createMemory = async (): Promise<string> => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "team-run-state-classifier-"));
  disposableDirectories.push(directory);
  const memoryDir = path.join(directory, "memory");
  await fs.mkdir(path.join(memoryDir, "agent_teams"), { recursive: true });
  return memoryDir;
};

const rootDirectory = async (memoryDir: string, rootTeamRunId: string): Promise<string> => {
  const directory = path.join(memoryDir, "agent_teams", rootTeamRunId);
  await fs.mkdir(directory, { recursive: true });
  return directory;
};

const copyCurrentPackage = async (memoryDir: string): Promise<string> => {
  const rootTeamRunId = "team-run-root";
  const directory = await rootDirectory(memoryDir, rootTeamRunId);
  await Promise.all([
    "team_run_execution_tree.json",
    "task_delegation_records.json",
    "team_communication_messages.json",
  ].map((name) => fs.copyFile(path.join(scenarioRoot, name), path.join(directory, name))));
  return rootTeamRunId;
};

const bytesByName = async (directory: string): Promise<Map<string, Buffer>> => {
  const result = new Map<string, Buffer>();
  for (const name of (await fs.readdir(directory)).sort()) {
    const filePath = path.join(directory, name);
    const stat = await fs.lstat(filePath);
    if (stat.isFile()) result.set(name, await fs.readFile(filePath));
  }
  return result;
};

afterEach(async () => {
  await Promise.all(disposableDirectories.splice(0).map(
    (directory) => fs.rm(directory, { recursive: true, force: true }),
  ));
});

describe("TeamRunMigrationStateClassifier", () => {
  it("classifies authoritative predecessor metadata before target-file evidence", async () => {
    const memoryDir = await createMemory();
    const directory = await rootDirectory(memoryDir, "root-predecessor");
    await fs.writeFile(path.join(directory, "team_run_metadata.json"), "{}\n");
    await fs.writeFile(path.join(directory, "team_run_execution_tree.json"), "{}\n");

    await expect(new TeamRunMigrationStateClassifier(memoryDir).classifyRoot("root-predecessor"))
      .resolves.toMatchObject({
        kind: "PREDECESSOR",
        rootTeamRunId: "root-predecessor",
        metadataPath: path.join(directory, "team_run_metadata.json"),
      });
  });

  it("classifies a complete validated current V1 package", async () => {
    const memoryDir = await createMemory();
    const rootTeamRunId = await copyCurrentPackage(memoryDir);

    const state = await new TeamRunMigrationStateClassifier(memoryDir).classifyRoot(rootTeamRunId);

    expect(state).toMatchObject({ kind: "CURRENT_V1", rootTeamRunId });
    if (state.kind !== "CURRENT_V1") throw new Error("Expected current V1 state.");
    expect(state.package.index.rootTeamRunId).toBe(rootTeamRunId);
  });

  it("classifies a positively identified historical manifest-only root", async () => {
    const memoryDir = await createMemory();
    const rootTeamRunId = "historical-root";
    const directory = await rootDirectory(memoryDir, rootTeamRunId);
    await fs.writeFile(path.join(directory, "team_run_manifest.json"), JSON.stringify({
      runVersion: 1,
      teamRunId: rootTeamRunId,
      coordinatorMemberRouteKey: "lead",
      memberBindings: [
        { memberRouteKey: "lead", memberRunId: "lead-run" },
        { memberRouteKey: "worker", memberRunId: "worker-run" },
      ],
    }));

    await expect(new TeamRunMigrationStateClassifier(memoryDir).classifyRoot(rootTeamRunId))
      .resolves.toMatchObject({
        kind: "HISTORICAL_RESIDUE",
        rootTeamRunId,
        manifestPath: path.join(directory, "team_run_manifest.json"),
      });
  });

  it.each([
    ["unknown", async (directory: string) => fs.writeFile(path.join(directory, "other.json"), "{}")],
    ["partial-v1", async (directory: string) => fs.copyFile(
      path.join(scenarioRoot, "team_run_execution_tree.json"),
      path.join(directory, "team_run_execution_tree.json"),
    )],
    ["malformed-complete-v1", async (directory: string) => Promise.all([
      "team_run_execution_tree.json",
      "task_delegation_records.json",
      "team_communication_messages.json",
    ].map((name) => fs.writeFile(path.join(directory, name), "{}\n")))],
    ["malformed-manifest", async (directory: string) => fs.writeFile(
      path.join(directory, "team_run_manifest.json"),
      JSON.stringify({ runVersion: 1, teamRunId: "wrong", memberBindings: [] }),
    )],
  ] as const)("classifies %s state as invalid without changing bytes", async (_name, arrange) => {
    const memoryDir = await createMemory();
    const rootTeamRunId = `root-${_name}`;
    const directory = await rootDirectory(memoryDir, rootTeamRunId);
    await arrange(directory);
    const before = await bytesByName(directory);

    const state = await new TeamRunMigrationStateClassifier(memoryDir).classifyRoot(rootTeamRunId);

    expect(state).toMatchObject({ kind: "INVALID", rootTeamRunId });
    expect(await bytesByName(directory)).toEqual(before);
  });

  it("lists roots in stable order and treats a missing Team root as an empty cohort", async () => {
    const missingMemory = path.join(await fs.mkdtemp(path.join(os.tmpdir(), "missing-team-root-")), "memory");
    disposableDirectories.push(path.dirname(missingMemory));
    await expect(new TeamRunMigrationStateClassifier(missingMemory).listAndClassifyRoots())
      .resolves.toEqual([]);

    const memoryDir = await createMemory();
    for (const rootTeamRunId of ["root-z", "root-a"]) {
      const directory = await rootDirectory(memoryDir, rootTeamRunId);
      await fs.writeFile(path.join(directory, "team_run_metadata.json"), "{}\n");
    }
    const states = await new TeamRunMigrationStateClassifier(memoryDir).listAndClassifyRoots();
    expect(states.map(({ rootTeamRunId }) => rootTeamRunId)).toEqual(["root-a", "root-z"]);
  });
});
