import { describe, expect, it, vi } from "vitest";
import { ToolResultEvent } from "autobyteus-ts/agent/events/agent-events.js";
import { AgentArtifactPersistenceProcessor } from "../../../../../src/agent-customization/processors/tool-result/agent-artifact-persistence-processor.js";
const buildContext = (notifier) => ({
    agentId: "agent-1",
    workspace: null,
    statusManager: { notifier: notifier ?? null },
});
const createMockService = (artifact) => {
    const defaultArtifact = {
        id: "artifact-123",
        agentId: "agent-1",
        path: "test.py",
        type: "file",
        workspaceRoot: null,
        url: null,
    };
    return {
        createArtifact: vi.fn().mockResolvedValue({ ...defaultArtifact, ...artifact }),
    };
};
describe("AgentArtifactPersistenceProcessor", () => {
    it("persists write_file artifacts", async () => {
        const artifactService = createMockService();
        const notifier = { notifyAgentArtifactPersisted: vi.fn(), notifyAgentArtifactUpdated: vi.fn() };
        const context = buildContext(notifier);
        const processor = new AgentArtifactPersistenceProcessor(artifactService);
        const event = new ToolResultEvent("write_file", null, undefined, undefined, {
            path: "src/app.py",
            content: "print('hello')",
        });
        await processor.process(event, context);
        expect(artifactService.createArtifact).toHaveBeenCalledWith({
            agentId: "agent-1",
            path: "src/app.py",
            type: "file",
            url: null,
            workspaceRoot: null,
        });
        expect(notifier.notifyAgentArtifactPersisted).toHaveBeenCalledOnce();
        const payload = notifier.notifyAgentArtifactPersisted.mock.calls[0][0];
        expect(payload.type).toBe("file");
        expect("url" in payload).toBe(false);
    });
    it("persists generate_image artifacts with URL", async () => {
        const artifactService = createMockService({ type: "image", path: "images/output.png" });
        const notifier = { notifyAgentArtifactPersisted: vi.fn(), notifyAgentArtifactUpdated: vi.fn() };
        const context = buildContext(notifier);
        const processor = new AgentArtifactPersistenceProcessor(artifactService);
        const event = new ToolResultEvent("generate_image", {
            output_file_url: "http://localhost:8000/rest/files/images/output.png",
            local_file_path: "/workspace/images/output.png",
        });
        await processor.process(event, context);
        expect(artifactService.createArtifact).toHaveBeenCalledWith({
            agentId: "agent-1",
            path: "/workspace/images/output.png",
            type: "image",
            url: "http://localhost:8000/rest/files/images/output.png",
            workspaceRoot: null,
        });
        const payload = notifier.notifyAgentArtifactPersisted.mock.calls[0][0];
        expect(payload.type).toBe("image");
        expect(payload.url).toBe("http://localhost:8000/rest/files/images/output.png");
    });
    it("persists generate_speech artifacts with URL", async () => {
        const artifactService = createMockService({
            type: "audio",
            path: "audio/speech.mp3",
            url: "http://localhost:8000/rest/files/audio/speech.mp3",
        });
        const notifier = { notifyAgentArtifactPersisted: vi.fn(), notifyAgentArtifactUpdated: vi.fn() };
        const context = buildContext(notifier);
        const processor = new AgentArtifactPersistenceProcessor(artifactService);
        const event = new ToolResultEvent("generate_speech", {
            output_file_url: "http://localhost:8000/rest/files/audio/speech.mp3",
            local_file_path: "/workspace/audio/speech.mp3",
        });
        await processor.process(event, context);
        expect(artifactService.createArtifact).toHaveBeenCalledWith({
            agentId: "agent-1",
            path: "/workspace/audio/speech.mp3",
            type: "audio",
            url: "http://localhost:8000/rest/files/audio/speech.mp3",
            workspaceRoot: null,
        });
        const payload = notifier.notifyAgentArtifactPersisted.mock.calls[0][0];
        expect(payload.type).toBe("audio");
        expect(payload.url).toBe("http://localhost:8000/rest/files/audio/speech.mp3");
    });
    it("skips non-artifact tools", async () => {
        const artifactService = createMockService();
        const notifier = { notifyAgentArtifactPersisted: vi.fn(), notifyAgentArtifactUpdated: vi.fn() };
        const context = buildContext(notifier);
        const processor = new AgentArtifactPersistenceProcessor(artifactService);
        const event = new ToolResultEvent("read_file", "file contents");
        await processor.process(event, context);
        expect(artifactService.createArtifact).not.toHaveBeenCalled();
        expect(notifier.notifyAgentArtifactPersisted).not.toHaveBeenCalled();
    });
    it("handles missing tool args for write_file", async () => {
        const artifactService = createMockService();
        const notifier = { notifyAgentArtifactPersisted: vi.fn(), notifyAgentArtifactUpdated: vi.fn() };
        const context = buildContext(notifier);
        const processor = new AgentArtifactPersistenceProcessor(artifactService);
        const event = new ToolResultEvent("write_file", null);
        await processor.process(event, context);
        expect(artifactService.createArtifact).not.toHaveBeenCalled();
        expect(notifier.notifyAgentArtifactPersisted).not.toHaveBeenCalled();
    });
    it("notifies edit_file artifact updates", async () => {
        const artifactService = createMockService();
        const notifier = { notifyAgentArtifactPersisted: vi.fn(), notifyAgentArtifactUpdated: vi.fn() };
        const context = buildContext(notifier);
        const processor = new AgentArtifactPersistenceProcessor(artifactService);
        const event = new ToolResultEvent("edit_file", null, undefined, undefined, {
            path: "src/app.py",
            patch: "@@ -1 +1 @@",
        });
        await processor.process(event, context);
        expect(artifactService.createArtifact).not.toHaveBeenCalled();
        expect(notifier.notifyAgentArtifactUpdated).toHaveBeenCalledOnce();
        const payload = notifier.notifyAgentArtifactUpdated.mock.calls[0][0];
        expect(payload.path).toBe("src/app.py");
        expect(payload.agent_id).toBe("agent-1");
        expect(payload.type).toBe("file");
    });
    it("persists generic tool artifacts", async () => {
        const artifactService = createMockService({ type: "video", path: "videos/demo.mp4" });
        const notifier = { notifyAgentArtifactPersisted: vi.fn(), notifyAgentArtifactUpdated: vi.fn() };
        const context = buildContext(notifier);
        const processor = new AgentArtifactPersistenceProcessor(artifactService);
        const event = new ToolResultEvent("create_video", { status: "success" }, undefined, undefined, {
            output_video_path: "videos/demo.mp4",
        });
        await processor.process(event, context);
        expect(artifactService.createArtifact).toHaveBeenCalledWith({
            agentId: "agent-1",
            path: "videos/demo.mp4",
            type: "video",
            url: null,
            workspaceRoot: null,
        });
        expect(notifier.notifyAgentArtifactPersisted).toHaveBeenCalledOnce();
        const payload = notifier.notifyAgentArtifactPersisted.mock.calls[0][0];
        expect(payload.type).toBe("video");
    });
    it("persists generic tool destination args", async () => {
        const artifactService = createMockService({ type: "pdf", path: "docs/report.pdf" });
        const notifier = { notifyAgentArtifactPersisted: vi.fn(), notifyAgentArtifactUpdated: vi.fn() };
        const context = buildContext(notifier);
        const processor = new AgentArtifactPersistenceProcessor(artifactService);
        const event = new ToolResultEvent("export_pdf", { status: "done" }, undefined, undefined, {
            destination_file: "docs/report.pdf",
        });
        await processor.process(event, context);
        expect(artifactService.createArtifact).toHaveBeenCalledWith({
            agentId: "agent-1",
            path: "docs/report.pdf",
            type: "pdf",
            url: null,
            workspaceRoot: null,
        });
        expect(notifier.notifyAgentArtifactPersisted).toHaveBeenCalledOnce();
    });
});
