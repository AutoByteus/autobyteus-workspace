import "reflect-metadata";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import fastify, { type FastifyInstance } from "fastify";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { SkillAccessMode } from "autobyteus-ts/agent/context/skill-access-mode.js";
import { RuntimeKind } from "../../../src/runtime-management/runtime-kind-enum.js";

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

  const getMemoryDir = (): string => path.join(appDataDir, "memory");

  const seedTeamCommunicationRun = async (input: {
    teamRunId: string;
    messageId: string;
    readableReferencePath: string;
    missingReferencePath: string;
    directoryReferencePath: string;
  }): Promise<void> => {
    const teamDir = path.join(getMemoryDir(), "agent_teams", input.teamRunId);
    await fs.mkdir(teamDir, { recursive: true });
    await fs.writeFile(
      path.join(teamDir, "team_run_metadata.json"),
      JSON.stringify(
        {
          teamRunId: input.teamRunId,
          teamDefinitionId: "team-def-1",
          teamDefinitionName: "Team Communication Validation",
          coordinatorMemberRouteKey: "solution_designer",
          runVersion: 1,
          createdAt: timestamp,
          updatedAt: timestamp,
          archivedAt: null,
          memberMetadata: [
            {
              memberRouteKey: "solution_designer",
              memberName: "Solution Designer",
              memberRunId: "sender-run-1",
              runtimeKind: RuntimeKind.AUTOBYTEUS,
              platformAgentRunId: null,
              agentDefinitionId: "agent-def-sender",
              llmModelIdentifier: "model-1",
              autoExecuteTools: true,
              skillAccessMode: SkillAccessMode.NONE,
              llmConfig: null,
              workspaceRootPath,
              applicationExecutionContext: null,
            },
            {
              memberRouteKey: "implementation_engineer",
              memberName: "Implementation Engineer",
              memberRunId: "receiver-run-1",
              runtimeKind: RuntimeKind.AUTOBYTEUS,
              platformAgentRunId: null,
              agentDefinitionId: "agent-def-receiver",
              llmModelIdentifier: "model-1",
              autoExecuteTools: true,
              skillAccessMode: SkillAccessMode.NONE,
              llmConfig: null,
              workspaceRootPath,
              applicationExecutionContext: null,
            },
          ],
        },
        null,
        2,
      ),
      "utf-8",
    );
    await fs.writeFile(
      path.join(teamDir, "team_communication_messages.json"),
      JSON.stringify(
        {
          version: 1,
          messages: [
            {
              messageId: input.messageId,
              teamRunId: input.teamRunId,
              senderRunId: "sender-run-1",
              senderMemberName: "Solution Designer",
              receiverRunId: "receiver-run-1",
              receiverMemberName: "Implementation Engineer",
              content: `Please review the attached file at ${input.readableReferencePath}; it should stay plain text in message content.`,
              messageType: "handoff",
              createdAt: timestamp,
              updatedAt: timestamp,
              referenceFiles: [
                {
                  referenceId: "ref-readable",
                  path: input.readableReferencePath,
                  type: "file",
                  createdAt: timestamp,
                  updatedAt: timestamp,
                },
                {
                  referenceId: "ref-missing",
                  path: input.missingReferencePath,
                  type: "file",
                  createdAt: timestamp,
                  updatedAt: timestamp,
                },
                {
                  referenceId: "ref-directory",
                  path: input.directoryReferencePath,
                  type: "file",
                  createdAt: timestamp,
                  updatedAt: timestamp,
                },
                {
                  referenceId: "ref-invalid",
                  path: "relative/reference.md",
                  type: "file",
                  createdAt: timestamp,
                  updatedAt: timestamp,
                },
              ],
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
        teamRunId: string;
        senderRunId: string;
        receiverRunId: string;
        content: string;
        messageType: string;
        referenceFiles: Array<{ referenceId: string; path: string; type: string }>;
      }>;
    }>(
      `query GetTeamCommunicationMessages($teamRunId: String!) {
        getTeamCommunicationMessages(teamRunId: $teamRunId) {
          messageId
          teamRunId
          senderRunId
          receiverRunId
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
        teamRunId,
        senderRunId: "sender-run-1",
        receiverRunId: "receiver-run-1",
        messageType: "handoff",
        content: expect.stringContaining(readableReferencePath),
        referenceFiles: expect.arrayContaining([
          expect.objectContaining({ referenceId: "ref-readable", path: readableReferencePath, type: "file" }),
          expect.objectContaining({ referenceId: "ref-missing", path: missingReferencePath, type: "file" }),
        ]),
      }),
    ]);

    const contentResponse = await app.inject({
      method: "GET",
      url: `/team-runs/${encodeURIComponent(teamRunId)}/team-communication/messages/${encodeURIComponent(messageId)}/references/ref-readable/content`,
    });

    expect(contentResponse.statusCode).toBe(200);
    expect(contentResponse.payload).toBe("# Handoff\n\nValidation bytes");
    expect(String(contentResponse.headers["content-type"])).toContain("text/markdown");
    expect(contentResponse.headers["cache-control"]).toBe("no-store");

    const missingResponse = await app.inject({
      method: "GET",
      url: `/team-runs/${encodeURIComponent(teamRunId)}/team-communication/messages/${encodeURIComponent(messageId)}/references/ref-missing/content`,
    });
    expect(missingResponse.statusCode).toBe(404);
    expect(missingResponse.json()).toEqual(expect.objectContaining({ code: "REFERENCE_CONTENT_UNAVAILABLE" }));

    const directoryResponse = await app.inject({
      method: "GET",
      url: `/team-runs/${encodeURIComponent(teamRunId)}/team-communication/messages/${encodeURIComponent(messageId)}/references/ref-directory/content`,
    });
    expect(directoryResponse.statusCode).toBe(404);
    expect(directoryResponse.json()).toEqual(expect.objectContaining({ code: "REFERENCE_CONTENT_UNAVAILABLE" }));

    const invalidPathResponse = await app.inject({
      method: "GET",
      url: `/team-runs/${encodeURIComponent(teamRunId)}/team-communication/messages/${encodeURIComponent(messageId)}/references/ref-invalid/content`,
    });
    expect(invalidPathResponse.statusCode).toBe(400);
    expect(invalidPathResponse.json()).toEqual(expect.objectContaining({ code: "INVALID_REFERENCE_PATH" }));

    const unknownReferenceResponse = await app.inject({
      method: "GET",
      url: `/team-runs/${encodeURIComponent(teamRunId)}/team-communication/messages/${encodeURIComponent(messageId)}/references/ref-unknown/content`,
    });
    expect(unknownReferenceResponse.statusCode).toBe(404);
    expect(unknownReferenceResponse.json()).toEqual(expect.objectContaining({ code: "REFERENCE_NOT_FOUND" }));
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
