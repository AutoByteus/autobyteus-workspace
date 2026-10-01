import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import {
  ClaudeSdkClient,
  type ClaudeSdkCanUseTool,
  type ClaudeSdkStreamingSessionOptions,
} from "../../../../../src/runtime-management/claude/client/claude-sdk-client.js";
import type { ClaudeSdkStreamingSession } from "../../../../../src/runtime-management/claude/client/claude-sdk-streaming-session.js";
import {
  buildStandaloneClaudeProcessEnv,
  resolveClaudeCliExecutableCandidates,
} from "../../../../helpers/claude-cli-executable-candidates.js";

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

const createSessionBinding = () => ({ kind: "create" as const, sessionId: randomUUID() });

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

type LiveSession = {
  session: ClaudeSdkStreamingSession;
  frames: Array<Record<string, unknown>>;
  send: (text: string) => string;
  nextResult: (timeoutMs?: number) => Promise<Record<string, unknown>>;
  close: () => void;
};

const allowAllTools: ClaudeSdkCanUseTool = async (_toolName, input) => ({ behavior: "allow", updatedInput: input });

/** Opens one live streaming session and pumps its frames (single consumer). */
const openLiveSession = async (
  client: ClaudeSdkClient,
  options: ClaudeSdkStreamingSessionOptions,
): Promise<LiveSession> => {
  const session = await client.openStreamingSession(options);
  const frames: Array<Record<string, unknown>> = [];
  const results: Array<Record<string, unknown>> = [];
  let waiter: (() => void) | null = null;
  void (async () => {
    try {
      for await (const frame of session.messages) {
        const payload = frame as Record<string, unknown>;
        frames.push(payload);
        if (payload.type === "result") results.push(payload);
        waiter?.();
      }
    } catch {
      // A closed or killed process ends the stream; tests assert on frames.
    }
    waiter?.();
  })();
  let consumed = 0;
  return {
    session,
    frames,
    send: (text) => {
      const uuid = randomUUID();
      session.send({ type: "user", uuid, parent_tool_use_id: null, message: { role: "user", content: [{ type: "text", text }] } });
      return uuid;
    },
    nextResult: async (timeoutMs = FLOW_TEST_TIMEOUT_MS) => {
      const deadline = Date.now() + timeoutMs;
      while (results.length <= consumed) {
        if (Date.now() > deadline) throw new Error(`No Claude result within ${String(timeoutMs)}ms.`);
        await Promise.race([new Promise<void>((resolve) => { waiter = resolve; }), delay(250)]);
      }
      return results[consumed++]!;
    },
    close: () => session.close(),
  };
};

const resultMentions = (live: LiveSession, token: string): boolean =>
  live.frames.some((frame) => JSON.stringify(frame).includes(token));

describeClaudeSdkClientIntegration("ClaudeSdkClient integration (live streaming transport)", () => {
  const createdWorkspaces = new Set<string>();
  const openSessions: LiveSession[] = [];

  afterEach(async () => {
    vi.unstubAllEnvs();
    for (const live of openSessions.splice(0)) live.close();
    await Promise.all(
      Array.from(createdWorkspaces).map((workspaceRoot) =>
        fs.rm(workspaceRoot, { recursive: true, force: true }).catch(() => undefined),
      ),
    );
    createdWorkspaces.clear();
  });

  const open = async (client: ClaudeSdkClient, options: ClaudeSdkStreamingSessionOptions) => {
    const live = await openLiveSession(client, options);
    openSessions.push(live);
    return live;
  };

  it(
    "lists live models, answers consecutive messages on one streaming session, and fetches session messages",
    async () => {
      const workspaceRoot = await createWorkspace("claude-sdk-client-live");
      createdWorkspaces.add(workspaceRoot);
      const client = new ClaudeSdkClient();
      const modelIdentifier = await resolveHaikuModelIdentifier(client);
      const firstToken = `CLAUDE_SDK_CLIENT_LIVE_A_${Date.now()}`;
      const secondToken = `CLAUDE_SDK_CLIENT_LIVE_B_${Date.now()}`;
      const binding = createSessionBinding();

      const live = await open(client, {
        systemPrompt: "",
        sessionBinding: binding,
        model: modelIdentifier,
        workingDirectory: workspaceRoot,
        permissionMode: "plan",
      });
      const first = live.send(`Reply with exactly '${firstToken}'. Do not add any other text.`);
      expect((await live.nextResult()).user_message_uuids).toEqual([first]);
      const second = live.send(`Reply with exactly '${secondToken}'. Do not add any other text.`);
      expect((await live.nextResult()).user_message_uuids).toEqual([second]);

      expect(resultMentions(live, firstToken)).toBe(true);
      expect(resultMentions(live, secondToken)).toBe(true);
      expect(live.frames.every((frame) => !frame.session_id || frame.session_id === binding.sessionId)).toBe(true);
      const rawMessages = await client.getSessionMessages(binding.sessionId);
      expect(JSON.stringify(rawMessages)).toContain(secondToken);
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

      const live = await open(client, {
        systemPrompt: "",
        sessionBinding: createSessionBinding(),
        model: modelIdentifier,
        workingDirectory: workspaceRoot,
        permissionMode: "default",
        canUseTool: allowAllTools,
      });
      live.send([
        `Use the project skill $${skillName} for this request.`,
        `Trigger token: ${triggerToken}`,
        "Follow the skill exactly.",
      ].join("\n"));
      await live.nextResult();

      expect(resultMentions(live, responseToken)).toBe(true);
    },
    FLOW_TEST_TIMEOUT_MS,
  );

  it(
    "resumes a closed streaming session in a new process and retains prior session history",
    async () => {
      const workspaceRoot = await createWorkspace("claude-sdk-client-resume");
      createdWorkspaces.add(workspaceRoot);
      const client = new ClaudeSdkClient();
      const modelIdentifier = await resolveHaikuModelIdentifier(client);
      const codeword = `PAPAYA${Date.now()}`;
      const binding = createSessionBinding();

      const first = await open(client, {
        systemPrompt: "",
        sessionBinding: binding,
        model: modelIdentifier,
        workingDirectory: workspaceRoot,
        permissionMode: "plan",
      });
      first.send(`Remember the codeword ${codeword}. Reply only OK.`);
      await first.nextResult();
      first.close();

      const resumed = await open(client, {
        systemPrompt: "",
        sessionBinding: { kind: "resume", sessionId: binding.sessionId },
        model: modelIdentifier,
        workingDirectory: workspaceRoot,
        permissionMode: "plan",
      });
      resumed.send("What codeword did I ask you to remember? Reply with only the codeword.");
      await resumed.nextResult();

      expect(resultMentions(resumed, codeword)).toBe(true);
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
            args && typeof args === "object" && !Array.isArray(args) && "token" in args &&
            typeof (args as { token?: unknown }).token === "string"
              ? (args as { token: string }).token
              : "";
          invocationTokens.push(token);
          return { content: [{ type: "text", text: `ECHO:${token}` }] };
        },
      });
      const mcpServer = await client.createMcpServer({ name: "integration_echo", tools: [echoTool] });
      expect(mcpServer).not.toBeNull();

      const live = await open(client, {
        systemPrompt: "",
        sessionBinding: createSessionBinding(),
        model: modelIdentifier,
        workingDirectory: workspaceRoot,
        mcpServers: { integration_echo: mcpServer! },
        permissionMode: "default",
        canUseTool: allowAllTools,
      });
      live.send([
        "Use the custom MCP tool exactly once.",
        "The tool is exposed from MCP server 'integration_echo'.",
        "Its tool name is 'echo_token'.",
        "If Claude shows the fully qualified MCP tool name, use 'mcp__integration_echo__echo_token'.",
        `Pass this exact token argument value: ${toolToken}`,
        "Do not use any other tool.",
        "After the tool succeeds, reply with exactly DONE.",
      ].join("\n"));
      await live.nextResult();

      expect(invocationTokens).toEqual([toolToken]);
      expect(resultMentions(live, "DONE")).toBe(true);
    },
    FLOW_TEST_TIMEOUT_MS,
  );
});

// Design step 1 risk control (RSK-006): `interrupt({ cancelQueued: true })` is protocol-documented
// and capability-advertised but not declared in the SDK d.ts. Re-run after Claude CLI or Agent SDK
// bumps with RUN_CLAUDE_E2E=1 on both CLIs AutoByteus can launch.
const cliCandidates = resolveClaudeCliExecutableCandidates();
const describeCancelQueued = liveClaudeTestsEnabled && cliCandidates.length > 0 ? describe : describe.skip;

describeCancelQueued("Claude CLI Stop contract (interrupt with cancelQueued)", () => {
  it.each(cliCandidates.map((candidate) => [candidate.label, candidate] as const))(
    "%s cancels a queued message atomically with the interrupt and keeps the process usable",
    async (_label, candidate) => {
      vi.stubEnv("CLAUDE_CODE_EXECUTABLE_PATH", candidate.executablePath);
      const workspaceRoot = await createWorkspace("claude-cancel-queued");
      const client = new ClaudeSdkClient();
      const live = await openLiveSession(client, {
        systemPrompt: "",
        sessionBinding: createSessionBinding(),
        model: "haiku",
        workingDirectory: workspaceRoot,
        permissionMode: "default",
        canUseTool: allowAllTools,
        env: { ...buildStandaloneClaudeProcessEnv(), CLAUDE_AGENT_SDK_AUTH_MODE: "cli" },
      });
      try {
        live.send("Reply only READY.");
        await live.nextResult();
        expect(live.session.capabilities?.has("interrupt_cancel_queued_v1")).toBe(true);

        const a = live.send("Use Bash in the foreground to run: python3 -c 'import time; time.sleep(25)' then reply DONE.");
        const deadline = Date.now() + 60_000;
        while (!live.frames.some((frame) => frame.type === "system" && frame.subtype === "task_started")) {
          if (Date.now() > deadline) throw new Error("The foreground Bash command never started.");
          await delay(200);
        }
        const b = live.send("Reply only B-SHOULD-NOT-RUN.");
        await delay(1_500);
        const outcome = await live.session.interruptAndCancelQueued();
        const interrupted = await live.nextResult();

        expect(outcome.cancelled).toContain(b);
        expect(interrupted.user_message_uuids).toEqual([a]);
        expect(String(interrupted.terminal_reason)).toMatch(/^aborted/u);

        const c = live.send("Reply only AFTER.");
        const after = await live.nextResult();
        expect(after.user_message_uuids).toEqual([c]);
        const answered = live.frames
          .filter((frame) => frame.type === "result")
          .flatMap((frame) => (frame.user_message_uuids as string[] | undefined) ?? []);
        expect(answered).not.toContain(b);
        expect(live.frames
          .filter((frame) => frame.type === "assistant")
          .some((frame) => JSON.stringify(frame).includes("B-SHOULD-NOT-RUN"))).toBe(false);
      } finally {
        live.close();
        await fs.rm(workspaceRoot, { recursive: true, force: true }).catch(() => undefined);
      }
    },
    FLOW_TEST_TIMEOUT_MS,
  );
});
