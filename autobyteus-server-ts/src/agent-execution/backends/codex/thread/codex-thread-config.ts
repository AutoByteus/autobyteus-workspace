import type { JsonObject } from "../codex-app-server-json.js";
import type { CodexSandboxMode } from "../../../../runtime-management/codex/codex-sandbox-mode-setting.js";

const asTrimmedString = (value: unknown): string | null =>
  typeof value === "string" && value.trim().length > 0 ? value.trim() : null;

export enum CodexApprovalPolicy {
  NEVER = "never",
  ON_REQUEST = "on-request",
}

export type CodexThreadConfig = {
  model: string | null;
  workingDirectory: string;
  reasoningEffort: string | null;
  approvalPolicy: CodexApprovalPolicy;
  sandbox: CodexSandboxMode;
  baseInstructions: string | null;
  developerInstructions: string | null;
  dynamicTools: JsonObject[] | null;
};

export const buildCodexThreadConfig = (input: {
  model: string | null;
  workingDirectory: string;
  reasoningEffort: string | null;
  approvalPolicy: CodexApprovalPolicy;
  sandbox: CodexSandboxMode;
  baseInstructions?: string | null;
  developerInstructions?: string | null;
  dynamicTools?: JsonObject[] | null;
}): CodexThreadConfig => ({
  model: input.model,
  workingDirectory: input.workingDirectory,
  reasoningEffort: input.reasoningEffort,
  approvalPolicy: input.approvalPolicy,
  sandbox: input.sandbox,
  baseInstructions: asTrimmedString(input.baseInstructions),
  developerInstructions: asTrimmedString(input.developerInstructions),
  dynamicTools: Array.isArray(input.dynamicTools) ? input.dynamicTools : null,
});
