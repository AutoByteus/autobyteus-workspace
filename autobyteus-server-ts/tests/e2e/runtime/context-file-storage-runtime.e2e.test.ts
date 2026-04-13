import "reflect-metadata";
import fsSync from "node:fs";
import path from "node:path";
import os from "node:os";
import { createRequire } from "node:module";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import fastify, { type FastifyInstance } from "fastify";
import multipart from "@fastify/multipart";
import websocket from "@fastify/websocket";
import WebSocket from "ws";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { graphql as graphqlFn, GraphQLSchema } from "graphql";
import { buildGraphqlSchema } from "../../../src/api/graphql/schema.js";
import { registerContextFileRoutes } from "../../../src/api/rest/context-files.js";
import { registerAgentWebsocket } from "../../../src/api/websocket/agent.js";
import { appConfigProvider } from "../../../src/config/app-config-provider.js";
import { ContextFileLocalPathResolver } from "../../../src/context-files/services/context-file-local-path-resolver.js";
import { ContextFileLayout } from "../../../src/context-files/store/context-file-layout.js";
import { loadAgentCustomizations } from "../../../src/startup/agent-customization-loader.js";

const DEFAULT_LMSTUDIO_TEXT_MODEL = "qwen/qwen3.5-35b-a3b";
const RED_PNG_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAIAAAAlC+aJAAAAS0lEQVR42u3PQQkAAAgAsetfWiP4FgYrsKZeS0BAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEDgsqnc8OJg6Ln3AAAAAElFTkSuQmCC";
const BLUE_PNG_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAIAAAAlC+aJAAAAS0lEQVR42u3PQQkAAAgAsetfWiP4FgYrsGqeExAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBA4LMf88OL0EKXAAAAAAElFTkSuQmCC";
const runLiveContextFileRuntimeE2e =
  process.env.RUN_LMSTUDIO_E2E === "1" ? describe : describe.skip;

const wait = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

const waitForSocketOpen = (socket: WebSocket, timeoutMs = 10_000): Promise<void> =>
  new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error("Timed out waiting for websocket open")),
      timeoutMs,
    );
    socket.once("open", () => {
      clearTimeout(timer);
      resolve();
    });
    socket.once("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
  });

type WsMessage = {
  type: string;
  payload: Record<string, unknown>;
};

type DiscoveredModel = {
  modelIdentifier: string;
  activeContextTokens?: number | null;
};

type UploadedAttachment = {
  storedFilename: string;
  displayName: string;
  locator: string;
  phase: "draft";
};

type FinalizedAttachment = {
  storedFilename: string;
  displayName: string;
  locator: string;
  phase: "final";
};

const parseWsMessage = (raw: WebSocket.RawData): WsMessage | null => {
  try {
    const parsed = JSON.parse(raw.toString()) as {
      type?: unknown;
      payload?: unknown;
    };
    if (typeof parsed.type !== "string") {
      return null;
    }
    const payload =
      parsed.payload && typeof parsed.payload === "object" && !Array.isArray(parsed.payload)
        ? (parsed.payload as Record<string, unknown>)
        : {};
    return {
      type: parsed.type,
      payload,
    };
  } catch {
    return null;
  }
};

const waitForMessage = async (
  messages: WsMessage[],
  predicate: (message: WsMessage) => boolean,
  label: string,
  timeoutMs = 150_000,
): Promise<WsMessage> => {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const match = messages.find(predicate);
    if (match) {
      return match;
    }
    await wait(250);
  }

  const preview = messages
    .slice(-25)
    .map((message) => `${message.type}:${JSON.stringify(message.payload).slice(0, 180)}`)
    .join(" | ");
  throw new Error(`Timed out waiting for websocket message '${label}'. preview='${preview}'`);
};

const waitForMessageAfter = async (
  messages: WsMessage[],
  startIndex: number,
  predicate: (message: WsMessage) => boolean,
  label: string,
  timeoutMs = 150_000,
): Promise<WsMessage> =>
  waitForMessage(
    messages,
    (message) => messages.indexOf(message) >= startIndex && predicate(message),
    label,
    timeoutMs,
  );

const assistantCompletedWithText = (message: WsMessage, agentName?: string): boolean => {
  if (agentName && message.payload.agent_name !== agentName) {
    return false;
  }

  if (message.type !== "ASSISTANT_COMPLETE") {
    return false;
  }

  const text =
    typeof message.payload.text === "string"
      ? message.payload.text
      : typeof message.payload.content === "string"
        ? message.payload.content
        : typeof message.payload.result === "string"
          ? message.payload.result
          : null;
  return typeof text === "string" && text.trim().length > 0;
};

const idleStatusMatches = (message: WsMessage, agentName?: string): boolean =>
  message.type === "AGENT_STATUS" &&
  message.payload.new_status === "IDLE" &&
  (!agentName || message.payload.agent_name === agentName);

const waitForWorkingContextImagePath = async (
  snapshotPath: string,
  expectedImagePath: string,
): Promise<void> => {
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    if (fsSync.existsSync(snapshotPath)) {
      try {
        const payload = JSON.parse(await readFile(snapshotPath, "utf-8")) as {
          messages?: Array<{
            role?: string;
            image_urls?: string[];
          }>;
        };
        const userMessage = [...(payload.messages ?? [])]
          .reverse()
          .find((message) => message.role === "user");
        const imageUrls = Array.isArray(userMessage?.image_urls) ? userMessage.image_urls : [];
        if (imageUrls.includes(expectedImagePath) && !imageUrls.some((url) => url.startsWith("/rest/"))) {
          return;
        }
      } catch {
        // retry until the snapshot is fully written
      }
    }
    await wait(250);
  }

  throw new Error(
    `Timed out waiting for working context snapshot '${snapshotPath}' to contain image path '${expectedImagePath}'.`,
  );
};

const chooseLmStudioModelIdentifier = (models: DiscoveredModel[]): string => {
  const exactOverride = process.env.LMSTUDIO_MODEL_ID?.trim();
  if (exactOverride && models.some((model) => model.modelIdentifier === exactOverride)) {
    return exactOverride;
  }

  const preferredFragment = process.env.LMSTUDIO_TARGET_TEXT_MODEL ?? DEFAULT_LMSTUDIO_TEXT_MODEL;
  const selected =
    models.find(
      (model) =>
        model.activeContextTokens !== null &&
        model.activeContextTokens !== undefined &&
        model.modelIdentifier.includes(preferredFragment),
    ) ??
    models.find(
      (model) =>
        model.activeContextTokens !== null &&
        model.activeContextTokens !== undefined &&
        !model.modelIdentifier.toLowerCase().includes("vl"),
    ) ??
    models.find((model) => model.modelIdentifier.includes(preferredFragment)) ??
    models.find((model) => !model.modelIdentifier.toLowerCase().includes("vl")) ??
    models[0];

  return selected?.modelIdentifier ?? preferredFragment;
};

const uploadDraftAttachment = async (
  httpOrigin: string,
  owner: Record<string, unknown>,
  input: {
    filename: string;
    mimeType: string;
    bytes: Uint8Array;
  },
): Promise<UploadedAttachment> => {
  const form = new FormData();
  form.set("owner", JSON.stringify(owner));
  form.set("file", new Blob([input.bytes], { type: input.mimeType }), input.filename);

  const response = await fetch(`${httpOrigin}/rest/context-files/upload`, {
    method: "POST",
    body: form,
  });
  const payload = await response.text();
  expect(response.status).toBe(200);
  return JSON.parse(payload) as UploadedAttachment;
};

const finalizeAttachment = async (
  httpOrigin: string,
  input: {
    draftOwner: Record<string, unknown>;
    finalOwner: Record<string, unknown>;
    attachment: UploadedAttachment;
  },
): Promise<FinalizedAttachment> => {
  const response = await fetch(`${httpOrigin}/rest/context-files/finalize`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({
      draftOwner: input.draftOwner,
      finalOwner: input.finalOwner,
      attachments: [
        {
          storedFilename: input.attachment.storedFilename,
          displayName: input.attachment.displayName,
        },
      ],
    }),
  });
  const payload = await response.text();
  expect(response.status).toBe(200);
  const parsed = JSON.parse(payload) as { attachments: FinalizedAttachment[] };
  expect(parsed.attachments).toHaveLength(1);
  return parsed.attachments[0]!;
};

const fetchAttachment = async (
  attachmentUrl: string,
  expectedMimeType: string,
): Promise<Response> => {
  const response = await fetch(attachmentUrl);
  expect(response.status).toBe(200);
  expect(response.headers.get("content-type")).toContain(expectedMimeType);
  return response;
};

const createApiApp = async (): Promise<{
  app: FastifyInstance;
  httpOrigin: string;
  wsOrigin: string;
}> => {
  const app = fastify();
  await app.register(multipart, {
    limits: {
      fileSize: 25 * 1024 * 1024,
    },
    throwFileSizeLimit: false,
  });
  await app.register(websocket);
  await app.register(registerContextFileRoutes, { prefix: "/rest" });
  await registerAgentWebsocket(app);

  const address = await app.listen({ port: 0, host: "127.0.0.1" });
  const url = new URL(address);
  return {
    app,
    httpOrigin: url.origin,
    wsOrigin: `ws://${url.host}`,
  };
};

runLiveContextFileRuntimeE2e(
  "Context-file storage backend-only runtime e2e (AutoByteus + LM Studio)",
  () => {
    let schema: GraphQLSchema;
    let graphql: typeof graphqlFn;
    let testDataDir: string | null = null;
    let previousParserEnv: string | undefined;
    const createdWorkspaceRoots = new Set<string>();

    beforeAll(async () => {
      previousParserEnv = process.env.AUTOBYTEUS_STREAM_PARSER;
      process.env.AUTOBYTEUS_STREAM_PARSER = "api_tool_call";
      testDataDir = await mkdtemp(path.join(os.tmpdir(), "context-file-storage-runtime-e2e-"));
      await writeFile(
        path.join(testDataDir, ".env"),
        "AUTOBYTEUS_SERVER_HOST=http://localhost:8000\nAPP_ENV=test\n",
        "utf-8",
      );
      appConfigProvider.config.setCustomAppDataDir(testDataDir);
      loadAgentCustomizations();
      schema = await buildGraphqlSchema();
      const require = createRequire(import.meta.url);
      const typeGraphqlRoot = path.dirname(require.resolve("type-graphql"));
      const graphqlPath = require.resolve("graphql", { paths: [typeGraphqlRoot] });
      const graphqlModule = await import(graphqlPath);
      graphql = graphqlModule.graphql as typeof graphqlFn;
    });

    afterAll(async () => {
      for (const workspaceRoot of createdWorkspaceRoots) {
        await rm(workspaceRoot, { recursive: true, force: true });
      }
      createdWorkspaceRoots.clear();

      if (testDataDir) {
        await rm(testDataDir, { recursive: true, force: true });
        testDataDir = null;
      }

      if (previousParserEnv === undefined) {
        delete process.env.AUTOBYTEUS_STREAM_PARSER;
      } else {
        process.env.AUTOBYTEUS_STREAM_PARSER = previousParserEnv;
      }
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

    const fetchModelIdentifier = async (): Promise<string> => {
      const query = `
        query Models($runtimeKind: String) {
          availableLlmProvidersWithModels(runtimeKind: $runtimeKind) {
            models {
              modelIdentifier
              activeContextTokens
            }
          }
        }
      `;

      const result = await execGraphql<{
        availableLlmProvidersWithModels: Array<{
          models: DiscoveredModel[];
        }>;
      }>(query, {
        runtimeKind: "autobyteus",
      });

      const models = result.availableLlmProvidersWithModels.flatMap((provider) => provider.models);
      if (models.length === 0) {
        throw new Error("No AutoByteus LM Studio model identifier was returned for context-file E2E.");
      }

      return chooseLmStudioModelIdentifier(models);
    };

    const createAgentDefinition = async (nameSuffix: string): Promise<string> => {
      const mutation = `
        mutation CreateAgentDefinition($input: CreateAgentDefinitionInput!) {
          createAgentDefinition(input: $input) {
            id
          }
        }
      `;

      const result = await execGraphql<{
        createAgentDefinition: { id: string };
      }>(mutation, {
        input: {
          name: `context-file-runtime-${nameSuffix}-${randomUUID()}`,
          role: "assistant",
          description: "Context-file runtime backend-only e2e agent",
          instructions:
            "Follow the user's request exactly. " +
            "When the user asks about an attached image, answer with exactly one lowercase word naming the dominant color in the image. " +
            "If the dominant color is red, reply red. If the dominant color is blue, reply blue. Otherwise reply other. " +
            "Do not use tools and do not add extra words.",
          category: "runtime-e2e",
          toolNames: [],
        },
      });

      return result.createAgentDefinition.id;
    };

    const createAgentRun = async (input: {
      agentDefinitionId: string;
      llmModelIdentifier: string;
      workspaceRootPath: string;
      llmConfig?: Record<string, unknown> | null;
    }): Promise<string> => {
      const mutation = `
        mutation CreateAgentRun($input: CreateAgentRunInput!) {
          createAgentRun(input: $input) {
            success
            message
            runId
          }
        }
      `;

      const result = await execGraphql<{
        createAgentRun: { success: boolean; message: string; runId: string | null };
      }>(mutation, {
        input: {
          agentDefinitionId: input.agentDefinitionId,
          workspaceRootPath: input.workspaceRootPath,
          llmModelIdentifier: input.llmModelIdentifier,
          autoExecuteTools: false,
          llmConfig: input.llmConfig ?? null,
          skillAccessMode: "NONE",
          runtimeKind: "autobyteus",
        },
      });

      expect(result.createAgentRun.success).toBe(true);
      expect(result.createAgentRun.runId).toBeTruthy();
      return result.createAgentRun.runId as string;
    };

    const terminateAgentRun = async (runId: string): Promise<void> => {
      const mutation = `
        mutation TerminateAgentRun($agentRunId: String!) {
          terminateAgentRun(agentRunId: $agentRunId) {
            success
            message
          }
        }
      `;

      const result = await execGraphql<{
        terminateAgentRun: { success: boolean; message: string };
      }>(mutation, { agentRunId: runId });

      expect(result.terminateAgentRun.success).toBe(true);
    };

    const createTeamDefinition = async (workerAgentDefinitionId: string): Promise<string> => {
      const mutation = `
        mutation CreateAgentTeamDefinition($input: CreateAgentTeamDefinitionInput!) {
          createAgentTeamDefinition(input: $input) {
            id
          }
        }
      `;

      const result = await execGraphql<{
        createAgentTeamDefinition: { id: string };
      }>(mutation, {
        input: {
          name: `context-file-runtime-team-${randomUUID()}`,
          description: "Context-file runtime backend-only e2e team",
          instructions: "Route the user's request to the worker.",
          coordinatorMemberName: "worker",
          nodes: [
            {
              memberName: "worker",
              ref: workerAgentDefinitionId,
              refType: "AGENT",
              refScope: "SHARED",
            },
          ],
        },
      });

      return result.createAgentTeamDefinition.id;
    };

    const createTeamRun = async (input: {
      teamDefinitionId: string;
      workerAgentDefinitionId: string;
      llmModelIdentifier: string;
      workspaceRootPath: string;
    }): Promise<string> => {
      const mutation = `
        mutation CreateAgentTeamRun($input: CreateAgentTeamRunInput!) {
          createAgentTeamRun(input: $input) {
            success
            message
            teamRunId
          }
        }
      `;

      const result = await execGraphql<{
        createAgentTeamRun: { success: boolean; message: string; teamRunId: string | null };
      }>(mutation, {
        input: {
          teamDefinitionId: input.teamDefinitionId,
          memberConfigs: [
            {
              memberName: "worker",
              agentDefinitionId: input.workerAgentDefinitionId,
              llmModelIdentifier: input.llmModelIdentifier,
              autoExecuteTools: false,
              llmConfig: null,
              skillAccessMode: "NONE",
              runtimeKind: "autobyteus",
              workspaceRootPath: input.workspaceRootPath,
            },
          ],
        },
      });

      expect(result.createAgentTeamRun.success).toBe(true);
      expect(result.createAgentTeamRun.teamRunId).toBeTruthy();
      return result.createAgentTeamRun.teamRunId as string;
    };

    const terminateTeamRun = async (teamRunId: string): Promise<void> => {
      const mutation = `
        mutation TerminateAgentTeamRun($teamRunId: String!) {
          terminateAgentTeamRun(teamRunId: $teamRunId) {
            success
            message
          }
        }
      `;

      const result = await execGraphql<{
        terminateAgentTeamRun: { success: boolean; message: string };
      }>(mutation, { teamRunId });

      expect(result.terminateAgentTeamRun.success).toBe(true);
    };

    it(
      "uploads, finalizes, serves, and delivers an agent-scoped stored image context file through the live runtime",
      async () => {
        const llmModelIdentifier = await fetchModelIdentifier();
        const workspaceRootPath = testDataDir as string;

        const agentDefinitionId = await createAgentDefinition("agent");
        const runId = await createAgentRun({
          agentDefinitionId,
          llmModelIdentifier,
          workspaceRootPath,
        });

        const apiApp = await createApiApp();
        const layout = new ContextFileLayout();
        const resolver = new ContextFileLocalPathResolver();
        const attachmentBytes = Buffer.from(RED_PNG_BASE64, "base64");
        const draftOwner = {
          kind: "agent_draft",
          draftRunId: runId,
        } as const;
        const finalOwner = {
          kind: "agent_final",
          runId,
        } as const;
        let socket: WebSocket | null = null;

        try {
          const uploaded = await uploadDraftAttachment(
            apiApp.httpOrigin,
            draftOwner,
            {
              filename: `agent-context-${randomUUID()}.png`,
              mimeType: "image/png",
              bytes: attachmentBytes,
            },
          );
          const finalized = await finalizeAttachment(apiApp.httpOrigin, {
            draftOwner,
            finalOwner,
            attachment: uploaded,
          });

          const finalAttachmentUrl = `${apiApp.httpOrigin}${finalized.locator}`;
          const finalAttachmentResponse = await fetchAttachment(finalAttachmentUrl, "image/png");
          const fetchedAttachmentBytes = Buffer.from(await finalAttachmentResponse.arrayBuffer());
          expect(fetchedAttachmentBytes.equals(attachmentBytes)).toBe(true);

          const finalFilePath = layout.getFinalFilePath(finalOwner, finalized.storedFilename);
          const workingContextSnapshotPath = path.join(
            path.dirname(path.dirname(finalFilePath)),
            "working_context_snapshot.json",
          );
          expect((await readFile(finalFilePath)).equals(attachmentBytes)).toBe(true);
          expect(fsSync.existsSync(layout.getDraftFilePath(draftOwner, finalized.storedFilename))).toBe(
            false,
          );
          expect(resolver.resolve(finalized.locator)).toBe(finalFilePath);

          socket = new WebSocket(`${apiApp.wsOrigin}/ws/agent/${runId}`);
          const messages: WsMessage[] = [];
          socket.on("message", (raw) => {
            const parsed = parseWsMessage(raw);
            if (parsed) {
              messages.push(parsed);
            }
          });

          await waitForSocketOpen(socket);
          await waitForMessage(messages, (message) => message.type === "CONNECTED", "CONNECTED", 15_000);

          const startIndex = messages.length;
          socket.send(
            JSON.stringify({
              type: "SEND_MESSAGE",
              payload: {
                content:
                  "What is the dominant color in the attached image? Reply with exactly one lowercase word.",
                context_file_paths: [finalized.locator],
              },
            }),
          );

          await waitForMessageAfter(
            messages,
            startIndex,
            (message) => assistantCompletedWithText(message),
            "assistant complete response with text",
          );
          await waitForMessageAfter(
            messages,
            startIndex,
            (message) => idleStatusMatches(message),
            "agent idle after image-context reply",
          );
          await waitForWorkingContextImagePath(workingContextSnapshotPath, finalFilePath);
        } finally {
          socket?.close();
          await apiApp.app.close();
          await terminateAgentRun(runId).catch(() => undefined);
        }
      },
      240_000,
    );

    it(
      "uploads, finalizes, serves, and delivers a team-member stored image context file through the live team runtime",
      async () => {
        const llmModelIdentifier = await fetchModelIdentifier();
        const workspaceRootPath = testDataDir as string;

        const workerAgentDefinitionId = await createAgentDefinition("team-worker");
        const teamDefinitionId = await createTeamDefinition(workerAgentDefinitionId);
        const teamRunId = await createTeamRun({
          teamDefinitionId,
          workerAgentDefinitionId,
          llmModelIdentifier,
          workspaceRootPath,
        });

        const apiApp = await createApiApp();
        const layout = new ContextFileLayout();
        const resolver = new ContextFileLocalPathResolver();
        const attachmentBytes = Buffer.from(BLUE_PNG_BASE64, "base64");
        const draftOwner = {
          kind: "team_member_draft",
          draftTeamRunId: teamRunId,
          memberRouteKey: "worker",
        } as const;
        const finalOwner = {
          kind: "team_member_final",
          teamRunId,
          memberRouteKey: "worker",
        } as const;
        let socket: WebSocket | null = null;

        try {
          const uploaded = await uploadDraftAttachment(
            apiApp.httpOrigin,
            draftOwner,
            {
              filename: `team-context-${randomUUID()}.png`,
              mimeType: "image/png",
              bytes: attachmentBytes,
            },
          );
          const finalized = await finalizeAttachment(apiApp.httpOrigin, {
            draftOwner,
            finalOwner,
            attachment: uploaded,
          });

          const finalAttachmentUrl = `${apiApp.httpOrigin}${finalized.locator}`;
          const finalAttachmentResponse = await fetchAttachment(finalAttachmentUrl, "image/png");
          const fetchedAttachmentBytes = Buffer.from(await finalAttachmentResponse.arrayBuffer());
          expect(fetchedAttachmentBytes.equals(attachmentBytes)).toBe(true);

          const finalFilePath = layout.getFinalFilePath(finalOwner, finalized.storedFilename);
          const workingContextSnapshotPath = path.join(
            path.dirname(path.dirname(finalFilePath)),
            "working_context_snapshot.json",
          );
          expect((await readFile(finalFilePath)).equals(attachmentBytes)).toBe(true);
          expect(fsSync.existsSync(layout.getDraftFilePath(draftOwner, finalized.storedFilename))).toBe(
            false,
          );
          expect(resolver.resolve(finalized.locator)).toBe(finalFilePath);

          socket = new WebSocket(`${apiApp.wsOrigin}/ws/agent-team/${teamRunId}`);
          const messages: WsMessage[] = [];
          socket.on("message", (raw) => {
            const parsed = parseWsMessage(raw);
            if (parsed) {
              messages.push(parsed);
            }
          });

          await waitForSocketOpen(socket);
          await waitForMessage(messages, (message) => message.type === "CONNECTED", "CONNECTED", 15_000);

          const startIndex = messages.length;
          socket.send(
            JSON.stringify({
              type: "SEND_MESSAGE",
              payload: {
                target_member_name: "worker",
                content:
                  "What is the dominant color in the attached image? Reply with exactly one lowercase word.",
                context_file_paths: [finalized.locator],
              },
            }),
          );

          await waitForMessageAfter(
            messages,
            startIndex,
            (message) => assistantCompletedWithText(message, "worker"),
            "team assistant complete response with text",
          );
          await waitForMessageAfter(
            messages,
            startIndex,
            (message) => idleStatusMatches(message, "worker"),
            "team worker idle after image-context reply",
          );
          await waitForWorkingContextImagePath(workingContextSnapshotPath, finalFilePath);
        } finally {
          socket?.close();
          await apiApp.app.close();
          await terminateTeamRun(teamRunId).catch(() => undefined);
        }
      },
      240_000,
    );
  },
);
