import { testViewStreams } from "../../helpers/view-streams.js";
import { teamMembershipTestCollaborators } from "../../helpers/team-membership-test-collaborators.js";
import { noDelegations, openTaskRecords } from "../../helpers/no-delegations.js";
import "reflect-metadata";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import fastify, { type FastifyInstance } from "fastify";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { createHash } from "node:crypto";
import { TeamRunExecutionTreeStore } from "../../../src/run-history/store/team-run-execution-tree-store.js";
import { TeamCommunicationStore } from "../../../src/services/team-communication/team-communication-store.js";
import { testAgentNode, testExecutionTree } from "../../fixtures/current-team-run-fixtures.js";
import { NO_FILES_RECEIVED, NO_PEER_CHANNEL } from "../../helpers/explicit-host-collaborators.js";

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
    await new TeamCommunicationStore().write(teamDir, {
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
      claudeBackendFactory: {} as never, agyBackendFactory: {} as never, grokBackendFactory: {} as never, deepSeekHarnessBackendFactory: {} as never,
      activationRegistry: { getActiveRun: () => null } as never,
      memoryRecorder: {} as never,
      providerInputNormalizer: { normalizeForProvider: (dispatch) => dispatch },
      agentToolMcpRunSessionDeactivator: {} as never,
    });
    const ownedTeamRunManager = AgentTeamRunManager.initializeProcessInstance({ ...teamMembershipTestCollaborators(), remoteChannel: NO_PEER_CHANNEL, receivedFiles: NO_FILES_RECEIVED, delegationIndex: noDelegations(), viewStreams: testViewStreams(), taskRecords: openTaskRecords(),
      memoryDir: appConfigProvider.config.getMemoryDir(), flatTeamExecutionFactory: {} as never,
      memberExecutionContextBuilder: {} as never,
      modelSelectionValidator: { validate: () => undefined } as never,
    });
    // The participant read composes the runs below the root (autobyteus-461 SR-072): none here.
    const [{ configureStudioApplicationApiServices }, { DelegatedRunAgentsReader }] = await Promise.all([
      import("../../../src/api/graphql/studio-application-api-services.js"),
      import("../../../src/run-history/services/delegated-run-agents-reader.js"),
    ]);
    const studio = configureStudioApplicationApiServices(new Proxy({ delegatedRunAgents: new DelegatedRunAgentsReader(noDelegations()) } as Record<string, unknown>,
      { get: (target, name) => target[name as string] ?? {} }) as never);
    // autobyteus-565: the read is the process ParticipantMessagesReader, as the composition root creates it.
    const [{ ParticipantMessagesReader, setProcessParticipantMessagesReader }, { runRecordsOfRootOwners }, { MessageViewScope },
      { CounterpartIdentities }, { AgentRunMetadataStore }, { RunViewMessagesReader },
      { MessageReferenceContentReader, setProcessMessageReferenceContentReader }] = await Promise.all([
      import("../../../src/run-history/services/participant-messages-reader.js"),
      import("../../../src/run-history/services/run-records-source.js"),
      import("../../../src/agent-collaboration/delegation/message-view-scope.js"),
      import("../../../src/run-history/services/counterpart-identities.js"),
      import("../../../src/run-history/store/agent-run-metadata-store.js"),
      import("../../../src/run-history/services/run-view-messages-reader.js"),
      import("../../../src/run-history/services/message-reference-content-reader.js"),
    ]);
    const tree = noDelegations();
    const delegatedRunAgents = new DelegatedRunAgentsReader(tree);
    // One view reader for the page and the message references, as the composition root creates them (autobyteus-615).
    const views = new RunViewMessagesReader({ records: runRecordsOfRootOwners, delegatedRunAgents });
    const releaseReader = setProcessParticipantMessagesReader(new ParticipantMessagesReader({ views,
      scope: new MessageViewScope({ tree }), identities: new CounterpartIdentities({ delegatedRunAgents, tree,
        runMetadata: new AgentRunMetadataStore(appConfigProvider.config.getMemoryDir()), peerName: async (nodeId) => nodeId }) }));
    const releaseReferences = setProcessMessageReferenceContentReader(new MessageReferenceContentReader({ views }));
    releaseOwnedRunManagers = () => {
      releaseReferences();
      releaseReader();
      studio.close();
      AgentTeamRunManager.releaseProcessInstance(ownedTeamRunManager);
      AgentRunManager.releaseProcessInstance(ownedAgentRunManager);
    };

    const [{ registerCollaborationMessageReferenceRoutes }, { registerGraphql }] = await Promise.all([
      import("../../../src/api/rest/collaboration-message-references.js"),
      import("../../../src/api/graphql/index.js"),
    ]);

    app = fastify();
    await registerCollaborationMessageReferenceRoutes(app);
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

    const participantMessages = `query Participant($rootRunId: String!, $agentRunId: String!) {
      collaborationParticipantMessages(rootKind: "agent_team", rootRunId: $rootRunId, agentRunId: $agentRunId)
    }`;
    const data = await execGraphql<{ collaborationParticipantMessages: { messages: Array<Record<string, unknown>> } }>(
      participantMessages, { rootRunId: teamRunId, agentRunId: "receiver-run-1" });
    expect(data.collaborationParticipantMessages).toEqual({ messages: [{
      messageId,
      senderAgentRunId: "sender-run-1",
      receiverAgentRunId: "receiver-run-1",
      messageType: "handoff",
      content: expect.stringContaining(readableReferencePath),
      referenceFiles: [readableReferencePath, missingReferencePath, directoryReferencePath],
      createdAt: timestamp,
    }], counterparts: [], hasMore: false });
    // The sender sees the same message; a run that is not a participant is refused (autobyteus-358).
    expect((await execGraphql<{ collaborationParticipantMessages: { messages: unknown[] } }>(
      participantMessages, { rootRunId: teamRunId, agentRunId: "sender-run-1" })).collaborationParticipantMessages.messages).toHaveLength(1);
    const stranger = await app.inject({ method: "POST", url: "/graphql",
      payload: { query: participantMessages, variables: { rootRunId: teamRunId, agentRunId: "stranger-run" } } });
    expect((stranger.json() as GraphqlResponse<unknown>).errors?.[0]?.message).toContain("is not a participant");

    // The whole-log query is gone.
    const removedQuery = await app.inject({
      method: "POST",
      url: "/graphql",
      payload: {
        query: `query Removed($teamRunId: String!) { getTeamCommunicationMessages(teamRunId: $teamRunId) { messageId } }`,
        variables: { teamRunId },
      },
    });
    expect([200, 400]).toContain(removedQuery.statusCode);
    expect((removedQuery.json() as GraphqlResponse<unknown>).errors?.[0]?.message).toContain("getTeamCommunicationMessages");

    const contentResponse = await app.inject({
      method: "GET",
      url: `/collaboration-messages/agent_team/${encodeURIComponent(teamRunId)}/messages/${encodeURIComponent(messageId)}/references/${referenceIdFor(messageId, readableReferencePath)}/content`,
    });

    expect(contentResponse.statusCode).toBe(200);
    expect(contentResponse.payload).toBe("# Handoff\n\nValidation bytes");
    expect(String(contentResponse.headers["content-type"])).toContain("text/markdown");
    expect(contentResponse.headers["cache-control"]).toBe("no-store");

    const missingResponse = await app.inject({
      method: "GET",
      url: `/collaboration-messages/agent_team/${encodeURIComponent(teamRunId)}/messages/${encodeURIComponent(messageId)}/references/${referenceIdFor(messageId, missingReferencePath)}/content`,
    });
    expect(missingResponse.statusCode).toBe(404);
    expect(missingResponse.json()).toEqual(expect.objectContaining({ code: "REFERENCE_CONTENT_UNAVAILABLE" }));

    const directoryResponse = await app.inject({
      method: "GET",
      url: `/collaboration-messages/agent_team/${encodeURIComponent(teamRunId)}/messages/${encodeURIComponent(messageId)}/references/${referenceIdFor(messageId, directoryReferencePath)}/content`,
    });
    expect(directoryResponse.statusCode).toBe(404);
    expect(directoryResponse.json()).toEqual(expect.objectContaining({ code: "REFERENCE_CONTENT_UNAVAILABLE" }));

    // A relative stored reference path is no longer a reachable state: the V1 message schema
    // accepts only normalized absolute paths when the package is read.

    const unknownReferenceResponse = await app.inject({
      method: "GET",
      url: `/collaboration-messages/agent_team/${encodeURIComponent(teamRunId)}/messages/${encodeURIComponent(messageId)}/references/ref-unknown/content`,
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
        query: `query Participant($rootRunId: String!) {
          collaborationParticipantMessages(rootKind: "agent_team", rootRunId: $rootRunId, agentRunId: "receiver-run-1")
        }`,
        variables: { rootRunId: teamRunId },
      },
    });
    const body = response.json() as GraphqlResponse<{ collaborationParticipantMessages: unknown }>;
    // The current runtime reads only current packages; a JSON file left in the folder is never read, and a folder
    // without a current tree has no records to read.
    expect(body.errors?.[0]?.message).toContain("were not found");
    expect(body.data?.collaborationParticipantMessages ?? null).toBeNull();
  });

  it("reports a damaged stored log with its reason when the messages are read (AC-006)", async () => {
    const teamRunId = `team-damaged-${Date.now()}`;
    const readableReferencePath = path.join(workspaceRootPath, "damaged.md");
    await seedTeamCommunicationRun({ teamRunId, messageId: "message-1", readableReferencePath,
      missingReferencePath: path.join(workspaceRootPath, "gone.md"), directoryReferencePath: path.join(workspaceRootPath, "dir") });
    const log = (await fs.readdir(getTeamDir(teamRunId))).find((name) => name.startsWith("team_communication_messages"))!;
    // A complete malformed line (an unfinished last line would be ignored by design).
    await fs.appendFile(path.join(getTeamDir(teamRunId), log), "{broken\n");
    const response = await app.inject({
      method: "POST",
      url: "/graphql",
      payload: {
        query: `query Participant($rootRunId: String!) {
          collaborationParticipantMessages(rootKind: "agent_team", rootRunId: $rootRunId, agentRunId: "receiver-run-1")
        }`,
        variables: { rootRunId: teamRunId },
      },
    });
    const body = response.json() as GraphqlResponse<{ collaborationParticipantMessages: unknown }>;
    expect(body.errors?.[0]?.message).toBeTruthy();
    expect(body.data?.collaborationParticipantMessages ?? null).toBeNull();
  });

});
