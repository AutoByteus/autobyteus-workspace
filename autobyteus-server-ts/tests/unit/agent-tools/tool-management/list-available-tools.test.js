import { beforeEach, describe, expect, it, vi } from "vitest";
import { listAvailableTools, registerListAvailableToolsTool } from "../../../../src/agent-tools/tool-management/list-available-tools.js";
import { defaultToolRegistry } from "autobyteus-ts/tools/registry/tool-registry.js";
import { ToolDefinition } from "autobyteus-ts/tools/registry/tool-definition.js";
import { ToolOrigin } from "autobyteus-ts/tools/tool-origin.js";
import { ParameterSchema } from "autobyteus-ts";
import { BaseTool } from "autobyteus-ts/tools/base-tool.js";
class DummyTool extends BaseTool {
    static getDescription() {
        return "Dummy tool";
    }
    static getArgumentSchema() {
        return null;
    }
    async _execute() {
        return null;
    }
}
const buildDefinition = (name, category, schema) => new ToolDefinition(name, `Description for ${name}`, ToolOrigin.LOCAL, category, () => schema ?? null, () => null, { customFactory: () => new DummyTool() });
describe("listAvailableTools", () => {
    beforeEach(() => {
        vi.restoreAllMocks();
    });
    it("returns sorted tool summaries", async () => {
        const schema = new ParameterSchema();
        const defs = [
            buildDefinition("bravo", "B", schema),
            buildDefinition("alpha", "A", schema),
        ];
        vi.spyOn(defaultToolRegistry, "listTools").mockReturnValue(defs);
        const result = await listAvailableTools({ agentId: "test-agent" });
        const data = JSON.parse(result);
        expect(data).toHaveLength(2);
        expect(data[0]?.category).toBe("A");
        expect(data[0]?.name).toBe("alpha");
        expect(data[1]?.category).toBe("B");
    });
    it("filters tools by category", async () => {
        const defs = [buildDefinition("alpha", "Tool Management")];
        vi.spyOn(defaultToolRegistry, "getToolsByCategory").mockReturnValue(defs);
        const tool = registerListAvailableToolsTool();
        const result = await tool.execute({ agentId: "test-agent" }, { category: "Tool Management" });
        const data = JSON.parse(result);
        expect(data).toHaveLength(1);
        expect(data[0]?.name).toBe("alpha");
    });
});
