/**
 * autobyteus-349 REQ-002 / AC-003: at startup, only a standalone run that was prepared, never started and
 * holds nothing but its record is removed (row and folder). Any content, an unreadable or missing record,
 * or a folder that cannot be fully read keeps the run. Real metadata store and history catalog on a
 * temporary data root; never the user's data.
 */
import fsSync from "node:fs";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AgentRunProvisioningService } from "../../../src/agent-execution/services/agent-run-provisioning-service.js";
import { AgentRunHistoryCatalogService } from "../../../src/run-history/services/agent-run-history-catalog-service.js";
import { AgentRunMetadataService } from "../../../src/run-history/services/agent-run-metadata-service.js";
import { RuntimeKind } from "../../../src/runtime-management/runtime-kind-enum.js";
import type { AgentRunMetadata } from "../../../src/run-history/store/agent-run-metadata-types.js";

vi.mock("../../../src/agent-definition/services/agent-definition-service.js", () => ({
  AgentDefinitionService: { getInstance: () => ({ getAgentDefinitionById: vi.fn().mockResolvedValue({ name: "Agent One" }) }) },
}));

let memoryDir: string;
let catalog: AgentRunHistoryCatalogService;
let agentRunManager: { hasActiveRun: ReturnType<typeof vi.fn> };
let logs: { info: string[]; warn: string[] };

const runDir = (runId: string) => path.join(memoryDir, "agents", runId);
const exists = (target: string) => fs.lstat(target).then(() => true, () => false);

const metadataFor = (runId: string, overrides: Partial<AgentRunMetadata> = {}): AgentRunMetadata => ({
  runId,
  agentDefinitionId: "agent-def-1",
  workspaceRootPath: "/tmp/workspace-one",
  memoryDir: runDir(runId),
  llmModelIdentifier: "model-1",
  llmConfig: null,
  autoExecuteTools: false,
  runtimeKind: RuntimeKind.CODEX_APP_SERVER,
  platformAgentRunId: null,
  preparedAt: "2026-10-30T10:00:00.000Z",
  preparedExpiresAt: "2026-10-31T10:00:00.000Z",
  startedAt: null,
  applicationExecutionContext: null,
  ...overrides,
});

/** A prepared run as the product records it: a catalog row plus `run_metadata.json` in its folder. */
const seedPrepared = async (runId: string, summary = "") => {
  await catalog.recordPreparedRun({ runId, metadata: metadataFor(runId), summary, createdAt: "2026-10-30T10:00:00.000Z" });
};
const writeFile = async (relative: string, content = "x") => {
  await fs.mkdir(path.dirname(path.join(memoryDir, relative)), { recursive: true });
  await fs.writeFile(path.join(memoryDir, relative), content);
};
const catalogRunIds = async () => (await catalog.listCatalogRows()).map((row) => row.runId).sort();

const buildService = () => new AgentRunProvisioningService(memoryDir, {
  agentRunManager: agentRunManager as never,
  metadataService: new AgentRunMetadataService(memoryDir),
  historyCatalogService: catalog,
  workspaceManager: {} as never,
  agentRunIdentityAllocator: { allocateForAgentDefinition: vi.fn() },
});

beforeEach(async () => {
  memoryDir = await fs.mkdtemp(path.join(os.tmpdir(), "empty-never-started-removal-"));
  agentRunManager = { hasActiveRun: vi.fn().mockReturnValue(false) };
  catalog = new AgentRunHistoryCatalogService(memoryDir, {
    agentDefinitionService: { getAgentDefinitionById: vi.fn().mockResolvedValue({ name: "Agent One" }) } as never,
    agentRunManager: agentRunManager as never,
    collaborationRoots: { hasRoot: vi.fn().mockReturnValue(false), endRoot: vi.fn(async () => undefined) },
  });
  logs = { info: [], warn: [] };
  vi.spyOn(console, "info").mockImplementation((...args: unknown[]) => { logs.info.push(args.map(String).join(" ")); });
  vi.spyOn(console, "warn").mockImplementation((...args: unknown[]) => { logs.warn.push(args.map(String).join(" ")); });
});

afterEach(async () => {
  vi.restoreAllMocks();
  await fs.chmod(memoryDir, 0o700).catch(() => undefined);
  for (const dir of await fs.readdir(path.join(memoryDir, "agents")).catch(() => [] as string[])) {
    await fs.chmod(path.join(memoryDir, "agents", dir, "locked"), 0o700).catch(() => undefined);
  }
  await fs.rm(memoryDir, { recursive: true, force: true });
});

describe("removeEmptyNeverStartedRuns", () => {
  it("keeps the May shape: an older record (activationState, no startedAt) with a conversation", async () => {
    await seedPrepared("run-may", "hello, how are you doing");
    const { startedAt: _startedAt, ...older } = metadataFor("run-may");
    await fs.writeFile(path.join(runDir("run-may"), "run_metadata.json"), JSON.stringify({ ...older, activationState: "ACTIVE" }));
    await writeFile("agents/run-may/raw_traces.jsonl", '{"role":"user","content":"hello, how are you doing"}\n');
    await writeFile("agents/run-may/work_journal.md", "# Journal\n");

    await expect(buildService().removeEmptyNeverStartedRuns()).resolves.toEqual([]);

    expect(await exists(path.join(runDir("run-may"), "raw_traces.jsonl"))).toBe(true);
    expect(await catalogRunIds()).toEqual(["run-may"]);
  });

  it("AC-003: removes only the empty never-started run (row and folder) and logs it", async () => {
    await seedPrepared("run-empty", "first words");
    await fs.mkdir(path.join(runDir("run-empty"), "nested", "deeper"), { recursive: true }); // empty subfolders are not content
    await seedPrepared("run-context");
    await writeFile("agents/run-context/context_files/screenshot.png", "png");
    await seedPrepared("run-started");
    await catalog.recordRunStarted({ runId: "run-started", platformAgentRunId: "thread-1", startedAt: "2026-10-30T10:01:00.000Z" });
    await writeFile("agents/run-unreadable/run_metadata.json", "{ not json");

    const removed = await buildService().removeEmptyNeverStartedRuns();

    expect(removed).toEqual([{ runId: "run-empty", title: "first words" }]);
    expect(await exists(runDir("run-empty"))).toBe(false);
    expect(await catalogRunIds()).toEqual(["run-context", "run-started"]);
    for (const kept of ["run-context", "run-started", "run-unreadable"]) expect(await exists(runDir(kept))).toBe(true);
    expect(logs.info).toContain("Removed empty never-started run 'run-empty' ('first words')");
    expect(logs.warn.some((line) => line.startsWith("Kept run 'run-unreadable': its record could not be read"))).toBe(true);
  });

  it("keeps a never-started run whose folder holds a symbolic link (not followed)", async () => {
    await seedPrepared("run-link-file");
    await writeFile("outside/target.txt", "not ours");
    await fs.symlink(path.join(memoryDir, "outside", "target.txt"), path.join(runDir("run-link-file"), "link"));
    await seedPrepared("run-link-dir");
    await fs.mkdir(path.join(memoryDir, "outside", "empty-dir"), { recursive: true });
    await fs.symlink(path.join(memoryDir, "outside", "empty-dir"), path.join(runDir("run-link-dir"), "linked-dir"));

    await expect(buildService().removeEmptyNeverStartedRuns()).resolves.toEqual([]);

    expect(await catalogRunIds()).toEqual(["run-link-dir", "run-link-file"]);
    expect(await exists(path.join(memoryDir, "outside", "target.txt"))).toBe(true);
  });

  it.skipIf(process.platform === "win32" || process.getuid?.() === 0)(
    "AR-002: keeps a run whose subfolder cannot be read, and logs it", async () => {
      await seedPrepared("run-locked");
      await fs.mkdir(path.join(runDir("run-locked"), "locked"));
      await writeFile("agents/run-locked/locked/trace.jsonl", "content we cannot see");
      await fs.chmod(path.join(runDir("run-locked"), "locked"), 0o000);

      await expect(buildService().removeEmptyNeverStartedRuns()).resolves.toEqual([]);

      await fs.chmod(path.join(runDir("run-locked"), "locked"), 0o700);
      expect(await exists(path.join(runDir("run-locked"), "locked", "trace.jsonl"))).toBe(true);
      expect(await catalogRunIds()).toEqual(["run-locked"]);
      expect(logs.warn.some((line) => line.startsWith("Kept never-started run 'run-locked': its folder could not be fully read"))).toBe(true);
    });

  it("AR-002: keeps an otherwise empty run when reading its folder fails", async () => {
    await seedPrepared("run-io-error");
    const readdir = fs.readdir.bind(fs);
    vi.spyOn(fs, "readdir").mockImplementation((async (target: fsSync.PathLike, options?: unknown) => {
      if (String(target) === runDir("run-io-error")) throw Object.assign(new Error("EIO: i/o error"), { code: "EIO" });
      return readdir(target as string, options as never);
    }) as typeof fs.readdir);

    await expect(buildService().removeEmptyNeverStartedRuns()).resolves.toEqual([]);

    expect(await exists(path.join(runDir("run-io-error"), "run_metadata.json"))).toBe(true);
    expect(await catalogRunIds()).toEqual(["run-io-error"]);
    expect(logs.warn.some((line) => line.includes("'run-io-error'") && line.includes("EIO"))).toBe(true);
  });

  it("keeps active runs, folders without a standalone record, and runs whose removal is refused; never throws", async () => {
    await seedPrepared("run-active");
    agentRunManager.hasActiveRun.mockImplementation((runId: string) => runId === "run-active");
    await fs.mkdir(path.join(memoryDir, "agents", "task-agent-or-partial"), { recursive: true });
    await seedPrepared("run-refused");
    await seedPrepared("run-lookup-fails");
    await seedPrepared("run-removable");
    const cancel = catalog.cancelPreparedRun.bind(catalog);
    vi.spyOn(catalog, "cancelPreparedRun").mockImplementation(async (runId: string) =>
      runId === "run-refused" ? { success: false, message: "Prepared run already has an active runtime." } : cancel(runId));
    const getRow = catalog.getCatalogRow.bind(catalog);
    vi.spyOn(catalog, "getCatalogRow").mockImplementation(async (runId: string) => {
      if (runId === "run-lookup-fails") throw new Error("catalog unavailable");
      return getRow(runId);
    });

    const removed = await buildService().removeEmptyNeverStartedRuns();

    expect(removed.map((run) => run.runId)).toEqual(["run-removable"]);
    for (const kept of ["run-active", "task-agent-or-partial", "run-refused", "run-lookup-fails"]) expect(await exists(runDir(kept))).toBe(true);
    expect(logs.warn).toContain("Kept empty never-started run 'run-refused': Prepared run already has an active runtime.");
    expect(logs.warn.some((line) => line.startsWith("Kept run 'run-lookup-fails': empty never-started check failed"))).toBe(true);
    expect(logs.info).toContain("Empty never-started run removal skipped 1 folder(s) without a standalone run record");
  });

  it("does nothing when there is no standalone run folder yet", async () => {
    await expect(buildService().removeEmptyNeverStartedRuns()).resolves.toEqual([]);
    expect(logs.warn).toEqual([]);
  });
});
