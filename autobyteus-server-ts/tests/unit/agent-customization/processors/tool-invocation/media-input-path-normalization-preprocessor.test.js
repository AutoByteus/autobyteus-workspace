import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import fs from "node:fs";
import { MediaInputPathNormalizationPreprocessor } from "../../../../../src/agent-customization/processors/tool-invocation/media-input-path-normalization-preprocessor.js";
import { ToolInvocation } from "autobyteus-ts/agent/tool-invocation.js";
import { LLMFactory } from "autobyteus-ts/llm/llm-factory.js";
import { LLMProvider } from "autobyteus-ts/llm/providers.js";
import { FileSystemWorkspace } from "../../../../../src/workspaces/filesystem-workspace.js";
import { WorkspaceConfig } from "autobyteus-ts/agent/workspace/workspace-config.js";
const mockMediaStorage = vi.hoisted(() => ({
    ingestLocalFileForContext: vi.fn(),
}));
vi.mock("../../../../../src/services/media-storage-service.js", () => {
    class MockMediaStorageService {
        ingestLocalFileForContext = mockMediaStorage.ingestLocalFileForContext;
    }
    return {
        MediaStorageService: MockMediaStorageService,
    };
});
describe("MediaInputPathNormalizationPreprocessor", () => {
    beforeEach(() => {
        mockMediaStorage.ingestLocalFileForContext.mockReset();
        vi.restoreAllMocks();
    });
    afterEach(() => {
        vi.restoreAllMocks();
    });
    it("skips non-target tools", async () => {
        const processor = new MediaInputPathNormalizationPreprocessor();
        const invocation = new ToolInvocation("other_tool", { input_images: "foo.png" }, "1");
        const context = {
            agentId: "agent-1",
            llmInstance: { model: { provider: LLMProvider.AUTOBYTEUS } },
        };
        const result = await processor.process(invocation, context);
        expect(result).toBe(invocation);
        expect(mockMediaStorage.ingestLocalFileForContext).not.toHaveBeenCalled();
    });
    it("skips generate_speech as it has no image path arguments", async () => {
        const processor = new MediaInputPathNormalizationPreprocessor();
        const invocation = new ToolInvocation("generate_speech", { prompt: "hello", output_file_path: "out.wav" }, "1b");
        const context = {
            agentId: "agent-1",
            llmInstance: { model: { provider: LLMProvider.AUTOBYTEUS } },
        };
        const result = await processor.process(invocation, context);
        expect(result).toBe(invocation);
        expect(result.arguments).toEqual({ prompt: "hello", output_file_path: "out.wav" });
    });
    it("skips when provider is not AUTOBYTEUS", async () => {
        const processor = new MediaInputPathNormalizationPreprocessor();
        const invocation = new ToolInvocation("generate_image", { input_images: "foo.png" }, "2");
        const context = {
            agentId: "agent-1",
            llmInstance: { model: { provider: LLMProvider.OPENAI } },
        };
        const result = await processor.process(invocation, context);
        expect(result).toBe(invocation);
        expect(mockMediaStorage.ingestLocalFileForContext).not.toHaveBeenCalled();
    });
    it("normalizes input_images with workspace", async () => {
        const processor = new MediaInputPathNormalizationPreprocessor();
        const invocation = new ToolInvocation("generate_image", { input_images: "images/out.png" }, "3");
        const workspace = new FileSystemWorkspace(new WorkspaceConfig({ rootPath: "/tmp" }));
        const context = {
            agentId: "agent-1",
            workspace,
            llmInstance: { model: { provider: LLMProvider.AUTOBYTEUS } },
        };
        const existsSpy = vi.spyOn(fs, "existsSync").mockReturnValue(true);
        const statSpy = vi.spyOn(fs, "statSync").mockReturnValue({
            isFile: () => true,
        });
        const result = await processor.process(invocation, context);
        expect(mockMediaStorage.ingestLocalFileForContext).not.toHaveBeenCalled();
        expect(result.arguments.input_images).toBe("/tmp/images/out.png");
        existsSpy.mockRestore();
        statSpy.mockRestore();
    });
    it("keeps URL entries unchanged", async () => {
        const processor = new MediaInputPathNormalizationPreprocessor();
        const invocation = new ToolInvocation("generate_image", { input_images: "http://example.com/img.png" }, "4");
        const context = {
            agentId: "agent-1",
            llmInstance: { model: { provider: LLMProvider.AUTOBYTEUS } },
        };
        const result = await processor.process(invocation, context);
        expect(result.arguments.input_images).toBe("http://example.com/img.png");
        expect(mockMediaStorage.ingestLocalFileForContext).not.toHaveBeenCalled();
    });
    it("normalizes mask_image when present", async () => {
        const processor = new MediaInputPathNormalizationPreprocessor();
        const invocation = new ToolInvocation("edit_image", { mask_image: "mask.png" }, "5");
        const workspace = new FileSystemWorkspace(new WorkspaceConfig({ rootPath: "/tmp" }));
        const context = {
            agentId: "agent-1",
            workspace,
            llmInstance: { model: { provider: LLMProvider.AUTOBYTEUS } },
        };
        const existsSpy = vi.spyOn(fs, "existsSync").mockReturnValue(true);
        const statSpy = vi.spyOn(fs, "statSync").mockReturnValue({
            isFile: () => true,
        });
        const result = await processor.process(invocation, context);
        expect(mockMediaStorage.ingestLocalFileForContext).not.toHaveBeenCalled();
        expect(result.arguments.mask_image).toBe("/tmp/mask.png");
        existsSpy.mockRestore();
        statSpy.mockRestore();
    });
    it("uses LLMFactory provider lookup when modelIdentifier is present", async () => {
        const providerSpy = vi
            .spyOn(LLMFactory, "getProvider")
            .mockResolvedValue(LLMProvider.AUTOBYTEUS);
        const processor = new MediaInputPathNormalizationPreprocessor();
        const invocation = new ToolInvocation("generate_image", { input_images: "images/out.png" }, "6");
        const workspace = new FileSystemWorkspace(new WorkspaceConfig({ rootPath: "/tmp" }));
        const context = {
            agentId: "agent-1",
            workspace,
            llmInstance: {
                model: {
                    provider: LLMProvider.OPENAI,
                    modelIdentifier: "my-model-id",
                },
            },
        };
        const existsSpy = vi.spyOn(fs, "existsSync").mockReturnValue(true);
        const statSpy = vi.spyOn(fs, "statSync").mockReturnValue({
            isFile: () => true,
        });
        const result = await processor.process(invocation, context);
        expect(providerSpy).toHaveBeenCalledWith("my-model-id");
        expect(mockMediaStorage.ingestLocalFileForContext).not.toHaveBeenCalled();
        expect(result.arguments.input_images).toBe("/tmp/images/out.png");
        existsSpy.mockRestore();
        statSpy.mockRestore();
    });
});
