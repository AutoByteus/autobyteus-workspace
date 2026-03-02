import {
  asObject,
  MODEL_DISCOVERY_PROBE_PROMPT,
  resolveClaudeCodeExecutablePath,
  type ClaudeSdkModuleLike,
} from "./claude-runtime-shared.js";
import {
  normalizeModelDescriptors,
  type NormalizedModelDescriptor,
} from "./claude-runtime-model-catalog.js";

export const resolveSdkFunction = (
  sdk: ClaudeSdkModuleLike | null,
  functionName:
    | "query"
    | "getSessionMessages"
    | "listModels"
    | "createSdkMcpServer"
    | "tool"
    | "unstable_v2_createSession"
    | "unstable_v2_resumeSession",
): ((...args: unknown[]) => unknown) | null => {
  if (!sdk) {
    return null;
  }

  const candidate = sdk[functionName];
  if (typeof candidate === "function") {
    return candidate as (...args: unknown[]) => unknown;
  }

  const nested = sdk.default?.[functionName];
  if (typeof nested === "function") {
    return nested as (...args: unknown[]) => unknown;
  }

  return null;
};

export const tryCallWithVariants = async (
  fn: (...args: unknown[]) => unknown,
  variants: unknown[][],
): Promise<unknown> => {
  let lastError: unknown = null;
  for (const args of variants) {
    try {
      return await fn(...args);
    } catch (error) {
      lastError = error;
    }
  }

  if (lastError) {
    throw lastError;
  }

  return null;
};

const closeQueryControl = async (controlLike: Record<string, unknown> | null): Promise<void> => {
  if (!controlLike) {
    return;
  }

  const interruptFn =
    typeof controlLike.interrupt === "function"
      ? (controlLike.interrupt as (...args: unknown[]) => Promise<unknown>)
      : null;
  if (interruptFn) {
    try {
      await interruptFn.call(controlLike);
    } catch {
      // best-effort cleanup
    }
  }

  const closeFn =
    typeof controlLike.close === "function"
      ? (controlLike.close as (...args: unknown[]) => unknown)
      : null;
  if (closeFn) {
    try {
      closeFn.call(controlLike);
    } catch {
      // best-effort cleanup
    }
  }
};

export const tryGetSupportedModelsFromQueryControl = async (
  sdk: ClaudeSdkModuleLike | null,
): Promise<NormalizedModelDescriptor[]> => {
  const queryFn = resolveSdkFunction(sdk, "query");
  if (!queryFn) {
    return [];
  }

  const pathToClaudeCodeExecutable = resolveClaudeCodeExecutablePath();

  let controlLike: Record<string, unknown> | null = null;
  try {
    const result = await tryCallWithVariants(queryFn, [
      [
        {
          prompt: MODEL_DISCOVERY_PROBE_PROMPT,
          options: {
            maxTurns: 0,
            permissionMode: "plan",
            cwd: process.cwd(),
            pathToClaudeCodeExecutable,
          },
        },
      ],
      [
        {
          prompt: MODEL_DISCOVERY_PROBE_PROMPT,
          options: {
            maxTurns: 0,
            permissionMode: "plan",
            pathToClaudeCodeExecutable,
          },
        },
      ],
      [
        {
          prompt: MODEL_DISCOVERY_PROBE_PROMPT,
          maxTurns: 0,
          permissionMode: "plan",
          cwd: process.cwd(),
          pathToClaudeCodeExecutable,
        },
      ],
    ]);

    controlLike = asObject(result);
    if (!controlLike) {
      return [];
    }

    const supportedModelsFn =
      typeof controlLike.supportedModels === "function"
        ? (controlLike.supportedModels as (...args: unknown[]) => Promise<unknown>)
        : null;
    if (supportedModelsFn) {
      const rows = await supportedModelsFn.call(result);
      const normalized = normalizeModelDescriptors(rows);
      if (normalized.length > 0) {
        return normalized;
      }
    }

    const initializationResultFn =
      typeof controlLike.initializationResult === "function"
        ? (controlLike.initializationResult as (...args: unknown[]) => Promise<unknown>)
        : null;
    if (initializationResultFn) {
      const initializationResult = await initializationResultFn.call(result);
      const normalized = normalizeModelDescriptors(asObject(initializationResult)?.models);
      if (normalized.length > 0) {
        return normalized;
      }
    }

    return [];
  } catch {
    return [];
  } finally {
    await closeQueryControl(controlLike);
  }
};
