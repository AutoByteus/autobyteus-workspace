import { describe, expect, it, vi } from "vitest";
import type {
  CodexDynamicToolRegistration,
} from "../../../../../../src/agent-execution/backends/codex/codex-dynamic-tool.js";
import {
  filterDynamicToolRegistrationsByToolNames,
} from "../../../../../../src/agent-execution/backends/codex/backend/codex-configured-tool-gating.js";

const createRegistration = (name: string): CodexDynamicToolRegistration => ({
  spec: {
    name,
    description: `${name} description`,
    inputSchema: {
      type: "object",
      properties: {},
      additionalProperties: false,
    },
  },
  handler: vi.fn(async () => ({
    success: true,
    contentItems: [],
  })),
});

describe("codex-configured-tool-gating", () => {
  it("filters dynamic registrations down to the names explicitly configured on the agent", () => {
    const registrations = [
      createRegistration("open_tab"),
      createRegistration("read_page"),
      createRegistration("publish_artifacts"),
    ];

    const filtered = filterDynamicToolRegistrationsByToolNames(
      registrations,
      new Set(["open_tab", "publish_artifacts"]),
    );

    expect(filtered).toHaveLength(2);
    expect(filtered?.map((registration) => registration.spec.name)).toEqual([
      "open_tab",
      "publish_artifacts",
    ]);
  });

  it("returns no dynamic registrations when the agent configured no matching tools", () => {
    const registrations = [createRegistration("publish_artifacts")];

    expect(
      filterDynamicToolRegistrationsByToolNames(registrations, new Set(["open_tab"])),
    ).toBeNull();
    expect(filterDynamicToolRegistrationsByToolNames(registrations, new Set())).toBeNull();
  });
});
