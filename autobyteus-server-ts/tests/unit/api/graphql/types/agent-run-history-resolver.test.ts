import "reflect-metadata";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockRunHistoryService = vi.hoisted(() => ({
  listRunHistory: vi.fn(),
  getRunResumeConfig: vi.fn(),
  deleteRunHistory: vi.fn(),
}));

const mockRunProjectionService = vi.hoisted(() => ({
  getProjection: vi.fn(),
}));

const mockRunContinuationService = vi.hoisted(() => ({
  continueRun: vi.fn(),
}));

vi.mock("../../../../../src/run-history/services/run-history-service.js", () => ({
  getRunHistoryService: () => mockRunHistoryService,
}));

vi.mock("../../../../../src/run-history/services/run-projection-service.js", () => ({
  getRunProjectionService: () => mockRunProjectionService,
}));

vi.mock("../../../../../src/run-history/services/run-continuation-service.js", () => ({
  getRunContinuationService: () => mockRunContinuationService,
}));

import { AgentRunHistoryResolver } from "../../../../../src/api/graphql/types/agent-run-history.js";

describe("AgentRunHistoryResolver", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("delegates listRunHistory query to service", async () => {
    mockRunHistoryService.listRunHistory.mockResolvedValue([
      {
        workspaceRootPath: "/tmp/ws",
        workspaceName: "ws",
        agents: [],
      },
    ]);

    const resolver = new AgentRunHistoryResolver();
    const result = await resolver.listRunHistory(5);

    expect(mockRunHistoryService.listRunHistory).toHaveBeenCalledWith(5);
    expect(result).toHaveLength(1);
  });

  it("delegates getRunProjection and getRunResumeConfig queries", async () => {
    mockRunProjectionService.getProjection.mockReturnValue({
      runId: "run-1",
      conversation: [],
      summary: null,
      lastActivityAt: null,
    });
    mockRunHistoryService.getRunResumeConfig.mockResolvedValue({
      runId: "run-1",
      isActive: false,
      manifestConfig: {
        agentDefinitionId: "agent-def-1",
        workspaceRootPath: "/tmp/ws",
        llmModelIdentifier: "model-x",
        llmConfig: null,
        autoExecuteTools: false,
        skillAccessMode: null,
      },
      editableFields: {
        llmModelIdentifier: true,
        llmConfig: true,
        autoExecuteTools: true,
        skillAccessMode: true,
        workspaceRootPath: false,
      },
    });

    const resolver = new AgentRunHistoryResolver();
    const projection = await resolver.getRunProjection("run-1");
    const resume = await resolver.getRunResumeConfig("run-1");

    expect(projection.runId).toBe("run-1");
    expect(resume.runId).toBe("run-1");
  });

  it("returns success payload for continueRun mutation", async () => {
    mockRunContinuationService.continueRun.mockResolvedValue({
      runId: "run-1",
      ignoredConfigFields: ["llmModelIdentifier"],
    });

    const resolver = new AgentRunHistoryResolver();
    const result = await resolver.continueRun({
      runId: "run-1",
      userInput: { content: "hello", contextFiles: null },
    } as any);

    expect(result).toMatchObject({
      success: true,
      runId: "run-1",
      ignoredConfigFields: ["llmModelIdentifier"],
    });
  });

  it("returns failure payload for continueRun mutation errors", async () => {
    mockRunContinuationService.continueRun.mockRejectedValue(new Error("restore failed"));

    const resolver = new AgentRunHistoryResolver();
    const result = await resolver.continueRun({
      runId: "run-1",
      userInput: { content: "hello", contextFiles: null },
    } as any);

    expect(result.success).toBe(false);
    expect(result.runId).toBe("run-1");
    expect(result.message).toContain("restore failed");
  });

  it("delegates deleteRunHistory mutation to runHistoryService", async () => {
    mockRunHistoryService.deleteRunHistory.mockResolvedValue({
      success: true,
      message: "Run deleted.",
    });

    const resolver = new AgentRunHistoryResolver();
    const result = await resolver.deleteRunHistory("run-1");

    expect(mockRunHistoryService.deleteRunHistory).toHaveBeenCalledWith("run-1");
    expect(result).toEqual({
      success: true,
      message: "Run deleted.",
    });
  });

  it("maps deleteRunHistory unexpected errors to failure payload", async () => {
    mockRunHistoryService.deleteRunHistory.mockRejectedValue(new Error("delete failed"));

    const resolver = new AgentRunHistoryResolver();
    const result = await resolver.deleteRunHistory("run-1");

    expect(result.success).toBe(false);
    expect(result.message).toContain("delete failed");
  });
});
