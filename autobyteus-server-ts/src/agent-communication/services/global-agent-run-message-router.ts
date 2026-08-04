import type { AgentRun } from "../../agent-execution/domain/agent-run.js";
import type { AgentOperationResult } from "../../agent-execution/domain/agent-operation-result.js";
import { AgentRunManager } from "../../agent-execution/services/agent-run-manager.js";
import type { AgentRunMessageSenderContext } from "../domain/agent-run-message-sender.js";
import type { DirectAgentRunMessageGrant } from "../domain/direct-agent-run-message-grant.js";
import {
  DirectAgentRunMessageGrantRegistry,
  getDirectAgentRunMessageGrantRegistry,
} from "./direct-agent-run-message-grant-registry.js";
import {
  buildDirectAgentRunInputMessage,
  buildDirectAgentRunInterAgentEvent,
  buildDirectAgentRunMessageId,
} from "./global-agent-run-message-runtime-builders.js";

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
    grantRegistry?: DirectAgentRunMessageGrantRegistry;
  } = {}) {}

  async deliver(input: GlobalAgentRunMessageDeliveryInput): Promise<AgentOperationResult> {
    const targetAgentRunId = normalizeRequired(input.targetAgentRunId, "targetAgentRunId");
    const content = normalizeRequired(input.content, "content");
    const messageType = normalizeMessageType(input.messageType);
    const referenceFiles = normalizeReferenceFiles(input.referenceFiles);
    const grantDecision = this.grantRegistry.evaluate({
      senderRunId: input.sender.senderRunId,
      targetAgentRunId,
      messageType,
      referenceFiles,
    });

    if (grantDecision.kind === "rejected") {
      this.recordGrantUsage(grantDecision.grant, {
        accepted: false,
        code: grantDecision.code,
        message: grantDecision.message,
        senderRunId: input.sender.senderRunId,
        targetAgentRunId,
        messageType,
        referenceFiles,
      });
      return {
        accepted: false,
        code: grantDecision.code,
        message: grantDecision.message,
      };
    }

    const targetRun = this.agentRunManager.getActiveRun(targetAgentRunId);
    if (!targetRun) {
      const result = {
        accepted: false,
        code: "TARGET_AGENT_RUN_NOT_ACTIVE",
        message: `Exact AgentRun target '${targetAgentRunId}' is not active.`,
      } satisfies AgentOperationResult;
      this.recordGrantUsage(grantDecision.kind === "allowed" ? grantDecision.grant : null, {
        ...result,
        senderRunId: input.sender.senderRunId,
        targetAgentRunId,
        messageType,
        referenceFiles,
      });
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

    this.recordGrantUsage(grantDecision.kind === "allowed" ? grantDecision.grant : null, {
      accepted: postResult.accepted,
      code: publicationError
        ? "DELIVERED_EVENT_PUBLICATION_FAILED"
        : postResult.code ?? (postResult.accepted ? "DELIVERED" : "TARGET_AGENT_RUN_REJECTED_INPUT"),
      message: publicationError
        ? `Message was accepted, but outward event publication failed: ${String(publicationError)}`
        : postResult.message ?? null,
      senderRunId: input.sender.senderRunId,
      targetAgentRunId,
      messageType,
      referenceFiles,
    });

    if (!postResult.accepted) {
      return {
        ...postResult,
        code: postResult.code ?? "TARGET_AGENT_RUN_REJECTED_INPUT",
        message: postResult.message ?? `Exact AgentRun target '${targetAgentRunId}' rejected the message.`,
      };
    }

    return {
      ...postResult,
      accepted: true,
      code: publicationError
        ? "DELIVERED_EVENT_PUBLICATION_FAILED"
        : postResult.code ?? "DELIVERED",
      message: publicationError
        ? `Message was accepted by ${targetAgentRunId}, but outward event publication failed: ${String(publicationError)}`
        : postResult.message ?? `Delivered message to ${targetAgentRunId}.`,
    };
  }

  private recordGrantUsage(
    grant: DirectAgentRunMessageGrant | null,
    input: {
      accepted: boolean;
      code: string;
      message: string | null;
      senderRunId: string;
      targetAgentRunId: string;
      messageType: string;
      referenceFiles: string[];
    },
  ): void {
    if (!grant) {
      return;
    }
    this.grantRegistry.recordUsage({
      grantId: grant.grantId,
      senderRunId: input.senderRunId,
      purpose: grant.purpose,
      accepted: input.accepted,
      code: input.code,
      message: input.message,
      targetAgentRunId: input.targetAgentRunId,
      messageType: input.messageType,
      referenceFiles: input.referenceFiles,
    });
  }

  private get agentRunManager(): ActiveRunLookup {
    return this.deps.agentRunManager ?? AgentRunManager.getInstance();
  }

  private get grantRegistry(): DirectAgentRunMessageGrantRegistry {
    return this.deps.grantRegistry ?? getDirectAgentRunMessageGrantRegistry();
  }
}

export const getGlobalAgentRunMessageRouter = (): GlobalAgentRunMessageRouter =>
  GlobalAgentRunMessageRouter.getInstance();
