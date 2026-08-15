import { describe, expect, it } from "vitest";
import {
  AUTOBYTEUS_DEFAULT_TOOL_NAMES,
  resolveAutoByteusRuntimeAgentToolExposure,
} from "../../../../../src/agent-execution/backends/autobyteus/autobyteus-runtime-tool-exposure.js";
import { TeamBackendKind } from "../../../../../src/agent-team-execution/domain/team-backend-kind.js";

describe("autobyteus runtime tool exposure", () => {
  it("adds the exact foundation baseline when no tools are configured", () => {
    expect(AUTOBYTEUS_DEFAULT_TOOL_NAMES).toEqual([
      "run_bash",
      "read_file",
      "edit_file",
      "write_file",
    ]);
    expect(resolveAutoByteusRuntimeAgentToolExposure(null).requestedToolNames).toEqual([
      "run_bash",
      "read_file",
      "edit_file",
      "write_file",
    ]);
  });

  it("deduplicates configured names without mutating persisted configuration", () => {
    const configuredToolNames = [" read_file ", "run_bash", "custom", "edit_file", "write_file"];

    const exposure = resolveAutoByteusRuntimeAgentToolExposure({
      toolNames: configuredToolNames,
    });

    expect(exposure.requestedToolNames).toEqual([
      "run_bash",
      "read_file",
      "edit_file",
      "write_file",
      "custom",
    ]);
    expect(configuredToolNames).toEqual([
      " read_file ",
      "run_bash",
      "custom",
      "edit_file",
      "write_file",
    ]);
  });

  it("keeps the automatic team collaboration trio additive to the native baseline", () => {
    const exposure = resolveAutoByteusRuntimeAgentToolExposure(
      { toolNames: [] },
      { teamBackendKind: TeamBackendKind.MIXED } as any,
    );

    expect(exposure.requestedToolNames).toEqual([
      "run_bash",
      "read_file",
      "edit_file",
      "write_file",
      "get_handoff_rules",
      "send_message_to",
      "delegate_task",
    ]);
  });
});
