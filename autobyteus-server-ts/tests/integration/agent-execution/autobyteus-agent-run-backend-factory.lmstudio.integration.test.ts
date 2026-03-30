import fs from "node:fs";
import fsPromises from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { AgentFactory, AgentInputUserMessage } from "autobyteus-ts";
import { LLMFactory } from "autobyteus-ts/llm/llm-factory.js";
import { LLMRuntime } from "autobyteus-ts/llm/runtimes.js";
import { registerWriteFileTool } from "autobyteus-ts/tools/file/write-file.js";
import { AgentDefinition } from "../../../src/agent-definition/domain/models.js";
import { AutoByteusAgentRunBackendFactory } from "../../../src/agent-execution/backends/autobyteus/autobyteus-agent-run-backend-factory.js";
import { AgentRunConfig } from "../../../src/agent-execution/domain/agent-run-config.js";
import {
  AgentRunEventType,
  type AgentRunEvent,
} from "../../../src/agent-execution/domain/agent-run-event.js";

const DEFAULT_LMSTUDIO_TEXT_MODEL = "qwen/qwen3-30b-a3b-2507";
const LMSTUDIO_MODEL_ENV_VAR = "LMSTUDIO_MODEL_ID";
const FLOW_TEST_TIMEOUT_MS = Number(process.env.LMSTUDIO_FLOW_TEST_TIMEOUT_MS || 180_000);
const EVENT_WAIT_TIMEOUT_MS = Number(process.env.LMSTUDIO_EVENT_WAIT_TIMEOUT_MS || 120_000);
const FILE_WAIT_TIMEOUT_MS = Number(process.env.LMSTUDIO_FILE_WAIT_TIMEOUT_MS || 120_000);
const runLiveIntegration = process.env.RUN_LMSTUDIO_E2E === "1" ? describe : describe.skip;

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
  let memoryDir = "";
  let workspaceDir = "";
  let agentFactory: AgentFactory;
  let backendFactory: AutoByteusAgentRunBackendFactory;

  beforeEach(async () => {
    previousMemoryDir = process.env.AUTOBYTEUS_MEMORY_DIR;
    previousParserEnv = process.env.AUTOBYTEUS_STREAM_PARSER;
    process.env.AUTOBYTEUS_STREAM_PARSER = "api_tool_call";

    memoryDir = await fsPromises.mkdtemp(path.join(os.tmpdir(), "autobyteus-live-backend-memory-"));
    workspaceDir = await fsPromises.mkdtemp(
      path.join(os.tmpdir(), "autobyteus-live-backend-workspace-"),
    );
    process.env.AUTOBYTEUS_MEMORY_DIR = memoryDir;

    registerWriteFileTool();

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
  }, FLOW_TEST_TIMEOUT_MS);

  it(
    "converts approval and tool lifecycle events through the backend event stream",
    async () => {
      const modelIdentifier = await resolveLmstudioModelIdentifier();
      expect(modelIdentifier).toBeTruthy();

      const backend = await backendFactory.createBackend(
        new AgentRunConfig({
          agentDefinitionId: "def-live-autobyteus-backend",
          llmModelIdentifier: modelIdentifier as string,
          autoExecuteTools: false,
        }),
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

      const backend = await backendFactory.createBackend(
        new AgentRunConfig({
          agentDefinitionId: "def-live-autobyteus-backend",
          llmModelIdentifier: modelIdentifier as string,
          autoExecuteTools: false,
        }),
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

      const backend = await backendFactory.createBackend(
        new AgentRunConfig({
          agentDefinitionId: "def-live-autobyteus-backend",
          llmModelIdentifier: modelIdentifier as string,
          autoExecuteTools: true,
        }),
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

        const targetPath = path.join(workspaceDir, targetRelativePath);
        expect(await waitForFile(targetPath)).toBe(true);
        expect(await fsPromises.readFile(targetPath, "utf8")).toBe(targetContent);
      } finally {
        unsubscribe();
        const terminateResult = await backend.terminate();
        expect(terminateResult.accepted).toBe(true);
      }
    },
    FLOW_TEST_TIMEOUT_MS,
  );
});
