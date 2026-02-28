import { asObject, asString, type JsonObject } from "./codex-runtime-json.js";

const DEFAULT_APP_SERVER_COMMAND = "codex";
const DEFAULT_APP_SERVER_ARGS = ["app-server"];
const DEFAULT_APPROVAL_POLICY = "on-request";
const DEFAULT_SANDBOX_MODE = "workspace-write";
const DEFAULT_REQUEST_TIMEOUT_MS = 120_000;

const VALID_APPROVAL_POLICIES = new Set(["untrusted", "on-failure", "on-request", "never"]);
const VALID_SANDBOX_MODES = new Set(["read-only", "workspace-write", "danger-full-access"]);

const logger = {
  warn: (...args: unknown[]) => console.warn(...args),
};

export const parseArgs = (): string[] => {
  const jsonArgs = process.env.CODEX_APP_SERVER_ARGS_JSON?.trim();
  if (jsonArgs) {
    try {
      const parsed = JSON.parse(jsonArgs);
      if (Array.isArray(parsed) && parsed.every((item) => typeof item === "string")) {
        return parsed as string[];
      }
    } catch (error) {
      logger.warn(`Failed to parse CODEX_APP_SERVER_ARGS_JSON: ${String(error)}`);
    }
  }

  const argString = process.env.CODEX_APP_SERVER_ARGS?.trim();
  if (!argString) {
    return DEFAULT_APP_SERVER_ARGS;
  }
  return argString
    .split(/\s+/)
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
};

export const normalizeApprovalPolicy = (): string => {
  const policy = process.env.CODEX_APP_SERVER_APPROVAL_POLICY?.trim() ?? DEFAULT_APPROVAL_POLICY;
  if (VALID_APPROVAL_POLICIES.has(policy)) {
    return policy;
  }
  logger.warn(
    `Invalid CODEX_APP_SERVER_APPROVAL_POLICY '${policy}', falling back to '${DEFAULT_APPROVAL_POLICY}'.`,
  );
  return DEFAULT_APPROVAL_POLICY;
};

export const normalizeSandboxMode = (): string => {
  const sandbox = process.env.CODEX_APP_SERVER_SANDBOX?.trim() ?? DEFAULT_SANDBOX_MODE;
  if (VALID_SANDBOX_MODES.has(sandbox)) {
    return sandbox;
  }
  logger.warn(
    `Invalid CODEX_APP_SERVER_SANDBOX '${sandbox}', falling back to '${DEFAULT_SANDBOX_MODE}'.`,
  );
  return DEFAULT_SANDBOX_MODE;
};

export const resolveRequestTimeoutMs = (): number => {
  const raw = Number(process.env.CODEX_APP_SERVER_REQUEST_TIMEOUT_MS ?? DEFAULT_REQUEST_TIMEOUT_MS);
  if (!Number.isFinite(raw) || raw <= 0) {
    return DEFAULT_REQUEST_TIMEOUT_MS;
  }
  return Math.floor(raw);
};

export const resolveLaunchCommand = (): string =>
  process.env.CODEX_APP_SERVER_COMMAND?.trim() || DEFAULT_APP_SERVER_COMMAND;

export const resolveDefaultModel = (): string | null => asString(process.env.CODEX_APP_SERVER_MODEL);

export const resolveThreadId = (payload: unknown): string | null => {
  const response = asObject(payload);
  const thread = asObject(response?.thread);
  return asString(thread?.id);
};

export const resolveTurnId = (payload: unknown): string | null => {
  const response = asObject(payload);
  const turn = asObject(response?.turn);
  return asString(turn?.id);
};

export const resolveThreadIdFromNotification = (params: JsonObject): string | null =>
  asString(params.threadId);
