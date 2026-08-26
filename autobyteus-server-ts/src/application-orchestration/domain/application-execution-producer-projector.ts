import type {
  ApplicationExecutionContext,
  ApplicationExecutionProducer,
} from "@autobyteus/application-sdk-contracts";

const requireRecord = (value: unknown, label: string): Record<string, unknown> => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} must be an object.`);
  }
  return value as Record<string, unknown>;
};

const requireString = (value: unknown, label: string): string => {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${label} must be a non-empty string.`);
  }
  return value.trim();
};

export class ApplicationExecutionProducerProjector {
  static project(value: unknown): ApplicationExecutionProducer {
    const record = requireRecord(value, "Application execution producer");
    if (record.displayName !== null && typeof record.displayName !== "string") {
      throw new Error("Application execution producer displayName must be a string or null.");
    }
    return Object.freeze({
      agentRunId: requireString(record.agentRunId, "Application execution producer agentRunId"),
      displayName: record.displayName === null ? null : record.displayName.trim() || null,
    });
  }

  static projectContext(value: unknown): ApplicationExecutionContext {
    const record = requireRecord(value, "Application execution context");
    return Object.freeze({
      applicationId: requireString(record.applicationId, "Application execution context applicationId"),
      bindingId: requireString(record.bindingId, "Application execution context bindingId"),
      producer: this.project(record.producer),
    });
  }
}
