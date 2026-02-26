import { beforeEach, describe, expect, it, vi } from "vitest";
import { listToolResultProcessors } from "../../../../src/agent-tools/tool-management/list-tool-result-processors.js";
import { defaultToolExecutionResultProcessorRegistry } from "autobyteus-ts";
describe("listToolResultProcessors", () => {
    beforeEach(() => {
        vi.restoreAllMocks();
    });
    it("returns sorted processor names", async () => {
        vi.spyOn(defaultToolExecutionResultProcessorRegistry, "getAllDefinitions").mockReturnValue({
            b: { name: "beta" },
            a: { name: "alpha" },
        });
        const result = await listToolResultProcessors({ agentId: "test-agent" });
        const data = JSON.parse(result);
        expect(data.map((item) => item.name)).toEqual(["alpha", "beta"]);
    });
    it("returns empty array when no definitions exist", async () => {
        vi.spyOn(defaultToolExecutionResultProcessorRegistry, "getAllDefinitions").mockReturnValue({});
        const result = await listToolResultProcessors({ agentId: "test-agent" });
        expect(result).toBe("[]");
    });
});
