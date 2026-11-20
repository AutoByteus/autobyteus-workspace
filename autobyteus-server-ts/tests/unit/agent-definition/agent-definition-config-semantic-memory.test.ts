import { describe, expect, it } from "vitest";
import { AgentDefinition } from "../../../src/agent-definition/domain/models.js";
import {
  buildAgentConfigRecord,
  mergeAgentConfigRecord,
  normalizeAgentConfigRecord,
} from "../../../src/agent-definition/providers/agent-definition-config.js";

/**
 * The retired `semanticMemoryEnabled` key of `agent-config.json` (autobyteus-554 REQ-003, AC-003): every agent has
 * semantic memory, so a stored `true` or `false` is not read, never written, and dropped at the file's next save,
 * with every other key kept. Nothing rewrites a file just for this.
 */
const agent = () => new AgentDefinition({
  id: "computer-use-operator", name: "Operator", description: "d", instructions: "i", toolNames: ["read_file"],
});

describe("agent-config.json and the retired semanticMemoryEnabled key", () => {
  it.each([true, false])("a stored %s is not read", (value) => {
    const record = normalizeAgentConfigRecord({ toolNames: ["read_file"], semanticMemoryEnabled: value });
    expect(record).not.toHaveProperty("semanticMemoryEnabled");
    expect(record.toolNames).toEqual(["read_file"]);
  });

  it("is never written", () => {
    expect(buildAgentConfigRecord(agent())).not.toHaveProperty("semanticMemoryEnabled");
  });

  it.each([true, false])("is dropped at the next save (stored %s); every other key is kept", (value) => {
    const existing = { toolNames: ["read_file"], authorNote: "kept", semanticMemoryEnabled: value };
    const merged = mergeAgentConfigRecord(existing, agent());
    expect(merged).toMatchObject({ authorNote: "kept", toolNames: ["read_file"] });
    expect(merged).not.toHaveProperty("semanticMemoryEnabled");
  });
});
