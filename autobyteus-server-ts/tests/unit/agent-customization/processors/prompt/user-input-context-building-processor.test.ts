import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { UserInputContextBuildingProcessor } from "../../../../../src/agent-customization/processors/prompt/user-input-context-building-processor.js";
import { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import { ContextFile } from "autobyteus-ts/agent/message/context-file.js";
import { SenderType } from "autobyteus-ts/agent/sender-type.js";
import { UserMessageReceivedEvent } from "autobyteus-ts/agent/events/agent-events.js";
import type { AgentContext } from "autobyteus-ts";
import { LLMProvider } from "autobyteus-ts/llm/providers.js";
import { FileSystemWorkspace } from "../../../../../src/workspaces/filesystem-workspace.js";
import { WorkspaceConfig } from "autobyteus-ts/agent/workspace/workspace-config.js";

type MockLlm = {
  model: { name: string; provider?: unknown; modelIdentifier?: string };
  systemMessage: string;
};

const buildContext = (options: {
  workspace?: FileSystemWorkspace | null;
  modelName?: string;
  provider?: unknown;
  systemMessage?: string;
  customData?: Record<string, any>;
} = {}): AgentContext => {
  const llmInstance: MockLlm = {
    model: {
      name: options.modelName ?? "test-model",
      provider: options.provider ?? LLMProvider.OPENAI,
    },
    systemMessage: options.systemMessage ?? "System Prompt.",
  };

  return {
    agentId: "test_agent",
    workspace: options.workspace ?? null,
    llmInstance,
    config: { systemPrompt: options.systemMessage ?? null },
    customData: options.customData ?? {},
  } as AgentContext;
};

describe("UserInputContextBuildingProcessor", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "autobyteus-user-input-"));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it("resolves relative paths and builds context", async () => {
    const filePath = path.join(tempDir, "test.txt");
    fs.writeFileSync(filePath, "relative content");

    const workspace = new FileSystemWorkspace(new WorkspaceConfig({ rootPath: tempDir }));
    const context = buildContext({ workspace });
    const message = new AgentInputUserMessage(
      "req",
      SenderType.USER,
      [new ContextFile("test.txt")],
    );
    const processor = new UserInputContextBuildingProcessor();

    const result = await processor.process(message, context, new UserMessageReceivedEvent(message));

    expect(result.contextFiles?.[0].uri).toBe(filePath);
    expect(result.content).toContain("relative content");
  });

  it("handles absolute paths correctly", async () => {
    const absDir = path.join(tempDir, "abs");
    fs.mkdirSync(absDir);
    const absFilePath = path.join(absDir, "abs_test.txt");
    fs.writeFileSync(absFilePath, "absolute content");

    const workspace = new FileSystemWorkspace(new WorkspaceConfig({ rootPath: tempDir }));
    const context = buildContext({ workspace });
    const message = new AgentInputUserMessage(
      "req",
      SenderType.USER,
      [new ContextFile(absFilePath)],
    );
    const processor = new UserInputContextBuildingProcessor();

    const result = await processor.process(message, context, new UserMessageReceivedEvent(message));

    expect(result.contextFiles?.[0].uri).toBe(absFilePath);
    expect(result.content).toContain("absolute content");
  });

  it("resolves media files for AUTOBYTEUS provider models without ingestion", async () => {
    const imagePath = path.join(tempDir, "image.png");
    fs.writeFileSync(imagePath, "fake image data");

    const workspace = new FileSystemWorkspace(new WorkspaceConfig({ rootPath: tempDir }));
    const context = buildContext({
      workspace,
      modelName: "claude-opus",
      provider: LLMProvider.AUTOBYTEUS,
    });
    const message = new AgentInputUserMessage(
      "req",
      SenderType.USER,
      [new ContextFile("image.png")],
    );
    const processor = new UserInputContextBuildingProcessor();

    const result = await processor.process(message, context, new UserMessageReceivedEvent(message));

    expect(result.contextFiles?.[0].uri).toBe(imagePath);
    expect(result.content).not.toContain("fake image data");
  });

  it("does not ingest media files for non-AUTOBYTEUS providers", async () => {
    const imagePath = path.join(tempDir, "image.png");
    fs.writeFileSync(imagePath, "fake image data");

    const workspace = new FileSystemWorkspace(new WorkspaceConfig({ rootPath: tempDir }));
    const context = buildContext({
      workspace,
      modelName: "claude-opus",
      provider: LLMProvider.OPENAI,
    });
    const message = new AgentInputUserMessage(
      "req",
      SenderType.USER,
      [new ContextFile("image.png")],
    );
    const processor = new UserInputContextBuildingProcessor();

    const result = await processor.process(message, context, new UserMessageReceivedEvent(message));

    expect(result.contextFiles?.[0].uri).toBe(imagePath);
  });

  it("prepends system prompt for first-turn AUTOBYTEUS models", async () => {
    const workspace = new FileSystemWorkspace(new WorkspaceConfig({ rootPath: tempDir }));
    const context = buildContext({
      workspace,
      modelName: "test-model",
      provider: LLMProvider.AUTOBYTEUS,
      systemMessage: "AUTOBYTEUS System Message.",
      customData: { is_first_user_turn: true },
    });
    const message = new AgentInputUserMessage("My Requirement", SenderType.USER);
    const processor = new UserInputContextBuildingProcessor();

    const result = await processor.process(message, context, new UserMessageReceivedEvent(message));

    expect(result.content.startsWith("AUTOBYTEUS System Message.")).toBe(true);
    expect(result.content).toContain("**[User Requirement]**\nMy Requirement");
    expect(context.customData.is_first_user_turn).toBe(false);
  });

  it("does not prepend system prompt after first turn", async () => {
    const workspace = new FileSystemWorkspace(new WorkspaceConfig({ rootPath: tempDir }));
    const context = buildContext({
      workspace,
      modelName: "test-model",
      provider: LLMProvider.AUTOBYTEUS,
      systemMessage: "AUTOBYTEUS System Message.",
      customData: { is_first_user_turn: false },
    });
    const message = new AgentInputUserMessage("My Requirement", SenderType.USER);
    const processor = new UserInputContextBuildingProcessor();

    const result = await processor.process(message, context, new UserMessageReceivedEvent(message));

    expect(result.content.startsWith("AUTOBYTEUS System Message.")).toBe(false);
    expect(result.content.endsWith("**[User Requirement]**\nMy Requirement")).toBe(true);
  });

  it("does not prepend system prompt for non-AUTOBYTEUS model on first turn", async () => {
    const workspace = new FileSystemWorkspace(new WorkspaceConfig({ rootPath: tempDir }));
    const context = buildContext({
      workspace,
      modelName: "test-model",
      provider: LLMProvider.OPENAI,
      systemMessage: "AUTOBYTEUS System Message.",
      customData: { is_first_user_turn: true },
    });
    const message = new AgentInputUserMessage("My Requirement", SenderType.USER);
    const processor = new UserInputContextBuildingProcessor();

    const result = await processor.process(message, context, new UserMessageReceivedEvent(message));

    expect(result.content.startsWith("AUTOBYTEUS System Message.")).toBe(false);
    expect(result.content.endsWith("**[User Requirement]**\nMy Requirement")).toBe(true);
    expect(context.customData.is_first_user_turn).toBe(false);
  });

  it("skips missing files gracefully", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    const workspace = new FileSystemWorkspace(new WorkspaceConfig({ rootPath: tempDir }));
    const context = buildContext({ workspace });
    const message = new AgentInputUserMessage(
      "req",
      SenderType.USER,
      [new ContextFile("nonexistent.txt")],
    );
    const processor = new UserInputContextBuildingProcessor();

    const result = await processor.process(message, context, new UserMessageReceivedEvent(message));

    expect(result.contextFiles?.length ?? 0).toBe(0);
    const warnText = warnSpy.mock.calls.map((call) => call.join(" ")).join(" ");
    expect(warnText).toContain("Relative path 'nonexistent.txt' not found in workspace");
    expect(result.content).not.toContain("File: nonexistent.txt");

    warnSpy.mockRestore();
  });
});
