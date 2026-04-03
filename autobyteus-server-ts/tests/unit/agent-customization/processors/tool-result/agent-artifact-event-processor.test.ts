import { describe, expect, it, vi } from "vitest";
import { ToolResultEvent } from "autobyteus-ts/agent/events/agent-events.js";
import type { AgentContext } from "autobyteus-ts";
import { AgentArtifactEventProcessor } from "../../../../../src/agent-customization/processors/tool-result/agent-artifact-event-processor.js";

const buildContext = (notifier?: {
  notifyAgentArtifactPersisted?: (payload: Record<string, unknown>) => void;
  notifyAgentArtifactUpdated?: (payload: Record<string, unknown>) => void;
}): AgentContext =>
  ({
    agentId: "agent-1",
    workspace: null,
    statusManager: { notifier: notifier ?? null },
  } as AgentContext);

describe("AgentArtifactEventProcessor", () => {
  it("emits write_file artifact events", async () => {
    const notifier = { notifyAgentArtifactPersisted: vi.fn(), notifyAgentArtifactUpdated: vi.fn() };
    const context = buildContext(notifier);

    const processor = new AgentArtifactEventProcessor();
    const event = new ToolResultEvent("write_file", null, undefined, undefined, {
      path: "src/app.py",
      content: "print('hello')",
    });

    await processor.process(event, context);

    expect(notifier.notifyAgentArtifactPersisted).toHaveBeenCalledOnce();
    const payload = (notifier.notifyAgentArtifactPersisted as any).mock.calls[0][0];
    expect(payload.path).toBe("src/app.py");
    expect(payload.agent_id).toBe("agent-1");
    expect(payload.type).toBe("file");
    expect("artifact_id" in payload).toBe(false);
    expect("url" in payload).toBe(false);
  });

  it("emits generate_image artifact events with URL", async () => {
    const notifier = { notifyAgentArtifactPersisted: vi.fn(), notifyAgentArtifactUpdated: vi.fn() };
    const context = buildContext(notifier);

    const processor = new AgentArtifactEventProcessor();
    const event = new ToolResultEvent("generate_image", {
      output_file_url: "http://localhost:8000/rest/files/images/output.png",
      local_file_path: "/workspace/images/output.png",
    });

    await processor.process(event, context);

    const payload = (notifier.notifyAgentArtifactPersisted as any).mock.calls[0][0];
    expect(payload.path).toBe("/workspace/images/output.png");
    expect(payload.type).toBe("image");
    expect(payload.url).toBe("http://localhost:8000/rest/files/images/output.png");
  });

  it("emits generate_speech artifact events with URL", async () => {
    const notifier = { notifyAgentArtifactPersisted: vi.fn(), notifyAgentArtifactUpdated: vi.fn() };
    const context = buildContext(notifier);

    const processor = new AgentArtifactEventProcessor();
    const event = new ToolResultEvent("generate_speech", {
      output_file_url: "http://localhost:8000/rest/files/audio/speech.mp3",
      local_file_path: "/workspace/audio/speech.mp3",
    });

    await processor.process(event, context);

    const payload = (notifier.notifyAgentArtifactPersisted as any).mock.calls[0][0];
    expect(payload.path).toBe("/workspace/audio/speech.mp3");
    expect(payload.type).toBe("audio");
    expect(payload.url).toBe("http://localhost:8000/rest/files/audio/speech.mp3");
  });

  it("skips non-artifact tools", async () => {
    const notifier = { notifyAgentArtifactPersisted: vi.fn(), notifyAgentArtifactUpdated: vi.fn() };
    const context = buildContext(notifier);

    const processor = new AgentArtifactEventProcessor();
    const event = new ToolResultEvent("read_file", "file contents");

    await processor.process(event, context);

    expect(notifier.notifyAgentArtifactPersisted).not.toHaveBeenCalled();
    expect(notifier.notifyAgentArtifactUpdated).not.toHaveBeenCalled();
  });

  it("handles missing tool args for write_file", async () => {
    const notifier = { notifyAgentArtifactPersisted: vi.fn(), notifyAgentArtifactUpdated: vi.fn() };
    const context = buildContext(notifier);

    const processor = new AgentArtifactEventProcessor();
    const event = new ToolResultEvent("write_file", null);

    await processor.process(event, context);

    expect(notifier.notifyAgentArtifactPersisted).not.toHaveBeenCalled();
  });

  it("emits edit_file artifact updates", async () => {
    const notifier = { notifyAgentArtifactPersisted: vi.fn(), notifyAgentArtifactUpdated: vi.fn() };
    const context = buildContext(notifier);

    const processor = new AgentArtifactEventProcessor();
    const event = new ToolResultEvent("edit_file", null, undefined, undefined, {
      path: "src/app.py",
      patch: "@@ -1 +1 @@",
    });

    await processor.process(event, context);

    expect(notifier.notifyAgentArtifactPersisted).not.toHaveBeenCalled();
    expect(notifier.notifyAgentArtifactUpdated).toHaveBeenCalledOnce();
    const payload = (notifier.notifyAgentArtifactUpdated as any).mock.calls[0][0];
    expect(payload.path).toBe("src/app.py");
    expect(payload.agent_id).toBe("agent-1");
    expect(payload.type).toBe("file");
  });

  it("skips artifact events when the tool result failed", async () => {
    const notifier = { notifyAgentArtifactPersisted: vi.fn(), notifyAgentArtifactUpdated: vi.fn() };
    const context = buildContext(notifier);

    const processor = new AgentArtifactEventProcessor();
    const event = new ToolResultEvent(
      "generate_image",
      null,
      "tool-1",
      "Generation failed",
      { output_file_path: "images/output.png" },
    );

    await processor.process(event, context);

    expect(notifier.notifyAgentArtifactPersisted).not.toHaveBeenCalled();
    expect(notifier.notifyAgentArtifactUpdated).not.toHaveBeenCalled();
  });

  it("skips artifact events when the tool result was denied", async () => {
    const notifier = { notifyAgentArtifactPersisted: vi.fn(), notifyAgentArtifactUpdated: vi.fn() };
    const context = buildContext(notifier);

    const processor = new AgentArtifactEventProcessor();
    const event = new ToolResultEvent(
      "write_file",
      null,
      "tool-2",
      "User denied",
      { path: "src/app.py" },
      undefined,
      true,
    );

    await processor.process(event, context);

    expect(notifier.notifyAgentArtifactPersisted).not.toHaveBeenCalled();
    expect(notifier.notifyAgentArtifactUpdated).not.toHaveBeenCalled();
  });

  it("emits generic output artifact events", async () => {
    const notifier = { notifyAgentArtifactPersisted: vi.fn(), notifyAgentArtifactUpdated: vi.fn() };
    const context = buildContext(notifier);

    const processor = new AgentArtifactEventProcessor();
    const event = new ToolResultEvent("create_video", { status: "success" }, undefined, undefined, {
      output_video_path: "videos/demo.mp4",
    });

    await processor.process(event, context);

    const payload = (notifier.notifyAgentArtifactPersisted as any).mock.calls[0][0];
    expect(payload.path).toBe("videos/demo.mp4");
    expect(payload.type).toBe("video");
  });

  it("emits generic destination-file artifact events", async () => {
    const notifier = { notifyAgentArtifactPersisted: vi.fn(), notifyAgentArtifactUpdated: vi.fn() };
    const context = buildContext(notifier);

    const processor = new AgentArtifactEventProcessor();
    const event = new ToolResultEvent("export_pdf", { status: "done" }, undefined, undefined, {
      destination_file: "docs/report.pdf",
    });

    await processor.process(event, context);

    const payload = (notifier.notifyAgentArtifactPersisted as any).mock.calls[0][0];
    expect(payload.path).toBe("docs/report.pdf");
    expect(payload.type).toBe("pdf");
  });
});
