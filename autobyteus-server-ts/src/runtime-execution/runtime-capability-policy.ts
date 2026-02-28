import type { RuntimeCapability } from "../runtime-management/runtime-capability-service.js";

export type RuntimeCommandOperation =
  | "create_or_restore"
  | "send_turn"
  | "relay_inter_agent_message"
  | "approve_tool"
  | "interrupt_run"
  | "terminate_run";

export interface RuntimeCapabilityDecision {
  allowed: boolean;
  code?: string;
  message?: string;
}

const buildUnavailableMessage = (capability: RuntimeCapability): string => {
  const base = `Runtime '${capability.runtimeKind}' is unavailable.`;
  if (!capability.reason) {
    return base;
  }
  return `${base} ${capability.reason}`;
};

export const isSafetyOperation = (operation: RuntimeCommandOperation): boolean =>
  operation === "interrupt_run" || operation === "terminate_run";

export const evaluateCommandCapability = (
  capability: RuntimeCapability,
  operation: RuntimeCommandOperation,
): RuntimeCapabilityDecision => {
  if (capability.enabled) {
    return { allowed: true };
  }

  if (
    operation === "send_turn" ||
    operation === "relay_inter_agent_message" ||
    operation === "approve_tool" ||
    operation === "create_or_restore"
  ) {
    return {
      allowed: false,
      code: "RUNTIME_UNAVAILABLE",
      message: buildUnavailableMessage(capability),
    };
  }

  if (isSafetyOperation(operation)) {
    return { allowed: true };
  }

  return {
    allowed: false,
    code: "RUNTIME_OPERATION_BLOCKED",
    message: buildUnavailableMessage(capability),
  };
};
