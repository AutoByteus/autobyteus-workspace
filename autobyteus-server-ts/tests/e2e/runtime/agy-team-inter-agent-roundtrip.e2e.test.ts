import "reflect-metadata";
import path from "node:path";
import os from "node:os";
import { spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import type { FastifyInstance } from "fastify";
import WebSocket from "ws";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import {
  AUTOBYTEUS_INTERNAL_SERVER_BASE_URL_ENV_VAR,
} from "../../../src/config/server-runtime-endpoints.js";
import { appConfigProvider } from "../../../src/config/app-config-provider.js";
import { getTeamMemberRunViewProjectionService } from "../../../src/run-history/services/team-member-run-view-projection-service.js";
import { isE2eTeamCommunicationMessage } from "../helpers/team-communication-message-helpers.js";
import { sendE2eSendMessageCommand } from "../helpers/websocket-command-helpers.js";
import { flattenE2eConfiguredAgentExecutions } from "../helpers/team-run-metadata-helpers.js";
import { startStudioE2eRuntimeServer } from "../helpers/studio-runtime-test-server.js";

const agyBinaryReady =
  spawnSync("agy", ["--version"], {
    stdio: "ignore",
  }).status === 0;
const liveAgyTestsEnabled = process.env["RUN_AGY_E2E"] === "1";
const describeAgyRuntime =
  agyBinaryReady && liveAgyTestsEnabled ? describe : describe.skip;

const wait = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

const waitForSocketOpen = (
  socket: WebSocket,
  timeoutMs = 10_000,
): Promise<void> =>
  new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error("Timed out waiting for websocket open")),
      timeoutMs,
    );
    socket.once("open", () => {
      clearTimeout(timer);
      resolve();
    });
    socket.once("error", (error: Error) => {
      clearTimeout(timer);
      reject(error);
    });
  });

const closeSocket = async (socket: WebSocket): Promise<void> => {
  if (socket.readyState === WebSocket.CLOSED) {
    return;
  }
  await new Promise<void>((resolve) => {
    const timer = setTimeout(resolve, 2_000);
    socket.once("close", () => {
      clearTimeout(timer);
      resolve();
    });
    socket.close();
  });
};

const sendTeamMessageOverSocket = (
  socket: WebSocket,
  input: {
    content: string;
    agentRunId: string;
    contextFilePaths?: string[];
    imageUrls?: string[];
  },
): void => {
  sendE2eSendMessageCommand(socket, {
    content: input.content,
    agent_run_id: input.agentRunId,
    context_file_paths: input.contextFilePaths ?? [],
    image_urls: input.imageUrls ?? [],
  });
};

describeAgyRuntime(
  "AGY Team and Org collaboration e2e (live transport)",
  () => {
    let testDataDir: string | null = null;
    let runtimeServerApp: FastifyInstance | null = null;
    let runtimeServerUrl: URL;
    let originalInternalServerBaseUrl: string | undefined;
    const createdAgentDefinitionIds = new Set<string>();
    const createdTeamDefinitionIds = new Set<string>();
    const createdTeamRunIds = new Set<string>();
    const createdOrgDefinitionIds = new Set<string>();
    const createdOrgRunIds = new Set<string>();
    const createdWorkspaceRoots = new Set<string>();

    beforeAll(async () => {
      originalInternalServerBaseUrl =
        process.env[AUTOBYTEUS_INTERNAL_SERVER_BASE_URL_ENV_VAR];
      testDataDir = await mkdtemp(
        path.join(os.tmpdir(), "agy-team-runtime-e2e-appdata-"),
      );
      await writeFile(
        path.join(testDataDir, ".env"),
        "AUTOBYTEUS_SERVER_HOST=http://localhost:8000\nAPP_ENV=test\n",
        "utf-8",
      );
      appConfigProvider.config.setCustomAppDataDir(testDataDir);
      const started = await startStudioE2eRuntimeServer();
      runtimeServerApp = started.fastify;
      runtimeServerUrl = started.mainUrl;
    });

    afterAll(async () => {
      if (originalInternalServerBaseUrl) {
        process.env[AUTOBYTEUS_INTERNAL_SERVER_BASE_URL_ENV_VAR] =
          originalInternalServerBaseUrl;
      } else {
        delete process.env[AUTOBYTEUS_INTERNAL_SERVER_BASE_URL_ENV_VAR];
      }
      if (runtimeServerApp) {
        await runtimeServerApp.close();
        runtimeServerApp = null;
      }
      for (const root of createdWorkspaceRoots) {
        await rm(root, { recursive: true, force: true });
      }
      createdWorkspaceRoots.clear();
      if (testDataDir) {
        await rm(testDataDir, { recursive: true, force: true });
        testDataDir = null;
      }
    });

    const execGraphql = async <T>(
      query: string,
      variables?: Record<string, unknown>,
    ): Promise<T> => {
      const response = await fetch(new URL("/graphql", runtimeServerUrl), {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ query, variables }),
      });
      const result = await response.json() as {
        data?: T;
        errors?: Array<{ message: string }>;
      };
      if (!response.ok || result.errors?.length || !result.data) {
        throw new Error(`GraphQL HTTP ${response.status}: ${JSON.stringify(result.errors ?? result)}`);
      }
      return result.data;
    };

    afterEach(async () => {
      const exec = async <T>(
        query: string,
        variables?: Record<string, unknown>,
      ): Promise<T | null> => execGraphql<T>(query, variables).catch(() => null);

      const terminateTeamRunMutation = `
      mutation TerminateAgentTeamRun($teamRunId: String!) {
        terminateAgentTeamRun(teamRunId: $teamRunId) {
          success
        }
      }
    `;
      for (const teamRunId of createdTeamRunIds) {
        await exec(terminateTeamRunMutation, { teamRunId });
      }
      createdTeamRunIds.clear();

      for (const agentOrgRunId of createdOrgRunIds) {
        await exec(`mutation($agentOrgRunId: String!) {
          terminateAgentOrgRun(agentOrgRunId: $agentOrgRunId) { success }
        }`, { agentOrgRunId });
      }
      createdOrgRunIds.clear();

      for (const id of createdOrgDefinitionIds) {
        await exec(`mutation($id: String!) {
          deleteAgentOrgDefinition(id: $id)
        }`, { id });
      }
      createdOrgDefinitionIds.clear();

      const deleteTeamDefinitionMutation = `
      mutation DeleteAgentTeamDefinition($id: String!) {
        deleteAgentTeamDefinition(id: $id) {
          success
        }
      }
    `;
      for (const id of createdTeamDefinitionIds) {
        await exec(deleteTeamDefinitionMutation, { id });
      }
      createdTeamDefinitionIds.clear();

      const deleteAgentDefinitionMutation = `
      mutation DeleteAgentDefinition($id: String!) {
        deleteAgentDefinition(id: $id) {
          success
        }
      }
    `;
      for (const id of createdAgentDefinitionIds) {
        await exec(deleteAgentDefinitionMutation, { id });
      }
      createdAgentDefinitionIds.clear();

      for (const root of createdWorkspaceRoots) {
        await rm(root, { recursive: true, force: true });
      }
      createdWorkspaceRoots.clear();
    });

    const fetchPreferredAgyToolModelIdentifier = async (): Promise<string> => {
      const result = await execGraphql<{
        providerModelCatalogSnapshots: Array<{ llmModels: Array<{ modelIdentifier: string }> }>;
      }>(`query Models($runtimeKind: String) {
        providerModelCatalogSnapshots(runtimeKind: $runtimeKind) {
          llmModels { modelIdentifier }
        }
      }`, { runtimeKind: "antigravity_cli" });
      const models = result.providerModelCatalogSnapshots.flatMap(provider => provider.llmModels.map(model => model.modelIdentifier));
      const override = process.env["AGY_E2E_TOOL_MODEL"]?.trim();
      if (override && models.includes(override)) return override;
      if (models.includes("gemini-3.8-flash-low")) return "gemini-3.8-flash-low";
      if (models.length === 0) throw new Error("No available AGY model in GraphQL catalog");
      return models[0]!;
    };

    it("routes a real scoped AGY send_message_to to another Team member over GraphQL/WebSocket", async () => {
      const unique = randomUUID();
      const modelIdentifier = await fetchPreferredAgyToolModelIdentifier();
      const workspaceRootPath = await mkdtemp(
        path.join(os.tmpdir(), "agy-team-roundtrip-e2e-"),
      );
      createdWorkspaceRoots.add(workspaceRootPath);

      const teamInstructions = `
You are participating in a two-agent team roundtrip validation in a team with members "ping" and "pong".

Rules:
1. Follow direct user instructions exactly.
2. You must not explore the environment or run diagnostics.
3. Use the AutoByteus agent tools MCP server for teammate delivery; do not use provider-native subagent routing.
4. You may read the MCP tool schema if needed. Invoke call_mcp_tool for ServerName autobyteus_agent_tools and ToolName send_message_to exactly once with the requested arguments.
5. Do not execute shell, file-write, or unrelated tools.
6. If you receive a teammate message, do not call any tool; reply with exactly ACK.
7. Keep assistant text responses very short.
`;

      const createAgentDefinitionMutation = `
        mutation CreateAgentDefinition($input: CreateAgentDefinitionInput!) {
          createAgentDefinition(input: $input) {
            id
          }
        }
      `;
      const pingAgentDefResult = await execGraphql<{
        createAgentDefinition: { id: string };
      }>(createAgentDefinitionMutation, {
        input: {
          name: `agy-ping-${unique}`,
          role: "assistant",
          description:
            "AGY ping agent for live inter-agent roundtrip validation.",
          instructions: teamInstructions,
          toolNames: ["send_message_to"],
        },
      });
      const pongAgentDefResult = await execGraphql<{
        createAgentDefinition: { id: string };
      }>(createAgentDefinitionMutation, {
        input: {
          name: `agy-pong-${unique}`,
          role: "assistant",
          description:
            "AGY pong agent for live inter-agent roundtrip validation.",
          instructions: teamInstructions,
          toolNames: ["send_message_to"],
        },
      });
      const pingAgentDefinitionId = pingAgentDefResult.createAgentDefinition.id;
      const pongAgentDefinitionId = pongAgentDefResult.createAgentDefinition.id;
      createdAgentDefinitionIds.add(pingAgentDefinitionId);
      createdAgentDefinitionIds.add(pongAgentDefinitionId);

      const createTeamDefinitionMutation = `
        mutation CreateAgentTeamDefinition($input: CreateAgentTeamDefinitionInput!) {
          createAgentTeamDefinition(input: $input) {
            id
          }
        }
      `;
      const teamDefinitionResult = await execGraphql<{
        createAgentTeamDefinition: { id: string };
      }>(createTeamDefinitionMutation, {
        input: {
          name: `agy-roundtrip-team-${unique}`,
          description: "Live agy inter-agent roundtrip validation team.",
          instructions:
            "Coordinate ping and pong to execute directed send_message_to hops.",
          coordinatorMemberName: "ping",
          nodes: [
            {
              memberName: "ping",
              ref: pingAgentDefinitionId,
              refScope: "SHARED",
            },
            {
              memberName: "pong",
              ref: pongAgentDefinitionId,
              refScope: "SHARED",
            },
          ],
        },
      });
      const teamDefinitionId =
        teamDefinitionResult.createAgentTeamDefinition.id;
      createdTeamDefinitionIds.add(teamDefinitionId);

      const createTeamRunMutation = `
        mutation CreateAgentTeamRun($input: CreateAgentTeamRunInput!) {
          createAgentTeamRun(input: $input) {
            success
            message
            teamRunId
          }
        }
      `;
      const createTeamRunResult = await execGraphql<{
        createAgentTeamRun: {
          success: boolean;
          message: string;
          teamRunId: string | null;
        };
      }>(createTeamRunMutation, {
        input: {
          teamDefinitionId,
          teamConfigs: [
            {
              teamAddress: "/",
              llmModelIdentifier: modelIdentifier,
              llmConfig: {},
              autoExecuteTools: true,
              skillAccessMode: "NONE",
              runtimeKind: "antigravity_cli",
              workspaceRootPath,
            },
          ],
          memberConfigs: [
            {
              memberAddress: "/ping",
              agentDefinitionId: pingAgentDefinitionId,
              llmModelIdentifier: modelIdentifier,
              llmConfig: {},
              autoExecuteTools: true,
              skillAccessMode: "NONE",
              runtimeKind: "antigravity_cli",
              workspaceRootPath,
            },
            {
              memberAddress: "/pong",
              agentDefinitionId: pongAgentDefinitionId,
              llmModelIdentifier: modelIdentifier,
              llmConfig: {},
              autoExecuteTools: true,
              skillAccessMode: "NONE",
              runtimeKind: "antigravity_cli",
              workspaceRootPath,
            },
          ],
        },
      });

      expect(createTeamRunResult.createAgentTeamRun.success).toBe(true);
      expect(createTeamRunResult.createAgentTeamRun.teamRunId).toBeTruthy();
      const teamRunId = createTeamRunResult.createAgentTeamRun
        .teamRunId as string;
      createdTeamRunIds.add(teamRunId);

      const teamResumeQuery = `
        query TeamResume($teamRunId: String!) {
          getTeamRunResumeConfig(teamRunId: $teamRunId) {
            executionTree
          }
        }
      `;
      const resumeResult = await execGraphql<{
        getTeamRunResumeConfig: { executionTree: Record<string, unknown> };
      }>(teamResumeQuery, { teamRunId });
      const members = flattenE2eConfiguredAgentExecutions(
        resumeResult.getTeamRunResumeConfig.executionTree,
      );
      const memberRunIdByName = new Map(
        members.map((member) => [member.memberName, member.agentRunId]),
      );
      expect(memberRunIdByName.get("ping")).toBeTruthy();
      expect(memberRunIdByName.get("pong")).toBeTruthy();

      const pingToken = `ROUNDTRIP_PING:${unique}`;
      const streamUrl = runtimeServerUrl;
      const teamSocket = new WebSocket(
        `ws://${streamUrl.hostname}:${streamUrl.port}/ws/agent-team/${teamRunId}`,
      );
      await waitForSocketOpen(teamSocket);
      const streamMessages: Array<{
        type: string;
        payload: Record<string, unknown>;
      }> = [];
      teamSocket.on("message", (raw: unknown) => {
        try {
          const parsed = JSON.parse(String(raw)) as {
            type?: unknown;
            payload?: unknown;
          };
          if (typeof parsed.type !== "string") {
            return;
          }
          const payload =
            parsed.payload &&
            typeof parsed.payload === "object" &&
            !Array.isArray(parsed.payload)
              ? (parsed.payload as Record<string, unknown>)
              : {};
          streamMessages.push({
            type: parsed.type,
            payload,
          });
        } catch {
          // ignore malformed rows in test stream capture
        }
      });

      const sendRelayInstruction = async (input: {
        targetMemberRouteKey: "ping" | "pong";
        recipientName: "ping" | "pong";
        messageType: string;
        content: string;
      }): Promise<void> => {
        const argsJson = JSON.stringify({
          recipient_address: `/${input.recipientName}`,
          content: input.content,
          message_type: input.messageType,
        });
        sendTeamMessageOverSocket(teamSocket, {
          agentRunId: memberRunIdByName.get(input.targetMemberRouteKey) as string,
          content:
            "Use the AutoByteus agent tools MCP call_mcp_tool with ServerName autobyteus_agent_tools and ToolName send_message_to exactly once now with these exact tool arguments: " +
            `${argsJson}. You may read the MCP schema if needed; do not use unrelated tools.`,
        });
      };

      const waitForTeamStreamEvent = async (
        predicate: (message: {
          type: string;
          payload: Record<string, unknown>;
        }) => boolean,
        label: string,
      ): Promise<void> => {
        const deadline = Date.now() + 120_000;
        while (Date.now() < deadline) {
          if (streamMessages.some(predicate)) {
            return;
          }
          await wait(500);
        }
        const preview = streamMessages
          .slice(-20)
          .map(
            (entry) =>
              `${entry.type}:${JSON.stringify(entry.payload).slice(0, 200)}`,
          )
          .join(" | ");
        const lifecyclePreview = streamMessages
          .filter((entry) =>
            [
              "SEGMENT_START",
              "TOOL_EXECUTION_STARTED",
              "TOOL_EXECUTION_SUCCEEDED",
              "TOOL_EXECUTION_FAILED",
              "TEAM_COMMUNICATION_MESSAGE",
              "MEMBER_INPUT_MESSAGE",
              "ASSISTANT_COMPLETE",
            ].includes(entry.type),
          )
          .map((entry) => `${entry.type}:${JSON.stringify(entry.payload)}`)
          .join(" | ");
        throw new Error(
          `Timed out waiting for team websocket event '${label}'. preview='${preview}'. lifecycle='${lifecyclePreview}'`,
        );
      };

      const waitForSendMessageLifecycleAndReceipt = async (input: {
        senderMemberName: "ping" | "pong";
        recipientMemberName: "ping" | "pong";
        content: string;
        startIndex: number;
      }): Promise<void> => {
        const senderRunId = memberRunIdByName.get(input.senderMemberName);
        const recipientRunId = memberRunIdByName.get(input.recipientMemberName);
        const isMatchingMcpCall = (message: { type: string; payload: Record<string, unknown> }): boolean => {
          if (message.type !== "TOOL_EXECUTION_STARTED" ||
              message.payload["agent_run_id"] !== senderRunId ||
              message.payload["tool_name"] !== "call_mcp_tool") return false;
          const parameters = message.payload["arguments"];
          if (!parameters || typeof parameters !== "object" || Array.isArray(parameters)) return false;
          const args = parameters as Record<string, unknown>;
          const toolArguments = args["Arguments"];
          if (!toolArguments || typeof toolArguments !== "object" || Array.isArray(toolArguments)) return false;
          const call = toolArguments as Record<string, unknown>;
          return args["ServerName"] === "autobyteus_agent_tools" &&
            args["ToolName"] === "send_message_to" &&
            call["recipient_address"] === `/${input.recipientMemberName}` &&
            call["content"] === input.content;
        };
        await waitForTeamStreamEvent(
          (message) => streamMessages.indexOf(message) >= input.startIndex && isMatchingMcpCall(message),
          `${input.senderMemberName} AGY call_mcp_tool send_message_to start`,
        );
        const started = streamMessages.find((message) =>
          streamMessages.indexOf(message) >= input.startIndex && isMatchingMcpCall(message));
        expect(started).toBeDefined();
        const invocationId = started?.payload["invocation_id"];
        expect(typeof invocationId).toBe("string");
        const isMatchingToolTerminal = (message: { type: string; payload: Record<string, unknown> }): boolean =>
          message.payload["agent_run_id"] === senderRunId &&
          message.payload["tool_name"] === "call_mcp_tool" &&
          message.payload["invocation_id"] === invocationId;
        const isReceipt = (message: { type: string; payload: Record<string, unknown> }): boolean =>
          isE2eTeamCommunicationMessage(message, {
            senderAgentRunId: senderRunId as string,
            recipientAgentRunId: recipientRunId as string,
            content: input.content,
          });
        await waitForTeamStreamEvent(
          (message) => streamMessages.indexOf(message) >= input.startIndex && isReceipt(message),
          `${input.recipientMemberName} real TEAM_COMMUNICATION_MESSAGE`,
        );
        const receipt = streamMessages.find((message) =>
          streamMessages.indexOf(message) >= input.startIndex && isReceipt(message));
        const receiptIndex = receipt ? streamMessages.indexOf(receipt) : -1;
        expect(receiptIndex).toBeGreaterThanOrEqual(input.startIndex);
        await waitForTeamStreamEvent(
          (message) => message.type === "TOOL_EXECUTION_SUCCEEDED" && isMatchingToolTerminal(message),
          `${input.senderMemberName} AGY call_mcp_tool success`,
        );
        await waitForTeamStreamEvent(
          (message) => streamMessages.indexOf(message) > receiptIndex &&
            message.type === "TURN_COMPLETED" && message.payload["agent_run_id"] === recipientRunId,
          `${input.recipientMemberName} response TURN_COMPLETED`,
        );
        expect(streamMessages.filter((message) => isMatchingMcpCall(message))).toHaveLength(1);
        expect(streamMessages.filter((message) => message.type === "TOOL_EXECUTION_SUCCEEDED" &&
          isMatchingToolTerminal(message))).toHaveLength(1);
        expect(streamMessages.filter((message) => message.type === "TOOL_EXECUTION_FAILED" &&
          isMatchingToolTerminal(message))).toHaveLength(0);
      };

      const activateMember = async (memberName: "ping" | "pong"): Promise<void> => {
        const agentRunId = memberRunIdByName.get(memberName);
        expect(agentRunId).toBeTruthy();
        const startIndex = streamMessages.length;
        sendTeamMessageOverSocket(teamSocket, {
          agentRunId: agentRunId as string,
          content: "Reply with exactly READY and nothing else.",
        });
        await waitForTeamStreamEvent(
          (message) =>
            streamMessages.indexOf(message) >= startIndex &&
            message.type === "TURN_COMPLETED" &&
            message.payload["agent_run_id"] === agentRunId,
          `${memberName} activation TURN_COMPLETED`,
        );
      };

      try {
        // Exact AgentRun targeting is supported only after the configured
        // recipient has a live runtime handle.
        await activateMember("ping");
        await activateMember("pong");
        const relayStartIndex = streamMessages.length;
        await sendRelayInstruction({
          targetMemberRouteKey: "ping",
          recipientName: "pong",
          content: `PING-TO-PONG ${pingToken}`,
          messageType: "roundtrip_ping",
        });
        await waitForSendMessageLifecycleAndReceipt({
          senderMemberName: "ping",
          recipientMemberName: "pong",
          content: `PING-TO-PONG ${pingToken}`,
          startIndex: relayStartIndex,
        });
        const waitForPersistedToken = async (memberName: "ping" | "pong"): Promise<void> => {
          const agentRunId = memberRunIdByName.get(memberName) as string;
          for (let attempt = 0; attempt < 120; attempt++) {
            const projection = await getTeamMemberRunViewProjectionService().getProjection(teamRunId, agentRunId);
            if (JSON.stringify(projection.conversation).includes(pingToken)) return;
            await wait(500);
          }
          throw new Error(`Missing persisted ${pingToken} in ${memberName} member projection`);
        };
        await waitForPersistedToken("ping");
        await waitForPersistedToken("pong");

        // A successful delivery is not enough to prove that the Team can
        // resume its exact AGY member bindings and continue on the same run.
        const beforeRestore = await execGraphql<{
          getTeamRunResumeConfig: { executionTree: Record<string, unknown> };
        }>(teamResumeQuery, { teamRunId });
        const boundBeforeRestore = flattenE2eConfiguredAgentExecutions(
          beforeRestore.getTeamRunResumeConfig.executionTree,
        );
        expect(boundBeforeRestore).toHaveLength(2);
        expect(boundBeforeRestore.every((member) =>
          member.runtimeKind === "antigravity_cli" &&
          member.workspaceRootPath === workspaceRootPath &&
          !!member.platformAgentRunId,
        )).toBe(true);

        const terminated = await execGraphql<{
          terminateAgentTeamRun: { success: boolean; message: string };
        }>(`mutation TerminateTeam($teamRunId: String!) {
          terminateAgentTeamRun(teamRunId: $teamRunId) { success message }
        }`, { teamRunId });
        expect(terminated.terminateAgentTeamRun.success).toBe(true);

        const restored = await execGraphql<{
          restoreAgentTeamRun: { success: boolean; message: string; teamRunId: string | null };
        }>(`mutation RestoreTeam($teamRunId: String!) {
          restoreAgentTeamRun(teamRunId: $teamRunId) { success message teamRunId }
        }`, { teamRunId });
        expect(restored.restoreAgentTeamRun).toMatchObject({
          success: true,
          teamRunId,
        });
        const afterRestore = await execGraphql<{
          getTeamRunResumeConfig: { executionTree: Record<string, unknown> };
        }>(teamResumeQuery, { teamRunId });
        expect(flattenE2eConfiguredAgentExecutions(
          afterRestore.getTeamRunResumeConfig.executionTree,
        )).toEqual(boundBeforeRestore);

        const continuationStartIndex = streamMessages.length;
        sendTeamMessageOverSocket(teamSocket, {
          agentRunId: memberRunIdByName.get("pong") as string,
          content: `After Team restore, reply with exactly ACK-RESTORED ${pingToken}.`,
        });
        await waitForTeamStreamEvent(
          (message) => streamMessages.indexOf(message) >= continuationStartIndex &&
            message.type === "TURN_COMPLETED" &&
            message.payload["agent_run_id"] === memberRunIdByName.get("pong"),
          "pong attributed post-restore TURN_COMPLETED",
        );
        let continuedConversation: unknown[] | null = null;
        for (let attempt = 0; attempt < 120; attempt++) {
          const projection = await getTeamMemberRunViewProjectionService().getProjection(
            teamRunId,
            memberRunIdByName.get("pong") as string,
          );
          if (JSON.stringify(projection.conversation).includes(`ACK-RESTORED ${pingToken}`)) {
            continuedConversation = projection.conversation;
            break;
          }
          await wait(500);
        }
        expect(continuedConversation).not.toBeNull();
      } finally {
        await closeSocket(teamSocket);
      }
    }, 300_000);

    it("launches direct and nested AGY Org members through GraphQL and streams exactly attributed turns", async () => {
      const unique = randomUUID();
      const modelIdentifier = await fetchPreferredAgyToolModelIdentifier();
      const workspaceRootPath = await mkdtemp(path.join(os.tmpdir(), "agy-org-runtime-e2e-"));
      createdWorkspaceRoots.add(workspaceRootPath);
      const instructions = `On a direct user request for a marker, reply with that exact marker and do not use tools.
On a request to relay to another Org member, use only the AutoByteus agent tools MCP call_mcp_tool with ServerName autobyteus_agent_tools and ToolName send_message_to and the exact supplied arguments; you may read the MCP schema first. Do not use shell/file tools.
On a teammate message, do not use tools; reply with exactly ACK.`;
      const createAgent = async (name: string): Promise<string> => {
        const result = await execGraphql<{ createAgentDefinition: { id: string } }>(
          `mutation($input: CreateAgentDefinitionInput!) { createAgentDefinition(input: $input) { id } }`,
          { input: { name: `agy-org-${name}-${unique}`, role: "assistant", description: "Live AGY Org member", instructions,
            toolNames: ["send_message_to"] } },
        );
        createdAgentDefinitionIds.add(result.createAgentDefinition.id);
        return result.createAgentDefinition.id;
      };
      const directorDefinitionId = await createAgent("director");
      const workerDefinitionId = await createAgent("worker");
      const team = await execGraphql<{ createAgentTeamDefinition: { id: string } }>(
        `mutation($input: CreateAgentTeamDefinitionInput!) { createAgentTeamDefinition(input: $input) { id } }`,
        { input: { name: `agy-org-team-${unique}`, description: "Live nested AGY team", instructions,
          coordinatorMemberName: "worker", nodes: [{ memberName: "worker", ref: workerDefinitionId, refScope: "SHARED" }] } },
      );
      const teamDefinitionId = team.createAgentTeamDefinition.id;
      createdTeamDefinitionIds.add(teamDefinitionId);
      const org = await execGraphql<{ createAgentOrgDefinition: { id: string } }>(
        `mutation($input: CreateAgentOrgDefinitionInput!) { createAgentOrgDefinition(input: $input) { id } }`,
        { input: { name: `agy-org-${unique}`, description: "Live AGY Org boundary", instructions,
          members: [
            { memberName: "director", ref: directorDefinitionId, refType: "AGENT", refScope: "SHARED" },
            { memberName: "team", ref: teamDefinitionId, refType: "AGENT_TEAM", refScope: "SHARED" },
          ], handoffs: [] } },
      );
      createdOrgDefinitionIds.add(org.createAgentOrgDefinition.id);
      const created = await execGraphql<{ createAgentOrgRun: { success: boolean; message: string; agentOrgRunId: string | null } }>(
        `mutation($input: CreateAgentOrgRunInput!) {
          createAgentOrgRun(input: $input) { success message agentOrgRunId }
        }`,
        { input: { agentOrgDefinitionId: org.createAgentOrgDefinition.id,
          rootConfiguration: { runtimeKind: "antigravity_cli", llmModelIdentifier: modelIdentifier,
            llmConfig: null, autoExecuteTools: true, skillAccessMode: "NONE", workspaceRootPath },
          agentOverrides: [], teamOverrides: [] } },
      );
      expect(created.createAgentOrgRun.success, created.createAgentOrgRun.message).toBe(true);
      const orgRunId = created.createAgentOrgRun.agentOrgRunId as string;
      expect(orgRunId).toBeTruthy();
      createdOrgRunIds.add(orgRunId);
      const config = await execGraphql<{ getAgentOrgRunConfig: { executionTree: Record<string, unknown> } }>(
        `query($orgRunId: String!) { getAgentOrgRunConfig(orgRunId: $orgRunId) { executionTree } }`,
        { orgRunId },
      );
      const tree = config.getAgentOrgRunConfig.executionTree as {
        rootOrg: { members: Array<Record<string, unknown>> };
      };
      const direct = tree.rootOrg.members.find((member) => member.address === "/director");
      const nestedTeam = tree.rootOrg.members.find((member) => member.address === "/team");
      const nested = (nestedTeam?.members as Array<Record<string, unknown>> | undefined)
        ?.find((member) => member.address === "/team/worker");
      expect(direct?.agentRunId).toEqual(expect.any(String));
      expect(nested?.agentRunId).toEqual(expect.any(String));
      expect(direct?.launchConfiguration).toMatchObject({ runtimeKind: "antigravity_cli", workspaceRootPath });
      expect(nested?.launchConfiguration).toMatchObject({ runtimeKind: "antigravity_cli", workspaceRootPath });

      const socket = new WebSocket(`ws://${runtimeServerUrl.hostname}:${runtimeServerUrl.port}/ws/agent-org/${orgRunId}`);
      const frames: Array<{ type: string; payload: Record<string, unknown> }> = [];
      socket.on("message", (raw: unknown) => {
        try {
          const parsed = JSON.parse(String(raw)) as { type: string; payload: Record<string, unknown> };
          frames.push(parsed);
        } catch { /* Ignore malformed frames only in the diagnostic capture. */ }
      });
      await waitForSocketOpen(socket);
      try {
        // The Org handler installs its command listener after publishing its
        // snapshot. A client command sent merely on TCP/WS open can race it.
        const readyDeadline = Date.now() + 15_000;
        while (Date.now() < readyDeadline &&
          !frames.some((frame) => frame.type === "ROOT_LIFECYCLE" && frame.payload.is_active === true)) {
          await wait(100);
        }
        expect(frames.some((frame) => frame.type === "CONNECTED" && frame.payload.root_run_id === orgRunId),
          JSON.stringify(frames)).toBe(true);
        expect(frames.some((frame) => frame.type === "ROOT_LIFECYCLE" && frame.payload.is_active === true),
          JSON.stringify(frames)).toBe(true);
        await wait(100);
        const memberMarkers: Array<{ address: string; runId: string; marker: string }> = [];
        for (const [address, runId] of [
          ["/director", direct?.agentRunId], ["/team/worker", nested?.agentRunId],
        ] as const) {
          const marker = `ORG-${address.replaceAll("/", "-")}-${unique}`;
          memberMarkers.push({ address, runId: runId as string, marker });
          const commandId = randomUUID();
          const start = frames.length;
          socket.send(JSON.stringify({ type: "SEND_MESSAGE", payload: {
            root_subject_kind: "agent_org", root_run_id: orgRunId,
            target_agent_run_id: runId, command_id: commandId,
            content: `Reply with exactly ${marker}.`, context_file_paths: [], image_urls: [],
            message_id: randomUUID(), dedupe_key: randomUUID(),
          } }));
          const deadline = Date.now() + 120_000;
          while (Date.now() < deadline) {
            const accepted = frames.slice(start).some((frame) => frame.type === "AGENT_COMMAND_ACK" &&
              frame.payload.command_id === commandId && frame.payload.state === "accepted");
            const attributed = frames.slice(start).some((frame) => {
              if (frame.type !== "ROOT_EXECUTION_EVENT") return false;
              const event = frame.payload.event as Record<string, unknown> | undefined;
              return frame.payload.root_run_id === orgRunId && event?.kind === "agent_presentation" &&
                event.member_address === address && event.agent_run_id === runId &&
                (event.message as Record<string, unknown> | undefined)?.type === "TURN_COMPLETED";
            });
            if (accepted && attributed) break;
            await wait(500);
          }
          expect(frames.slice(start).some((frame) => frame.type === "AGENT_COMMAND_ACK" &&
            frame.payload.command_id === commandId && frame.payload.state === "accepted"),
          JSON.stringify(frames.slice(start).slice(-10))).toBe(true);
          expect(frames.slice(start).some((frame) => {
            if (frame.type !== "ROOT_EXECUTION_EVENT") return false;
            const event = frame.payload.event as Record<string, unknown> | undefined;
            return frame.payload.root_run_id === orgRunId && event?.kind === "agent_presentation" &&
              event.member_address === address && event.agent_run_id === runId &&
              (event.message as Record<string, unknown> | undefined)?.type === "TURN_COMPLETED";
          }), JSON.stringify(frames.slice(start).slice(-10))).toBe(true);
        }

        const relayContent = `ORG-RELAY-${unique}`;
        const relayStart = frames.length;
        const relayCommandId = randomUUID();
        socket.send(JSON.stringify({ type: "SEND_MESSAGE", payload: {
          root_subject_kind: "agent_org", root_run_id: orgRunId,
          target_agent_run_id: direct?.agentRunId, command_id: relayCommandId,
          content: "Use AutoByteus call_mcp_tool ServerName autobyteus_agent_tools ToolName send_message_to " +
            `exactly once with arguments ${JSON.stringify({ recipient_address: "/team/worker", content: relayContent,
              message_type: "org_roundtrip" })}. Do not use unrelated tools.`,
          context_file_paths: [], image_urls: [], message_id: randomUUID(), dedupe_key: randomUUID(),
        } }));
        const relayDeadline = Date.now() + 120_000;
        while (Date.now() < relayDeadline) {
          const receipt = frames.slice(relayStart).find((frame) => {
            if (frame.type !== "ROOT_EXECUTION_EVENT") return false;
            const event = frame.payload.event as Record<string, unknown> | undefined;
            const message = event?.message as Record<string, unknown> | undefined;
            return frame.payload.root_run_id === orgRunId && event?.kind === "communication" &&
              message?.senderAgentRunId === direct?.agentRunId &&
              message?.receiverAgentRunId === nested?.agentRunId && message?.content === relayContent;
          });
          const workerTurn = frames.slice(relayStart).some((frame) => {
            if (frame.type !== "ROOT_EXECUTION_EVENT") return false;
            const event = frame.payload.event as Record<string, unknown> | undefined;
            return event?.kind === "agent_presentation" && event.member_address === "/team/worker" &&
              event.agent_run_id === nested?.agentRunId &&
              (event.message as Record<string, unknown> | undefined)?.type === "TURN_COMPLETED";
          });
          if (receipt && workerTurn) break;
          await wait(500);
        }
        expect(frames.slice(relayStart).some((frame) => frame.type === "AGENT_COMMAND_ACK" &&
          frame.payload.command_id === relayCommandId && frame.payload.state === "accepted")).toBe(true);
        const receipt = frames.slice(relayStart).find((frame) => {
          if (frame.type !== "ROOT_EXECUTION_EVENT") return false;
          const event = frame.payload.event as Record<string, unknown> | undefined;
          const message = event?.message as Record<string, unknown> | undefined;
          return frame.payload.root_run_id === orgRunId && event?.kind === "communication" &&
            message?.senderAgentRunId === direct?.agentRunId &&
            message?.receiverAgentRunId === nested?.agentRunId && message?.content === relayContent;
        });
        expect(receipt, JSON.stringify(frames.slice(relayStart).slice(-20))).toBeDefined();
        const findDirectorTool = (type: string, invocationId?: string) =>
          frames.slice(relayStart).find((frame) => {
            if (frame.type !== "ROOT_EXECUTION_EVENT") return false;
            const event = frame.payload.event as Record<string, unknown> | undefined;
            const message = event?.message as Record<string, unknown> | undefined;
            const payload = message?.payload as Record<string, unknown> | undefined;
            return event?.kind === "agent_presentation" && event.member_address === "/director" &&
              event.agent_run_id === direct?.agentRunId && message?.type === type &&
              payload?.tool_name === "call_mcp_tool" &&
              (invocationId ? payload.invocation_id === invocationId :
                JSON.stringify(payload.arguments).includes("send_message_to") &&
                JSON.stringify(payload.arguments).includes(relayContent));
          });
        const toolStart = findDirectorTool("TOOL_EXECUTION_STARTED");
        expect(toolStart, JSON.stringify(frames.slice(relayStart).slice(-20))).toBeDefined();
        const startedEvent = toolStart?.payload.event as Record<string, unknown> | undefined;
        const startedMessage = startedEvent?.message as Record<string, unknown> | undefined;
        const invocationId = (startedMessage?.payload as Record<string, unknown> | undefined)?.invocation_id;
        expect(typeof invocationId).toBe("string");
        expect(findDirectorTool("TOOL_EXECUTION_SUCCEEDED", invocationId as string)).toBeDefined();
        expect(frames.slice(relayStart).some((frame) => {
          if (frame.type !== "ROOT_EXECUTION_EVENT") return false;
          const event = frame.payload.event as Record<string, unknown> | undefined;
          return event?.kind === "agent_presentation" && event.member_address === "/team/worker" &&
            event.agent_run_id === nested?.agentRunId &&
            (event.message as Record<string, unknown> | undefined)?.type === "TURN_COMPLETED";
        }), JSON.stringify(frames.slice(relayStart).slice(-20))).toBe(true);

        for (const { address, runId, marker } of memberMarkers) {
          let outputFound = false;
          for (let attempt = 0; attempt < 120; attempt++) {
            const projectionQuery = `query($orgRunId: String!, $memberAddress: String!, $agentRunId: String!) {
              getAgentOrgMemberRunProjection(orgRunId: $orgRunId, memberAddress: $memberAddress, agentRunId: $agentRunId) {
                agentRunId memberAddress conversation
              }
            }`;
            const projectionVariables = { orgRunId, memberAddress: address, agentRunId: runId };
            const projection = await execGraphql<{ getAgentOrgMemberRunProjection: {
              agentRunId: string; memberAddress: string; conversation: unknown[];
            } }>(projectionQuery, projectionVariables);
            expect(projection.getAgentOrgMemberRunProjection).toMatchObject({ agentRunId: runId, memberAddress: address });
            if (JSON.stringify(projection.getAgentOrgMemberRunProjection.conversation).includes(marker)) {
              outputFound = true;
              break;
            }
            await wait(500);
          }
          expect(outputFound).toBe(true);
          const trace = await execGraphql<{ getAgentOrgMemberEventMonitorActiveTracePage: {
            events: Array<{ eventId: string; visuals: Array<{ kind: string; content?: string; text?: string }> }>;
            cursorStatus: string; activeGeneration: string;
          } }>(`query($orgRunId: String!, $memberAddress: String!, $agentRunId: String!) {
            getAgentOrgMemberEventMonitorActiveTracePage(
              orgRunId: $orgRunId, memberAddress: $memberAddress, agentRunId: $agentRunId
            ) {
              cursorStatus activeGeneration
              events { eventId visuals {
                ... on EventMonitorUserVisual { kind text }
                ... on EventMonitorAssistantTextVisual { kind content }
              } }
            }
          }`, { orgRunId, memberAddress: address, agentRunId: runId });
          expect(trace.getAgentOrgMemberEventMonitorActiveTracePage.cursorStatus).toBe("VALID");
          expect(trace.getAgentOrgMemberEventMonitorActiveTracePage.activeGeneration).toBeTruthy();
          expect(trace.getAgentOrgMemberEventMonitorActiveTracePage.events.length).toBeGreaterThan(0);
        }
        // A member TURN_COMPLETED can precede full root-level work settlement.
        // Restore coverage should stop a quiescent Org, not race an in-flight turn.
        let settled = false;
        for (let attempt = 0; attempt < 120; attempt++) {
          const checkpoint = await execGraphql<{ getAgentOrgExecutionCheckpoint: {
            orgRunId: string; hasOpenExecutionWork: boolean;
          } }>(`query($orgRunId: String!) {
            getAgentOrgExecutionCheckpoint(orgRunId: $orgRunId) { orgRunId hasOpenExecutionWork }
          }`, { orgRunId });
          expect(checkpoint.getAgentOrgExecutionCheckpoint.orgRunId).toBe(orgRunId);
          if (!checkpoint.getAgentOrgExecutionCheckpoint.hasOpenExecutionWork) {
            settled = true;
            break;
          }
          await wait(500);
        }
        expect(settled).toBe(true);
      } finally {
        await closeSocket(socket);
      }
      const beforeStop = await execGraphql<{ getAgentOrgRunConfig: { isActive: boolean } }>(
        `query($orgRunId: String!) { getAgentOrgRunConfig(orgRunId: $orgRunId) { isActive } }`,
        { orgRunId },
      );
      expect(beforeStop.getAgentOrgRunConfig.isActive).toBe(true);
      const stopped = await execGraphql<{ terminateAgentOrgRun: { success: boolean; message: string } }>(
        `mutation($agentOrgRunId: String!) {
          terminateAgentOrgRun(agentOrgRunId: $agentOrgRunId) { success message }
        }`, { agentOrgRunId: orgRunId },
      );
      expect(stopped.terminateAgentOrgRun.success, stopped.terminateAgentOrgRun.message).toBe(true);
      const restored = await execGraphql<{ restoreAgentOrgRun: {
        success: boolean; message: string; agentOrgRunId: string | null;
      } }>(`mutation($agentOrgRunId: String!) {
        restoreAgentOrgRun(agentOrgRunId: $agentOrgRunId) { success message agentOrgRunId }
      }`, { agentOrgRunId: orgRunId });
      expect(restored.restoreAgentOrgRun.success, restored.restoreAgentOrgRun.message).toBe(true);
      expect(restored.restoreAgentOrgRun.agentOrgRunId).toBe(orgRunId);
      const reloaded = await execGraphql<{ getAgentOrgRunConfig: { executionTree: Record<string, unknown> } }>(
        `query($orgRunId: String!) { getAgentOrgRunConfig(orgRunId: $orgRunId) { executionTree } }`,
        { orgRunId },
      );
      const restoredTree = reloaded.getAgentOrgRunConfig.executionTree as {
        rootOrg: { members: Array<Record<string, unknown>> };
      };
      const restoredDirector = restoredTree.rootOrg.members.find((member) => member.address === "/director");
      const restoredTeam = restoredTree.rootOrg.members.find((member) => member.address === "/team");
      const restoredWorker = (restoredTeam?.members as Array<Record<string, unknown>> | undefined)
        ?.find((member) => member.address === "/team/worker");
      expect(restoredDirector?.agentRunId).toBe(direct?.agentRunId);
      expect(restoredWorker?.agentRunId).toBe(nested?.agentRunId);
      for (const [address, runId] of [
        ["/director", direct?.agentRunId], ["/team/worker", nested?.agentRunId],
      ] as const) {
        const variables = { orgRunId, memberAddress: address, agentRunId: runId };
        const projection = await execGraphql<{ getAgentOrgMemberRunProjection: {
          agentRunId: string; memberAddress: string; conversation: unknown[];
        } }>(`query($orgRunId: String!, $memberAddress: String!, $agentRunId: String!) {
          getAgentOrgMemberRunProjection(orgRunId: $orgRunId, memberAddress: $memberAddress, agentRunId: $agentRunId) {
            agentRunId memberAddress conversation
          }
        }`, variables);
        expect(projection.getAgentOrgMemberRunProjection).toMatchObject({ agentRunId: runId, memberAddress: address });
        expect(JSON.stringify(projection.getAgentOrgMemberRunProjection.conversation))
          .toContain(`ORG-${address.replaceAll("/", "-")}-${unique}`);
        const trace = await execGraphql<{ getAgentOrgMemberEventMonitorActiveTracePage: {
          cursorStatus: string; events: Array<{ eventId: string }>;
        } }>(`query($orgRunId: String!, $memberAddress: String!, $agentRunId: String!) {
          getAgentOrgMemberEventMonitorActiveTracePage(
            orgRunId: $orgRunId, memberAddress: $memberAddress, agentRunId: $agentRunId
          ) { cursorStatus events { eventId } }
        }`, variables);
        expect(trace.getAgentOrgMemberEventMonitorActiveTracePage.cursorStatus).toBe("VALID");
        expect(trace.getAgentOrgMemberEventMonitorActiveTracePage.events.length).toBeGreaterThan(0);
      }
    }, 300_000);
  });
