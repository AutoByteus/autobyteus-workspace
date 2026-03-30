import type { JsonObject } from "./codex-app-server-json.js";

export type CodexDynamicToolContentItem = {
  type: "inputText";
  text: string;
};

export type CodexDynamicToolCallInput = {
  runId: string;
  threadId: string;
  turnId: string | null;
  callId: string;
  toolName: string;
  arguments: Record<string, unknown>;
};

export type CodexDynamicToolCallResult = {
  success: boolean;
  contentItems: CodexDynamicToolContentItem[];
};

export type CodexDynamicToolHandler = (
  input: CodexDynamicToolCallInput,
) => Promise<CodexDynamicToolCallResult>;

export type CodexDynamicToolRegistration = {
  spec: JsonObject;
  handler: CodexDynamicToolHandler;
};

export type CodexDynamicToolHandlerMap = Record<string, CodexDynamicToolHandler>;

export const createCodexDynamicToolTextResult = (
  text: string,
  success = true,
): CodexDynamicToolCallResult => ({
  success,
  contentItems: [
    {
      type: "inputText",
      text,
    },
  ],
});

export const buildCodexDynamicToolSpecs = (
  registrations: CodexDynamicToolRegistration[] | null | undefined,
): JsonObject[] | null => {
  if (!Array.isArray(registrations) || registrations.length === 0) {
    return null;
  }
  const specs = registrations
    .map((registration) => registration.spec)
    .filter((spec): spec is JsonObject => Boolean(spec?.name));
  return specs.length > 0 ? specs : null;
};

export const buildCodexDynamicToolHandlerMap = (
  registrations: CodexDynamicToolRegistration[] | null | undefined,
): CodexDynamicToolHandlerMap => {
  const next: CodexDynamicToolHandlerMap = {};
  if (!Array.isArray(registrations)) {
    return next;
  }

  for (const registration of registrations) {
    const toolName =
      typeof registration?.spec?.name === "string" ? registration.spec.name.trim() : "";
    if (!toolName || typeof registration.handler !== "function") {
      continue;
    }
    next[toolName] = registration.handler;
  }
  return next;
};
