import fs from "node:fs/promises";
import { describe, expect, it, vi } from "vitest";
import { AgentRunIdentityAllocator } from "../../../src/agent-execution/services/agent-run-identity-allocator.js";
import { AgentOrgRunExecutionTreeStore } from "../../../src/run-history/store/agent-org-run-execution-tree-store.js";

const definitions = () => ({ getAgentDefinitionById: vi.fn(async (id: string) => ({ id, name: "Worker" }) as never) });
describe("fresh AgentRunIdentityAllocator", () => {
  it("normalizes the required definition and generates one formatted UUID", async () => {
    const service = definitions();
    const createToken = vi.fn(() => "12345678-1234-1234-1234-123456789abc");
    const allocator = new AgentRunIdentityAllocator({ agentDefinitionService: service, createToken });
    expect(await allocator.allocateForAgentDefinition(" worker-definition ")).toBe("worker_12345678123412341234123456789abc");
    expect(service.getAgentDefinitionById).toHaveBeenCalledWith("worker-definition");
    expect(createToken).toHaveBeenCalledTimes(1);
  });
  it("keeps required definition and token validation", async () => {
    const createToken = vi.fn();
    const allocator = new AgentRunIdentityAllocator({ agentDefinitionService: { getAgentDefinitionById: vi.fn(async () => null) }, createToken });
    await expect(allocator.allocateForAgentDefinition(" ")).rejects.toThrow("agentDefinitionId is required");
    await expect(allocator.allocateForAgentDefinition("missing")).rejects.toThrow("cannot be loaded");
    expect(createToken).not.toHaveBeenCalled();
    const invalid = new AgentRunIdentityAllocator({ agentDefinitionService: definitions(), createToken: () => "not-a-token" });
    await expect(invalid.allocateForAgentDefinition("worker")).rejects.toThrow();
  });
  it("produces independent default UUIDs concurrently without any stored-tree or filesystem reads", async () => {
    const reads = vi.spyOn(AgentOrgRunExecutionTreeStore.prototype, "read");
    const fileReads = vi.spyOn(fs, "readFile");
    try {
      const allocator = new AgentRunIdentityAllocator({ agentDefinitionService: definitions() });
      const ids = await Promise.all(Array.from({ length: 10 }, () => allocator.allocateForAgentDefinition("worker")));
      expect(new Set(ids).size).toBe(10);
      ids.forEach(id => expect(id).toMatch(/^worker_[0-9a-f]{32}$/));
      expect(reads).not.toHaveBeenCalled(); expect(fileReads).not.toHaveBeenCalled();
    } finally { reads.mockRestore(); fileReads.mockRestore(); }
  });
});
