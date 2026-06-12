import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AgentRunIdentityAllocator } from "../../../src/agent-execution/services/agent-run-identity-allocator.js";
import { AgentMemoryLayout } from "../../../src/agent-memory/store/agent-memory-layout.js";

const token = (suffix: number): string => String(suffix).padStart(32, "0");

describe("AgentRunIdentityAllocator", () => {
  let memoryDir: string;
  let memoryLayout: AgentMemoryLayout;

  beforeEach(async () => {
    memoryDir = await fs.mkdtemp(path.join(os.tmpdir(), "agent-run-identity-allocator-"));
    memoryLayout = new AgentMemoryLayout(memoryDir);
  });

  afterEach(async () => {
    await fs.rm(memoryDir, { recursive: true, force: true });
  });

  it("reserves candidates before async collision scans so concurrent allocations cannot return the same ID", async () => {
    let releaseFirstCollisionScan!: () => void;
    let resolveFirstCollisionScanStarted!: () => void;
    const firstScanStarted = new Promise<void>((resolve) => {
      resolveFirstCollisionScanStarted = resolve;
    });
    const releaseFirstScan = new Promise<void>((resolve) => {
      releaseFirstCollisionScan = resolve;
    });
    let metadataReadCount = 0;
    const allocator = new AgentRunIdentityAllocator({
      agentDefinitionService: {
        getAgentDefinitionById: vi.fn().mockResolvedValue({ name: "Worker" }),
      },
      agentRunManager: {
        hasActiveRun: vi.fn().mockReturnValue(false),
      },
      agentRunMetadataService: {
        readMetadata: vi.fn(async () => {
          metadataReadCount += 1;
          if (metadataReadCount === 1) {
            resolveFirstCollisionScanStarted();
            await releaseFirstScan;
          }
          return null;
        }),
      },
      teamRunMetadataService: {
        listTeamRunIds: vi.fn().mockResolvedValue([]),
        readMetadata: vi.fn(),
      },
      memoryDir,
      createToken: vi.fn()
        .mockReturnValueOnce(token(1))
        .mockReturnValueOnce(token(1))
        .mockReturnValueOnce(token(2)),
    });

    const firstAllocation = allocator.allocateForAgentDefinition("agent-worker");
    await firstScanStarted;
    const secondAllocation = allocator.allocateForAgentDefinition("agent-worker");
    releaseFirstCollisionScan();

    await expect(Promise.all([firstAllocation, secondAllocation])).resolves.toEqual([
      "worker_00000000000000000000000000000001",
      "worker_00000000000000000000000000000002",
    ]);
  });

  it("skips candidates that already have a standalone memory directory", async () => {
    await fs.mkdir(
      memoryLayout.getStandaloneRunDirPath("worker_00000000000000000000000000000001"),
      { recursive: true },
    );
    const allocator = new AgentRunIdentityAllocator({
      agentDefinitionService: {
        getAgentDefinitionById: vi.fn().mockResolvedValue({ name: "Worker" }),
      },
      agentRunManager: {
        hasActiveRun: vi.fn().mockReturnValue(false),
      },
      agentRunMetadataService: {
        readMetadata: vi.fn().mockResolvedValue(null),
      },
      teamRunMetadataService: {
        listTeamRunIds: vi.fn().mockResolvedValue([]),
        readMetadata: vi.fn(),
      },
      memoryDir,
      createToken: vi.fn()
        .mockReturnValueOnce(token(1))
        .mockReturnValueOnce(token(2)),
    });

    await expect(allocator.allocateForAgentDefinition("agent-worker")).resolves.toBe(
      "worker_00000000000000000000000000000002",
    );
  });

  it("skips candidates that already have a team-scoped memory directory", async () => {
    await fs.mkdir(
      memoryLayout.getTeamAgentRunDirPath(
        { rootTeamRunId: "team-root", teamRunPath: [] },
        "worker_00000000000000000000000000000001",
      ),
      { recursive: true },
    );
    const allocator = new AgentRunIdentityAllocator({
      agentDefinitionService: {
        getAgentDefinitionById: vi.fn().mockResolvedValue({ name: "Worker" }),
      },
      agentRunManager: {
        hasActiveRun: vi.fn().mockReturnValue(false),
      },
      agentRunMetadataService: {
        readMetadata: vi.fn().mockResolvedValue(null),
      },
      teamRunMetadataService: {
        listTeamRunIds: vi.fn().mockResolvedValue(["team-root"]),
        readMetadata: vi.fn().mockResolvedValue(null),
      },
      memoryDir,
      createToken: vi.fn()
        .mockReturnValueOnce(token(1))
        .mockReturnValueOnce(token(2)),
    });

    await expect(allocator.allocateForAgentDefinition("agent-worker")).resolves.toBe(
      "worker_00000000000000000000000000000002",
    );
  });
});
