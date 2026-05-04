import "reflect-metadata";
import fs from "node:fs/promises";
import fsSync from "node:fs";
import os from "node:os";
import path from "node:path";
import fastify, { type FastifyInstance } from "fastify";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { SkillAccessMode } from "autobyteus-ts/agent/context/skill-access-mode.js";
import { AgentRun } from "../../../src/agent-execution/domain/agent-run.js";
import { AgentRunConfig } from "../../../src/agent-execution/domain/agent-run-config.js";
import { AgentRunContext } from "../../../src/agent-execution/domain/agent-run-context.js";
import {
  AgentRunEventType,
  type AgentRunEvent,
} from "../../../src/agent-execution/domain/agent-run-event.js";
import type { AgentOperationResult } from "../../../src/agent-execution/domain/agent-operation-result.js";
import type {
  AgentRunBackend,
  AgentRunEventListener,
  AgentRunEventUnsubscribe,
} from "../../../src/agent-execution/backends/agent-run-backend.js";
import { CodexTeamManager } from "../../../src/agent-team-execution/backends/codex/codex-team-manager.js";
import {
  CodexTeamMemberContext,
  CodexTeamRunContext,
} from "../../../src/agent-team-execution/backends/codex/codex-team-run-context.js";
import { MemberTeamContext } from "../../../src/agent-team-execution/domain/member-team-context.js";
import { TeamBackendKind } from "../../../src/agent-team-execution/domain/team-backend-kind.js";
import { TeamRunConfig } from "../../../src/agent-team-execution/domain/team-run-config.js";
import { TeamRunContext } from "../../../src/agent-team-execution/domain/team-run-context.js";
import {
  TeamRunEventSourceType,
  type TeamRunAgentEventPayload,
  type TeamRunEvent,
} from "../../../src/agent-team-execution/domain/team-run-event.js";
import { registerGraphql } from "../../../src/api/graphql/index.js";
import { registerMessageFileReferenceRoutes } from "../../../src/api/rest/message-file-references.js";
import { appConfigProvider } from "../../../src/config/app-config-provider.js";
import { RuntimeKind } from "../../../src/runtime-management/runtime-kind-enum.js";
import { TeamMemberMemoryLayout } from "../../../src/agent-memory/store/team-member-memory-layout.js";
import { TeamRunMetadataService } from "../../../src/run-history/services/team-run-metadata-service.js";
import { MessageFileReferenceProjectionStore } from "../../../src/services/message-file-references/message-file-reference-projection-store.js";
import {
  MessageFileReferenceContentError,
  MessageFileReferenceContentService,
} from "../../../src/services/message-file-references/message-file-reference-content-service.js";
import { MessageFileReferenceProjectionService } from "../../../src/services/message-file-references/message-file-reference-projection-service.js";
import { MessageFileReferenceService } from "../../../src/services/message-file-references/message-file-reference-service.js";
import { buildMessageFileReferenceId } from "../../../src/services/message-file-references/message-file-reference-identity.js";
import type { MessageFileReferenceEntry } from "../../../src/services/message-file-references/message-file-reference-types.js";

const timestamp = "2026-05-04T10:00:00.000Z";

const waitForCondition = async (
  predicate: () => Promise<boolean> | boolean,
  label: string,
  timeoutMs = 2_000,
): Promise<void> => {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await predicate()) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
  throw new Error(`Timed out waiting for ${label}`);
};

const buildAgentRunConfig = (agentDefinitionId: string): AgentRunConfig =>
  new AgentRunConfig({
    agentDefinitionId,
    llmModelIdentifier: "model-1",
    autoExecuteTools: true,
    skillAccessMode: SkillAccessMode.NONE,
    runtimeKind: RuntimeKind.CODEX_APP_SERVER,
  });

class AcceptingAgentRunBackend implements AgentRunBackend {
  readonly runtimeKind = RuntimeKind.CODEX_APP_SERVER;
  readonly postedMessages: Array<{ content: string; metadata: unknown }> = [];
  private readonly context: AgentRunContext<null>;

  constructor(
    readonly runId: string,
    config: AgentRunConfig,
  ) {
    this.context = new AgentRunContext({
      runId,
      config,
      runtimeContext: null,
    });
  }

  getContext(): AgentRunContext<null> {
    return this.context;
  }

  isActive(): boolean {
    return true;
  }

  getPlatformAgentRunId(): string | null {
    return `thread-${this.runId}`;
  }

  getStatus(): string | null {
    return "IDLE";
  }

  subscribeToEvents(_listener: AgentRunEventListener): AgentRunEventUnsubscribe {
    return () => {};
  }

  async postUserMessage(message: { content: string; metadata?: unknown }): Promise<AgentOperationResult> {
    this.postedMessages.push({
      content: message.content,
      metadata: message.metadata ?? null,
    });
    return {
      accepted: true,
      platformAgentRunId: this.getPlatformAgentRunId(),
    };
  }

  async approveToolInvocation(): Promise<AgentOperationResult> {
    return { accepted: true };
  }

  async interrupt(): Promise<AgentOperationResult> {
    return { accepted: true };
  }

  async terminate(): Promise<AgentOperationResult> {
    return { accepted: true };
  }
}

class FakeAgentRunManager {
  readonly backendsByRunId = new Map<string, AcceptingAgentRunBackend>();

  async createAgentRun(config: AgentRunConfig, preferredRunId: string | null = null): Promise<AgentRun> {
    const runId = preferredRunId ?? `run-${this.backendsByRunId.size + 1}`;
    const backend = new AcceptingAgentRunBackend(runId, config);
    this.backendsByRunId.set(runId, backend);
    return new AgentRun({
      context: backend.getContext(),
      backend,
    });
  }

  async restoreAgentRun(context: AgentRunContext<null>): Promise<AgentRun> {
    const backend = new AcceptingAgentRunBackend(context.runId, context.config);
    this.backendsByRunId.set(context.runId, backend);
    return new AgentRun({
      context: backend.getContext(),
      backend,
    });
  }
}

const createTeamManager = (teamRunId: string): {
  manager: CodexTeamManager;
  agentRunManager: FakeAgentRunManager;
} => {
  const senderConfig = buildAgentRunConfig("sender-agent-def");
  const receiverConfig = buildAgentRunConfig("receiver-agent-def");
  const teamConfig = new TeamRunConfig({
    teamDefinitionId: "message-reference-team-def",
    teamBackendKind: TeamBackendKind.CODEX_APP_SERVER,
    coordinatorMemberName: "sender",
    memberConfigs: [
      {
        memberName: "sender",
        memberRouteKey: "sender",
        memberRunId: "sender-run-1",
        agentDefinitionId: senderConfig.agentDefinitionId,
        llmModelIdentifier: senderConfig.llmModelIdentifier,
        autoExecuteTools: senderConfig.autoExecuteTools,
        skillAccessMode: senderConfig.skillAccessMode,
        runtimeKind: senderConfig.runtimeKind,
      },
      {
        memberName: "receiver",
        memberRouteKey: "receiver",
        memberRunId: "receiver-run-1",
        agentDefinitionId: receiverConfig.agentDefinitionId,
        llmModelIdentifier: receiverConfig.llmModelIdentifier,
        autoExecuteTools: receiverConfig.autoExecuteTools,
        skillAccessMode: receiverConfig.skillAccessMode,
        runtimeKind: receiverConfig.runtimeKind,
      },
    ],
  });
  const context = new TeamRunContext({
    runId: teamRunId,
    teamBackendKind: TeamBackendKind.CODEX_APP_SERVER,
    coordinatorMemberName: "sender",
    config: teamConfig,
    runtimeContext: new CodexTeamRunContext({
      coordinatorMemberRouteKey: "sender",
      memberContexts: [
        new CodexTeamMemberContext({
          memberName: "sender",
          memberRouteKey: "sender",
          memberRunId: "sender-run-1",
          agentRunConfig: senderConfig,
          threadId: null,
        }),
        new CodexTeamMemberContext({
          memberName: "receiver",
          memberRouteKey: "receiver",
          memberRunId: "receiver-run-1",
          agentRunConfig: receiverConfig,
          threadId: null,
        }),
      ],
    }),
  });
  const agentRunManager = new FakeAgentRunManager();
  const memberTeamContextBuilder = {
    build: async (input: {
      teamRunId: string;
      teamDefinitionId: string;
      teamBackendKind: TeamBackendKind;
      currentMemberName: string;
      currentMemberRouteKey: string;
      currentMemberRunId: string;
      members: Array<{ memberName: string; memberRouteKey: string; memberRunId: string; runtimeKind: RuntimeKind }>;
      deliverInterAgentMessage: MemberTeamContext["deliverInterAgentMessage"];
    }) =>
      new MemberTeamContext({
        teamRunId: input.teamRunId,
        teamDefinitionId: input.teamDefinitionId,
        teamBackendKind: input.teamBackendKind,
        memberName: input.currentMemberName,
        memberRouteKey: input.currentMemberRouteKey,
        memberRunId: input.currentMemberRunId,
        members: input.members.map((member) => ({
          ...member,
          role: null,
          description: null,
        })),
        allowedRecipientNames: input.members.map((member) => member.memberName),
        sendMessageToEnabled: true,
        deliverInterAgentMessage: input.deliverInterAgentMessage,
      }),
  };

  return {
    manager: new CodexTeamManager(context, {
      agentRunManager: agentRunManager as any,
      memberTeamContextBuilder: memberTeamContextBuilder as any,
    }),
    agentRunManager,
  };
};

const buildEntry = (overrides: Partial<MessageFileReferenceEntry> & { referenceId: string; path: string }): MessageFileReferenceEntry => ({
  referenceId: overrides.referenceId,
  teamRunId: overrides.teamRunId ?? "team-errors",
  senderRunId: overrides.senderRunId ?? "sender-errors",
  senderMemberName: overrides.senderMemberName ?? "sender",
  receiverRunId: overrides.receiverRunId ?? "receiver-errors",
  receiverMemberName: overrides.receiverMemberName ?? "receiver",
  messageType: overrides.messageType ?? "handoff",
  path: overrides.path,
  type: overrides.type ?? "file",
  createdAt: overrides.createdAt ?? timestamp,
  updatedAt: overrides.updatedAt ?? timestamp,
});

describe("Message file references API integration", () => {
  let app: FastifyInstance;
  let appDataDir: string;
  let workspaceRootPath: string;
  let originalServerHostEnv: string | undefined;
  let originalMemoryDirEnv: string | undefined;
  let metadataService: TeamRunMetadataService;
  let projectionStore: MessageFileReferenceProjectionStore;
  let teamLayout: TeamMemberMemoryLayout;
  let activeTeamRunForContent: { runId: string; subscribeToEvents: (listener: (event: TeamRunEvent) => void) => () => void } | null = null;

  const getMemoryDir = (): string => path.join(appDataDir, "memory");

  const writeTeamMetadata = async (
    teamRunId: string,
    members: Array<{ memberRouteKey: string; memberName: string; memberRunId: string }>,
  ): Promise<void> => {
    await metadataService.writeMetadata(teamRunId, {
      teamRunId,
      teamDefinitionId: "message-reference-team-def",
      teamDefinitionName: "Message reference validation team",
      coordinatorMemberRouteKey: members[0]?.memberRouteKey ?? "sender",
      runVersion: 1,
      createdAt: timestamp,
      updatedAt: timestamp,
      memberMetadata: members.map((member) => ({
        ...member,
        runtimeKind: RuntimeKind.CODEX_APP_SERVER,
        platformAgentRunId: null,
        agentDefinitionId: `${member.memberRouteKey}-agent-def`,
        llmModelIdentifier: "model-1",
        autoExecuteTools: true,
        skillAccessMode: SkillAccessMode.NONE,
        llmConfig: null,
        workspaceRootPath,
        applicationExecutionContext: null,
      })),
    });
  };

  const execGraphql = async <T>(query: string, variables: Record<string, unknown>): Promise<T> => {
    const response = await app.inject({
      method: "POST",
      url: "/graphql",
      payload: {
        query,
        variables,
      },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json() as { data?: T; errors?: Array<{ message?: string }> };
    expect(body.errors).toBeUndefined();
    if (!body.data) {
      throw new Error("Expected GraphQL response data.");
    }
    return body.data;
  };

  beforeAll(async () => {
    originalServerHostEnv = process.env.AUTOBYTEUS_SERVER_HOST;
    originalMemoryDirEnv = process.env.AUTOBYTEUS_MEMORY_DIR;
    appDataDir = await fs.mkdtemp(path.join(os.tmpdir(), "message-file-references-appdata-"));
    workspaceRootPath = await fs.mkdtemp(path.join(os.tmpdir(), "message-file-references-workspace-"));
    await fs.writeFile(
      path.join(appDataDir, ".env"),
      "AUTOBYTEUS_SERVER_HOST=http://localhost:8000\nAPP_ENV=test\n",
      "utf-8",
    );

    appConfigProvider.resetForTests();
    process.env.AUTOBYTEUS_SERVER_HOST = "http://localhost:8000";
    delete process.env.AUTOBYTEUS_MEMORY_DIR;
    appConfigProvider.initialize({ appDataDir });
    appConfigProvider.config.initialize();

    metadataService = new TeamRunMetadataService(getMemoryDir());
    projectionStore = new MessageFileReferenceProjectionStore();
    teamLayout = new TeamMemberMemoryLayout(getMemoryDir());

    const activeReferenceService = new MessageFileReferenceService({
      memoryDir: getMemoryDir(),
    });
    const projectionService = new MessageFileReferenceProjectionService({
      teamRunManager: {
        getTeamRun: (teamRunId: string) =>
          activeTeamRunForContent?.runId === teamRunId ? activeTeamRunForContent : null,
      } as any,
      metadataService,
      projectionStore,
      activeReferenceService,
      memoryDir: getMemoryDir(),
    });

    app = fastify();
    await registerMessageFileReferenceRoutes(app, {
      contentService: new MessageFileReferenceContentService(projectionService),
    });
    await registerGraphql(app);

    (app as any).activeReferenceService = activeReferenceService;
  });

  afterAll(async () => {
    await app.close();
    await Promise.all([
      fs.rm(appDataDir, { recursive: true, force: true }),
      fs.rm(workspaceRootPath, { recursive: true, force: true }),
    ]);
    appConfigProvider.resetForTests();
    if (originalServerHostEnv === undefined) {
      delete process.env.AUTOBYTEUS_SERVER_HOST;
    } else {
      process.env.AUTOBYTEUS_SERVER_HOST = originalServerHostEnv;
    }
    if (originalMemoryDirEnv === undefined) {
      delete process.env.AUTOBYTEUS_MEMORY_DIR;
    } else {
      process.env.AUTOBYTEUS_MEMORY_DIR = originalMemoryDirEnv;
    }
  });

  it("derives, streams, persists, dedupes, hydrates, and serves team-level references from accepted inter-agent messages", async () => {
    const teamRunId = "team-accepted-1";
    const referencedFilePath = path.join(workspaceRootPath, "handoff", "accepted-report.md");
    await fs.mkdir(path.dirname(referencedFilePath), { recursive: true });
    await fs.writeFile(referencedFilePath, "# Accepted referenced report", "utf-8");
    await writeTeamMetadata(teamRunId, [
      { memberRouteKey: "sender", memberName: "sender", memberRunId: "sender-run-1" },
      { memberRouteKey: "receiver", memberName: "receiver", memberRunId: "receiver-run-1" },
    ]);

    const { manager, agentRunManager } = createTeamManager(teamRunId);
    const capturedEvents: TeamRunEvent[] = [];
    const unsubscribeCapture = manager.subscribeToEvents((event) => {
      capturedEvents.push(event);
    });
    activeTeamRunForContent = {
      runId: teamRunId,
      subscribeToEvents: manager.subscribeToEvents.bind(manager),
    };
    const unsubscribeProjection = (app as any).activeReferenceService.attachToTeamRun(
      activeTeamRunForContent as any,
    );

    const deliver = async (messageType: string): Promise<AgentRunEvent[]> => {
      const result = await manager.deliverInterAgentMessage({
        teamRunId,
        senderRunId: "sender-run-1",
        senderMemberName: "sender",
        recipientMemberName: "receiver",
        messageType,
        content: `Please review **${referencedFilePath}** before delivery. Raw text must stay plain.`,
      });
      expect(result).toMatchObject({
        accepted: true,
        memberRunId: "receiver-run-1",
        memberName: "receiver",
      });
      return capturedEvents
        .filter((event) => event.eventSourceType === TeamRunEventSourceType.AGENT)
        .map((event) => (event.data as TeamRunAgentEventPayload).agentEvent);
    };

    const firstAgentEvents = await deliver("handoff");
    expect(agentRunManager.backendsByRunId.get("receiver-run-1")?.postedMessages[0]?.content).toContain(
      `message:\nPlease review **${referencedFilePath}**`,
    );

    expect(firstAgentEvents.map((event) => event.eventType)).toEqual([
      AgentRunEventType.INTER_AGENT_MESSAGE,
      AgentRunEventType.MESSAGE_FILE_REFERENCE_DECLARED,
    ]);
    expect(firstAgentEvents[0]).toMatchObject<Partial<AgentRunEvent>>({
      eventType: AgentRunEventType.INTER_AGENT_MESSAGE,
      runId: "receiver-run-1",
      payload: {
        team_run_id: teamRunId,
        receiver_run_id: "receiver-run-1",
        sender_agent_id: "sender-run-1",
        sender_agent_name: "sender",
        receiver_agent_name: "receiver",
        recipient_role_name: "receiver",
        content: `Please review **${referencedFilePath}** before delivery. Raw text must stay plain.`,
        message_type: "handoff",
      },
    });

    const expectedReferenceId = buildMessageFileReferenceId({
      teamRunId,
      senderRunId: "sender-run-1",
      receiverRunId: "receiver-run-1",
      path: referencedFilePath,
    });
    expect(firstAgentEvents[1]).toMatchObject<Partial<AgentRunEvent>>({
      eventType: AgentRunEventType.MESSAGE_FILE_REFERENCE_DECLARED,
      runId: "receiver-run-1",
      payload: {
        referenceId: expectedReferenceId,
        teamRunId,
        senderRunId: "sender-run-1",
        senderMemberName: "sender",
        receiverRunId: "receiver-run-1",
        receiverMemberName: "receiver",
        path: referencedFilePath,
        type: "file",
        messageType: "handoff",
      },
    });

    const immediateResponse = await app.inject({
      method: "GET",
      url: `/team-runs/${encodeURIComponent(teamRunId)}/message-file-references/${encodeURIComponent(expectedReferenceId)}/content`,
    });
    expect(immediateResponse.statusCode).toBe(200);
    expect(immediateResponse.payload).toBe("# Accepted referenced report");

    const projectionPath = path.join(
      teamLayout.getTeamDirPath(teamRunId),
      "message_file_references.json",
    );
    await waitForCondition(
      () => fsSync.existsSync(projectionPath),
      "team-level message reference projection persistence",
    );
    expect(fsSync.existsSync(
      path.join(teamLayout.getMemberDirPath(teamRunId, "receiver-run-1"), "message_file_references.json"),
    )).toBe(false);

    const firstProjection = JSON.parse(await fs.readFile(projectionPath, "utf-8"));
    const firstEntry = firstProjection.entries[0] as MessageFileReferenceEntry;
    expect(firstProjection.entries).toEqual([
      expect.objectContaining({
        referenceId: expectedReferenceId,
        teamRunId,
        senderRunId: "sender-run-1",
        receiverRunId: "receiver-run-1",
        messageType: "handoff",
        path: referencedFilePath,
      }),
    ]);

    await new Promise((resolve) => setTimeout(resolve, 15));
    capturedEvents.length = 0;
    await deliver("revision");

    await waitForCondition(async () => {
      const parsed = JSON.parse(await fs.readFile(projectionPath, "utf-8"));
      return parsed.entries.length === 1 && parsed.entries[0].messageType === "revision";
    }, "deduped projection update");

    const dedupedProjection = JSON.parse(await fs.readFile(projectionPath, "utf-8"));
    expect(dedupedProjection.entries).toHaveLength(1);
    expect(dedupedProjection.entries[0]).toMatchObject({
      referenceId: expectedReferenceId,
      createdAt: firstEntry.createdAt,
      messageType: "revision",
    });
    expect(dedupedProjection.entries[0].updatedAt >= firstEntry.updatedAt).toBe(true);

    activeTeamRunForContent = null;
    unsubscribeProjection();

    const data = await execGraphql<{
      getMessageFileReferences: Array<{
        referenceId: string;
        path: string;
        senderMemberName: string | null;
        receiverMemberName: string | null;
        messageType: string;
      }>;
    }>(
      `query GetMessageFileReferences($teamRunId: String!) {
        getMessageFileReferences(teamRunId: $teamRunId) {
          referenceId
          path
          senderMemberName
          receiverMemberName
          messageType
        }
      }`,
      { teamRunId },
    );

    expect(data.getMessageFileReferences).toEqual([
      expect.objectContaining({
        referenceId: expectedReferenceId,
        path: referencedFilePath,
        senderMemberName: "sender",
        receiverMemberName: "receiver",
        messageType: "revision",
      }),
    ]);

    const historicalResponse = await app.inject({
      method: "GET",
      url: `/team-runs/${encodeURIComponent(teamRunId)}/message-file-references/${encodeURIComponent(expectedReferenceId)}/content`,
    });

    expect(historicalResponse.statusCode).toBe(200);
    expect(historicalResponse.payload).toBe("# Accepted referenced report");
    expect(String(historicalResponse.headers["content-type"])).toContain("text/markdown");
    expect(historicalResponse.headers["cache-control"]).toBe("no-store");

    unsubscribeCapture();
  });

  it("returns graceful status codes for missing, directory, invalid, forbidden, and unreadable team-level reference content cases", async () => {
    const teamRunId = "team-errors";
    const directoryPath = path.join(workspaceRootPath, "directory-reference");
    const unreadablePath = path.join(workspaceRootPath, "unreadable-reference.md");
    await fs.mkdir(directoryPath, { recursive: true });
    await fs.writeFile(unreadablePath, "private", "utf-8");
    await writeTeamMetadata(teamRunId, [
      { memberRouteKey: "sender", memberName: "sender", memberRunId: "sender-errors" },
      { memberRouteKey: "receiver", memberName: "receiver", memberRunId: "receiver-errors" },
    ]);
    await projectionStore.writeProjection(
      teamLayout.getTeamDirPath(teamRunId),
      {
        version: 1,
        entries: [
          buildEntry({ referenceId: "ref-missing-file", teamRunId, path: path.join(workspaceRootPath, "missing.md") }),
          buildEntry({ referenceId: "ref-directory", teamRunId, path: directoryPath }),
          buildEntry({ referenceId: "ref-invalid", teamRunId, path: "relative/report.md" }),
          buildEntry({ referenceId: "ref-unreadable", teamRunId, path: unreadablePath }),
        ],
      },
    );

    const missingReference = await app.inject({
      method: "GET",
      url: `/team-runs/${teamRunId}/message-file-references/ref-does-not-exist/content`,
    });
    expect(missingReference.statusCode).toBe(404);
    expect(missingReference.json()).toEqual({ detail: "Message file reference was not found." });

    const missingFile = await app.inject({
      method: "GET",
      url: `/team-runs/${teamRunId}/message-file-references/ref-missing-file/content`,
    });
    expect(missingFile.statusCode).toBe(404);
    expect(missingFile.json()).toEqual({ detail: "Referenced artifact content is not available." });

    const directory = await app.inject({
      method: "GET",
      url: `/team-runs/${teamRunId}/message-file-references/ref-directory/content`,
    });
    expect(directory.statusCode).toBe(404);
    expect(directory.json()).toEqual({ detail: "Referenced artifact content is not available." });

    const invalid = await app.inject({
      method: "GET",
      url: `/team-runs/${teamRunId}/message-file-references/ref-invalid/content`,
    });
    expect(invalid.statusCode).toBe(400);
    expect(invalid.json()).toEqual({ detail: "Stored message file reference path is invalid." });

    await fs.chmod(unreadablePath, 0o000);
    try {
      await fs.access(unreadablePath, fsSync.constants.R_OK).then(
        () => undefined,
        async () => {
          const unreadable = await app.inject({
            method: "GET",
            url: `/team-runs/${teamRunId}/message-file-references/ref-unreadable/content`,
          });
          expect(unreadable.statusCode).toBe(403);
          expect(unreadable.json()).toEqual({ detail: "Referenced artifact content is not readable." });
        },
      );
    } finally {
      await fs.chmod(unreadablePath, 0o600);
    }

    const forbiddenApp = fastify();
    await registerMessageFileReferenceRoutes(forbiddenApp, {
      contentService: {
        resolveContent: async () => {
          throw new MessageFileReferenceContentError(
            "REFERENCE_CONTENT_FORBIDDEN",
            "Referenced artifact content is not readable.",
          );
        },
      } as any,
    });
    const forbidden = await forbiddenApp.inject({
      method: "GET",
      url: "/team-runs/team/message-file-references/ref/content",
    });
    expect(forbidden.statusCode).toBe(403);
    expect(forbidden.json()).toEqual({ detail: "Referenced artifact content is not readable." });
    await forbiddenApp.close();
  });
});
