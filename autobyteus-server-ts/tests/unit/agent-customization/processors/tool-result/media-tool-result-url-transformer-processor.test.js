import { beforeEach, describe, expect, it, vi } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { MediaToolResultUrlTransformerProcessor } from "../../../../../src/agent-customization/processors/tool-result/media-tool-result-url-transformer-processor.js";
import { ToolResultEvent } from "autobyteus-ts/agent/events/agent-events.js";
const mockMediaStorageService = vi.hoisted(() => ({
    storeMediaAndGetUrl: vi.fn(),
}));
vi.mock("../../../../../src/services/media-storage-service.js", () => {
    class MockMediaStorageService {
        storeMediaAndGetUrl = mockMediaStorageService.storeMediaAndGetUrl;
    }
    return {
        MediaStorageService: MockMediaStorageService,
    };
});
describe("MediaToolResultUrlTransformerProcessor", () => {
    beforeEach(() => {
        mockMediaStorageService.storeMediaAndGetUrl.mockReset();
    });
    it.each(["generate_image", "edit_image", "generate_speech"])("transforms target tools (%s)", async (toolName) => {
        mockMediaStorageService.storeMediaAndGetUrl.mockResolvedValue("http://server/rest/files/images/out.png");
        const processor = new MediaToolResultUrlTransformerProcessor();
        const context = { agentId: "agent-1" };
        const event = new ToolResultEvent(toolName, { file_path: "/tmp/out.png" }, undefined, undefined, { output_file_path: "/tmp/out.png" });
        const processed = await processor.process(event, context);
        expect(mockMediaStorageService.storeMediaAndGetUrl).toHaveBeenCalledWith("/tmp/out.png", "out.png");
        expect(processed.result.output_file_url).toBe("http://server/rest/files/images/out.png");
        expect(processed.result.local_file_path).toBe("/tmp/out.png");
    });
    it("skips non-media artifacts", async () => {
        const processor = new MediaToolResultUrlTransformerProcessor();
        const context = { agentId: "agent-1" };
        const original = { file_path: "/tmp/out.txt" };
        const event = new ToolResultEvent("other_tool", original, undefined, undefined, {});
        const processed = await processor.process(event, context);
        expect(mockMediaStorageService.storeMediaAndGetUrl).not.toHaveBeenCalled();
        expect(processed.result).toBe(original);
    });
    it("wraps non-object results", async () => {
        mockMediaStorageService.storeMediaAndGetUrl.mockResolvedValue("http://localhost/img.png");
        const processor = new MediaToolResultUrlTransformerProcessor();
        const context = { agentId: "agent-1" };
        const event = new ToolResultEvent("generate_image", "Image created successfully", undefined, undefined, { output_file_path: "/tmp/out.png" });
        const processed = await processor.process(event, context);
        expect(mockMediaStorageService.storeMediaAndGetUrl).toHaveBeenCalled();
        const result = processed.result;
        expect(result.output_file_url).toBe("http://localhost/img.png");
        expect(result.original_output).toBe("Image created successfully");
    });
    it("resolves relative paths using workspace", async () => {
        mockMediaStorageService.storeMediaAndGetUrl.mockResolvedValue("http://localhost/img.png");
        const processor = new MediaToolResultUrlTransformerProcessor();
        const context = {
            agentId: "agent-1",
            workspace: {
                getBasePath: () => "/workspace/root",
            },
        };
        const existsSpy = vi.spyOn(fs, "existsSync").mockReturnValue(true);
        const isAbsSpy = vi.spyOn(path, "isAbsolute");
        const event = new ToolResultEvent("generate_image", "Success", undefined, undefined, { output_file_path: "images/out.png" });
        await processor.process(event, context);
        expect(mockMediaStorageService.storeMediaAndGetUrl).toHaveBeenCalledWith("/workspace/root/images/out.png", "out.png");
        existsSpy.mockRestore();
        isAbsSpy.mockRestore();
    });
    it("handles storage failure and preserves result", async () => {
        mockMediaStorageService.storeMediaAndGetUrl.mockRejectedValue(new Error("store failed"));
        const processor = new MediaToolResultUrlTransformerProcessor();
        const context = { agentId: "agent-1" };
        const original = { file_path: "/tmp/out.png" };
        const event = new ToolResultEvent("generate_image", original, undefined, undefined, { output_file_path: "/tmp/out.png" });
        const processed = await processor.process(event, context);
        expect(mockMediaStorageService.storeMediaAndGetUrl).toHaveBeenCalled();
        expect(processed.result).toBe(original);
    });
    it("processes PDF files", async () => {
        mockMediaStorageService.storeMediaAndGetUrl.mockResolvedValue("http://server/rest/files/images/out.png");
        const processor = new MediaToolResultUrlTransformerProcessor();
        const context = { agentId: "agent-1" };
        const event = new ToolResultEvent("generate_pdf", "PDF generated at report.pdf", undefined, undefined, { output_path: "report.pdf" });
        const processed = await processor.process(event, context);
        expect(mockMediaStorageService.storeMediaAndGetUrl).toHaveBeenCalled();
        const result = processed.result;
        expect(result.output_file_url).toBe("http://server/rest/files/images/out.png");
        expect(result.local_file_path).toBe("report.pdf");
    });
});
