import { ParameterDefinition, ParameterSchema, ParameterType } from "autobyteus-ts/utils/parameter-schema.js";
import { SANDBOX_LIMITS } from "../../sandboxes/sandbox-settings.js";

export const CREATE_SANDBOX_TOOL_NAME = "create_sandbox";
export const RUN_IN_SANDBOX_TOOL_NAME = "run_in_sandbox";
export const DESTROY_SANDBOX_TOOL_NAME = "destroy_sandbox";

export const CREATE_SANDBOX_TOOL_DESCRIPTION = [
  "Create a sandbox: a fresh AutoByteus node in its own container, from this node's release, paired with this node as a peer",
  "and sending its model calls through this node, which adds the credentials (no key or login is ever inside it).",
  "agentPackages: absolute paths of agent package folders on this computer; each is copied into the sandbox and imported.",
  "sharedFolders (optional): [{path, name}] folders on this computer the sandbox reads (read-only) at /home/autobyteus/shared/<name>.",
  `lifetimeMinutes (optional): 1 to ${SANDBOX_LIMITS.maxLifetimeMinutes}, default ${SANDBOX_LIMITS.defaultLifetimeMinutes}; it is removed then.`,
  "Returns sandboxId (also its peer name: use it as node in delegate_task), its workspaceFolder and runMemoryFolder on this",
  "computer (copy inputs into workspaceFolder before you delegate; read results and transcripts there, never following links),",
  "the imported agents and teams with their addresses, and expiresAt. Always destroy_sandbox when you are done.",
].join(" ");

export const RUN_IN_SANDBOX_TOOL_DESCRIPTION = [
  "Run one command inside your sandbox: argv is the program and its arguments as a list (no shell; use",
  "[\"bash\", \"-lc\", \"…\"] for one). timeoutSeconds 1 to 600, default 60. Returns exitCode (null when it timed out),",
  "stdout, stderr (each capped at 64 KiB) and truncated.",
].join(" ");

export const DESTROY_SANDBOX_TOOL_DESCRIPTION =
  "Remove your sandbox: its container, its pairing with this node and its record. Its workspace and run-memory folders on this computer are kept.";

/** An argument a sandbox tool refuses: a missing or wrong-typed field, or an unknown one. */
export class SandboxToolArgumentError extends Error {
  readonly code = "SANDBOX_ARGUMENT_INVALID";
}

export const buildCreateSandboxSchema = (): ParameterSchema => new ParameterSchema([
  new ParameterDefinition({ name: "agentPackages", type: ParameterType.ARRAY, required: true, arrayItemSchema: ParameterType.STRING,
    description: "Absolute paths of agent package folders to copy into the sandbox and import (at least one)." }),
  new ParameterDefinition({ name: "sharedFolders", type: ParameterType.ARRAY, required: false,
    arrayItemSchema: new ParameterSchema([
      new ParameterDefinition({ name: "path", type: ParameterType.STRING, required: true, description: "Absolute path of a folder on this computer." }),
      new ParameterDefinition({ name: "name", type: ParameterType.STRING, required: true, description: "Its name in the sandbox: lower-case letters, digits, '-'." }),
    ]),
    description: "Folders the sandbox may read, read-only, at /home/autobyteus/shared/<name>." }),
  new ParameterDefinition({ name: "lifetimeMinutes", type: ParameterType.INTEGER, required: false, minValue: 1, maxValue: SANDBOX_LIMITS.maxLifetimeMinutes,
    description: `Minutes until the sandbox is removed (default ${SANDBOX_LIMITS.defaultLifetimeMinutes}).` }),
]);

export const buildRunInSandboxSchema = (): ParameterSchema => new ParameterSchema([
  new ParameterDefinition({ name: "sandboxId", type: ParameterType.STRING, required: true, description: "The sandbox, from create_sandbox." }),
  new ParameterDefinition({ name: "argv", type: ParameterType.ARRAY, required: true, arrayItemSchema: ParameterType.STRING,
    description: "The program and its arguments." }),
  new ParameterDefinition({ name: "timeoutSeconds", type: ParameterType.INTEGER, required: false, minValue: 1, maxValue: 600,
    description: "Time limit in seconds (default 60)." }),
]);

export const buildDestroySandboxSchema = (): ParameterSchema => new ParameterSchema([
  new ParameterDefinition({ name: "sandboxId", type: ParameterType.STRING, required: true, description: "The sandbox, from create_sandbox." }),
]);

const objectOf = (raw: unknown, allowed: readonly string[]): Record<string, unknown> => {
  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) throw new SandboxToolArgumentError("Arguments must be an object.");
  const input = raw as Record<string, unknown>;
  const unknown = Object.keys(input).find((key) => !allowed.includes(key));
  if (unknown) throw new SandboxToolArgumentError(`Unsupported argument '${unknown}'.`);
  return input;
};
const stringList = (value: unknown, name: string, required: boolean): string[] => {
  if (value === undefined && !required) return [];
  if (!Array.isArray(value) || value.some((entry) => typeof entry !== "string" || !entry.trim()) || (required && value.length === 0)) {
    throw new SandboxToolArgumentError(`${name} must be a ${required ? "non-empty " : ""}list of strings.`);
  }
  return value.map((entry) => (entry as string).trim());
};
const sandboxIdOf = (value: unknown): string => {
  if (typeof value !== "string" || !value.trim()) throw new SandboxToolArgumentError("sandboxId must be a non-empty string.");
  return value.trim();
};

export const parseCreateSandboxInput = (raw: unknown) => {
  const input = objectOf(raw, ["agentPackages", "sharedFolders", "lifetimeMinutes"]);
  const shared = input.sharedFolders === undefined ? [] : input.sharedFolders;
  if (!Array.isArray(shared) || shared.some((entry) => !entry || typeof entry !== "object"
    || typeof (entry as Record<string, unknown>).path !== "string" || typeof (entry as Record<string, unknown>).name !== "string")) {
    throw new SandboxToolArgumentError("sharedFolders must be a list of {path, name}.");
  }
  const lifetime = input.lifetimeMinutes ?? SANDBOX_LIMITS.defaultLifetimeMinutes;
  if (!Number.isInteger(lifetime) || (lifetime as number) < 1 || (lifetime as number) > SANDBOX_LIMITS.maxLifetimeMinutes) {
    throw new SandboxToolArgumentError(`lifetimeMinutes must be a whole number from 1 to ${SANDBOX_LIMITS.maxLifetimeMinutes}.`);
  }
  return Object.freeze({
    agentPackages: stringList(input.agentPackages, "agentPackages", true),
    sharedFolders: (shared as Array<{ path: string; name: string }>).map((entry) => Object.freeze({ path: entry.path, name: entry.name })),
    lifetimeMinutes: lifetime as number,
  });
};

export const parseRunInSandboxInput = (raw: unknown) => {
  const input = objectOf(raw, ["sandboxId", "argv", "timeoutSeconds"]);
  if (input.timeoutSeconds !== undefined && !Number.isInteger(input.timeoutSeconds)) {
    throw new SandboxToolArgumentError("timeoutSeconds must be a whole number.");
  }
  return Object.freeze({
    sandboxId: sandboxIdOf(input.sandboxId),
    argv: stringList(input.argv, "argv", true),
    timeoutSeconds: (input.timeoutSeconds as number | undefined) ?? null,
  });
};

export const parseDestroySandboxInput = (raw: unknown) => Object.freeze({ sandboxId: sandboxIdOf(objectOf(raw, ["sandboxId"]).sandboxId) });
