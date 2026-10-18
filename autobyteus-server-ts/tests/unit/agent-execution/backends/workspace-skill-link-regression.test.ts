/**
 * REQ-105 regression (workspace-skill-collision-fix): the user's setup, where the workspace skill
 * folder already holds an absolute link to the configured package skill, must not block a run on
 * any runtime; neither must a brand-new run whose member memory folder does not exist yet. A
 * different skill with the same name keeps the beta.1 collision behavior.
 *
 * Each case drives the real run preparation (Claude/Codex bootstrapper, Grok ACP factory with the
 * fake ACP agent) against a test-owned package, workspace and memory root under the OS temp dir.
 */
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AgentDefinition } from "../../../../src/agent-definition/domain/models.js";
import { ClaudeSessionBootstrapper } from "../../../../src/agent-execution/backends/claude/backend/claude-session-bootstrapper.js";
import { ClaudeAgentRunContext } from "../../../../src/agent-execution/backends/claude/backend/claude-agent-run-context.js";
import { CLAUDE_WORKSPACE_SKILL_MATERIALIZATION_PROFILE } from "../../../../src/agent-execution/backends/claude/claude-workspace-skill-materializer.js";
import { CodexThreadBootstrapper } from "../../../../src/agent-execution/backends/codex/backend/codex-thread-bootstrapper.js";
import { CODEX_WORKSPACE_SKILL_MATERIALIZATION_PROFILE } from "../../../../src/agent-execution/backends/codex/codex-workspace-skill-materializer.js";
import { GROK_WORKSPACE_SKILL_MATERIALIZATION_PROFILE } from "../../../../src/agent-execution/backends/grok/grok-workspace-skill-materializer.js";
import { grokBuildSessionProfile } from "../../../../src/agent-execution/backends/grok/grok-build-session-profile.js";
import { AcpAgentRunBackendFactory } from "../../../../src/agent-execution/backends/acp/backend/acp-agent-run-backend-factory.js";
import { AcpAgentRunContext } from "../../../../src/agent-execution/backends/acp/backend/acp-agent-run-context.js";
import {
  WorkspaceSkillMaterializer,
  type MaterializedWorkspaceSkill,
} from "../../../../src/agent-execution/backends/shared/workspace-skill-materializer.js";
import { AgentRunConfig } from "../../../../src/agent-execution/domain/agent-run-config.js";
import { AgentRunContext } from "../../../../src/agent-execution/domain/agent-run-context.js";
import { CodexAppServerClientManager } from "../../../../src/runtime-management/codex/client/codex-app-server-client-manager.js";
import type { CodexAppServerClient } from "../../../../src/runtime-management/codex/client/codex-app-server-client.js";
import { RuntimeKind } from "../../../../src/runtime-management/runtime-kind-enum.js";
import { Skill } from "../../../../src/skills/domain/models.js";
import { FAKE_ACP_AGENT, fixturePath, fixtureSessionId } from "./acp/acp-fake-agent-harness.js";

type Runtime = "claude" | "codex" | "grok";
type Scope = "CONFIGURED" | "ALL_INSTALLED";
type Prepared = { release(): Promise<void>; materialized: MaterializedWorkspaceSkill[] };

const SKILL = "solution-designer";
let root: string;
let skillRoot: string;
let workspace: string;

beforeEach(async () => {
  root = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), "workspace-skill-link-regression-")));
  // The user's package shape: <package>/agents/<agent>/skills/<skill>.
  skillRoot = path.join(root, "package", "agents", "solution-designer", "skills", SKILL);
  await fs.mkdir(skillRoot, { recursive: true });
  await fs.writeFile(path.join(skillRoot, "SKILL.md"), `---\nname: ${SKILL}\ndescription: configured\n---\nConfigured body\n`);
  workspace = path.join(root, "workspace");
  await fs.mkdir(workspace);
});
afterEach(async () => {
  vi.restoreAllMocks();
  await fs.rm(root, { recursive: true, force: true });
});

const skillFolder = (runtime: Runtime) => path.join(workspace, `.${runtime}`, "skills");
const entry = (runtime: Runtime) => path.join(skillFolder(runtime), SKILL);
const linkSameSkill = async (runtime: Runtime) => {
  await fs.mkdir(skillFolder(runtime), { recursive: true });
  await fs.symlink(skillRoot, entry(runtime)); // absolute link, as the user creates it
};
const writeDifferentSkill = async (runtime: Runtime) => {
  await fs.mkdir(entry(runtime), { recursive: true });
  await fs.writeFile(path.join(entry(runtime), "SKILL.md"), `---\nname: ${SKILL}\ndescription: the user's own\n---\nOther body\n`);
};
/** A brand-new team member: the team folder exists, the member's own memory folder does not. */
const newMemberMemoryDir = async () => {
  await fs.mkdir(path.join(root, "memory", "agent_teams", "team-run"), { recursive: true });
  return path.join(root, "memory", "agent_teams", "team-run", "member");
};

const skill = () => new Skill({ name: SKILL, description: "configured", content: "", rootPath: skillRoot });
const definition = () => new AgentDefinition({ id: "solution-designer", name: "Solution Designer", description: "Designs",
  instructions: "Design.", skillNames: [SKILL], toolNames: [] });
const skillsFor = (scope: Scope) => ({
  resolveSkillScope: () => scope, hasEffectiveSkills: () => true,
  resolveConfiguredSkillBindingsForAgent: () => [{ kind: "resolved" as const, skill: skill() }],
  resolveManagedSkillForMaterialization: () => null,
});
const config = (runtimeKind: RuntimeKind, memoryDir: string) => new AgentRunConfig({
  agentDefinitionId: "solution-designer", llmModelIdentifier: "test-model", autoExecuteTools: false,
  workspaceId: "test-workspace", memoryDir, runtimeKind,
});

/** Codex lists workspace skills natively and reports a linked one at its real path. */
const codexClientManager = (runtime: Runtime) => new CodexAppServerClientManager({
  createClient: () => ({
    start: vi.fn(async () => undefined), notify: vi.fn(), onClose: vi.fn(() => () => {}), close: vi.fn(async () => undefined),
    request: vi.fn(async (method: string) => {
      if (method !== "skills/list") return {};
      const real = await fs.realpath(entry(runtime)).catch(() => null);
      return { data: [{ cwd: workspace, skills: real ? [{ name: SKILL, path: path.join(real, "SKILL.md"), enabled: true }] : [] }] };
    }),
  }) as unknown as CodexAppServerClient,
});

const prepare = async (runtime: Runtime, input: { scope: Scope; restore: boolean; memoryDir: string }): Promise<Prepared> => {
  const resolver = { resolveWorkingDirectory: vi.fn(async () => workspace) };
  const definitions = { getAgentDefinitionById: vi.fn(async () => definition()) };
  const skills = skillsFor(input.scope);
  if (runtime === "grok") {
    const materializer = new WorkspaceSkillMaterializer(GROK_WORKSPACE_SKILL_MATERIALIZATION_PROFILE);
    const fixture = input.restore ? "load" : "prompt";
    const factory = new AcpAgentRunBackendFactory({
      launchProfile: { agentLabel: "Fake Grok", command: () => process.execPath, args: () => [FAKE_ACP_AGENT],
        env: (base) => ({ ...base, FAKE_ACP_FIXTURE: fixturePath(fixture) }), normalizeModels: () => [] },
      sessionProfile: grokBuildSessionProfile, definitions: definitions as never, skills: skills as never,
      workspaces: resolver, mcpSessions: { activateForRun: vi.fn(() => ({ kind: "inactive" })) } as never,
      skillMaterializer: materializer,
    });
    const runConfig = config(RuntimeKind.GROK_BUILD, input.memoryDir);
    const acquired: MaterializedWorkspaceSkill[] = [];
    const materialize = materializer.materializeConfiguredWorkspaceSkills.bind(materializer);
    vi.spyOn(materializer, "materializeConfiguredWorkspaceSkills").mockImplementation(async (request) => {
      const result = await materialize(request); acquired.push(...result.materializedSkills); return result;
    });
    const backend = await factory.beginPreparation(input.restore
      ? { kind: "restore", context: new AgentRunContext({ runId: "grok-run", config: runConfig,
          runtimeContext: new AcpAgentRunContext(fixtureSessionId("load"), workspace) }) }
      : { kind: "new", config: runConfig, runId: "grok-run" }).prepare();
    return { release: () => backend.terminate().then(() => undefined), materialized: acquired };
  }
  const owned: MaterializedWorkspaceSkill[] = [];
  const guard = { assertAccepting: () => undefined, ownSkill: (held: MaterializedWorkspaceSkill) => { owned.push(held); } };
  if (runtime === "claude") {
    const materializer = new WorkspaceSkillMaterializer(CLAUDE_WORKSPACE_SKILL_MATERIALIZATION_PROFILE);
    const bootstrapper = new ClaudeSessionBootstrapper(resolver as never, materializer, definitions as never, skills as never);
    const runConfig = config(RuntimeKind.CLAUDE_AGENT_SDK, input.memoryDir);
    const context = input.restore
      ? await bootstrapper.bootstrapForRestore(new AgentRunContext({ runId: "claude-run", config: runConfig,
          runtimeContext: { sessionId: "existing-session", hasCompletedTurn: true, activeTurnId: null } as unknown as ClaudeAgentRunContext }), guard)
      : await bootstrapper.bootstrapForCreate(new AgentRunContext({ runId: "claude-run", config: runConfig, runtimeContext: null }), guard);
    expect(context.runtimeContext.configuredSkills.map((entry) => entry.name)).toEqual([SKILL]);
    if (input.restore) expect(context.runtimeContext.sessionId).toBe("existing-session");
    return { release: () => bootstrapper.releaseSkills(owned), materialized: context.runtimeContext.materializedConfiguredSkills };
  }
  const materializer = new WorkspaceSkillMaterializer(CODEX_WORKSPACE_SKILL_MATERIALIZATION_PROFILE);
  const bootstrapper = new CodexThreadBootstrapper({ activateForRun: () => ({ kind: "not_exposed" }) } as never, materializer,
    resolver as never, definitions as never, skills as never, codexClientManager(runtime));
  const runConfig = config(RuntimeKind.CODEX_APP_SERVER, input.memoryDir);
  const context = input.restore
    ? await bootstrapper.bootstrapForRestore(new AgentRunContext({ runId: "codex-run", config: runConfig,
        runtimeContext: { threadId: "existing-thread", activeTurnId: null } as never }), guard)
    : await bootstrapper.bootstrapForCreate(new AgentRunContext({ runId: "codex-run", config: runConfig, runtimeContext: null }), guard);
  if (input.restore) expect(context.runtimeContext.threadId).toBe("existing-thread");
  return { release: () => materializer.cleanupMaterializedWorkspaceSkills(owned), materialized: context.runtimeContext.materializedConfiguredSkills };
};

describe.each(["claude", "codex", "grok"] as const)("%s run preparation with the user's workspace skill links (REQ-105)", (runtime) => {
  beforeEach(() => { vi.spyOn(console, "warn").mockImplementation(() => undefined); });

  it.each([false, true])("brand-new member memory folder, same-skill link in the workspace: run prepares (restore=%s)", async (restore) => {
    await linkSameSkill(runtime);
    const memoryDir = await newMemberMemoryDir();

    const prepared = await prepare(runtime, { scope: "CONFIGURED", restore, memoryDir });

    // While the run holds the skill, the user's link is still there and still points at the package skill.
    expect((await fs.lstat(entry(runtime))).isSymbolicLink()).toBe(true);
    expect(await fs.readlink(entry(runtime))).toBe(skillRoot);
    expect(await fs.readFile(path.join(entry(runtime), "SKILL.md"), "utf8")).toContain("Configured body");
    // Codex already discovers the linked skill itself, so nothing is materialized for it.
    if (runtime === "codex") expect(prepared.materialized).toEqual([]);
    await prepared.release();
  });

  it("brand-new member memory folder, no workspace entry: the skill is linked for the run and removed at release", async () => {
    const memoryDir = await newMemberMemoryDir();

    const prepared = await prepare(runtime, { scope: "CONFIGURED", restore: false, memoryDir });

    expect(await fs.realpath(entry(runtime))).toBe(skillRoot);
    expect(prepared.materialized.map((held) => held.materializedRootPath)).toEqual([entry(runtime)]);
    await prepared.release();
    await expect(fs.lstat(entry(runtime))).rejects.toMatchObject({ code: "ENOENT" });
  });

  it("a different skill with the same name refuses a configured-skill run and leaves the workspace entry alone", async () => {
    await writeDifferentSkill(runtime);
    const memoryDir = await newMemberMemoryDir();

    await expect(prepare(runtime, { scope: "CONFIGURED", restore: false, memoryDir }))
      .rejects.toThrow("Workspace skill path collision");
    expect(await fs.readFile(path.join(entry(runtime), "SKILL.md"), "utf8")).toContain("Other body");
  });

  it("a different skill with the same name is preferred for an all-installed run", async () => {
    await writeDifferentSkill(runtime);
    const memoryDir = await newMemberMemoryDir();

    const prepared = await prepare(runtime, { scope: "ALL_INSTALLED", restore: false, memoryDir });

    expect(prepared.materialized).toEqual([]);
    expect(await fs.readFile(path.join(entry(runtime), "SKILL.md"), "utf8")).toContain("Other body");
    await prepared.release();
    expect(await fs.readFile(path.join(entry(runtime), "SKILL.md"), "utf8")).toContain("Other body");
  });
});
