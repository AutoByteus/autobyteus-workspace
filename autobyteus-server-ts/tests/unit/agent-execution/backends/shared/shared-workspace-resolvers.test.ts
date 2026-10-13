import { beforeEach, describe, expect, it, vi } from "vitest";
const binding = vi.hoisted(() => vi.fn());
vi.mock("../../../../../src/workspaces/shared-workspace-binding.js", () => ({ configuredSharedWorkspace: binding }));
vi.mock("../../../../../src/config/app-config-provider.js", () => ({ appConfigProvider: { config: { getTempWorkspaceDir: () => "/local/temp" } } }));
import { ClaudeWorkspaceResolver } from "../../../../../src/agent-execution/backends/claude/claude-workspace-resolver.js";
import { CodexWorkspaceResolver } from "../../../../../src/agent-execution/backends/codex/codex-workspace-resolver.js";
import type { WorkspaceManager } from "../../../../../src/workspaces/workspace-manager.js";

beforeEach(() => binding.mockReset());
describe.each([ClaudeWorkspaceResolver, CodexWorkspaceResolver])("configured shared resolver %s", (Resolver) => {
  it("never falls back after failure for a registered configured shared project", async () => {
    const failed = new Error("shared source unavailable");
    const manager = {
      getWorkspaceById: () => undefined,
      getOrCreateWorkspace: vi.fn().mockRejectedValue(failed),
      getRegisteredWorkspaceRootPath: vi.fn().mockResolvedValue("/Volumes/autobyteus-shared/project"),
    } as unknown as WorkspaceManager;
    binding.mockResolvedValue({ storageId: "configured" });
    await expect(new Resolver(manager).resolveWorkingDirectory("ws-id")).rejects.toBe(failed);
  });
  it("retains ordinary local fallback when no shared binding applies", async () => {
    const manager = {
      getWorkspaceById: () => undefined,
      getOrCreateWorkspace: vi.fn().mockRejectedValue(new Error("local unavailable")),
      getRegisteredWorkspaceRootPath: vi.fn().mockResolvedValue("/local/project"),
    } as unknown as WorkspaceManager;
    binding.mockResolvedValue(null);
    expect(await new Resolver(manager).resolveWorkingDirectory("ws-id")).toBe("/local/temp");
  });
});
