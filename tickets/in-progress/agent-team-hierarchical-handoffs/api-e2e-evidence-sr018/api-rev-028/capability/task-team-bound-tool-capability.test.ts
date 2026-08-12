import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import { defaultToolRegistry } from "autobyteus-ts/tools/registry/tool-registry.js";
import type { ToolDefinition } from "autobyteus-ts/tools/registry/tool-definition.js";
import { AgentDefinition } from "../../src/agent-definition/domain/models.js";
import { buildAgentRunMessageSenderContext } from "../../src/agent-communication/domain/agent-run-message-sender.js";
import { SEND_MESSAGE_TO_TOOL_NAME } from "../../src/agent-communication/services/send-message-to-tool-contract.js";
import { resolveAutoByteusAgentTools } from "../../src/agent-execution/backends/autobyteus/autobyteus-agent-tool-resolver.js";
import { buildConfiguredAgentToolExposure } from "../../src/agent-execution/shared/configured-agent-tool-exposure.js";
import { MixedTeamManager } from "../../src/agent-team-execution/backends/mixed/mixed-team-manager.js";
import { MixedTeamRunBackend } from "../../src/agent-team-execution/backends/mixed/mixed-team-run-backend.js";
import {
  MixedAgentMemberContext,
  MixedSubTeamMemberContext,
  MixedTeamRunContext,
} from "../../src/agent-team-execution/backends/mixed/mixed-team-run-context.js";
import type { ResolvedInterAgentMessageDeliveryRequest } from "../../src/agent-team-execution/domain/inter-agent-message-delivery.js";
import { TeamBackendKind } from "../../src/agent-team-execution/domain/team-backend-kind.js";
import { createTeamExecutionAddress } from "../../src/agent-team-execution/domain/team-execution-address.js";
import { TeamRun } from "../../src/agent-team-execution/domain/team-run.js";
import { TeamRunContext } from "../../src/agent-team-execution/domain/team-run-context.js";
import { TeamRunEventSourceType, type TeamRunEvent } from "../../src/agent-team-execution/domain/team-run-event.js";
import { clearTaskTeamActiveRunDirectory } from "../../src/agent-team-execution/task-delegation/task-team-active-run-directory.js";
import { disposeTaskAgentDirectory } from "../../src/agent-team-execution/task-delegation/task-agent-directory.js";
import { MemberTeamContextBuilder } from "../../src/agent-team-execution/services/member-team-context-builder.js";
import { AgentToolMcpCatalog } from "../../src/agent-tools/mcp/agent-tool-mcp-catalog.js";
import { AgentToolMcpSessionRegistry } from "../../src/agent-tools/mcp/agent-tool-mcp-session-registry.js";
import { AgentToolMcpSessionService } from "../../src/agent-tools/mcp/agent-tool-mcp-session-service.js";
import { AgentToolMcpToolExecutor } from "../../src/agent-tools/mcp/agent-tool-mcp-tool-executor.js";
import { RuntimeKind } from "../../src/runtime-management/runtime-kind-enum.js";
import { TeamCommunicationProjectionService } from "../../src/services/team-communication/team-communication-projection-service.js";
import { TeamCommunicationProjectionStore } from "../../src/services/team-communication/team-communication-projection-store.js";
import { TeamCommunicationService } from "../../src/services/team-communication/team-communication-service.js";
import {
  testAgentNode,
  testAgentTeamNode,
  testTeamRunConfig,
} from "../fixtures/current-team-run-fixtures.js";

const rootTeamRunId = "api-rev-028-root-team-run";
const taskTeamRunId = "api-rev-028-task-team-run";
const taskId = "task_0001";
const studentOneRunId = "api-rev-028-student-one-task-run";
const studentTwoRunId = "api-rev-028-student-two-task-run";
const teamAddress = "/StudentStudyGroup";
const studentOneAddress = "/StudentStudyGroup/student_one";
const studentTwoAddress = "/StudentStudyGroup/student_two";
const requestContent = "API_REV_028_TASK_PEER_REQUEST";
const replyContent = "API_REV_028_TASK_PEER_REPLY";

const address = (memberAddress: string) => createTeamExecutionAddress({
  rootTeamRunId,
  taskTeamRunIds: [taskTeamRunId],
  memberAddress,
});

const studentOneNode = testAgentNode(studentOneAddress, {
  agentRunId: studentOneRunId,
  runtimeKind: RuntimeKind.AUTOBYTEUS,
});
const studentTwoNode = testAgentNode(studentTwoAddress, {
  agentRunId: studentTwoRunId,
  runtimeKind: RuntimeKind.CODEX_APP_SERVER,
});
const taskTeamNode = testAgentTeamNode({
  address: teamAddress,
  coordinatorAddress: studentOneAddress,
  teamRunId: taskTeamRunId,
  teamDefinitionId: "student-study-group-definition",
  children: [studentOneNode, studentTwoNode],
});
const config = testTeamRunConfig({
  rootTeamRunId,
  rootTeamDefinitionId: "nested-classroom-definition",
  coordinatorAddress: "/Teacher",
  children: [
    testAgentNode("/Teacher", { agentRunId: "api-rev-028-teacher-run" }),
    taskTeamNode,
  ],
});

const createBoundRuns = () => {
  const childRuntime = new MixedTeamRunContext({
    memberContexts: [
      new MixedAgentMemberContext({
        address: studentOneAddress,
        agentRunId: studentOneRunId,
        runtimeKind: RuntimeKind.AUTOBYTEUS,
        platformAgentRunId: "platform-student-one-task-run",
      }),
      new MixedAgentMemberContext({
        address: studentTwoAddress,
        agentRunId: studentTwoRunId,
        runtimeKind: RuntimeKind.CODEX_APP_SERVER,
        platformAgentRunId: "platform-student-two-task-run",
      }),
    ],
    taskId,
    teamExecutionAddress: address(teamAddress),
  });
  const childContext = new TeamRunContext({
    teamRunId: taskTeamRunId,
    teamAddress,
    taskTeamRunIds: [taskTeamRunId],
    teamBackendKind: TeamBackendKind.MIXED,
    config,
    runtimeContext: childRuntime,
  });
  const childManager = new MixedTeamManager(childContext);
  const childRun = new TeamRun({
    context: childContext,
    backend: new MixedTeamRunBackend(childContext, childManager),
  });
  const subTeamRunFactory = { createOrRestore: vi.fn(async () => childRun) };
  const rootContext = new TeamRunContext({
    teamRunId: rootTeamRunId,
    teamAddress: "/",
    teamBackendKind: TeamBackendKind.MIXED,
    config,
    runtimeContext: new MixedTeamRunContext({
      memberContexts: [
        new MixedAgentMemberContext({
          address: "/Teacher",
          agentRunId: "api-rev-028-teacher-run",
          runtimeKind: RuntimeKind.AUTOBYTEUS,
          platformAgentRunId: null,
        }),
        new MixedSubTeamMemberContext({
          address: teamAddress,
          teamDefinitionId: "student-study-group-definition",
          teamRunId: taskTeamRunId,
        }),
      ],
      teamExecutionAddress: createTeamExecutionAddress({
        rootTeamRunId,
        taskTeamRunIds: [],
        memberAddress: "/Teacher",
      }),
    }),
  });
  const rootManager = new MixedTeamManager(rootContext, {
    subTeamRunFactory: subTeamRunFactory as never,
  });
  const rootRun = new TeamRun({
    context: rootContext,
    backend: new MixedTeamRunBackend(rootContext, rootManager),
  });
  return { childContext, childManager, childRun, rootManager, rootRun, subTeamRunFactory };
};

describe("API-REV-028 bound task-Team send_message_to capability", () => {
  let memoryDir: string;
  let registrySnapshot: Map<string, ToolDefinition>;

  beforeEach(async () => {
    clearTaskTeamActiveRunDirectory();
    disposeTaskAgentDirectory(rootTeamRunId);
    registrySnapshot = defaultToolRegistry.snapshot();
    memoryDir = await fs.mkdtemp(path.join(os.tmpdir(), "api-rev-028-team-communication-"));
  });

  afterEach(async () => {
    clearTaskTeamActiveRunDirectory();
    disposeTaskAgentDirectory(rootTeamRunId);
    defaultToolRegistry.restore(registrySnapshot);
    await fs.rm(memoryDir, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  it("invokes the actual bound AutoByteus and MCP seams in both directions and publishes exact current records", async () => {
    const { childContext, childManager, rootManager, rootRun, subTeamRunFactory } = createBoundRuns();
    const events: TeamRunEvent[] = [];
    rootRun.subscribeToEvents((event) => events.push(event));

    const store = new TeamCommunicationProjectionStore();
    const communicationService = new TeamCommunicationService({ projectionStore: store, memoryDir });
    const detach = communicationService.attachToTeamRun(rootRun);
    const publicProjection = new TeamCommunicationProjectionService({
      teamRunManager: { getTeamRun: (id: string) => id === rootTeamRunId ? rootRun : null } as never,
      metadataService: {} as never,
      projectionStore: store,
      activeCommunicationService: communicationService,
      memoryDir,
    });

    const deliveredRequests: ResolvedInterAgentMessageDeliveryRequest[] = [];
    const childPersistentGetOrCreate = vi.spyOn((childManager as any).persistentMembers, "getOrCreate")
      .mockImplementation((memberContext: { address: string; agentRunId: string }) => ({
        context: memberContext,
        deliverInterMemberMessage: async (
          request: ResolvedInterAgentMessageDeliveryRequest,
          beforePublishMemberInput: (() => void) | null,
        ) => {
          expect(request.receiverAddress.memberAddress).toBe(memberContext.address);
          expect(request.targetAgentRunId).toBe(memberContext.agentRunId);
          deliveredRequests.push(request);
          beforePublishMemberInput?.();
          return { accepted: true, code: "DELIVERED" };
        },
      }));
    const rootPersistentGetOrCreate = vi.spyOn((rootManager as any).persistentMembers, "getOrCreate");

    try {
      await expect(rootRun.startTaskTeamExecution({
        taskId,
        receiver: address(studentOneAddress),
        config,
        teamNode: taskTeamNode,
        message: new AgentInputUserMessage("Prepare deterministic task-Team capability proof."),
      })).resolves.toEqual({ accepted: true });
      rootRun.markTaskTeamExecutionActive(taskTeamRunId);
      expect(rootRun.isActive()).toBe(true);
      expect(subTeamRunFactory.createOrRestore).toHaveBeenCalledTimes(1);

      const definitionService = {
        getDefinitionById: vi.fn(async (id: string) => ({
          id,
          name: id === "student-study-group-definition" ? "Student Study Group" : id,
          instructions: "Test-owned deterministic task Team.",
        })),
      };
      const contextBuilder = new MemberTeamContextBuilder(definitionService as never);
      const deliverInterAgentMessage = (intent: Parameters<TeamRun["deliverInterAgentMessage"]>[0]) =>
        rootRun.deliverInterAgentMessage(intent);
      const studentOneContext = await contextBuilder.build({
        teamContext: childContext,
        agentNode: studentOneNode,
        deliverInterAgentMessage,
        taskId,
      });
      const studentTwoContext = await contextBuilder.build({
        teamContext: childContext,
        agentNode: studentTwoNode,
        deliverInterAgentMessage,
        taskId,
      });

      expect(studentOneContext.executionAddress).toEqual(address(studentOneAddress));
      expect(studentTwoContext.executionAddress).toEqual(address(studentTwoAddress));
      expect(studentOneContext.agentRunId).toBe(studentOneRunId);
      expect(studentTwoContext.agentRunId).toBe(studentTwoRunId);

      const studentOneDefinition = new AgentDefinition({
        id: "student-one-definition",
        name: "student_one",
        description: "Task-scoped student one.",
        instructions: "Use the intrinsic Team communication capability when directly invoked.",
        toolNames: [],
      });
      const autoByteusResolution = resolveAutoByteusAgentTools({
        agentDefinition: studentOneDefinition,
        senderRunId: studentOneRunId,
        senderName: "student_one",
        runtimeKind: RuntimeKind.AUTOBYTEUS,
        memberTeamContext: studentOneContext,
      });
      expect(autoByteusResolution.actualToolNames).toContain(SEND_MESSAGE_TO_TOOL_NAME);
      expect(studentOneDefinition.toolNames).toEqual([]);
      const nativeTool = autoByteusResolution.tools.find(
        (tool) => tool.definition?.name === SEND_MESSAGE_TO_TOOL_NAME,
      );
      expect(nativeTool).toBeDefined();
      const requestEnvelope = JSON.parse(await nativeTool!.execute({}, {
        recipient_address: "./student_two",
        content: requestContent,
        message_type: "task_peer_request",
      }));
      expect(requestEnvelope).toEqual({
        accepted: true,
        code: "DELIVERED",
        message: "Delivered message to ./student_two.",
        result: null,
      });

      const mcpRegistry = new AgentToolMcpSessionRegistry();
      const mcpCatalog = new AgentToolMcpCatalog();
      const mcpSessionService = new AgentToolMcpSessionService({
        registry: mcpRegistry,
        catalog: mcpCatalog,
        getInternalBaseUrl: () => "http://127.0.0.1:65535",
      });
      const mcpCreated = mcpSessionService.createAgentToolMcpSession({
        owner: { runId: taskTeamRunId, agentRunId: studentTwoRunId },
        sender: buildAgentRunMessageSenderContext({
          senderRunId: studentTwoRunId,
          senderName: "student_two",
          runtimeKind: RuntimeKind.CODEX_APP_SERVER,
          memberTeamContext: studentTwoContext,
        }),
        runtimeKind: RuntimeKind.CODEX_APP_SERVER,
        configuredExposure: buildConfiguredAgentToolExposure([]),
      });
      expect(mcpCreated.descriptor.enabledTools).toContain(SEND_MESSAGE_TO_TOOL_NAME);
      const replyResult = await new AgentToolMcpToolExecutor({ catalog: mcpCatalog })
        .executeAgentToolMcpCall({
          session: mcpCreated.session,
          toolName: SEND_MESSAGE_TO_TOOL_NAME,
          rawArguments: {
            recipient_address: "./student_one",
            content: replyContent,
            message_type: "task_peer_reply",
          },
        });
      expect(replyResult.kind).toBe("mcp_tool_result");
      if (replyResult.kind !== "mcp_tool_result") throw new Error("Expected MCP tool result.");
      expect(replyResult.result.structuredContent).toEqual({
        accepted: true,
        code: "DELIVERED",
        message: "Delivered message to ./student_one.",
        result: null,
      });

      const records = await publicProjection.getTeamCommunicationMessages(rootTeamRunId);
      expect(records).toHaveLength(2);
      expect(records.map(({ senderAddress, receiverAddress, content, messageType }) => ({
        senderAddress,
        receiverAddress,
        content,
        messageType,
      }))).toEqual([
        {
          senderAddress: address(studentOneAddress),
          receiverAddress: address(studentTwoAddress),
          content: requestContent,
          messageType: "task_peer_request",
        },
        {
          senderAddress: address(studentTwoAddress),
          receiverAddress: address(studentOneAddress),
          content: replyContent,
          messageType: "task_peer_reply",
        },
      ]);
      expect(new Set(records.map((record) => record.messageId)).size).toBe(2);

      expect(deliveredRequests).toHaveLength(2);
      expect(deliveredRequests.map((request) => ({
        senderRunId: request.sender.participant.agentRunId,
        targetAgentRunId: request.targetAgentRunId,
        senderAddress: request.senderAddress,
        receiverAddress: request.receiverAddress,
        content: request.content,
      }))).toEqual([
        {
          senderRunId: studentOneRunId,
          targetAgentRunId: studentTwoRunId,
          senderAddress: address(studentOneAddress),
          receiverAddress: address(studentTwoAddress),
          content: requestContent,
        },
        {
          senderRunId: studentTwoRunId,
          targetAgentRunId: studentOneRunId,
          senderAddress: address(studentTwoAddress),
          receiverAddress: address(studentOneAddress),
          content: replyContent,
        },
      ]);
      expect(childPersistentGetOrCreate).toHaveBeenCalledTimes(2);
      expect(rootPersistentGetOrCreate).not.toHaveBeenCalled();

      const communicationEvents = events.filter(
        (event) => event.eventSourceType === TeamRunEventSourceType.COMMUNICATION,
      );
      expect(communicationEvents).toHaveLength(2);
      expect(communicationEvents.map((event) =>
        event.eventSourceType === TeamRunEventSourceType.COMMUNICATION
          ? [event.payload.content, event.payload.senderAddress.taskTeamRunIds]
          : null,
      )).toEqual([
        [requestContent, [taskTeamRunId]],
        [replyContent, [taskTeamRunId]],
      ]);
    } finally {
      detach();
      await rootRun.terminate();
    }
  });
});
