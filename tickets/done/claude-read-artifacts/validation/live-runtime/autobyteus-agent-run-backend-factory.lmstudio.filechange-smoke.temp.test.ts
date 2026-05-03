import fs from "node:fs";
import fsPromises from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { AgentFactory, AgentInputUserMessage } from "autobyteus-ts";
import { LLMFactory } from "autobyteus-ts/llm/llm-factory.js";
import { LLMRuntime } from "autobyteus-ts/llm/runtimes.js";
import { registerWriteFileTool } from "autobyteus-ts/tools/file/write-file.js";
import { AgentDefinition } from "../../../src/agent-definition/domain/models.js";
import { registerPublishArtifactTool } from "../../../src/agent-tools/published-artifacts/publish-artifact-tool.js";
import { AutoByteusAgentRunBackendFactory } from "../../../src/agent-execution/backends/autobyteus/autobyteus-agent-run-backend-factory.js";
import { AgentRunConfig } from "../../../src/agent-execution/domain/agent-run-config.js";
import {
  AgentRunEventType,
  type AgentRunEvent,
} from "../../../src/agent-execution/domain/agent-run-event.js";
import { AgentRunManager } from "../../../src/agent-execution/services/agent-run-manager.js";
import { generateStandaloneAgentRunId } from "../../../src/run-history/utils/agent-run-id-utils.js";
import { PublishedArtifactProjectionStore } from "../../../src/services/published-artifacts/published-artifact-projection-store.js";
import { PublishedArtifactSnapshotStore } from "../../../src/services/published-artifacts/published-artifact-snapshot-store.js";
import { getWorkspaceManager } from "../../../src/workspaces/workspace-manager.js";

const DEFAULT_LMSTUDIO_TEXT_MODEL = "qwen/qwen3.5-35b-a3b";
const LMSTUDIO_MODEL_ENV_VAR = "LMSTUDIO_MODEL_ID";
const FLOW_TEST_TIMEOUT_MS = Number(process.env.LMSTUDIO_FLOW_TEST_TIMEOUT_MS || 180_000);
const EVENT_WAIT_TIMEOUT_MS = Number(process.env.LMSTUDIO_EVENT_WAIT_TIMEOUT_MS || 120_000);
const FILE_WAIT_TIMEOUT_MS = Number(process.env.LMSTUDIO_FILE_WAIT_TIMEOUT_MS || 120_000);
const runLiveIntegration = process.env.RUN_LMSTUDIO_E2E === "1" ? describe : describe.skip;
const AUTOBYTEUS_BACKEND_EVENT_LOG_DIR = process.env.AUTOBYTEUS_BACKEND_EVENT_LOG_DIR?.trim() || null;

let cachedLmstudioModelIdentifier: string | null = null;

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const waitFor = async (
  predicate: () => Promise<boolean> | boolean,
  timeoutMs = EVENT_WAIT_TIMEOUT_MS,
  intervalMs = 100,
): Promise<void> => {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await predicate()) {
      return;
    }
    await delay(intervalMs);
  }
  throw new Error(`Condition not met within ${timeoutMs}ms.`);
};

const waitForFile = async (
  filePath: string,
  timeoutMs = FILE_WAIT_TIMEOUT_MS,
  intervalMs = 100,
): Promise<boolean> => {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (fs.existsSync(filePath)) {
      return true;
    }
    await delay(intervalMs);
  }
  return false;
};

const waitForEvent = async (
  events: AgentRunEvent[],
  predicate: (event: AgentRunEvent) => boolean,
  timeoutMs = EVENT_WAIT_TIMEOUT_MS,
): Promise<AgentRunEvent> => {
  let matched: AgentRunEvent | undefined;
  await waitFor(() => {
    matched = events.find(predicate);
    return Boolean(matched);
  }, timeoutMs);
  return matched as AgentRunEvent;
};

const resolveInvocationId = (payload: Record<string, unknown>): string | null => {
  const candidates = [
    payload.invocation_id,
    payload.tool_invocation_id,
    payload.toolInvocationId,
    payload.id,
  ];
  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim().length > 0) {
      return candidate;
    }
  }
  return null;
};

const writeBackendEventLog = async (testName: string, events: AgentRunEvent[]): Promise<void> => {
  if (!AUTOBYTEUS_BACKEND_EVENT_LOG_DIR) {
    return;
  }
  await fsPromises.mkdir(AUTOBYTEUS_BACKEND_EVENT_LOG_DIR, { recursive: true });
  const safeName = testName.replace(/[^a-z0-9_-]+/gi, "-").toLowerCase();
  await fsPromises.writeFile(
    path.join(AUTOBYTEUS_BACKEND_EVENT_LOG_DIR, `${safeName}.json`),
    JSON.stringify(events, null, 2),
    "utf8",
  );
};

const resolveFileChangePath = (event: AgentRunEvent): string => {
  const payload = event.payload as Record<string, unknown>;
  const candidate = payload.path ?? payload.file_path ?? payload.filePath ?? "";
  return typeof candidate === "string" ? candidate : "";
};

const resolveLmstudioModelIdentifier = async (): Promise<string | null> => {
  if (cachedLmstudioModelIdentifier) {
    return cachedLmstudioModelIdentifier;
  }

  const manualModelId = process.env[LMSTUDIO_MODEL_ENV_VAR];
  if (manualModelId) {
    cachedLmstudioModelIdentifier = manualModelId;
    return manualModelId;
  }

  await LLMFactory.reinitialize();
  const models = await LLMFactory.listModelsByRuntime(LLMRuntime.LMSTUDIO);
  if (!models.length) {
    return null;
  }

  const targetTextModel = process.env.LMSTUDIO_TARGET_TEXT_MODEL ?? DEFAULT_LMSTUDIO_TEXT_MODEL;
  const selected =
    models.find(
      (model) =>
        model.active_context_tokens !== null &&
        model.active_context_tokens !== undefined &&
        model.model_identifier.includes(targetTextModel),
    ) ??
    models.find(
      (model) =>
        model.active_context_tokens !== null &&
        model.active_context_tokens !== undefined &&
        !model.model_identifier.toLowerCase().includes("vl"),
    ) ??
    models.find((model) => model.model_identifier.includes(targetTextModel)) ??
    models.find((model) => !model.model_identifier.toLowerCase().includes("vl")) ??
    models[0];

  cachedLmstudioModelIdentifier = selected.model_identifier;
  return cachedLmstudioModelIdentifier;
};

const createToolRequiredLlmFactory = () =>
  ({
    createLLM: async (modelIdentifier: string, config?: unknown) => {
      const llm = await LLMFactory.createLLM(modelIdentifier, config as any);
      const originalStream = llm.streamUserMessage.bind(llm);
      (llm as any).streamUserMessage = async function* (
        userMessage: unknown,
        kwargs: Record<string, unknown> = {},
      ) {
        yield* originalStream(userMessage as any, {
          ...kwargs,
          tool_choice: "required",
        });
      };
      return llm;
    },
  }) as any;

runLiveIntegration("AutoByteusAgentRunBackendFactory live LM Studio integration", () => {
  let previousMemoryDir: string | undefined;
  let previousParserEnv: string | undefined;
  let previousAgentRunManagerInstance: AgentRunManager | null | undefined;
  let agentRunManagerOverridden = false;
  let memoryDir = "";
  let workspaceDir = "";
  let agentFactory: AgentFactory;
  let backendFactory: AutoByteusAgentRunBackendFactory;

  const createPreparedConfig = (
    runId: string,
    modelIdentifier: string,
    autoExecuteTools: boolean,
  ): AgentRunConfig =>
    new AgentRunConfig({
      agentDefinitionId: "def-live-autobyteus-backend",
      llmModelIdentifier: modelIdentifier,
      autoExecuteTools,
      memoryDir: path.join(memoryDir, "agents", runId),
    });

  beforeEach(async () => {
    previousMemoryDir = process.env.AUTOBYTEUS_MEMORY_DIR;
    previousParserEnv = process.env.AUTOBYTEUS_STREAM_PARSER;
    previousAgentRunManagerInstance = (AgentRunManager as any).instance;
    agentRunManagerOverridden = false;
    process.env.AUTOBYTEUS_STREAM_PARSER = "api_tool_call";

    memoryDir = await fsPromises.mkdtemp(path.join(os.tmpdir(), "autobyteus-live-backend-memory-"));
    workspaceDir = await fsPromises.mkdtemp(
      path.join(os.tmpdir(), "autobyteus-live-backend-workspace-"),
    );
    process.env.AUTOBYTEUS_MEMORY_DIR = memoryDir;

    registerWriteFileTool();
    registerPublishArtifactTool();

    agentFactory = new AgentFactory();
    const activeIds = agentFactory.listActiveAgentIds();
    await Promise.all(activeIds.map((id) => agentFactory.removeAgent(id).catch(() => false)));

    backendFactory = new AutoByteusAgentRunBackendFactory({
      agentFactory: agentFactory as any,
      agentDefinitionService: {
        getAgentDefinitionById: async () =>
          new AgentDefinition({
            id: "def-live-autobyteus-backend",
            name: "LiveAutoByteusBackendAgent",
            role: "Tool User",
            description: "Live AutoByteus backend integration test",
            instructions:
              "When the user asks you to write a file, call the write_file tool exactly once. " +
              "Use the provided relative path and exact file content. Do not answer with plain text.",
            toolNames: ["write_file"],
          }),
      } as any,
      llmFactory: createToolRequiredLlmFactory(),
      workspaceManager: {
        getWorkspaceById: () => null,
        getOrCreateTempWorkspace: async () => ({
          workspaceId: "temp_ws_live_backend_integration",
          getName: () => "Temp Workspace",
          getBasePath: () => workspaceDir,
        }),
      } as any,
      skillService: {
        getSkill: () => null,
      } as any,
    });
  });

  afterEach(async () => {
    const activeIds = agentFactory.listActiveAgentIds();
    await Promise.all(activeIds.map((id) => agentFactory.removeAgent(id).catch(() => false)));
    await fsPromises.rm(memoryDir, { recursive: true, force: true });
    await fsPromises.rm(workspaceDir, { recursive: true, force: true });

    if (previousMemoryDir === undefined) {
      delete process.env.AUTOBYTEUS_MEMORY_DIR;
    } else {
      process.env.AUTOBYTEUS_MEMORY_DIR = previousMemoryDir;
    }

    if (previousParserEnv === undefined) {
      delete process.env.AUTOBYTEUS_STREAM_PARSER;
    } else {
      process.env.AUTOBYTEUS_STREAM_PARSER = previousParserEnv;
    }

    if (agentRunManagerOverridden) {
      (AgentRunManager as any).instance = previousAgentRunManagerInstance ?? null;
      agentRunManagerOverridden = false;
    }
  }, FLOW_TEST_TIMEOUT_MS);

  it(
    "converts approval and tool lifecycle events through the backend event stream",
    async () => {
      const modelIdentifier = await resolveLmstudioModelIdentifier();
      expect(modelIdentifier).toBeTruthy();
      const runId = generateStandaloneAgentRunId("LiveAutoByteusBackendAgent", "Tool User");

      const backend = await backendFactory.createBackend(
        createPreparedConfig(runId, modelIdentifier as string, false),
        runId,
      );

      const events: AgentRunEvent[] = [];
      const unsubscribe = backend.subscribeToEvents((event) => {
        if (event && typeof event === "object") {
          events.push(event as AgentRunEvent);
        }
      });

      try {
        const targetRelativePath = "approval-flow-test.txt";
        const targetContent = "line one\nline two";

        const sendResult = await backend.postUserMessage(
          new AgentInputUserMessage(
            `Create ${targetRelativePath} with exactly two lines: ` +
              `"line one" and "line two". Use a relative path and do not answer with plain text.`,
          ),
        );
        expect(sendResult.accepted).toBe(true);

        const approvalRequested = await waitForEvent(
          events,
          (event) => event.eventType === AgentRunEventType.TOOL_APPROVAL_REQUESTED,
        );
        const invocationId = resolveInvocationId(approvalRequested.payload);
        expect(invocationId).toBeTruthy();

        const approveResult = await backend.approveToolInvocation(
          invocationId as string,
          true,
          "approved by LM Studio integration test",
        );
        expect(approveResult.accepted).toBe(true);

        await waitForEvent(
          events,
          (event) =>
            event.eventType === AgentRunEventType.TOOL_APPROVED &&
            resolveInvocationId(event.payload) === invocationId,
        );
        await waitForEvent(
          events,
          (event) =>
            event.eventType === AgentRunEventType.TOOL_EXECUTION_STARTED &&
            resolveInvocationId(event.payload) === invocationId,
        );
        await waitForEvent(
          events,
          (event) =>
            event.eventType === AgentRunEventType.TOOL_EXECUTION_SUCCEEDED &&
            resolveInvocationId(event.payload) === invocationId,
        );
        await waitForEvent(
          events,
          (event) => event.eventType === AgentRunEventType.ASSISTANT_COMPLETE,
        );
        await waitFor(
          () => events.some((event) => event.eventType === AgentRunEventType.AGENT_STATUS),
          EVENT_WAIT_TIMEOUT_MS,
        );
        await waitFor(() => (backend.getStatus() ?? "").toLowerCase() === "idle");

        const targetPath = path.join(workspaceDir, targetRelativePath);
        expect(await waitForFile(targetPath)).toBe(true);
        expect(await fsPromises.readFile(targetPath, "utf8")).toBe(targetContent);

        expect(events.some((event) => event.statusHint === "ACTIVE")).toBe(true);
        expect(events.some((event) => event.statusHint === "IDLE")).toBe(true);
      } finally {
        unsubscribe();
        const terminateResult = await backend.terminate();
        expect(terminateResult.accepted).toBe(true);
      }
    },
    FLOW_TEST_TIMEOUT_MS,
  );

  it(
    "converts a denied approval into TOOL_DENIED and leaves the file absent",
    async () => {
      const modelIdentifier = await resolveLmstudioModelIdentifier();
      expect(modelIdentifier).toBeTruthy();
      const runId = generateStandaloneAgentRunId("LiveAutoByteusBackendAgent", "Tool User");

      const backend = await backendFactory.createBackend(
        createPreparedConfig(runId, modelIdentifier as string, false),
        runId,
      );

      const events: AgentRunEvent[] = [];
      const unsubscribe = backend.subscribeToEvents((event) => {
        if (event && typeof event === "object") {
          events.push(event as AgentRunEvent);
        }
      });

      try {
        const targetRelativePath = "denied-flow-test.txt";
        const sendResult = await backend.postUserMessage(
          new AgentInputUserMessage(
            `Create ${targetRelativePath} with exactly two lines: ` +
              `"line one" and "line two". Use a relative path and do not answer with plain text.`,
          ),
        );
        expect(sendResult.accepted).toBe(true);

        const approvalRequested = await waitForEvent(
          events,
          (event) => event.eventType === AgentRunEventType.TOOL_APPROVAL_REQUESTED,
        );
        const invocationId = resolveInvocationId(approvalRequested.payload);
        expect(invocationId).toBeTruthy();

        const denyResult = await backend.approveToolInvocation(
          invocationId as string,
          false,
          "denied by LM Studio integration test",
        );
        expect(denyResult.accepted).toBe(true);

        await waitForEvent(
          events,
          (event) =>
            event.eventType === AgentRunEventType.TOOL_DENIED &&
            resolveInvocationId(event.payload) === invocationId,
        );
        await waitFor(() => (backend.getStatus() ?? "").toLowerCase() === "idle");

        const targetPath = path.join(workspaceDir, targetRelativePath);
        expect(fs.existsSync(targetPath)).toBe(false);
      } finally {
        unsubscribe();
        const terminateResult = await backend.terminate();
        expect(terminateResult.accepted).toBe(true);
      }
    },
    FLOW_TEST_TIMEOUT_MS,
  );

  it(
    "auto-executes tools without approval and still emits converted execution events",
    async () => {
      const modelIdentifier = await resolveLmstudioModelIdentifier();
      expect(modelIdentifier).toBeTruthy();
      const runId = generateStandaloneAgentRunId("LiveAutoByteusBackendAgent", "Tool User");

      const backend = await backendFactory.createBackend(
        createPreparedConfig(runId, modelIdentifier as string, true),
        runId,
      );

      const events: AgentRunEvent[] = [];
      const unsubscribe = backend.subscribeToEvents((event) => {
        if (event && typeof event === "object") {
          events.push(event as AgentRunEvent);
        }
      });

      try {
        const targetRelativePath = "auto-exec-flow-test.txt";
        const targetContent = "line one\nline two";

        const sendResult = await backend.postUserMessage(
          new AgentInputUserMessage(
            `Create ${targetRelativePath} with exactly two lines: ` +
              `"line one" and "line two". Use a relative path and do not answer with plain text.`,
          ),
        );
        expect(sendResult.accepted).toBe(true);

        await waitForEvent(
          events,
          (event) => event.eventType === AgentRunEventType.TOOL_EXECUTION_STARTED,
        );
        await waitForEvent(
          events,
          (event) => event.eventType === AgentRunEventType.TOOL_EXECUTION_SUCCEEDED,
        );
        await waitForEvent(
          events,
          (event) => event.eventType === AgentRunEventType.ASSISTANT_COMPLETE,
        );
        await waitFor(() => (backend.getStatus() ?? "").toLowerCase() === "idle");

        expect(
          events.some((event) => event.eventType === AgentRunEventType.TOOL_APPROVAL_REQUESTED),
        ).toBe(false);

        const availableFileChange = await waitForEvent(
          events,
          (event) =>
            event.eventType === AgentRunEventType.FILE_CHANGE &&
            event.payload.status === "available" &&
            resolveFileChangePath(event).endsWith(targetRelativePath),
        );
        expect(resolveFileChangePath(availableFileChange)).toContain(targetRelativePath);
        expect(
          events.some(
            (event) =>
              event.eventType === AgentRunEventType.FILE_CHANGE &&
              ["streaming", "pending"].includes(String(event.payload.status)) &&
              resolveFileChangePath(event).endsWith(targetRelativePath),
          ),
        ).toBe(true);

        const targetPath = path.join(workspaceDir, targetRelativePath);
        expect(await waitForFile(targetPath)).toBe(true);
        expect(await fsPromises.readFile(targetPath, "utf8")).toBe(targetContent);
      } finally {
        unsubscribe();
        await writeBackendEventLog("autobyteus-live-autoexec-write-file", events);
        const terminateResult = await backend.terminate();
        expect(terminateResult.accepted).toBe(true);
      }
    },
    FLOW_TEST_TIMEOUT_MS,
  );

  it(
    "publishes an existing workspace file through the live AutoByteus publish_artifact tool path",
    async () => {
      const modelIdentifier = await resolveLmstudioModelIdentifier();
      expect(modelIdentifier).toBeTruthy();

      const workspace = await getWorkspaceManager().ensureWorkspaceByRootPath(workspaceDir);
      const runId = generateStandaloneAgentRunId("LiveAutoByteusPublishArtifactAgent", "Tool User");
      const artifactRelativePath = path.posix.join("reports", "live-artifact.md");
      const artifactDescription = "Live AutoByteus publish artifact integration";
      const artifactBody = `# Live artifact\n\nToken: ${randomUUID()}`;
      const artifactAbsolutePath = path.join(workspaceDir, "reports", "live-artifact.md");
      await fsPromises.mkdir(path.dirname(artifactAbsolutePath), { recursive: true });
      await fsPromises.writeFile(artifactAbsolutePath, artifactBody, "utf8");

      const publishBackendFactory = new AutoByteusAgentRunBackendFactory({
        agentFactory: agentFactory as any,
        agentDefinitionService: {
          getAgentDefinitionById: async () =>
            new AgentDefinition({
              id: "def-live-autobyteus-publish-artifact",
              name: "LiveAutoByteusPublishArtifactAgent",
              role: "Tool User",
              description: "Live AutoByteus publish_artifact integration test",
              instructions:
                "When the user asks you to publish an artifact, call the publish_artifact tool exactly once. " +
                "Use the provided relative path and exact description. Do not answer with plain text.",
              toolNames: ["publish_artifact"],
            }),
        } as any,
        llmFactory: createToolRequiredLlmFactory(),
        workspaceManager: getWorkspaceManager(),
        skillService: {
          getSkill: () => null,
        } as any,
      });

      const runManager = new AgentRunManager({
        autoByteusBackendFactory: publishBackendFactory,
        runFileChangeService: {
          attachToRun: () => () => undefined,
        } as any,
        publishedArtifactRelayService: {
          attachToRun: () => () => undefined,
        } as any,
      });
      (AgentRunManager as any).instance = runManager;
      agentRunManagerOverridden = true;

      const run = await runManager.createAgentRun(
        new AgentRunConfig({
          agentDefinitionId: "def-live-autobyteus-publish-artifact",
          llmModelIdentifier: modelIdentifier as string,
          autoExecuteTools: true,
          runtimeKind: "autobyteus",
          workspaceId: workspace.workspaceId,
          memoryDir: path.join(memoryDir, "agents", runId),
        } as any),
        runId,
      );

      const events: AgentRunEvent[] = [];
      const unsubscribe = run.subscribeToEvents((event) => {
        if (event && typeof event === "object") {
          events.push(event as AgentRunEvent);
        }
      });

      try {
        const sendResult = await run.postUserMessage(
          new AgentInputUserMessage(
            `The file ${artifactRelativePath} already exists in the workspace. ` +
              `Call publish_artifact exactly once with path "${artifactRelativePath}" ` +
              `and description "${artifactDescription}". Do not call any other tool. ` +
              "Do not answer with plain text.",
          ),
        );
        expect(sendResult.accepted).toBe(true);

        await waitForEvent(
          events,
          (event) =>
            event.eventType === AgentRunEventType.TOOL_EXECUTION_SUCCEEDED &&
            event.payload.tool_name === "publish_artifact",
        );
        const persisted = await waitForEvent(
          events,
          (event) => event.eventType === AgentRunEventType.ARTIFACT_PERSISTED,
        );
        await waitForEvent(
          events,
          (event) => event.eventType === AgentRunEventType.ASSISTANT_COMPLETE,
        );
        await waitFor(() => (run.getStatus() ?? "").toLowerCase() === "idle");

        expect(
          events.some((event) => event.eventType === AgentRunEventType.TOOL_APPROVAL_REQUESTED),
        ).toBe(false);

        const projectionStore = new PublishedArtifactProjectionStore();
        const snapshotStore = new PublishedArtifactSnapshotStore();
        const projection = await projectionStore.readProjection(run.config.memoryDir as string);
        expect(projection.summaries).toHaveLength(1);
        expect(projection.revisions).toHaveLength(1);
        expect(projection.summaries[0]).toMatchObject({
          runId: run.runId,
          path: artifactRelativePath,
          type: "file",
          status: "available",
          description: artifactDescription,
        });
        expect(persisted.payload).toMatchObject(projection.summaries[0] as Record<string, unknown>);
        await expect(
          snapshotStore.readRevisionText(
            run.config.memoryDir as string,
            projection.revisions[0]!.snapshotRelativePath,
          ),
        ).resolves.toBe(artifactBody);
      } finally {
        unsubscribe();
        const terminateResult = await runManager.terminateAgentRun(run.runId);
        expect(terminateResult).toBe(true);
      }
    },
    FLOW_TEST_TIMEOUT_MS,
  );
});
