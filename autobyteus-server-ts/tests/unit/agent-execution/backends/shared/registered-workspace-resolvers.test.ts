import { describe, expect, it, vi } from "vitest";
vi.mock("../../../../../src/config/app-config-provider.js", () => ({ appConfigProvider:{config:{getTempWorkspaceDir:()=>"/local/temp"}} }));
import { ClaudeWorkspaceResolver } from "../../../../../src/agent-execution/backends/claude/claude-workspace-resolver.js";
import { CodexWorkspaceResolver } from "../../../../../src/agent-execution/backends/codex/codex-workspace-resolver.js";
import type { WorkspaceManager } from "../../../../../src/workspaces/workspace-manager.js";
import { WorkspaceAccessError } from "../../../../../src/workspaces/workspace-access-error.js";
describe.each([ClaudeWorkspaceResolver,CodexWorkspaceResolver])("ordinary registered path resolver %s",Resolver=>{
 it("propagates registered workspace resolution errors without a storage discriminator",async()=>{
  const failure=Error("ordinary permission error");const manager={getOrCreateRunWorkspace:vi.fn().mockRejectedValue(failure),getRegisteredWorkspaceRootPath:vi.fn().mockResolvedValue("/ordinary/project")} as unknown as WorkspaceManager;
  await expect(new Resolver(manager).resolveWorkingDirectory("registered")).rejects.toBe(failure);
 });
 it("retains no-selection and unknown-ID fallback",async()=>{
  const manager={getOrCreateRunWorkspace:vi.fn().mockRejectedValue(Error("unknown")),getRegisteredWorkspaceRootPath:vi.fn().mockResolvedValue(null)} as unknown as WorkspaceManager;
  const r=new Resolver(manager);expect(await r.resolveWorkingDirectory()).toBe("/local/temp");expect(await r.resolveWorkingDirectory("unknown")).toBe("/local/temp");
 });
 it("uses the selected registered workspace, not a temporary substitute",async()=>{
  const manager={getOrCreateRunWorkspace:vi.fn().mockResolvedValue({getBasePath:()=>"/ordinary/project"}),getRegisteredWorkspaceRootPath:vi.fn()} as unknown as WorkspaceManager;
  expect(await new Resolver(manager).resolveWorkingDirectory("registered")).toBe("/ordinary/project");expect(manager.getOrCreateRunWorkspace).toHaveBeenCalledWith("registered");
 });
 it("refuses a semantic memory view's workspace (WORKSPACE_NOT_RUNNABLE), never falling back to the temp workspace (autobyteus-554 AC-011)",async()=>{
  const refusal=new WorkspaceAccessError("WORKSPACE_NOT_RUNNABLE","read-only");
  const manager={getOrCreateRunWorkspace:vi.fn().mockRejectedValue(refusal),getRegisteredWorkspaceRootPath:vi.fn().mockResolvedValue(null)} as unknown as WorkspaceManager;
  await expect(new Resolver(manager).resolveWorkingDirectory("semantic_ws_operator")).rejects.toBe(refusal);
 });
});
