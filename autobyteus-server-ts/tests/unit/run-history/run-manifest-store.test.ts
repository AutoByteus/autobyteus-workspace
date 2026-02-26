import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { SkillAccessMode } from "autobyteus-ts/agent/context/skill-access-mode.js";
import { RunManifestStore } from "../../../src/run-history/store/run-manifest-store.js";

const createTempMemoryDir = async (): Promise<string> => {
  return fs.mkdtemp(path.join(os.tmpdir(), "autobyteus-run-manifest-"));
};

describe("RunManifestStore", () => {
  let memoryDir: string;
  let store: RunManifestStore;

  beforeEach(async () => {
    memoryDir = await createTempMemoryDir();
    store = new RunManifestStore(memoryDir);
  });

  afterEach(async () => {
    await fs.rm(memoryDir, { recursive: true, force: true });
  });

  it("writes and reads normalized manifest", async () => {
    await store.writeManifest("run-1", {
      agentDefinitionId: "  agent-def-1  ",
      workspaceRootPath: "/tmp/ws////",
      llmModelIdentifier: "  model-x  ",
      llmConfig: { temperature: 0.2 },
      autoExecuteTools: true,
      skillAccessMode: SkillAccessMode.PRELOADED_ONLY,
    });

    const manifest = await store.readManifest("run-1");
    expect(manifest).toEqual({
      agentDefinitionId: "agent-def-1",
      workspaceRootPath: path.resolve("/tmp/ws"),
      llmModelIdentifier: "model-x",
      llmConfig: { temperature: 0.2 },
      autoExecuteTools: true,
      skillAccessMode: SkillAccessMode.PRELOADED_ONLY,
    });
  });

  it("returns null for malformed manifest file", async () => {
    const manifestPath = store.getManifestPath("run-bad");
    await fs.mkdir(path.dirname(manifestPath), { recursive: true });
    await fs.writeFile(
      manifestPath,
      JSON.stringify({
        agentDefinitionId: "agent-def-1",
        workspaceRootPath: "/tmp/ws",
        llmModelIdentifier: "model-x",
        autoExecuteTools: "yes",
      }),
      "utf-8",
    );

    const manifest = await store.readManifest("run-bad");
    expect(manifest).toBeNull();
  });
});
