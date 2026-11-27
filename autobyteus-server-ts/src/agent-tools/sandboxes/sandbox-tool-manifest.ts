import { SandboxRefusal } from "../../sandboxes/sandbox-manager.js";
import { getProcessSandboxManager } from "../../sandboxes/sandbox-process-binding.js";
import {
  buildCreateSandboxSchema,
  buildDestroySandboxSchema,
  buildRunInSandboxSchema,
  CREATE_SANDBOX_TOOL_DESCRIPTION,
  CREATE_SANDBOX_TOOL_NAME,
  DESTROY_SANDBOX_TOOL_DESCRIPTION,
  DESTROY_SANDBOX_TOOL_NAME,
  parseCreateSandboxInput,
  parseDestroySandboxInput,
  parseRunInSandboxInput,
  RUN_IN_SANDBOX_TOOL_DESCRIPTION,
  RUN_IN_SANDBOX_TOOL_NAME,
  SandboxToolArgumentError,
} from "./sandbox-tool-contract.js";

/** The asking run is the agent that calls the tool: only it may use or remove what it created (DEC-107). */
const callerOf = (runId: string | null) => {
  if (!runId) throw new SandboxToolArgumentError("The sandbox tools need the calling run.");
  return { kind: "run" as const, runId };
};

/** A refusal as the tool result's error: its code (C7) and message. */
export const sandboxToolError = (error: unknown) => ({
  error: {
    code: error instanceof SandboxRefusal || error instanceof SandboxToolArgumentError ? error.code : "SANDBOX_TOOL_FAILED",
    message: error instanceof Error ? error.message : String(error),
  },
});

/** The one contract of each sandbox tool's two entry forms (native tool and MCP adapter). */
export const SANDBOX_TOOL_MANIFESTS = [
  {
    name: CREATE_SANDBOX_TOOL_NAME,
    description: CREATE_SANDBOX_TOOL_DESCRIPTION,
    parameterSchema: buildCreateSandboxSchema(),
    parse: parseCreateSandboxInput,
    execute: async (raw: unknown, runId: string | null) =>
      getProcessSandboxManager().create(callerOf(runId), parseCreateSandboxInput(raw)),
  },
  {
    name: RUN_IN_SANDBOX_TOOL_NAME,
    description: RUN_IN_SANDBOX_TOOL_DESCRIPTION,
    parameterSchema: buildRunInSandboxSchema(),
    parse: parseRunInSandboxInput,
    execute: async (raw: unknown, runId: string | null) => {
      const input = parseRunInSandboxInput(raw);
      return getProcessSandboxManager().runIn(callerOf(runId), input.sandboxId, input.argv, input.timeoutSeconds);
    },
  },
  {
    name: DESTROY_SANDBOX_TOOL_NAME,
    description: DESTROY_SANDBOX_TOOL_DESCRIPTION,
    parameterSchema: buildDestroySandboxSchema(),
    parse: parseDestroySandboxInput,
    execute: async (raw: unknown, runId: string | null) =>
      getProcessSandboxManager().destroy(callerOf(runId), parseDestroySandboxInput(raw).sandboxId),
  },
] as const;
