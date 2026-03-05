import { describe, expect, it, vi } from "vitest";
import { tryGetSupportedModelsFromQueryControl } from "../../../../src/runtime-execution/claude-agent-sdk/claude-runtime-sdk-interop.js";

describe("claude-runtime-sdk-interop", () => {
  it("passes explicit env to query model-discovery options", async () => {
    const supportedModels = vi.fn().mockResolvedValue([
      { model_identifier: "default", display_name: "Default (recommended)" },
    ]);
    const query = vi.fn().mockResolvedValue({
      supportedModels,
      interrupt: vi.fn().mockResolvedValue(undefined),
      close: vi.fn(),
    });

    const rows = await tryGetSupportedModelsFromQueryControl(
      {
        query,
      },
      { CLAUDE_AGENT_SDK_CLIENT_APP: "autobyteus-test/1.0.0" },
    );

    expect(query).toHaveBeenCalledTimes(1);
    expect(query.mock.calls[0]?.[0]).toMatchObject({
      options: {
        env: { CLAUDE_AGENT_SDK_CLIENT_APP: "autobyteus-test/1.0.0" },
      },
    });
    expect(rows).toEqual([
      {
        identifier: "default",
        displayName: "Default (recommended)",
      },
    ]);
  });
});
