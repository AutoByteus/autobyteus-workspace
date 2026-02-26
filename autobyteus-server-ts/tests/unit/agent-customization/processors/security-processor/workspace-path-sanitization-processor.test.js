import { describe, expect, it } from "vitest";
import { WorkspacePathSanitizationProcessor } from "../../../../../src/agent-customization/processors/security-processor/workspace-path-sanitization-processor.js";
import { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import { UserMessageReceivedEvent } from "autobyteus-ts/agent/events/agent-events.js";
import { FileSystemWorkspace } from "../../../../../src/workspaces/filesystem-workspace.js";
import { WorkspaceConfig } from "autobyteus-ts/agent/workspace/workspace-config.js";
const normalizeSpaces = (value) => value.split(/\s+/).filter(Boolean).join(" ");
const buildContext = (workspace) => ({ agentId: "test_agent", workspace });
describe("WorkspacePathSanitizationProcessor", () => {
    it.each([
        ["/var/autobyteus/ws-1", "Error in /var/autobyteus/ws-1/src/app.py", "Error in src/app.py"],
        ["/var/autobyteus/ws-1", "Please list files in /var/autobyteus/ws-1", "Please list files in"],
        ["/app/data", "Path is /app/data/file.txt and also check /app/data", "Path is file.txt and also check"],
        ["/tmp/workspace", "cat /tmp/workspace/main.py", "cat main.py"],
        ["/home/user", "/home/user/script.sh is failing.", "script.sh is failing."],
        ["/opt/run", "Execute command in /opt/run", "Execute command in"],
        ["/var/log", "Line 1: /var/log/app.log\nLine 2: /var/log", "Line 1: app.log\nLine 2:"],
        ["C:\\Users\\Test\\Project", "File at C:\\Users\\Test\\Project\\src\\main.c", "File at src\\main.c"],
    ])("sanitizes workspace paths for %s", async (rootPath, originalContent, expectedContent) => {
        const workspace = new FileSystemWorkspace(new WorkspaceConfig({ rootPath: rootPath }));
        const context = buildContext(workspace);
        const message = new AgentInputUserMessage(originalContent);
        const processor = new WorkspacePathSanitizationProcessor();
        const result = await processor.process(message, context, new UserMessageReceivedEvent(message));
        expect(normalizeSpaces(result.content)).toBe(normalizeSpaces(expectedContent));
    });
    it.each([
        ["/var/autobyteus/ws-1", "Check /var/autobyteus/ws-1-backup/log.txt"],
        ["/var/autobyteus/ws-1", "The path is /var/autobyteus/"],
        ["/var/autobyteus/ws-1", "This is a simple message with no paths."],
        ["/home/user/project", "Do not touch /home/user/project_old/file.py"],
    ])("does not sanitize unrelated paths for %s", async (rootPath, originalContent) => {
        const workspace = new FileSystemWorkspace(new WorkspaceConfig({ rootPath: rootPath }));
        const context = buildContext(workspace);
        const message = new AgentInputUserMessage(originalContent);
        const processor = new WorkspacePathSanitizationProcessor();
        const result = await processor.process(message, context, new UserMessageReceivedEvent(message));
        expect(result.content).toBe(originalContent);
    });
    it("skips sanitization when workspace is invalid", async () => {
        const processor = new WorkspacePathSanitizationProcessor();
        const originalContent = "Some content with /some/path";
        const invalidWorkspaces = [null, {}, new (class {
            })()];
        for (const workspace of invalidWorkspaces) {
            const context = buildContext(workspace);
            const message = new AgentInputUserMessage(originalContent);
            const result = await processor.process(message, context, new UserMessageReceivedEvent(message));
            expect(result.content).toBe(originalContent);
        }
        const workspace = new FileSystemWorkspace(new WorkspaceConfig({ rootPath: "/tmp" }));
        workspace.rootPath = "";
        const context = buildContext(workspace);
        const message = new AgentInputUserMessage(originalContent);
        const result = await processor.process(message, context, new UserMessageReceivedEvent(message));
        expect(result.content).toBe(originalContent);
    });
    it("returns the expected processor name", () => {
        expect(WorkspacePathSanitizationProcessor.getName()).toBe("WorkspacePathSanitizationProcessor");
    });
});
