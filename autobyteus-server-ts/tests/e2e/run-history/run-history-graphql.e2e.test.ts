import "reflect-metadata";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import type { graphql as graphqlFn, GraphQLSchema } from "graphql";
import { buildGraphqlSchema } from "../../../src/api/graphql/schema.js";
import { appConfigProvider } from "../../../src/config/app-config-provider.js";
import { AgentRunManager } from "../../../src/agent-execution/services/agent-run-manager.js";
import { getRunHistoryService } from "../../../src/run-history/services/run-history-service.js";
import { RunManifestStore } from "../../../src/run-history/store/run-manifest-store.js";
import type { RunManifest } from "../../../src/run-history/domain/models.js";
import { getWorkspaceManager } from "../../../src/workspaces/workspace-manager.js";
import { getRuntimeSessionStore } from "../../../src/runtime-execution/runtime-session-store.js";

const normalizeRootPath = (value: string): string => {
  const normalized = value.replace(/\\/g, "/");
  if (normalized === "/") {
    return normalized;
  }
  return normalized.replace(/\/+$/, "");
};

const listRunHistoryQuery = `
  query ListRunHistory($limitPerAgent: Int = 10) {
    listRunHistory(limitPerAgent: $limitPerAgent) {
      workspaceRootPath
      workspaceName
      agents {
        agentDefinitionId
        agentName
        runs {
          runId
          summary
          lastActivityAt
          lastKnownStatus
          isActive
        }
      }
    }
  }
`;

const getRunResumeConfigQuery = `
  query GetRunResumeConfig($runId: String!) {
    getRunResumeConfig(runId: $runId) {
      runId
      isActive
      manifestConfig {
        agentDefinitionId
        workspaceRootPath
        llmModelIdentifier
        llmConfig
        autoExecuteTools
        skillAccessMode
      }
      editableFields {
        llmModelIdentifier
        llmConfig
        autoExecuteTools
        skillAccessMode
        workspaceRootPath
        runtimeKind
      }
    }
  }
`;

const getRunProjectionQuery = `
  query GetRunProjection($runId: String!) {
    getRunProjection(runId: $runId) {
      runId
      summary
      lastActivityAt
      conversation
    }
  }
`;

describe("Run history GraphQL e2e", () => {
  let schema: GraphQLSchema;
  let graphql: typeof graphqlFn;
  const seededRunIds = new Set<string>();

  beforeAll(async () => {
    schema = await buildGraphqlSchema();
    const require = createRequire(import.meta.url);
    const typeGraphqlRoot = path.dirname(require.resolve("type-graphql"));
    const graphqlPath = require.resolve("graphql", { paths: [typeGraphqlRoot] });
    const graphqlModule = await import(graphqlPath);
    graphql = graphqlModule.graphql as typeof graphqlFn;
  });

  afterEach(async () => {
    vi.restoreAllMocks();

    const runHistoryService = getRunHistoryService();
    const memoryDir = appConfigProvider.config.getMemoryDir();
    getRuntimeSessionStore().clear();

    for (const runId of seededRunIds) {
      await runHistoryService.deleteRunHistory(runId);
      await fs.rm(path.join(memoryDir, "agents", runId), { recursive: true, force: true });
    }
    seededRunIds.clear();
  });

  const execGraphql = async <T>(
    query: string,
    variables?: Record<string, unknown>,
  ): Promise<T> => {
    const result = await graphql({
      schema,
      source: query,
      variableValues: variables,
    });
    if (result.errors?.length) {
      throw result.errors[0];
    }
    return result.data as T;
  };

  const seedRunHistory = async (options?: {
    llmModelIdentifier?: string;
    llmConfig?: Record<string, unknown> | null;
    runtimeKind?: RunManifest["runtimeKind"];
  }): Promise<{
    runId: string;
    expectedWorkspaceRootPath: string;
    manifest: RunManifest;
  }> => {
    const memoryDir = appConfigProvider.config.getMemoryDir();
    const runHistoryService = getRunHistoryService();
    const manifestStore = new RunManifestStore(memoryDir);
    const unique = `${Date.now()}_${Math.random().toString(16).slice(2)}`;
    const runId = `run_history_e2e_${unique}`;
    const workspaceRootPathWithSuffix = `${path.join(
      os.tmpdir(),
      `autobyteus-run-history-${unique}`,
    )}${path.sep}`;
    const manifest: RunManifest = {
      agentDefinitionId: `missing_agent_${unique}`,
      workspaceRootPath: workspaceRootPathWithSuffix,
      llmModelIdentifier: options?.llmModelIdentifier ?? "e2e-model",
      llmConfig: options?.llmConfig ?? null,
      autoExecuteTools: false,
      skillAccessMode: null,
      runtimeKind: options?.runtimeKind ?? "autobyteus",
      runtimeReference: {
        runtimeKind: options?.runtimeKind ?? "autobyteus",
        sessionId: runId,
        threadId: null,
        metadata: null,
      },
    };
    await manifestStore.writeManifest(runId, manifest);
    await runHistoryService.upsertRunHistoryRow({
      runId,
      manifest,
      summary: "run history seeded summary",
      lastKnownStatus: "IDLE",
      lastActivityAt: "2026-02-15T00:00:00.000Z",
    });
    seededRunIds.add(runId);
    return {
      runId,
      expectedWorkspaceRootPath: normalizeRootPath(workspaceRootPathWithSuffix),
      manifest,
    };
  };

  const seedRunScopedConversation = async (runId: string): Promise<void> => {
    const memoryDir = appConfigProvider.config.getMemoryDir();
    const runDir = path.join(memoryDir, "agents", runId);
    await fs.mkdir(runDir, { recursive: true });
    const traces = [
      {
        id: "trace-user-1",
        ts: 1772526528.006,
        turn_id: "turn_0001",
        seq: 1,
        trace_type: "user",
        content: "hello from persisted run scope",
        source_event: "LLMUserMessageReadyEvent",
      },
      {
        id: "trace-assistant-1",
        ts: 1772526557.906,
        turn_id: "turn_0001",
        seq: 2,
        trace_type: "assistant",
        content: "persisted response from run scope",
        source_event: "LLMCompleteResponseReceivedEvent",
      },
    ];
    await fs.writeFile(
      path.join(runDir, "raw_traces.jsonl"),
      `${traces.map((entry) => JSON.stringify(entry)).join("\n")}\n`,
      "utf-8",
    );
  };

  it("lists seeded run history, returns resume config, and deletes run history", async () => {
    const { runId, expectedWorkspaceRootPath, manifest } = await seedRunHistory();

    const listResult = await execGraphql<{
      listRunHistory: Array<{
        workspaceRootPath: string;
        workspaceName: string;
        agents: Array<{
          agentDefinitionId: string;
          agentName: string;
          runs: Array<{
            runId: string;
            summary: string;
            lastActivityAt: string;
            lastKnownStatus: string;
            isActive: boolean;
          }>;
        }>;
      }>;
    }>(listRunHistoryQuery, { limitPerAgent: 10 });

    const workspaceGroup = listResult.listRunHistory.find(
      (workspace) => workspace.workspaceRootPath === expectedWorkspaceRootPath,
    );
    expect(workspaceGroup).toBeTruthy();
    const seededRun = workspaceGroup?.agents
      .flatMap((agent) => agent.runs)
      .find((run) => run.runId === runId);
    expect(seededRun).toBeTruthy();
    expect(seededRun?.summary).toBe("run history seeded summary");
    expect(seededRun?.lastKnownStatus).toBe("IDLE");
    expect(seededRun?.isActive).toBe(false);

    const resumeResult = await execGraphql<{
      getRunResumeConfig: {
        runId: string;
        isActive: boolean;
        manifestConfig: {
          agentDefinitionId: string;
          workspaceRootPath: string;
          llmModelIdentifier: string;
          autoExecuteTools: boolean;
          skillAccessMode: string | null;
        };
        editableFields: {
          llmModelIdentifier: boolean;
          llmConfig: boolean;
          autoExecuteTools: boolean;
          skillAccessMode: boolean;
          workspaceRootPath: boolean;
          runtimeKind: boolean;
        };
      };
    }>(getRunResumeConfigQuery, { runId });

    expect(resumeResult.getRunResumeConfig.runId).toBe(runId);
    expect(resumeResult.getRunResumeConfig.isActive).toBe(false);
    expect(resumeResult.getRunResumeConfig.manifestConfig.agentDefinitionId).toBe(
      manifest.agentDefinitionId,
    );
    expect(resumeResult.getRunResumeConfig.manifestConfig.workspaceRootPath).toBe(
      expectedWorkspaceRootPath,
    );
    expect(resumeResult.getRunResumeConfig.manifestConfig.llmModelIdentifier).toBe(
      manifest.llmModelIdentifier,
    );
    expect(resumeResult.getRunResumeConfig.editableFields.workspaceRootPath).toBe(false);
    expect(resumeResult.getRunResumeConfig.editableFields.llmModelIdentifier).toBe(true);
    expect(resumeResult.getRunResumeConfig.editableFields.runtimeKind).toBe(false);

    const deleteMutation = `
      mutation DeleteRunHistory($runId: String!) {
        deleteRunHistory(runId: $runId) {
          success
          message
        }
      }
    `;

    const deleteResult = await execGraphql<{
      deleteRunHistory: { success: boolean; message: string };
    }>(deleteMutation, { runId });

    expect(deleteResult.deleteRunHistory.success).toBe(true);
    expect(deleteResult.deleteRunHistory.message).toContain(runId);

    const afterDeleteList = await execGraphql<{
      listRunHistory: Array<{
        agents: Array<{ runs: Array<{ runId: string }> }>;
      }>;
    }>(listRunHistoryQuery, { limitPerAgent: 10 });
    const stillPresent = afterDeleteList.listRunHistory.some((workspace) =>
      workspace.agents.some((agent) =>
        agent.runs.some((run) => run.runId === runId),
      ),
    );
    expect(stillPresent).toBe(false);

    seededRunIds.delete(runId);
  });

  it("returns deterministic run projection payload for seeded runs", async () => {
    const { runId } = await seedRunHistory();

    const projectionResult = await execGraphql<{
      getRunProjection: {
        runId: string;
        summary: string | null;
        lastActivityAt: string | null;
        conversation: Array<Record<string, unknown>>;
      };
    }>(getRunProjectionQuery, { runId });

    expect(projectionResult.getRunProjection.runId).toBe(runId);
    expect(Array.isArray(projectionResult.getRunProjection.conversation)).toBe(true);
  });

  it("returns non-empty projection for inactive runs when run-scoped traces exist", async () => {
    const { runId } = await seedRunHistory();
    await seedRunScopedConversation(runId);

    const projectionResult = await execGraphql<{
      getRunProjection: {
        runId: string;
        conversation: Array<Record<string, unknown>>;
      };
    }>(getRunProjectionQuery, { runId });

    expect(projectionResult.getRunProjection.runId).toBe(runId);
    expect(projectionResult.getRunProjection.conversation.length).toBeGreaterThan(0);
    expect(
      projectionResult.getRunProjection.conversation.some(
        (entry) =>
          entry.kind === "message" &&
          entry.role === "user" &&
          typeof entry.content === "string" &&
          entry.content.includes("persisted run scope"),
      ),
    ).toBe(true);
  });

  it("returns a structured failure payload when continueRun references a missing manifest", async () => {
    const runId = `missing_manifest_${Date.now()}_${Math.random().toString(16).slice(2)}`;

    const continueMutation = `
      mutation ContinueRun($input: ContinueRunInput!) {
        continueRun(input: $input) {
          success
          message
          runId
          ignoredConfigFields
        }
      }
    `;

    const result = await execGraphql<{
      continueRun: {
        success: boolean;
        message: string;
        runId: string | null;
        ignoredConfigFields: string[];
      };
    }>(continueMutation, {
      input: {
        runId,
        userInput: {
          content: "hello from e2e",
        },
      },
    });

    expect(result.continueRun.success).toBe(false);
    expect(result.continueRun.runId).toBe(runId);
    expect(result.continueRun.message).toContain("manifest");
    expect(result.continueRun.ignoredConfigFields).toEqual([]);
  });

  it("terminates an active run and marks history as inactive", async () => {
    const { runId, expectedWorkspaceRootPath } = await seedRunHistory();
    const manager = AgentRunManager.getInstance();
    let isActive = true;

    vi.spyOn(manager, "getAgentRun").mockImplementation((agentRunId: string) => {
      if (agentRunId !== runId || !isActive) {
        return null;
      }
      return {
        postUserMessage: vi.fn(),
      } as any;
    });
    vi.spyOn(manager, "listActiveRuns").mockImplementation(() =>
      isActive ? [runId] : [],
    );
    vi.spyOn(manager, "terminateAgentRun").mockImplementation(async (agentRunId: string) => {
      if (agentRunId !== runId) {
        return false;
      }
      isActive = false;
      return true;
    });

    const beforeTerminate = await execGraphql<{
      listRunHistory: Array<{
        workspaceRootPath: string;
        agents: Array<{
          runs: Array<{
            runId: string;
            isActive: boolean;
            lastKnownStatus: string;
          }>;
        }>;
      }>;
    }>(listRunHistoryQuery, { limitPerAgent: 10 });

    const workspaceBefore = beforeTerminate.listRunHistory.find(
      (workspace) => workspace.workspaceRootPath === expectedWorkspaceRootPath,
    );
    const runBefore = workspaceBefore?.agents
      .flatMap((agent) => agent.runs)
      .find((run) => run.runId === runId);
    expect(runBefore).toBeTruthy();
    expect(runBefore?.isActive).toBe(true);
    expect(runBefore?.lastKnownStatus).toBe("ACTIVE");

    const terminateMutation = `
      mutation TerminateAgentRun($id: String!) {
        terminateAgentRun(id: $id) {
          success
          message
        }
      }
    `;

    const terminateResult = await execGraphql<{
      terminateAgentRun: {
        success: boolean;
        message: string;
      };
    }>(terminateMutation, { id: runId });

    expect(terminateResult.terminateAgentRun.success).toBe(true);
    expect(terminateResult.terminateAgentRun.message).toContain("terminated");

    const afterTerminate = await execGraphql<{
      listRunHistory: Array<{
        workspaceRootPath: string;
        agents: Array<{
          runs: Array<{
            runId: string;
            isActive: boolean;
            lastKnownStatus: string;
          }>;
        }>;
      }>;
    }>(listRunHistoryQuery, { limitPerAgent: 10 });

    const workspaceAfter = afterTerminate.listRunHistory.find(
      (workspace) => workspace.workspaceRootPath === expectedWorkspaceRootPath,
    );
    const runAfter = workspaceAfter?.agents
      .flatMap((agent) => agent.runs)
      .find((run) => run.runId === runId);
    expect(runAfter).toBeTruthy();
    expect(runAfter?.isActive).toBe(false);
    expect(runAfter?.lastKnownStatus).toBe("IDLE");
  });

  it("restores an inactive run through continueRun and marks it active", async () => {
    const { runId, expectedWorkspaceRootPath, manifest } = await seedRunHistory();
    const manager = AgentRunManager.getInstance();
    const workspaceManager = getWorkspaceManager();
    let restored = false;
    const postUserMessage = vi.fn().mockResolvedValue(undefined);

    vi.spyOn(manager, "getAgentRun").mockImplementation((agentRunId: string) => {
      if (!restored || agentRunId !== runId) {
        return null;
      }
      return {
        postUserMessage,
      } as any;
    });
    vi.spyOn(manager, "restoreAgentRun").mockImplementation(async (options: any) => {
      if (options.runId === runId) {
        restored = true;
      }
      return options.runId;
    });
    vi.spyOn(manager, "listActiveRuns").mockImplementation(() =>
      restored ? [runId] : [],
    );
    vi.spyOn(workspaceManager, "ensureWorkspaceByRootPath").mockImplementation(
      async (rootPath: string) =>
        ({
          workspaceId: `workspace_restore_${Date.now()}`,
          getBasePath: () => rootPath,
        }) as any,
    );

    const continueMutation = `
      mutation ContinueRun($input: ContinueRunInput!) {
        continueRun(input: $input) {
          success
          message
          runId
          ignoredConfigFields
        }
      }
    `;

    const continueResult = await execGraphql<{
      continueRun: {
        success: boolean;
        message: string;
        runId: string | null;
        ignoredConfigFields: string[];
      };
    }>(continueMutation, {
      input: {
        runId,
        userInput: {
          content: "restore this run from history",
        },
        llmModelIdentifier: "restored-model",
        workspaceRootPath: expectedWorkspaceRootPath,
      },
    });

    expect(continueResult.continueRun.success).toBe(true);
    expect(continueResult.continueRun.runId).toBe(runId);
    expect(continueResult.continueRun.ignoredConfigFields).toEqual([]);
    expect(postUserMessage).toHaveBeenCalledTimes(1);

    const resumeResult = await execGraphql<{
      getRunResumeConfig: {
        runId: string;
        isActive: boolean;
        manifestConfig: {
          agentDefinitionId: string;
          workspaceRootPath: string;
          llmModelIdentifier: string;
        };
      };
    }>(getRunResumeConfigQuery, { runId });

    expect(resumeResult.getRunResumeConfig.runId).toBe(runId);
    expect(resumeResult.getRunResumeConfig.isActive).toBe(true);
    expect(resumeResult.getRunResumeConfig.manifestConfig.agentDefinitionId).toBe(
      manifest.agentDefinitionId,
    );
    expect(resumeResult.getRunResumeConfig.manifestConfig.workspaceRootPath).toBe(
      expectedWorkspaceRootPath,
    );
    expect(resumeResult.getRunResumeConfig.manifestConfig.llmModelIdentifier).toBe(
      "restored-model",
    );

    const listAfterRestore = await execGraphql<{
      listRunHistory: Array<{
        workspaceRootPath: string;
        agents: Array<{
          runs: Array<{
            runId: string;
            isActive: boolean;
            summary: string;
            lastKnownStatus: string;
          }>;
        }>;
      }>;
    }>(listRunHistoryQuery, { limitPerAgent: 10 });

    const workspaceGroup = listAfterRestore.listRunHistory.find(
      (workspace) => workspace.workspaceRootPath === expectedWorkspaceRootPath,
    );
    const restoredRun = workspaceGroup?.agents
      .flatMap((agent) => agent.runs)
      .find((run) => run.runId === runId);
    expect(restoredRun).toBeTruthy();
    expect(restoredRun?.isActive).toBe(true);
    expect(restoredRun?.lastKnownStatus).toBe("ACTIVE");
    expect(restoredRun?.summary).toContain("restore this run from history");
  });

  it("continues an inactive run using manifest model and llmConfig when overrides are omitted", async () => {
    const persistedConfig = { reasoning_effort: "high", temperature: 0.1 };
    const { runId, expectedWorkspaceRootPath, manifest } = await seedRunHistory({
      llmModelIdentifier: "manifest-default-model",
      llmConfig: persistedConfig,
    });
    const manager = AgentRunManager.getInstance();
    const workspaceManager = getWorkspaceManager();
    let restored = false;
    let restoreOptions: any = null;
    const postUserMessage = vi.fn().mockResolvedValue(undefined);

    vi.spyOn(manager, "getAgentRun").mockImplementation((agentRunId: string) => {
      if (!restored || agentRunId !== runId) {
        return null;
      }
      return {
        postUserMessage,
      } as any;
    });
    vi.spyOn(manager, "restoreAgentRun").mockImplementation(async (options: any) => {
      restoreOptions = options;
      if (options.runId === runId) {
        restored = true;
      }
      return options.runId;
    });
    vi.spyOn(manager, "listActiveRuns").mockImplementation(() =>
      restored ? [runId] : [],
    );
    vi.spyOn(workspaceManager, "ensureWorkspaceByRootPath").mockImplementation(
      async (rootPath: string) =>
        ({
          workspaceId: `workspace_restore_${Date.now()}`,
          getBasePath: () => rootPath,
        }) as any,
    );

    const continueMutation = `
      mutation ContinueRun($input: ContinueRunInput!) {
        continueRun(input: $input) {
          success
          message
          runId
          ignoredConfigFields
        }
      }
    `;

    const continueResult = await execGraphql<{
      continueRun: {
        success: boolean;
        message: string;
        runId: string | null;
        ignoredConfigFields: string[];
      };
    }>(continueMutation, {
      input: {
        runId,
        userInput: {
          content: "continue with manifest defaults",
        },
      },
    });

    expect(continueResult.continueRun.success).toBe(true);
    expect(continueResult.continueRun.runId).toBe(runId);
    expect(continueResult.continueRun.ignoredConfigFields).toEqual([]);
    expect(restoreOptions?.llmModelIdentifier).toBe(manifest.llmModelIdentifier);
    expect(restoreOptions?.llmConfig).toEqual(persistedConfig);
    expect(postUserMessage).toHaveBeenCalledTimes(1);

    const resumeResult = await execGraphql<{
      getRunResumeConfig: {
        runId: string;
        manifestConfig: {
          llmModelIdentifier: string;
          llmConfig: Record<string, unknown> | null;
        };
      };
    }>(getRunResumeConfigQuery, { runId });

    expect(resumeResult.getRunResumeConfig.runId).toBe(runId);
    expect(resumeResult.getRunResumeConfig.manifestConfig.llmModelIdentifier).toBe(
      manifest.llmModelIdentifier,
    );
    expect(resumeResult.getRunResumeConfig.manifestConfig.llmConfig).toEqual(persistedConfig);

    const listAfterRestore = await execGraphql<{
      listRunHistory: Array<{
        workspaceRootPath: string;
        agents: Array<{
          runs: Array<{
            runId: string;
            isActive: boolean;
            summary: string;
            lastKnownStatus: string;
          }>;
        }>;
      }>;
    }>(listRunHistoryQuery, { limitPerAgent: 10 });

    const workspaceGroup = listAfterRestore.listRunHistory.find(
      (workspace) => workspace.workspaceRootPath === expectedWorkspaceRootPath,
    );
    const restoredRun = workspaceGroup?.agents
      .flatMap((agent) => agent.runs)
      .find((run) => run.runId === runId);
    expect(restoredRun).toBeTruthy();
    expect(restoredRun?.isActive).toBe(true);
    expect(restoredRun?.lastKnownStatus).toBe("ACTIVE");
    expect(restoredRun?.summary).toContain("continue with manifest defaults");
  });

  it("returns ignoredConfigFields for active-run continuation overrides", async () => {
    const { runId } = await seedRunHistory();
    const manager = AgentRunManager.getInstance();
    const runtimeSessionStore = getRuntimeSessionStore();
    const postUserMessage = vi.fn().mockResolvedValue(undefined);

    runtimeSessionStore.upsertSession({
      runId,
      runtimeKind: "autobyteus",
      mode: "agent",
      runtimeReference: {
        runtimeKind: "autobyteus",
        sessionId: runId,
        threadId: null,
        metadata: null,
      },
    });

    vi.spyOn(manager, "getAgentRun").mockImplementation((agentRunId: string) => {
      if (agentRunId !== runId) {
        return null;
      }
      return {
        postUserMessage,
      } as any;
    });
    vi.spyOn(manager, "listActiveRuns").mockImplementation(() => [runId]);

    const continueMutation = `
      mutation ContinueRun($input: ContinueRunInput!) {
        continueRun(input: $input) {
          success
          message
          runId
          ignoredConfigFields
        }
      }
    `;

    const continueResult = await execGraphql<{
      continueRun: {
        success: boolean;
        message: string;
        runId: string | null;
        ignoredConfigFields: string[];
      };
    }>(continueMutation, {
      input: {
        runId,
        userInput: {
          content: "active override probe",
        },
        llmModelIdentifier: "override-model",
        llmConfig: { reasoning_effort: "low" },
        autoExecuteTools: true,
        skillAccessMode: "GLOBAL_DISCOVERY",
        workspaceRootPath: "/tmp/override-workspace",
        runtimeKind: "codex_app_server",
      },
    });

    expect(continueResult.continueRun.success).toBe(true);
    expect(continueResult.continueRun.runId).toBe(runId);
    expect(new Set(continueResult.continueRun.ignoredConfigFields)).toEqual(
      new Set([
        "llmModelIdentifier",
        "llmConfig",
        "autoExecuteTools",
        "skillAccessMode",
        "workspaceRootPath",
        "runtimeKind",
      ]),
    );
    expect(postUserMessage).toHaveBeenCalledTimes(1);
  });
});
