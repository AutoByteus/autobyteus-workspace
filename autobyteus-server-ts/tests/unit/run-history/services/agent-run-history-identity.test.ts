import path from "node:path";
import { describe, expect, it } from "vitest";
import { AgentRunHistoryIdentityResolver } from "../../../../src/run-history/services/agent-run-history-identity.js";

describe("AgentRunHistoryIdentityResolver", () => {
  it("resolves standalone metadata paths under the canonical agent memory root", () => {
    const memoryDir = "/tmp/agent-run-history-identity";
    const resolver = new AgentRunHistoryIdentityResolver(memoryDir);

    expect(resolver.resolve(" run-1 ")).toEqual({
      runId: "run-1",
      runDirPath: path.join(memoryDir, "agents", "run-1"),
      metadataPath: path.join(memoryDir, "agents", "run-1", "run_metadata.json"),
    });
  });

  it("rejects unsafe standalone run id shapes without composing paths", () => {
    const resolver = new AgentRunHistoryIdentityResolver("/tmp/agent-run-history-identity");

    expect(resolver.resolve("../escape")).toBeNull();
    expect(resolver.resolve("nested/run")).toBeNull();
    expect(resolver.resolve("temp-draft", { rejectDraftIds: true })).toBeNull();
  });
});
