import type { AgentOperationResult } from "../../agent-execution/domain/agent-operation-result.js";
import type { SendMessageCommandAckPayload } from "../../agent-execution/services/agent-run-command-types.js";
import type { TeamExecutionAddress } from "../../agent-team-execution/domain/team-execution-address.js";

export type InterruptCommandTarget =
  | {
      target_kind: "standalone_run";
      run_id: string;
    }
  | {
      target_kind: "team_member";
      team_run_id: string;
      execution_address: TeamExecutionAddress | null;
    };

export type InterruptGenerationCommandAckPayload =
  | {
      command_type: "INTERRUPT_GENERATION";
      command_id: string;
      state: "accepted";
      target: InterruptCommandTarget;
    }
  | {
      command_type: "INTERRUPT_GENERATION";
      command_id: string;
      state: "rejected" | "failed";
      code: string;
      message: string;
      target: InterruptCommandTarget;
    };

export type AgentCommandAckPayload =
  | SendMessageCommandAckPayload
  | InterruptGenerationCommandAckPayload;

type ValidationFailure = { code: string; message: string };

export const normalizeInterruptCommandId = (value: unknown): string =>
  typeof value === "string" ? value.trim() : "";

export const buildInterruptGenerationCommandAck = (input: {
  commandId: unknown;
  target: InterruptCommandTarget;
  validationFailure?: ValidationFailure | null;
  result?: AgentOperationResult | null;
  executionError?: unknown;
}): InterruptGenerationCommandAckPayload => {
  const commandId = normalizeInterruptCommandId(input.commandId);
  const common = {
    command_type: "INTERRUPT_GENERATION" as const,
    command_id: commandId,
    target: input.target,
  };
  if (!commandId) {
    return {
      ...common,
      state: "rejected",
      code: "INVALID_COMMAND_ID",
      message: "INTERRUPT_GENERATION command_id must be a nonempty string.",
    };
  }
  if (input.validationFailure) {
    return { ...common, state: "rejected", ...input.validationFailure };
  }
  if (input.executionError !== undefined) {
    const detail = input.executionError instanceof Error
      ? input.executionError.message
      : String(input.executionError);
    return {
      ...common,
      state: "failed",
      code: "INTERRUPT_EXECUTION_FAILED",
      message: detail || "Interrupt execution failed.",
    };
  }
  if (!input.result?.accepted) {
    return {
      ...common,
      state: "failed",
      code: input.result?.code?.trim() || "RUNTIME_REJECTED",
      message: input.result?.message?.trim() || "The runtime did not accept the interrupt request.",
    };
  }
  return { ...common, state: "accepted" };
};
