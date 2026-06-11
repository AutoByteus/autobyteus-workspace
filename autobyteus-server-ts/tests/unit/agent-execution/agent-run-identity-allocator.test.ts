import { describe, expect, it, vi } from "vitest";
import { AgentRunIdentityAllocator } from "../../../src/agent-execution/services/agent-run-identity-allocator.js";

const token = (suffix: number): string => String(suffix).padStart(32, "0");

describe("AgentRunIdentityAllocator", () => {
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
      memoryDir: "/tmp/agent-run-identity-allocator-test",
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
});
