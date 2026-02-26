import type { RunRuntimeOverrides } from "../domain/models.js";

const ACTIVE_RUN_BLOCKED_FIELDS: Array<keyof RunRuntimeOverrides> = [
  "llmModelIdentifier",
  "llmConfig",
  "autoExecuteTools",
  "skillAccessMode",
  "workspaceRootPath",
  "runtimeKind",
  "runtimeReference",
];

export class ActiveRunOverridePolicy {
  resolveIgnoredConfigFields(overrides: RunRuntimeOverrides): string[] {
    const ignored: string[] = [];
    for (const field of ACTIVE_RUN_BLOCKED_FIELDS) {
      const value = overrides[field];
      if (value !== undefined && value !== null) {
        ignored.push(field);
      }
    }
    return ignored;
  }
}

let cachedActiveRunOverridePolicy: ActiveRunOverridePolicy | null = null;

export const getActiveRunOverridePolicy = (): ActiveRunOverridePolicy => {
  if (!cachedActiveRunOverridePolicy) {
    cachedActiveRunOverridePolicy = new ActiveRunOverridePolicy();
  }
  return cachedActiveRunOverridePolicy;
};
