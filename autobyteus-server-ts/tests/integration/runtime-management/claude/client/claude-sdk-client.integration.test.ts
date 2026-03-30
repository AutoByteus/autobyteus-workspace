import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { afterEach, describe, expect, it } from "vitest";
import { z } from "zod";
import { ClaudeSdkClient } from "../../../../../src/runtime-management/claude/client/claude-sdk-client.js";

const claudeBinaryReady = spawnSync("claude", ["--version"], {
  stdio: "ignore",
}).status === 0;
const liveClaudeTestsEnabled = process.env.RUN_CLAUDE_E2E === "1";
const describeClaudeSdkClientIntegration =
  claudeBinaryReady && liveClaudeTestsEnabled ? describe : describe.skip;

const FLOW_TEST_TIMEOUT_MS = Number(process.env.CLAUDE_FLOW_TEST_TIMEOUT_MS || 180_000);

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const createWorkspace = async (label: string): Promise<string> =>
  fs.mkdtemp(path.join(os.tmpdir(), `${label}-`));

const resolveHaikuModelIdentifier = async (client: ClaudeSdkClient): Promise<string> => {
  const models = await client.listModels();
  expect(models.length).toBeGreaterThan(0);
  expect(
    models.some(
      (model) =>
        Boolean(
          (model.config_schema as { properties?: Record<string, unknown> } | undefined)?.properties
            ?.reasoning_effort,
        ),
    ),
  ).toBe(true);

  const haiku = models.find((model) => model.model_identifier === "haiku");
  if (!haiku) {
    throw new Error("Claude model catalog did not include the expected 'haiku' model.");
  }
  return haiku.model_identifier;
};

const readLiveTurnResult = async (
  query: AsyncIterable<unknown>,
  timeoutMs = FLOW_TEST_TIMEOUT_MS,
): Promise<{ chunks: string[]; resultText: string | null; sessionId: string | null }> =>
  Promise.race([
    (async () => {
      const chunks: string[] = [];
      let resultText: string | null = null;
      let sessionId: string | null = null;
      for await (const chunk of query) {
        chunks.push(JSON.stringify(chunk));
        const payload =
          chunk && typeof chunk === "object" && !Array.isArray(chunk)
            ? (chunk as Record<string, unknown>)
            : null;
        if (typeof payload?.session_id === "string" && payload.session_id.length > 0) {
          sessionId = payload.session_id;
        }
        const type =
          typeof payload?.type === "string" ? payload.type.trim().toLowerCase() : null;
        if (typeof payload?.result === "string" && payload.result.length > 0) {
          resultText = payload.result;
        }
        if (type === "result") {
          break;
        }
      }
      return { chunks, resultText, sessionId };
    })(),
    delay(timeoutMs).then(() => {
      throw new Error(`Claude SDK client turn did not reach a result chunk within ${String(timeoutMs)}ms.`);
    }),
  ]);

describeClaudeSdkClientIntegration("ClaudeSdkClient integration (live transport)", () => {
  const createdWorkspaces = new Set<string>();

  afterEach(async () => {
    await Promise.all(
      Array.from(createdWorkspaces).map((workspaceRoot) =>
        fs.rm(workspaceRoot, { recursive: true, force: true }).catch(() => undefined),
      ),
    );
    createdWorkspaces.clear();
  });

  it(
    "lists live models, runs a live Claude query turn, and fetches live session messages",
    async () => {
      const workspaceRoot = await createWorkspace("claude-sdk-client-live");
      createdWorkspaces.add(workspaceRoot);

      const client = new ClaudeSdkClient();
      const modelIdentifier = await resolveHaikuModelIdentifier(client);
      const token = `CLAUDE_SDK_CLIENT_LIVE_${Date.now()}`;

      const query = await client.startQueryTurn({
        prompt: `Reply with exactly '${token}'. Do not add any other text.`,
        model: modelIdentifier,
        workingDirectory: workspaceRoot,
        permissionMode: "plan",
        enableSendMessageToTooling: false,
        autoExecuteTools: false,
      });

      try {
        const { chunks, resultText, sessionId } = await readLiveTurnResult(query);

        expect(chunks.length).toBeGreaterThan(0);
        expect(chunks.some((chunk) => chunk.includes(token)) || resultText?.includes(token)).toBe(
          true,
        );

        expect(sessionId).toBeTruthy();

        const rawMessages = await client.getSessionMessages(sessionId!);
        expect(rawMessages).not.toBeNull();
        if (Array.isArray(rawMessages)) {
          expect(rawMessages.length).toBeGreaterThan(0);
        }
      } finally {
        query.close();
      }
    },
    FLOW_TEST_TIMEOUT_MS,
  );

  it(
    "loads a project skill from .claude/skills when project skill settings are enabled",
    async () => {
      const workspaceRoot = await createWorkspace("claude-sdk-client-skill");
      createdWorkspaces.add(workspaceRoot);

      const client = new ClaudeSdkClient();
      const modelIdentifier = await resolveHaikuModelIdentifier(client);
      const skillName = `sdk_skill_${Date.now()}`;
      const triggerToken = `SDK_SKILL_TRIGGER_${Date.now()}`;
      const responseToken = `SDK_SKILL_RESPONSE_${Date.now()}`;
      const skillRoot = path.join(workspaceRoot, ".claude", "skills", skillName);
      await fs.mkdir(skillRoot, { recursive: true });
      await fs.writeFile(
        path.join(skillRoot, "SKILL.md"),
        [
          "---",
          `name: ${skillName}`,
          "description: test skill",
          "---",
          "",
          `When the user explicitly says to use $${skillName} and includes the token "${triggerToken}", respond with exactly "${responseToken}".`,
          "Do not add any other words or punctuation.",
          "",
        ].join("\n"),
        "utf-8",
      );

      const query = await client.startQueryTurn({
        prompt: [
          `Use the project skill $${skillName} for this request.`,
          `Trigger token: ${triggerToken}`,
          "Follow the skill exactly.",
        ].join("\n"),
        model: modelIdentifier,
        workingDirectory: workspaceRoot,
        permissionMode: "default",
        enableSendMessageToTooling: false,
        enableProjectSkillSettings: true,
        autoExecuteTools: true,
      });

      try {
        const { chunks, resultText } = await readLiveTurnResult(query);
        expect(
          chunks.some((chunk) => chunk.includes(responseToken)) || resultText?.includes(responseToken),
        ).toBe(true);
      } finally {
        query.close();
      }
    },
    FLOW_TEST_TIMEOUT_MS,
  );

  it(
    "resumes a live Claude query session and retains prior session history",
    async () => {
      const workspaceRoot = await createWorkspace("claude-sdk-client-resume");
      createdWorkspaces.add(workspaceRoot);

      const client = new ClaudeSdkClient();
      const modelIdentifier = await resolveHaikuModelIdentifier(client);

      const firstToken = `CLAUDE_SDK_RESUME_FIRST_${Date.now()}`;
      const secondToken = `CLAUDE_SDK_RESUME_SECOND_${Date.now()}`;

      let initialSessionId: string | null = null;
      const firstQuery = await client.startQueryTurn({
        prompt: `Reply with exactly '${firstToken}'. Do not add any other text.`,
        model: modelIdentifier,
        workingDirectory: workspaceRoot,
        permissionMode: "plan",
        enableSendMessageToTooling: false,
        autoExecuteTools: false,
      });
      try {
        const firstResult = await readLiveTurnResult(firstQuery);
        expect(
          firstResult.chunks.some((chunk) => chunk.includes(firstToken)) ||
            firstResult.resultText?.includes(firstToken),
        ).toBe(true);

        initialSessionId = firstResult.sessionId;
        expect(initialSessionId).toBeTruthy();
      } finally {
        firstQuery.close();
      }

      const resumedQuery = await client.startQueryTurn({
        prompt: `Reply with exactly '${secondToken}'. Do not add any other text.`,
        sessionId: initialSessionId!,
        model: modelIdentifier,
        workingDirectory: workspaceRoot,
        permissionMode: "plan",
        enableSendMessageToTooling: false,
        autoExecuteTools: false,
      });

      try {
        const secondResult = await readLiveTurnResult(resumedQuery);
        const resumedSessionId = secondResult.sessionId;
        expect(resumedSessionId).toBeTruthy();
        expect(
          secondResult.chunks.some((chunk) => chunk.includes(secondToken)) ||
            secondResult.resultText?.includes(secondToken),
        ).toBe(true);

        const rawMessages = await client.getSessionMessages(resumedSessionId!);
        expect(rawMessages).not.toBeNull();
        const serializedMessages = JSON.stringify(rawMessages);
        expect(serializedMessages).toContain(firstToken);
        expect(serializedMessages).toContain(secondToken);
      } finally {
        resumedQuery.close();
      }
    },
    FLOW_TEST_TIMEOUT_MS,
  );

  it(
    "configures a custom MCP server and executes a simple custom MCP tool",
    async () => {
      const workspaceRoot = await createWorkspace("claude-sdk-client-mcp");
      createdWorkspaces.add(workspaceRoot);

      const client = new ClaudeSdkClient();
      const modelIdentifier = await resolveHaikuModelIdentifier(client);
      const invocationTokens: string[] = [];
      const toolToken = `CLAUDE_SDK_MCP_${Date.now()}`;

      const echoTool = await client.createToolDefinition({
        name: "echo_token",
        description: "Echoes back the provided token.",
        inputSchema: {
          token: z.string().min(1).describe("Token to echo back verbatim."),
        },
        handler: async (args) => {
          const token =
            args &&
            typeof args === "object" &&
            !Array.isArray(args) &&
            "token" in args &&
            typeof (args as { token?: unknown }).token === "string"
              ? ((args as { token: string }).token)
              : "";
          invocationTokens.push(token);
          return {
            content: [{ type: "text", text: `ECHO:${token}` }],
          };
        },
      });

      const mcpServer = await client.createMcpServer({
        name: "integration_echo",
        tools: [echoTool],
      });
      expect(mcpServer).not.toBeNull();

      const query = await client.startQueryTurn({
        prompt: [
          "Use the custom MCP tool exactly once.",
          "The tool is exposed from MCP server 'integration_echo'.",
          "Its tool name is 'echo_token'.",
          "If Claude shows the fully qualified MCP tool name, use 'mcp__integration_echo__echo_token'.",
          `Pass this exact token argument value: ${toolToken}`,
          "Do not use any other tool.",
          "After the tool succeeds, reply with exactly DONE.",
        ].join("\n"),
        model: modelIdentifier,
        workingDirectory: workspaceRoot,
        mcpServers: {
          integration_echo: mcpServer!,
        },
        permissionMode: "default",
        enableSendMessageToTooling: false,
        autoExecuteTools: true,
      });

      try {
        const { chunks, resultText } = await readLiveTurnResult(query);
        const serialized = chunks.join("\n");

        expect(invocationTokens, serialized || resultText || "no-stream-output").toEqual([toolToken]);
        expect(serialized.includes("DONE") || resultText?.includes("DONE")).toBe(true);
        expect(serialized.includes(`ECHO:${toolToken}`) || resultText?.includes(`ECHO:${toolToken}`)).toBe(
          true,
        );
      } finally {
        query.close();
      }
    },
    FLOW_TEST_TIMEOUT_MS,
  );
});
