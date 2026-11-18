import { describe, expect, it } from "vitest";
import { platformToolConverters } from "../../../src/agent-work-journal/rendering/platform/platform-tool-converters.js";
import { buildDefaultAgentToolMcpAdapterProviders } from "../../../src/agent-tools/mcp/providers/default-agent-tool-mcp-adapter-providers.js";

/**
 * AC-011: a platform tool without a neutral line fails here until someone decides (a converter, or an entry on
 * the explicit list below with its reason). The registry is read here, never by the journal.
 */
const GENERIC_ON_PURPOSE: Readonly<Record<string, string>> = {};

/** Names tools had when earlier runs recorded them; they no longer exist, journals of those runs still hold them. */
const RECORDED_HISTORY = ["create_or_update_task", "create_or_update_project", "manage_task"];

const currentToolNames = (): string[] => buildDefaultAgentToolMcpAdapterProviders()
  .flatMap((provider) => provider.getAdapters().map((adapter) => adapter.definition.name));

describe("platform tool converters", () => {
  it("cover every platform tool the registry offers", () => {
    const names = currentToolNames();
    expect(names).toEqual(expect.arrayContaining(["send_message_to", "create_task", "open_tab", "generate_image", "search_memory", "submit_launch_choices"]));
    const missing = names.filter((name) => !platformToolConverters.has(name) && !(name in GENERIC_ON_PURPOSE));
    expect(missing).toEqual([]);
  });

  it("hold no name that is neither a current tool nor recorded history", () => {
    const current = new Set(currentToolNames());
    const extra = [...platformToolConverters.keys()].filter((name) => !current.has(name)).sort();
    expect(extra).toEqual([...RECORDED_HISTORY].sort());
  });

  it("the explicit list of tools left generic on purpose is empty", () => {
    expect(Object.keys(GENERIC_ON_PURPOSE)).toEqual([]);
  });
});
