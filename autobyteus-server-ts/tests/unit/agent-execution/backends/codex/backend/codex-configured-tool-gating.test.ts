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
      createRegistration("custom_dynamic_alpha"),
      createRegistration("custom_dynamic_beta"),
      createRegistration("custom_dynamic_gamma"),
    ];

    const filtered = filterDynamicToolRegistrationsByToolNames(
      registrations,
      new Set(["custom_dynamic_alpha", "custom_dynamic_gamma"]),
    );

    expect(filtered).toHaveLength(2);
    expect(filtered?.map((registration) => registration.spec.name)).toEqual([
      "custom_dynamic_alpha",
      "custom_dynamic_gamma",
    ]);
  });

  it("returns no dynamic registrations when the agent configured no matching tools", () => {
    const registrations = [createRegistration("custom_dynamic_alpha")];

    expect(
      filterDynamicToolRegistrationsByToolNames(registrations, new Set(["custom_dynamic_beta"])),
    ).toBeNull();
    expect(filterDynamicToolRegistrationsByToolNames(registrations, new Set())).toBeNull();
  });
});
