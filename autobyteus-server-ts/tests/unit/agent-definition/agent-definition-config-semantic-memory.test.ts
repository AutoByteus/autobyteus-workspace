import { describe, expect, it } from "vitest";
import { AgentDefinition } from "../../../src/agent-definition/domain/models.js";
import {
  buildAgentConfigRecord,
  mergeAgentConfigRecord,
  normalizeAgentConfigRecord,
} from "../../../src/agent-definition/providers/agent-definition-config.js";

/** `semanticMemoryEnabled` in `agent-config.json` (REQ-001, REQ-002, REQ-008): absent means off; written only when on. */
const agent = (semanticMemoryEnabled: boolean) => new AgentDefinition({
  id: "computer-use-operator", name: "Operator", description: "d", instructions: "i", semanticMemoryEnabled,
});

describe("agent-config.json semanticMemoryEnabled", () => {
  it("reads true only for `true`; absent or anything else is off", () => {
    expect(normalizeAgentConfigRecord({ semanticMemoryEnabled: true }).semanticMemoryEnabled).toBe(true);
    for (const value of [undefined, false, "true", 1, null]) {
      expect(normalizeAgentConfigRecord({ semanticMemoryEnabled: value }).semanticMemoryEnabled).toBe(false);
    }
    expect(normalizeAgentConfigRecord({}).semanticMemoryEnabled).toBe(false);
  });

  it("writes the field only when on, so an agent without it keeps its file as it was", () => {
    expect(buildAgentConfigRecord(agent(true))).toMatchObject({ semanticMemoryEnabled: true });
    expect(buildAgentConfigRecord(agent(false))).not.toHaveProperty("semanticMemoryEnabled");
  });

  it("merge sets it, keeps unknown fields, and removes a stale `true` when turned off", () => {
    const existing = { toolNames: ["read_file"], authorNote: "kept", semanticMemoryEnabled: true };
    expect(mergeAgentConfigRecord(existing, agent(true))).toMatchObject({ authorNote: "kept", semanticMemoryEnabled: true });
    const off = mergeAgentConfigRecord(existing, agent(false));
    expect(off).toMatchObject({ authorNote: "kept" });
    expect(off).not.toHaveProperty("semanticMemoryEnabled");
  });
});
