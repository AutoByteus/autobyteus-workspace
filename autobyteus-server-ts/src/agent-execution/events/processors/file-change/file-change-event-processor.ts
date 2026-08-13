import {
  AgentRunEventType,
  type AgentRunEvent,
} from "../../../domain/agent-run-event.js";
import {
  type AgentRunFileChangePayload,
  type AgentRunFileChangeSourceTool,
  type AgentRunFileChangeStatus,
} from "../../../domain/agent-run-file-change.js";
import type {
  AgentRunEventProcessor,
  AgentRunEventProcessorInput,
} from "../../agent-run-event-processor.js";
import { FileChangeInvocationContextStore } from "./file-change-invocation-context-store.js";
import { FileChangePayloadBuilder } from "./file-change-payload-builder.js";
import {
  extractDelta,
  extractInvocationId,
  extractMutationTargetPath,
  extractSegmentType,
  extractToolArguments,
  extractToolName,
  extractTurnId,
} from "./file-change-event-payload-accessors.js";
import { resolveAgentRunErrorEvidence } from "../../../domain/agent-run-error-evidence.js";
import {
  extractExplicitGeneratedOutputPath,
  extractGeneratedOutputPathForKnownTool,
} from "./file-change-output-path.js";
import {
  isGeneratedOutputTool,
  normalizeFileMutationTool,
} from "./file-change-tool-semantics.js";

export class FileChangeEventProcessor implements AgentRunEventProcessor {
  private readonly invocationContexts = new FileChangeInvocationContextStore();

  constructor(private readonly payloadBuilder = new FileChangePayloadBuilder()) {}

  process(input: AgentRunEventProcessorInput): AgentRunEvent[] {
    const derivedEvents: AgentRunEvent[] = [];

    for (const event of input.sourceEvents) {
      if (event.eventType === AgentRunEventType.FILE_CHANGE) {
        continue;
      }

      const payload = this.buildFileChangePayload(input, event);
      if (!payload) {
        continue;
      }

      derivedEvents.push({
        eventType: AgentRunEventType.FILE_CHANGE,
        runId: input.runContext.runId,
        payload: { ...payload },
        statusHint: null,
      });
    }

    return derivedEvents;
  }

  releaseRun(runId: string): void {
    this.invocationContexts.clearRun(runId);
  }

  private buildFileChangePayload(
    input: AgentRunEventProcessorInput,
    event: AgentRunEvent,
  ): AgentRunFileChangePayload | null {
    switch (event.eventType) {
      case AgentRunEventType.SEGMENT_START:
        return this.handleSegmentStart(input, event.payload);
      case AgentRunEventType.SEGMENT_CONTENT:
        return this.handleSegmentContent(input, event.payload);
      case AgentRunEventType.SEGMENT_END:
        return this.handleSegmentEnd(input, event.payload);
      case AgentRunEventType.TOOL_EXECUTION_STARTED:
        return this.handleToolExecutionStarted(input, event.payload);
      case AgentRunEventType.TOOL_EXECUTION_SUCCEEDED:
        return this.handleToolExecutionSucceeded(input, event.payload);
      case AgentRunEventType.TOOL_EXECUTION_FAILED:
      case AgentRunEventType.TOOL_DENIED:
      case AgentRunEventType.TOOL_EXECUTION_INTERRUPTED:
        return this.handleToolExecutionFailure(input, event.payload);
      case AgentRunEventType.TURN_COMPLETED:
      case AgentRunEventType.TURN_INTERRUPTED:
        this.invocationContexts.clearTurn(input.runContext.runId, extractTurnId(event.payload));
        return null;
      case AgentRunEventType.ERROR: {
        const evidence = resolveAgentRunErrorEvidence(event);
        if (evidence?.kind === "TURN_TERMINAL") {
          this.invocationContexts.clearTurn(input.runContext.runId, evidence.turnId);
        } else if (evidence?.kind === "RUNTIME_GLOBAL") {
          this.invocationContexts.clearRun(input.runContext.runId);
        }
        return null;
      }
      case AgentRunEventType.AGENT_STATUS:
        if (event.payload.status === "offline" || event.payload.status === "error") {
          this.invocationContexts.clearRun(input.runContext.runId);
        }
        return null;
      default:
        return null;
    }
  }

  private handleSegmentStart(
    input: AgentRunEventProcessorInput,
    payload: Record<string, unknown>,
  ): AgentRunFileChangePayload | null {
    const sourceTool = normalizeFileMutationTool(extractSegmentType(payload));
    if (!sourceTool) {
      return null;
    }

    const invocationId = extractInvocationId(payload);
    const targetPath = extractMutationTargetPath(payload);
    if (invocationId) {
      this.invocationContexts.insert(input.runContext.runId, invocationId, {
        turnId: extractTurnId(payload),
        segmentId: invocationId,
        toolName: sourceTool,
        arguments: extractToolArguments(payload),
        sourceTool,
        targetPath,
        generatedOutputPath: null,
        content: sourceTool === "write_file" ? "" : undefined,
        status: sourceTool === "write_file" ? "streaming" : "pending",
      });
    }

    if (!targetPath) {
      return null;
    }

    return this.buildPayload(input, {
      path: targetPath,
      status: sourceTool === "write_file" ? "streaming" : "pending",
      sourceTool,
      sourceInvocationId: invocationId,
      content: sourceTool === "write_file" ? "" : undefined,
    });
  }

  private handleSegmentContent(
    input: AgentRunEventProcessorInput,
    payload: Record<string, unknown>,
  ): AgentRunFileChangePayload | null {
    if (extractSegmentType(payload) !== "write_file") {
      return null;
    }

    const invocationId = extractInvocationId(payload);
    const delta = extractDelta(payload);
    if (!invocationId || delta === null) {
      return null;
    }

    const context = this.invocationContexts.find(input.runContext.runId, invocationId);
    if (
      context?.sourceTool !== "write_file" ||
      context.turnId !== extractTurnId(payload) ||
      context.segmentId !== invocationId ||
      !context.targetPath
    ) {
      return null;
    }

    context.content = `${context.content ?? ""}${delta}`;
    context.status = "streaming";

    return this.buildPayload(input, {
      path: context.targetPath,
      status: "streaming",
      sourceTool: "write_file",
      sourceInvocationId: invocationId,
      content: context.content,
    });
  }

  private handleSegmentEnd(
    input: AgentRunEventProcessorInput,
    payload: Record<string, unknown>,
  ): AgentRunFileChangePayload | null {
    const invocationId = extractInvocationId(payload);
    if (!invocationId) {
      return null;
    }

    const context = this.invocationContexts.find(input.runContext.runId, invocationId);
    if (
      context?.sourceTool !== "write_file" ||
      context.turnId !== extractTurnId(payload) ||
      context.segmentId !== invocationId ||
      !context.targetPath
    ) {
      return null;
    }

    context.status = "pending";

    return this.buildPayload(input, {
      path: context.targetPath,
      status: "pending",
      sourceTool: "write_file",
      sourceInvocationId: invocationId,
      content: context.content,
    });
  }

  private handleToolExecutionStarted(
    input: AgentRunEventProcessorInput,
    payload: Record<string, unknown>,
  ): AgentRunFileChangePayload | null {
    const invocationId = extractInvocationId(payload);
    const toolName = extractToolName(payload);
    const toolArguments = extractToolArguments(payload);
    const sourceTool = normalizeFileMutationTool(toolName);
    const targetPath = sourceTool ? extractMutationTargetPath(toolArguments, payload) : null;
    const generatedOutputPath = isGeneratedOutputTool(toolName)
      ? extractExplicitGeneratedOutputPath(toolArguments, null)
      : null;

    const existingContext = invocationId
      ? this.invocationContexts.find(input.runContext.runId, invocationId)
      : null;

    if (invocationId && existingContext) {
      const eventTurnId = extractTurnId(payload);
      if (eventTurnId && existingContext.turnId === eventTurnId) {
        existingContext.toolName = toolName ?? existingContext.toolName;
        if (Object.keys(toolArguments).length > 0) existingContext.arguments = toolArguments;
        existingContext.sourceTool ??=
          sourceTool ?? (isGeneratedOutputTool(toolName) ? "generated_output" : null);
        existingContext.targetPath ??= targetPath;
        existingContext.generatedOutputPath ??= generatedOutputPath;
      }
    } else if (invocationId && isGeneratedOutputTool(toolName)) {
      this.invocationContexts.insert(input.runContext.runId, invocationId, {
        turnId: extractTurnId(payload),
        segmentId: null,
        toolName,
        arguments: toolArguments,
        sourceTool: sourceTool ?? (isGeneratedOutputTool(toolName) ? "generated_output" : null),
        targetPath,
        generatedOutputPath,
      });
    }

    if (!sourceTool || !targetPath) {
      return null;
    }

    if (sourceTool === "write_file" && existingContext?.status === "streaming") {
      return null;
    }

    return this.buildPayload(input, {
      path: targetPath,
      status: "pending",
      sourceTool,
      sourceInvocationId: invocationId,
    });
  }

  private handleToolExecutionSucceeded(
    input: AgentRunEventProcessorInput,
    payload: Record<string, unknown>,
  ): AgentRunFileChangePayload | null {
    const invocationId = extractInvocationId(payload);
    const cachedInvocation = this.invocationContexts.consume(input.runContext.runId, invocationId);
    const toolName = extractToolName(payload) ?? cachedInvocation?.toolName ?? null;
    const toolArguments = extractToolArguments(payload);
    const sourceTool = normalizeFileMutationTool(toolName);
    const result = payload.result;

    if (sourceTool) {
      const targetPath = extractMutationTargetPath(
        toolArguments,
        payload,
        result,
        cachedInvocation?.arguments,
      ) ?? cachedInvocation?.targetPath ?? null;
      if (!targetPath) {
        return null;
      }

      return this.buildPayload(input, {
        path: targetPath,
        status: "available",
        sourceTool,
        sourceInvocationId: invocationId,
        content: sourceTool === "write_file" ? cachedInvocation?.content : undefined,
      });
    }

    if (!isGeneratedOutputTool(toolName)) {
      return null;
    }

    const outputPath = extractGeneratedOutputPathForKnownTool(
      toolName,
      Object.keys(toolArguments).length > 0 ? toolArguments : cachedInvocation?.arguments,
      result,
      cachedInvocation?.generatedOutputPath,
    );
    if (!outputPath) {
      return null;
    }

    return this.buildPayload(input, {
      path: outputPath,
      status: "available",
      sourceTool: "generated_output",
      sourceInvocationId: invocationId,
    });
  }

  private handleToolExecutionFailure(
    input: AgentRunEventProcessorInput,
    payload: Record<string, unknown>,
  ): AgentRunFileChangePayload | null {
    const invocationId = extractInvocationId(payload);
    const cachedInvocation = this.invocationContexts.consume(input.runContext.runId, invocationId);
    const toolName = extractToolName(payload) ?? cachedInvocation?.toolName ?? null;
    const sourceTool = normalizeFileMutationTool(toolName);
    if (!sourceTool) {
      return null;
    }

    const targetPath = extractMutationTargetPath(
      extractToolArguments(payload),
      payload,
      cachedInvocation?.arguments,
    ) ?? cachedInvocation?.targetPath ?? null;
    if (!targetPath) {
      return null;
    }

    return this.buildPayload(input, {
      path: targetPath,
      status: "failed",
      sourceTool,
      sourceInvocationId: invocationId,
      content: null,
    });
  }

  private buildPayload(input: AgentRunEventProcessorInput, payload: {
    path: string | null | undefined;
    status: AgentRunFileChangeStatus;
    sourceTool: AgentRunFileChangeSourceTool;
    sourceInvocationId: string | null;
    content?: string | null;
  }): AgentRunFileChangePayload | null {
    const nextPayload = {
      runContext: input.runContext,
      path: payload.path,
      status: payload.status,
      sourceTool: payload.sourceTool,
      sourceInvocationId: payload.sourceInvocationId,
      ...(payload.content !== undefined ? { content: payload.content } : {}),
    };

    return this.payloadBuilder.build(nextPayload);
  }

}
