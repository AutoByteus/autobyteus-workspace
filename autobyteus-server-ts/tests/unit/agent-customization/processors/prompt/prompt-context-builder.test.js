import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { PromptContextBuilder } from "../../../../../src/agent-customization/processors/prompt/prompt-context-builder.js";
import { FileSystemWorkspace } from "../../../../../src/workspaces/filesystem-workspace.js";
import { WorkspaceConfig } from "autobyteus-ts/agent/workspace/workspace-config.js";
import { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import { ContextFile } from "autobyteus-ts/agent/message/context-file.js";
import { ContextFileType } from "autobyteus-ts/agent/message/context-file-type.js";
describe("PromptContextBuilder", () => {
    let tempDir;
    let workspace;
    beforeEach(() => {
        tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "autobyteus-prompt-context-"));
        workspace = new FileSystemWorkspace(new WorkspaceConfig({ rootPath: tempDir }));
    });
    afterEach(() => {
        fs.rmSync(tempDir, { recursive: true, force: true });
    });
    it("returns a message when no context files are provided", () => {
        const userInput = new AgentInputUserMessage("test", undefined, []);
        const builder = new PromptContextBuilder(userInput, workspace);
        const contextString = builder.buildContextString();
        expect(contextString).toBe("No context files were specified for this interaction.");
    });
    it("reads file contents with absolute paths", () => {
        const filePath = path.join(tempDir, "file1.txt");
        fs.writeFileSync(filePath, "Hello from file 1.");
        const contextFile = new ContextFile(filePath, ContextFileType.TEXT);
        const userInput = new AgentInputUserMessage("test", undefined, [contextFile]);
        const builder = new PromptContextBuilder(userInput, workspace);
        const contextString = builder.buildContextString();
        expect(contextString).toBe("File: file1.txt\nHello from file 1.");
    });
    it("skips non-readable file types", () => {
        const contextFile = new ContextFile("/fake/path/image.png", ContextFileType.IMAGE);
        const userInput = new AgentInputUserMessage("test", undefined, [contextFile]);
        const builder = new PromptContextBuilder(userInput, workspace);
        const contextString = builder.buildContextString();
        expect(contextString).toBe("No readable text-based context files were processed for this interaction.");
        expect(contextString).not.toContain("File:");
    });
    it("handles missing files", () => {
        const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => { });
        const missingPath = path.join(tempDir, "nonexistent.txt");
        const contextFile = new ContextFile(missingPath, ContextFileType.TEXT);
        const userInput = new AgentInputUserMessage("test", undefined, [contextFile]);
        const builder = new PromptContextBuilder(userInput, workspace);
        const contextString = builder.buildContextString();
        const warnText = warnSpy.mock.calls.map((call) => call.join(" ")).join(" ");
        expect(warnText).toContain("Context file not found at pre-validated path");
        expect(contextString).toBe(`File: ${missingPath}\nError: File not found.`);
        warnSpy.mockRestore();
    });
    it("does not truncate large files", () => {
        const largeContent = "A".repeat(25000);
        const filePath = path.join(tempDir, "large_file.txt");
        fs.writeFileSync(filePath, largeContent);
        const contextFile = new ContextFile(filePath, ContextFileType.TEXT);
        const userInput = new AgentInputUserMessage("test", undefined, [contextFile]);
        const builder = new PromptContextBuilder(userInput, workspace);
        const contextString = builder.buildContextString();
        expect(contextString).toBe(`File: large_file.txt\n${largeContent}`);
    });
});
