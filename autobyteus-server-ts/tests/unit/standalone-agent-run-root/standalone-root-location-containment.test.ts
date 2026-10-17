import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createHash } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";
import { StandaloneRootLocationService } from "../../../src/standalone-agent-run-root/services/standalone-root-location-service.js";
import { StandaloneRootPackageStore } from "../../../src/standalone-agent-run-root/persistence/standalone-root-package-store.js";
import { getStandaloneRootDirPath, getStandaloneRootTreePath } from "../../../src/standalone-agent-run-root/persistence/standalone-root-tree-path.js";
import { RuntimeKind } from "../../../src/runtime-management/runtime-kind-enum.js";
import type { StandaloneRootTreeFile } from "../../../src/standalone-agent-run-root/domain/standalone-root-tree.js";

/**
 * DESIGN.md rule 7 (remove-nested-task-team DS-002, AC-002): a lookup that scans every standalone run
 * skips a run whose collaboration tree cannot be read, warns naming it, and keeps working for every
 * other run; a lookup naming that run still reports its error; no file is changed.
 */
const directories: string[] = [];
afterEach(async () => { await Promise.all(directories.splice(0).map((dir) => fs.rm(dir, { recursive: true, force: true }))); });

const launch = { runtimeKind: RuntimeKind.AUTOBYTEUS, llmModelIdentifier: "m", llmConfig: null, autoExecuteTools: false, workspaceRootPath: null };
const treeOf = (hostRunId: string, childRunId: string): StandaloneRootTreeFile => ({
  subjectKind: "agent",
  createdAt: "2026-10-17T00:00:00.000Z",
  host: { address: "/host" as never, agentRunId: hostRunId, agentDefinitionId: "host-definition" },
  taskExecutions: [{
    address: "/reviewer" as never, agentRunId: childRunId, platformAgentRunId: null, delegatorAgentRunId: hostRunId,
    startedAt: "2026-10-17T00:01:00.000Z", source: { kind: "agent", agentDefinitionId: "reviewer", launchConfiguration: launch },
  }],
});

const fingerprint = async (root: string): Promise<Record<string, string>> => {
  const out: Record<string, string> = {};
  const walk = async (dir: string): Promise<void> => {
    for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) await walk(full);
      else out[path.relative(root, full)] = createHash("sha256").update(await fs.readFile(full)).digest("hex");
    }
  };
  await walk(root);
  return out;
};

const setup = async () => {
  const memoryDir = await fs.mkdtemp(path.join(os.tmpdir(), "standalone-location-containment-"));
  directories.push(memoryDir);
  const store = new StandaloneRootPackageStore();
  for (const [host, child] of [["host-a", "child-a"], ["host-c", "child-c"]] as const) {
    expect((await store.writeTree(getStandaloneRootDirPath(memoryDir, host), treeOf(host, child))).outcome).toBe("committed");
  }
  // One run whose tree cannot be read (any cause; here a truncated file).
  const brokenDir = getStandaloneRootDirPath(memoryDir, "host-b");
  await fs.mkdir(brokenDir, { recursive: true });
  await fs.writeFile(getStandaloneRootTreePath(brokenDir), JSON.stringify(treeOf("host-b", "child-b")).slice(0, 80));
  const warn = vi.fn();
  return { memoryDir, warn, service: new StandaloneRootLocationService({ memoryDir, store, warn }) };
};

describe("StandaloneRootLocationService cross-run containment (DESIGN.md rule 7)", () => {
  it("a scan skips the unreadable run with a warning naming it, and finds and lists every other run", async () => {
    const { memoryDir, warn, service } = await setup();
    const before = await fingerprint(memoryDir);
    expect(await service.findAgent({ agentRunId: "child-c" })).toMatchObject({ rootRunId: "host-c", agentRunId: "child-c" });
    expect(service.findAgentSync({ agentRunId: "child-c" })).toMatchObject({ rootRunId: "host-c", agentRunId: "child-c" });
    expect((await service.listAgents()).map((agent) => agent.agentRunId)).toEqual(["child-a", "child-c"]);
    expect(warn).toHaveBeenCalledTimes(3);
    for (const [message] of warn.mock.calls) {
      expect(message).toMatch(/^Skipping standalone run 'host-b': its collaboration tree cannot be read: /);
    }
    expect(await fingerprint(memoryDir)).toEqual(before);
  });

  it("a lookup naming the unreadable run still reports its error", async () => {
    const { warn, service } = await setup();
    await expect(service.findAgent({ rootRunId: "host-b", agentRunId: "child-b" })).rejects.toThrow();
    expect(() => service.findAgentSync({ rootRunId: "host-b", agentRunId: "child-b" })).toThrow();
    await expect(service.listAgents({ rootRunId: "host-b" })).rejects.toThrow();
    expect(warn).not.toHaveBeenCalled();
    expect(await service.findAgent({ rootRunId: "host-a", agentRunId: "child-a" })).toMatchObject({ rootRunId: "host-a" });
  });
});
