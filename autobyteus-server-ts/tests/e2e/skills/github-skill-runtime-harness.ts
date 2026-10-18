// Actual adapter preparation and execution-private profiles; only external provider I/O
// and lookup of a supplied agent/workspace fixture are controlled. Used after real GraphQL import/update.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { AgentDefinition } from "../../../src/agent-definition/domain/models.js";
import { SkillService } from "../../../src/skills/services/skill-service.js";
import { AgentRunContext } from "../../../src/agent-execution/domain/agent-run-context.js";
import { AgentRunConfig } from "../../../src/agent-execution/domain/agent-run-config.js";
import { RuntimeKind } from "../../../src/runtime-management/runtime-kind-enum.js";
import { CodexThreadBootstrapper } from "../../../src/agent-execution/backends/codex/backend/codex-thread-bootstrapper.js";
import { ClaudeSessionBootstrapper } from "../../../src/agent-execution/backends/claude/backend/claude-session-bootstrapper.js";
import { createGrokBuildAgentRunBackendFactory } from "../../../src/agent-execution/backends/grok/grok-build-agent-run-backend-factory.js";

export async function runtimeFixture(root: string, adapter: "codex" | "claude" | "grok", scope: "CONFIGURED" | "ALL_INSTALLED") {
  const workspace = path.join(root, "workspace"); fs.mkdirSync(workspace);
  const memoryDir = path.join(root, "runtime-private"); fs.mkdirSync(memoryDir);
  const definition = new AgentDefinition({ id: "fixture-agent", name: "Fixture", role: "assistant", description: "Skill preparation fixture", instructions: "Use writer", skillNames: ["api-writer"], skillScope: scope });
  const definitions = { getAgentDefinitionById: async () => definition };
  const workspaces = { resolveWorkingDirectory: async () => workspace };
  const mcpSessions = { activateForRun: () => ({ kind: "not_exposed" }) };
  const skills = SkillService.getInstance();
  const runtimeKind = { codex: RuntimeKind.CODEX_APP_SERVER, claude: RuntimeKind.CLAUDE_AGENT_SDK, grok: RuntimeKind.GROK_BUILD }[adapter];
  const config = () => new AgentRunConfig({ agentDefinitionId: "fixture-agent", llmModelIdentifier: "fixture", runtimeKind, workspaceId: "fixture-workspace", autoExecuteTools: false, memoryDir });
  const cleanups: Array<() => Promise<void>> = [];
  const boot = adapter === "codex" ? new CodexThreadBootstrapper(mcpSessions as never, workspaces as never, definitions as never, skills) : adapter === "claude" ? new ClaudeSessionBootstrapper(workspaces as never, definitions as never, skills) : null;
  const envKeys = ["GROK_BUILD_COMMAND", "FAKE_ACP_FIXTURE", "FAKE_ACP_RECORD"];
  const saved = envKeys.map(key => process.env[key]);
  if (adapter === "grok") {
    const fixtures = fileURLToPath(new URL("../../fixtures/grok-acp/", import.meta.url));
    // Private executable wrapper: never chmod a shared repository fixture.
    const wrapper = path.join(root, "grok-fixture");
    fs.writeFileSync(wrapper, `#!/bin/sh\nexec '${process.execPath.replaceAll("'", "'\\''")}' '${path.join(fixtures, "fake-grok-cli.mjs").replaceAll("'", "'\\''")}' "$@"\n`, { mode: 0o700 });
    process.env.GROK_BUILD_COMMAND = wrapper;
    process.env.FAKE_ACP_FIXTURE = path.join(fixtures, "handshake.jsonl");
    process.env.FAKE_ACP_RECORD = path.join(root, "acp.jsonl");
  }
  const factory = adapter === "grok" ? createGrokBuildAgentRunBackendFactory({ definitions: definitions as never, skills, workspaces, mcpSessions: mcpSessions as never }) : null;
  return {
    workspace,
    async start(id: string) {
      if (factory) {
        const parent = path.join(memoryDir, "runtime-skill-profiles");
        const before = new Set(fs.existsSync(parent) ? fs.readdirSync(parent) : []);
        const backend = await factory.beginPreparation({ kind: "new", config: config(), runId: id }).prepare();
        const cleanup = () => backend.terminate(); cleanups.push(cleanup);
        const acquired = fs.readdirSync(parent).filter(name => !before.has(name));
        if (acquired.length !== 1) throw new Error("Expected one exact new private profile");
        const link = path.join(parent, acquired[0]!, "skills", "api-writer");
        return { cleanup, link, root: fs.realpathSync(link) };
      }
      const guard = { assertAccepting: () => undefined, ownSkillProfile: (profile: {release():Promise<void>}) => cleanups.push(() => profile.release()) };
      const result = await boot!.bootstrapForCreate(new AgentRunContext({ runId: id, config: config(), runtimeContext: null }), guard);
      const profile = result.runtimeContext.privateSkillProfile!;
      return { cleanup: () => profile.release(), link: profile.exposures[0]!.linkRoot, root: profile.exposures[0]!.sourceRoot };
    },
    async close() {
      try { for (const cleanup of cleanups.reverse()) await cleanup(); }
      finally { envKeys.forEach((key, i) => { if (saved[i] === undefined) delete process.env[key]; else process.env[key] = saved[i]; }); }
    },
  };
}
