import { ROOT_NOT_ACTIVE_MESSAGE } from "../../agent-collaboration/execution/task/task-delegation-command.js";
import type { AgentOperationResult } from "../../agent-execution/domain/agent-operation-result.js";
import { AgentRunManager } from "../../agent-execution/services/agent-run-manager.js";
import type { AgentRunMessageSenderContext } from "../domain/agent-run-message-sender.js";
import {
  buildDirectAgentRunInputMessage,
  buildDirectAgentRunInterAgentEvent,
  buildDirectAgentRunMessageId,
} from "./global-agent-run-message-runtime-builders.js";
import {
  ActiveCollaborationRootDirectory,
  getActiveCollaborationRootDirectory,
} from "../../agent-collaboration/execution/services/active-collaboration-root-directory.js";
import { sameRootExecutionIdentity } from "../../agent-collaboration/execution/domain/root-execution-identity.js";

export type GlobalAgentRunMessageDeliveryInput = {
  sender: AgentRunMessageSenderContext;
  targetAgentRunId: string;
  content: string;
  messageType?: string | null;
  referenceFiles?: string[] | null;
};

type ActiveRunLookup = Pick<AgentRunManager, "getActiveRun">;

const normalizeRequired = (value: string, fieldName: string): string => {
  const normalized = value.trim();
  if (!normalized) {
    throw new Error(`${fieldName} is required.`);
  }
  return normalized;
};

const normalizeMessageType = (value: string | null | undefined): string => {
  const normalized = value?.trim();
  return normalized ? normalized : "agent_message";
};

const normalizeReferenceFiles = (referenceFiles: string[] | null | undefined): string[] =>
  Array.isArray(referenceFiles) ? [...referenceFiles] : [];

export class GlobalAgentRunMessageRouter {
  private static instance: GlobalAgentRunMessageRouter | null = null;

  static getInstance(): GlobalAgentRunMessageRouter {
    if (!GlobalAgentRunMessageRouter.instance) {
      GlobalAgentRunMessageRouter.instance = new GlobalAgentRunMessageRouter();
    }
    return GlobalAgentRunMessageRouter.instance;
  }

  static resetInstance(): void {
    GlobalAgentRunMessageRouter.instance = null;
  }

  constructor(private readonly deps: {
    agentRunManager?: ActiveRunLookup;
    activeRootDirectory?: ActiveCollaborationRootDirectory;
  } = {}) {}

  async deliver(input: GlobalAgentRunMessageDeliveryInput): Promise<AgentOperationResult> {
    const targetAgentRunId = normalizeRequired(input.targetAgentRunId, "targetAgentRunId");
    const content = normalizeRequired(input.content, "content");
    const messageType = normalizeMessageType(input.messageType);
    const referenceFiles = normalizeReferenceFiles(input.referenceFiles);

    // A sender inside a collaboration root reaches every AgentRun of that root
    // through the root boundary, which restores a shut-down delegated child first.
    // Targets outside the sender's root use the live-only path below.
    const senderRoot = input.sender.memberExecutionContext
      ? this.activeRootDirectory.resolve(input.sender.memberExecutionContext.identity.root)
      : null;
    if (senderRoot?.hasAgentExecution(targetAgentRunId)) {
      const result = await senderRoot.deliverExactAgentMessage({
        sender: Object.freeze({
          kind: "agent",
          identity: input.sender.memberExecutionContext!.identity,
          displayName: input.sender.senderName,
        }),
        targetAgentRunId,
        content,
        messageType,
        referenceFiles,
      });
      return result.accepted ? { ...result, agentRunId: targetAgentRunId } : result;
    }

    // send_message_to talks with agents only: a task agent team's ID is refused with its coordinator's ID.
    const coordinator = this.activeRootDirectory.findTeamCoordinator(targetAgentRunId);
    if (coordinator) {
      const result = {
        accepted: false,
        code: "TARGET_IS_TEAM_RUN",
        message: `${targetAgentRunId} is a task agent team's run id, and send_message_to talks with agents. To talk with the team, use its coordinator's run id: ${coordinator}.`,
      } satisfies AgentOperationResult;
      return result;
    }

    const targetRun = this.agentRunManager.getActiveRun(targetAgentRunId);
    if (!targetRun) {
      const result = {
        accepted: false,
        code: "TARGET_AGENT_RUN_NOT_ACTIVE",
        message: `No running agent has the run id '${targetAgentRunId}', so the message was not sent. Use an exact run id you were given: a sender run id (from a message or your new task), or a run id delegate_task returned to you.`,
      } satisfies AgentOperationResult;
      return result;
    }

    const senderTeam = input.sender.memberExecutionContext;
    const targetTeam = targetRun.config.memberExecutionContext;
    if (
      senderTeam &&
      targetTeam &&
      sameRootExecutionIdentity(senderTeam.identity.root, targetTeam.identity.root)
    ) {
      // The sender's root is not active, so same-root delivery is unavailable.
      const result = {
        accepted: false,
        code: "COLLABORATION_ROOT_NOT_ACTIVE",
        message: ROOT_NOT_ACTIVE_MESSAGE,
      } satisfies AgentOperationResult;
      return result;
    }

    const messageId = buildDirectAgentRunMessageId();
    const createdAt = new Date().toISOString();
    const runtimeInput = {
      sender: input.sender,
      targetAgentRunId,
      content,
      messageType,
      referenceFiles,
      createdAt,
      messageId,
    };
    const postResult = await targetRun.postUserMessage(
      buildDirectAgentRunInputMessage(runtimeInput),
    );
    let publicationError: unknown = null;
    if (postResult.accepted) {
      try {
        await targetRun.publishEvent(buildDirectAgentRunInterAgentEvent(runtimeInput));
      } catch (error) {
        publicationError = error;
      }
    }

    if (!postResult.accepted) {
      return {
        ...postResult,
        code: postResult.code ?? "TARGET_AGENT_RUN_REJECTED_INPUT",
        message: postResult.message
          ? `The agent '${targetAgentRunId}' did not accept the message: ${postResult.message}`
          : `The agent '${targetAgentRunId}' did not accept the message.`,
      };
    }

    return {
      ...postResult,
      accepted: true,
      agentRunId: targetAgentRunId,
      code: publicationError
        ? "DELIVERED_EVENT_PUBLICATION_FAILED"
        : postResult.code ?? "DELIVERED",
      message: publicationError
        ? `Message was accepted by ${targetAgentRunId}, but outward event publication failed: ${String(publicationError)}`
        : postResult.message ?? `Delivered message to ${targetAgentRunId}.`,
    };
  }

  private get agentRunManager(): ActiveRunLookup {
    return this.deps.agentRunManager ?? AgentRunManager.getInstance();
  }

  private get activeRootDirectory(): ActiveCollaborationRootDirectory {
    return this.deps.activeRootDirectory ?? getActiveCollaborationRootDirectory();
  }

}

export const getGlobalAgentRunMessageRouter = (): GlobalAgentRunMessageRouter =>
  GlobalAgentRunMessageRouter.getInstance();
