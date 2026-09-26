import "reflect-metadata";
import { createRequire } from "node:module";
import path from "node:path";
import os from "node:os";
import { spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import type { FastifyInstance } from "fastify";
import WebSocket from "ws";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import type { graphql as graphqlFn, GraphQLSchema } from "graphql";
import { buildGraphqlSchema } from "../../../src/api/graphql/schema.js";
import { appConfigProvider } from "../../../src/config/app-config-provider.js";
import { isE2eTeamCommunicationMessage } from "../helpers/team-communication-message-helpers.js";
import { sendE2eSendMessageCommand } from "../helpers/websocket-command-helpers.js";
import { flattenE2eConfiguredAgentExecutions } from "../helpers/team-run-metadata-helpers.js";
import { E2E_TEAM_RUN_RESUME_CONFIG_DOCUMENT } from "../helpers/team-run-graphql-documents.js";
import { startStudioE2eRuntimeServer } from "../helpers/studio-runtime-test-server.js";
import { buildStandaloneClaudeProcessEnv } from "../../helpers/claude-cli-executable-candidates.js";

// AC-004 / AC-014 (teammate path): a teammate's send_message_to reaches a busy member inside
// its running turn instead of waiting for that turn to end. The sender is a Claude member;
// the busy worker is a Claude or a Codex member. Gated by RUN_CLAUDE_E2E=1 (and RUN_CODEX_E2E=1
// for the Codex worker).
const binaryReady = (binary: string) => spawnSync(binary, ["--version"], { stdio: "ignore" }).status === 0;
const claudeReady = process.env.RUN_CLAUDE_E2E === "1" && binaryReady("claude");
const codexReady = claudeReady && process.env.RUN_CODEX_E2E === "1" && binaryReady("codex");
const CODEX_WORKER_MODEL = process.env.CODEX_BACKEND_MODEL?.trim() || "gpt-5.6-luna";
const TEAM_CASE_TIMEOUT_MS = 300_000;

type TeamStreamMessage = { type: string; payload: Record<string, unknown> };

const workerCases = [
  { label: "claude worker", runtimeKind: "claude_agent_sdk", model: "haiku", enabled: claudeReady },
  { label: "codex worker", runtimeKind: "codex_app_server", model: CODEX_WORKER_MODEL, enabled: codexReady },
] as const;

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

(claudeReady ? describe : describe.skip)("Teammate message to a busy member (live team E2E)", () => {
  let schema: GraphQLSchema;
  let graphql: typeof graphqlFn;
  let testDataDir: string | null = null;
  let runtimeServerApp: FastifyInstance | null = null;
  let runtimeServerUrl: URL;
  const savedEnv = { ...process.env };
  const created = { agents: new Set<string>(), teams: new Set<string>(), runs: new Set<string>(), dirs: new Set<string>() };

  const execGraphql = async <T>(source: string, variableValues?: Record<string, unknown>): Promise<T> => {
    const result = await graphql({ schema, source, variableValues });
    if (result.errors?.length) throw result.errors[0];
    return result.data as T;
  };

  beforeAll(async () => {
    // Run like a standalone server even when launched from a Claude Code session.
    const standalone = buildStandaloneClaudeProcessEnv();
    for (const key of Object.keys(process.env)) {
      if (!(key in standalone)) delete process.env[key];
    }
    testDataDir = await mkdtemp(path.join(os.tmpdir(), "team-busy-member-e2e-appdata-"));
    await writeFile(path.join(testDataDir, ".env"), "AUTOBYTEUS_SERVER_HOST=http://localhost:8000\nAPP_ENV=test\n", "utf-8");
    appConfigProvider.config.setCustomAppDataDir(testDataDir);
    const require = createRequire(import.meta.url);
    const graphqlPath = require.resolve("graphql", { paths: [path.dirname(require.resolve("type-graphql"))] });
    graphql = (await import(graphqlPath)).graphql as typeof graphqlFn;
    const started = await startStudioE2eRuntimeServer();
    runtimeServerApp = started.fastify;
    runtimeServerUrl = started.mainUrl;
    schema = await buildGraphqlSchema();
  });

  afterEach(async () => {
    const quietly = (source: string, variables: Record<string, unknown>) => execGraphql(source, variables).catch(() => undefined);
    for (const teamRunId of created.runs) {
      await quietly("mutation T($teamRunId: String!) { terminateAgentTeamRun(teamRunId: $teamRunId) { success } }", { teamRunId });
    }
    for (const id of created.teams) {
      await quietly("mutation D($id: String!) { deleteAgentTeamDefinition(id: $id) { success } }", { id });
    }
    for (const id of created.agents) {
      await quietly("mutation D($id: String!) { deleteAgentDefinition(id: $id) { success } }", { id });
    }
    for (const dir of created.dirs) await rm(dir, { recursive: true, force: true });
    created.runs.clear();
    created.teams.clear();
    created.agents.clear();
    created.dirs.clear();
  });

  afterAll(async () => {
    await runtimeServerApp?.close();
    if (testDataDir) await rm(testDataDir, { recursive: true, force: true });
    process.env = savedEnv;
  });

  const createAgentDefinition = async (name: string, instructions: string, toolNames: string[]) => {
    const result = await execGraphql<{ createAgentDefinition: { id: string } }>(
      "mutation C($input: CreateAgentDefinitionInput!) { createAgentDefinition(input: $input) { id } }",
      { input: { name, role: "assistant", description: `${name} for busy-member delivery E2E.`, instructions, toolNames } },
    );
    created.agents.add(result.createAgentDefinition.id);
    return result.createAgentDefinition.id;
  };

  it.each(workerCases.map((workerCase) => [workerCase.label, workerCase] as const))(
    "delivers a teammate message into the busy member's running turn (%s)",
    async (_label, workerCase) => {
      if (!workerCase.enabled) {
        console.info(`[AC-004] ${workerCase.label} skipped: runtime not enabled for live E2E.`);
        return;
      }
      const unique = randomUUID();
      const workspaceRootPath = await mkdtemp(path.join(os.tmpdir(), "team-busy-member-e2e-"));
      created.dirs.add(workspaceRootPath);
      const senderId = await createAgentDefinition(
        `busy-delivery-sender-${unique}`,
        "If the user asks you to call send_message_to with explicit arguments, call it exactly once with those arguments and no other tool. Otherwise reply briefly.",
        ["send_message_to"],
      );
      const workerId = await createAgentDefinition(
        `busy-delivery-worker-${unique}`,
        "Follow the user's and teammates' instructions exactly. Keep replies short. Never call send_message_to.",
        [],
      );
      const team = await execGraphql<{ createAgentTeamDefinition: { id: string } }>(
        "mutation C($input: CreateAgentTeamDefinitionInput!) { createAgentTeamDefinition(input: $input) { id } }",
        {
          input: {
            name: `busy-delivery-team-${unique}`,
            description: "Busy member mid-turn delivery team.",
            instructions: "The sender relays messages to the worker.",
            coordinatorMemberName: "sender",
            nodes: [
              { memberName: "sender", ref: senderId, refScope: "SHARED" },
              { memberName: "worker", ref: workerId, refScope: "SHARED" },
            ],
          },
        },
      );
      created.teams.add(team.createAgentTeamDefinition.id);
      const memberConfig = (address: string, agentDefinitionId: string, runtimeKind: string, llmModelIdentifier: string) => ({
        memberAddress: address, agentDefinitionId, llmModelIdentifier, runtimeKind,
        autoExecuteTools: true, skillAccessMode: "NONE", workspaceRootPath,
      });
      const run = await execGraphql<{ createAgentTeamRun: { success: boolean; message: string; teamRunId: string | null } }>(
        "mutation C($input: CreateAgentTeamRunInput!) { createAgentTeamRun(input: $input) { success message teamRunId } }",
        {
          input: {
            teamDefinitionId: team.createAgentTeamDefinition.id,
            teamConfigs: [{
              teamAddress: "/", llmModelIdentifier: "haiku", runtimeKind: "claude_agent_sdk",
              autoExecuteTools: true, skillAccessMode: "NONE", workspaceRootPath,
            }],
            memberConfigs: [
              memberConfig("/sender", senderId, "claude_agent_sdk", "haiku"),
              memberConfig("/worker", workerId, workerCase.runtimeKind, workerCase.model),
            ],
          },
        },
      );
      expect(run.createAgentTeamRun, run.createAgentTeamRun.message).toMatchObject({ success: true });
      const teamRunId = run.createAgentTeamRun.teamRunId!;
      created.runs.add(teamRunId);

      const resume = await execGraphql<{ getTeamRunResumeConfig: { executionTree: Record<string, unknown> } }>(
        E2E_TEAM_RUN_RESUME_CONFIG_DOCUMENT,
        { teamRunId },
      );
      const members = flattenE2eConfiguredAgentExecutions(resume.getTeamRunResumeConfig.executionTree);
      const runIdOf = (name: string) => members.find((member) => member.memberName === name)!.agentRunId;
      const addressOf = (name: string) => members.find((member) => member.memberName === name)!.memberAddress;
      const senderRunId = runIdOf("sender");
      const workerRunId = runIdOf("worker");

      const socket = new WebSocket(`ws://${runtimeServerUrl.hostname}:${runtimeServerUrl.port}/ws/agent-team/${teamRunId}`);
      const stream: TeamStreamMessage[] = [];
      socket.on("message", (raw) => {
        try {
          const parsed = JSON.parse(String(raw)) as { type?: unknown; payload?: unknown };
          if (typeof parsed.type === "string") {
            stream.push({ type: parsed.type, payload: (parsed.payload ?? {}) as Record<string, unknown> });
          }
        } catch {
          // ignore non-JSON frames
        }
      });
      await new Promise<void>((resolve, reject) => {
        socket.once("open", () => resolve());
        socket.once("error", reject);
      });
      const waitFor = async (predicate: (message: TeamStreamMessage) => boolean, label: string, timeoutMs = 180_000) => {
        const deadline = Date.now() + timeoutMs;
        while (Date.now() < deadline) {
          const index = stream.findIndex(predicate);
          if (index >= 0) return index;
          await wait(300);
        }
        throw new Error(`Timed out waiting for ${label}; last: ${stream.slice(-15).map((m) => `${m.type}:${String(m.payload.agent_run_id ?? "")}`).join(" | ")}`);
      };
      const ofWorker = (type: string) => (message: TeamStreamMessage) => message.type === type && message.payload.agent_run_id === workerRunId;

      try {
        // A plain `sleep N; …` chain is blocked by the Claude CLI, which suggests backgrounding it.
        const command = `python3 -c "import time; time.sleep(25); print('WORK_DONE')"`;
        sendE2eSendMessageCommand(socket, {
          agent_run_id: workerRunId,
          content: `Use your shell/terminal tool (not in the background) to run exactly: ${command}\nThen reply with its output.`,
        });
        await waitFor(
          (message) => ofWorker("TOOL_EXECUTION_STARTED")(message) &&
            JSON.stringify(message.payload.arguments ?? message.payload).includes("WORK_DONE"),
          "worker command started",
        );
        const teammateContent = `From sender ${unique.slice(0, 6)}: your final reply must include the word PINEAPPLE.`;
        sendE2eSendMessageCommand(socket, {
          agent_run_id: senderRunId,
          content: `Call send_message_to exactly once now with these exact JSON arguments: ${JSON.stringify({
            recipient_address: addressOf("worker"),
            content: teammateContent,
            message_type: "direct",
          })}. Do not call any other tool.`,
        });
        const receiptIndex = await waitFor(
          (message) => isE2eTeamCommunicationMessage(message, {
            senderAgentRunId: senderRunId,
            recipientAgentRunId: workerRunId,
            content: teammateContent,
          }),
          "teammate message routed to the worker",
        );
        const workerCompletedIndex = await waitFor(ofWorker("TURN_COMPLETED"), "worker TURN_COMPLETED");
        console.info(`[AC-004 ${workerCase.label}] worker/sender stream:`, JSON.stringify(stream
          .map((message, index) => ({ index, type: message.type, run: message.payload.agent_run_id === workerRunId ? "worker" : message.payload.agent_run_id === senderRunId ? "sender" : "-",
            tool: message.payload.tool_name, args: message.payload.arguments, result: typeof message.payload.result === "string" ? message.payload.result.slice(0, 160) : undefined,
            error: typeof message.payload.error === "string" ? message.payload.error.slice(0, 300) : undefined }))
          .filter((row) => row.run !== "-" && !["SEGMENT_CONTENT", "SEGMENT_START", "SEGMENT_END", "TOKEN_USAGE_UPDATED"].includes(row.type))));
        expect(receiptIndex, "the teammate message arrived while the worker's turn was running").toBeLessThan(workerCompletedIndex);
        await wait(10_000); // a second worker turn would start here if the message had waited for turn end

        const workerStarted = stream.filter(ofWorker("TURN_STARTED"));
        const workerCompleted = stream.filter(ofWorker("TURN_COMPLETED"));
        expect(workerStarted, "no new worker turn was started for the teammate message").toHaveLength(1);
        expect(workerCompleted).toHaveLength(1);
        const turnIdOf = (message: TeamStreamMessage) => message.payload.turn_id ?? message.payload.turnId;
        expect(turnIdOf(workerCompleted[0]!)).toBe(turnIdOf(workerStarted[0]!));
        const workerReply = stream
          .filter((message) => ofWorker("SEGMENT_CONTENT")(message) && (message.payload.segment_type ?? "text") === "text")
          .map((message) => String(message.payload.delta ?? ""))
          .join("");
        expect(workerReply).toContain("WORK_DONE");
        expect(workerReply.toUpperCase()).toContain("PINEAPPLE");
        console.info(`[AC-004 ${workerCase.label}] worker turn ${String(turnIdOf(workerStarted[0]!))}: receipt@${receiptIndex} < completed@${workerCompletedIndex}`);
      } finally {
        socket.close();
      }
    },
    TEAM_CASE_TIMEOUT_MS,
  );
});
