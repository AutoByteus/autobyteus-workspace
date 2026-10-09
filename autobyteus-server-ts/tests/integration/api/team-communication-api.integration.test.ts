import "reflect-metadata";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import fastify, { type FastifyInstance } from "fastify";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { createHash } from "node:crypto";
import { TeamRunExecutionTreeStore } from "../../../src/run-history/store/team-run-execution-tree-store.js";
import { TeamCommunicationV1Store } from "../../../src/services/team-communication/team-communication-v1-store.js";
import { testAgentNode, testExecutionTree } from "../../fixtures/current-team-run-fixtures.js";

const timestamp = "2026-04-12T10:00:00.000Z";

type GraphqlResponse<T> = {
  data?: T;
  errors?: Array<{ message?: string }>;
};

describe("Team communication API integration", () => {
  let app: FastifyInstance;
  let appDataDir: string;
  let workspaceRootPath: string;
  let originalServerHostEnv: string | undefined;
  let releaseOwnedRunManagers: (() => void) | null = null;

  const getMemoryDir = (): string => path.join(appDataDir, "memory");

  const getTeamDir = (teamRunId: string): string => path.join(getMemoryDir(), "agent_teams", teamRunId);

  /** Current Team package: execution tree with the two members plus the V1 communication messages. */
  const seedTeamCommunicationRun = async (input: {
    teamRunId: string;
    messageId: string;
    readableReferencePath: string;
    missingReferencePath: string;
    directoryReferencePath: string;
  }): Promise<void> => {
    const teamDir = getTeamDir(input.teamRunId);
    await new TeamRunExecutionTreeStore().write(teamDir, testExecutionTree({
      rootTeamRunId: input.teamRunId,
      rootTeamDefinitionId: "team-def-1",
      teamDefinitionName: "Team Communication Validation",
      coordinatorAddress: "/solution_designer",
      createdAt: timestamp,
      children: [
        testAgentNode("/solution_designer", { agentRunId: "sender-run-1", workspaceRootPath }),
        testAgentNode("/implementation_engineer", { agentRunId: "receiver-run-1", workspaceRootPath }),
      ],
    }));
    await new TeamCommunicationV1Store().write(teamDir, {
      schemaVersion: 1,
      rootTeamRunId: input.teamRunId,
      messages: [{
        messageId: input.messageId,
        senderAgentRunId: "sender-run-1",
        receiverAgentRunId: "receiver-run-1",
        content: `Please review the attached file at ${input.readableReferencePath}; it should stay plain text in message content.`,
        messageType: "handoff",
        createdAt: timestamp,
        referenceFiles: [input.readableReferencePath, input.missingReferencePath, input.directoryReferencePath],
      }],
    });
  };

  /** Reference IDs are derived from the owning message and the stored absolute path. */
  const referenceIdFor = (messageId: string, filePath: string): string =>
    createHash("sha256").update(`${messageId}\0${filePath}`).digest("hex");

  const seedLegacyFlatTeamCommunicationRun = async (teamRunId: string): Promise<void> => {
    const teamDir = getTeamDir(teamRunId);
    await fs.mkdir(teamDir, { recursive: true });
    await fs.writeFile(
      path.join(teamDir, "team_communication_messages.json"),
      JSON.stringify(
        {
          version: 1,
          messages: [
            {
              messageId: "legacy-message-1",
              teamRunId,
              senderRunId: "sender-run-1",
              senderMemberName: "Solution Designer",
              receiverRunId: "receiver-run-1",
              receiverMemberName: "Implementation Engineer",
              content: "This old flat row must not be hydrated by runtime fallback.",
              messageType: "handoff",
              createdAt: timestamp,
              updatedAt: timestamp,
              referenceFiles: [],
            },
          ],
        },
        null,
        2,
      ),
      "utf-8",
    );
  };

  const execGraphql = async <T>(query: string, variables: Record<string, unknown>): Promise<T> => {
    const response = await app.inject({
      method: "POST",
      url: "/graphql",
      payload: { query, variables },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json() as GraphqlResponse<T>;
    expect(body.errors).toBeUndefined();
    if (!body.data) {
      throw new Error("Expected GraphQL response data.");
    }
    return body.data;
  };

  beforeAll(async () => {
    originalServerHostEnv = process.env.AUTOBYTEUS_SERVER_HOST;
    appDataDir = await fs.mkdtemp(path.join(os.tmpdir(), "team-communication-api-appdata-"));
    workspaceRootPath = await fs.mkdtemp(path.join(os.tmpdir(), "team-communication-api-workspace-"));
    await fs.writeFile(
      path.join(appDataDir, ".env"),
      "AUTOBYTEUS_SERVER_HOST=http://localhost:8000\nAPP_ENV=test\n",
      "utf-8",
    );
    process.env.AUTOBYTEUS_SERVER_HOST = "http://localhost:8000";

    vi.resetModules();
    const { appConfigProvider } = await import("../../../src/config/app-config-provider.js");
    appConfigProvider.resetForTests();
    appConfigProvider.initialize({ appDataDir });

    // Server startup initializes the process run managers before routes resolve their services.
    const [{ AgentRunManager }, { AgentTeamRunManager }] = await Promise.all([
      import("../../../src/agent-execution/services/agent-run-manager.js"),
      import("../../../src/agent-team-execution/services/agent-team-run-manager.js"),
    ]);
    const ownedAgentRunManager = AgentRunManager.initializeProcessInstance({
      autoByteusBackendFactory: {} as never, codexBackendFactory: {} as never,
      claudeBackendFactory: {} as never, agyBackendFactory: {} as never, grokBackendFactory: {} as never,
      activationRegistry: { getActiveRun: () => null } as never,
      memoryRecorder: {} as never,
      providerInputNormalizer: { normalizeForProvider: (dispatch) => dispatch },
      agentToolMcpRunSessionDeactivator: {} as never,
    });
    const ownedTeamRunManager = AgentTeamRunManager.initializeProcessInstance({
      memoryDir: appConfigProvider.config.getMemoryDir(), flatTeamExecutionFactory: {} as never,
      memberExecutionContextBuilder: {} as never,
      taskExecutionIdentity: {
        agentRuns: { allocateForAgentDefinition: () => "unused-agent-run" },
        taskTeams: { create: () => "unused-task-team" },
      } as never,
      modelSelectionValidator: { validate: () => undefined } as never,
    });
    releaseOwnedRunManagers = () => {
      AgentTeamRunManager.releaseProcessInstance(ownedTeamRunManager);
      AgentRunManager.releaseProcessInstance(ownedAgentRunManager);
    };

    const [{ registerTeamCommunicationRoutes }, { registerGraphql }] = await Promise.all([
      import("../../../src/api/rest/team-communication.js"),
      import("../../../src/api/graphql/index.js"),
    ]);

    app = fastify();
    await registerTeamCommunicationRoutes(app);
    await registerGraphql(app);
  });

  afterAll(async () => {
    await app.close();
    releaseOwnedRunManagers?.();
    await Promise.all([
      fs.rm(appDataDir, { recursive: true, force: true }),
      fs.rm(workspaceRootPath, { recursive: true, force: true }),
    ]);
    if (originalServerHostEnv === undefined) {
      delete process.env.AUTOBYTEUS_SERVER_HOST;
    } else {
      process.env.AUTOBYTEUS_SERVER_HOST = originalServerHostEnv;
    }
  });

  it("hydrates historical messages through GraphQL and serves reference content through the message-owned REST route", async () => {
    const teamRunId = `team-comm-${Date.now()}`;
    const messageId = "message-1";
    const readableReferencePath = path.join(workspaceRootPath, "handoff.md");
    const missingReferencePath = path.join(workspaceRootPath, "deleted.md");
    const directoryReferencePath = path.join(workspaceRootPath, "directory-reference");
    await fs.mkdir(directoryReferencePath, { recursive: true });
    await fs.writeFile(readableReferencePath, "# Handoff\n\nValidation bytes", "utf-8");
    await seedTeamCommunicationRun({
      teamRunId,
      messageId,
      readableReferencePath,
      missingReferencePath,
      directoryReferencePath,
    });

    const data = await execGraphql<{
      getTeamCommunicationMessages: Array<{
        messageId: string;
        senderAgentRunId: string;
        receiverAgentRunId: string;
        content: string;
        messageType: string;
        referenceFiles: Array<{ referenceId: string; path: string; type: string }>;
      }>;
    }>(
      `query GetTeamCommunicationMessages($teamRunId: String!) {
        getTeamCommunicationMessages(teamRunId: $teamRunId) {
          messageId
          senderAgentRunId
          receiverAgentRunId
          content
          messageType
          referenceFiles {
            referenceId
            path
            type
          }
        }
      }`,
      { teamRunId },
    );

    expect(data.getTeamCommunicationMessages).toEqual([
      expect.objectContaining({
        messageId,
        senderAgentRunId: "sender-run-1",
        receiverAgentRunId: "receiver-run-1",
        messageType: "handoff",
        content: expect.stringContaining(readableReferencePath),
        referenceFiles: expect.arrayContaining([
          expect.objectContaining({ referenceId: referenceIdFor(messageId, readableReferencePath), path: readableReferencePath, type: "file" }),
          expect.objectContaining({ referenceId: referenceIdFor(messageId, missingReferencePath), path: missingReferencePath, type: "file" }),
        ]),
      }),
    ]);
    expect(data.getTeamCommunicationMessages[0]).not.toHaveProperty("teamRunId");
    expect(data.getTeamCommunicationMessages[0]).not.toHaveProperty("senderRunId");
    expect(data.getTeamCommunicationMessages[0]).not.toHaveProperty("receiverRunId");

    const legacyFieldResponse = await app.inject({
      method: "POST",
      url: "/graphql",
      payload: {
        query: `query LegacyTeamCommunicationFields($teamRunId: String!) {
          getTeamCommunicationMessages(teamRunId: $teamRunId) {
            senderRunId
          }
        }`,
        variables: { teamRunId },
      },
    });
    expect([200, 400]).toContain(legacyFieldResponse.statusCode);
    expect(
      (legacyFieldResponse.json() as GraphqlResponse<unknown>).errors?.[0]?.message,
    ).toContain("senderRunId");

    const contentResponse = await app.inject({
      method: "GET",
      url: `/team-runs/${encodeURIComponent(teamRunId)}/team-communication/messages/${encodeURIComponent(messageId)}/references/${referenceIdFor(messageId, readableReferencePath)}/content`,
    });

    expect(contentResponse.statusCode).toBe(200);
    expect(contentResponse.payload).toBe("# Handoff\n\nValidation bytes");
    expect(String(contentResponse.headers["content-type"])).toContain("text/markdown");
    expect(contentResponse.headers["cache-control"]).toBe("no-store");

    const missingResponse = await app.inject({
      method: "GET",
      url: `/team-runs/${encodeURIComponent(teamRunId)}/team-communication/messages/${encodeURIComponent(messageId)}/references/${referenceIdFor(messageId, missingReferencePath)}/content`,
    });
    expect(missingResponse.statusCode).toBe(404);
    expect(missingResponse.json()).toEqual(expect.objectContaining({ code: "REFERENCE_CONTENT_UNAVAILABLE" }));

    const directoryResponse = await app.inject({
      method: "GET",
      url: `/team-runs/${encodeURIComponent(teamRunId)}/team-communication/messages/${encodeURIComponent(messageId)}/references/${referenceIdFor(messageId, directoryReferencePath)}/content`,
    });
    expect(directoryResponse.statusCode).toBe(404);
    expect(directoryResponse.json()).toEqual(expect.objectContaining({ code: "REFERENCE_CONTENT_UNAVAILABLE" }));

    // A relative stored reference path is no longer a reachable state: the V1 message schema
    // accepts only normalized absolute paths when the package is read.

    const unknownReferenceResponse = await app.inject({
      method: "GET",
      url: `/team-runs/${encodeURIComponent(teamRunId)}/team-communication/messages/${encodeURIComponent(messageId)}/references/ref-unknown/content`,
    });
    expect(unknownReferenceResponse.statusCode).toBe(404);
    expect(unknownReferenceResponse.json()).toEqual(expect.objectContaining({ code: "REFERENCE_NOT_FOUND" }));
  });

  it("does not hydrate unmigrated old flat projections through a runtime compatibility fallback", async () => {
    const teamRunId = `team-legacy-flat-${Date.now()}`;
    await seedLegacyFlatTeamCommunicationRun(teamRunId);

    const response = await app.inject({
      method: "POST",
      url: "/graphql",
      payload: {
        query: `query GetTeamCommunicationMessages($teamRunId: String!) {
          getTeamCommunicationMessages(teamRunId: $teamRunId) {
            messageId
            senderAgentRunId
            receiverAgentRunId
          }
        }`,
        variables: { teamRunId },
      },
    });
    const body = response.json() as GraphqlResponse<{ getTeamCommunicationMessages: unknown[] | null }>;
    // The strict V1 reader rejects the old flat shape; nothing is hydrated through a fallback.
    expect(body.data?.getTeamCommunicationMessages ?? null).toBeNull();
    expect(body.errors?.[0]?.message).toContain("unsupported or missing field");
  });

  it("maps unreadable reference content failures to a graceful 403 REST response", async () => {
    const [{ registerTeamCommunicationRoutes }, { TeamCommunicationReferenceContentError }] = await Promise.all([
      import("../../../src/api/rest/team-communication.js"),
      import("../../../src/services/team-communication/team-communication-content-service.js"),
    ]);
    const routeApp = fastify();
    await registerTeamCommunicationRoutes(routeApp, {
      contentService: {
        resolveContent: async () => {
          throw new TeamCommunicationReferenceContentError(
            "REFERENCE_CONTENT_FORBIDDEN",
            "Referenced communication file content is not readable.",
          );
        },
      } as any,
    });

    try {
      const response = await routeApp.inject({
        method: "GET",
        url: "/team-runs/team-1/team-communication/messages/message-1/references/ref-unreadable/content",
      });

      expect(response.statusCode).toBe(403);
      expect(response.json()).toEqual({
        code: "REFERENCE_CONTENT_FORBIDDEN",
        detail: "Referenced communication file content is not readable.",
      });
    } finally {
      await routeApp.close();
    }
  });

});
