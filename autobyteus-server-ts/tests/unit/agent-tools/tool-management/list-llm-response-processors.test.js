import { beforeEach, describe, expect, it, vi } from "vitest";
import { listLlmResponseProcessors } from "../../../../src/agent-tools/tool-management/list-llm-response-processors.js";
import { defaultLlmResponseProcessorRegistry } from "autobyteus-ts";
describe("listLlmResponseProcessors", () => {
    beforeEach(() => {
        vi.restoreAllMocks();
    });
    it("returns sorted processor names", async () => {
        vi.spyOn(defaultLlmResponseProcessorRegistry, "getAllDefinitions").mockReturnValue({
            b: { name: "beta" },
            a: { name: "alpha" },
        });
        const result = await listLlmResponseProcessors({ agentId: "test-agent" });
        const data = JSON.parse(result);
        expect(data.map((item) => item.name)).toEqual(["alpha", "beta"]);
    });
    it("returns empty array when no definitions exist", async () => {
        vi.spyOn(defaultLlmResponseProcessorRegistry, "getAllDefinitions").mockReturnValue({});
        const result = await listLlmResponseProcessors({ agentId: "test-agent" });
        expect(result).toBe("[]");
    });
});
