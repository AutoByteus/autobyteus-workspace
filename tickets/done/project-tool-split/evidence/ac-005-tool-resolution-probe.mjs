// AC-005 / AC-004 probe (project-tool-split): which Project tools does an agent definition get from one app build?
// Runs that build's own tool resolution, read-only: the AutoByteus resolver (native registry, unknown names skipped)
// and the Agent Tools MCP catalog that Codex and Claude sessions use. No data root, no server, no run.
//
// Usage (clean environment, throwaway HOME):
//   env -i PATH="$PATH" HOME="$(mktemp -d)" node ac-005-tool-resolution-probe.mjs <server dir containing dist/>
// <server dir>: an installed app's Resources/server (release code), or a worktree's autobyteus-server-ts after `build`.
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";

const serverDir = process.argv[2];
if (!serverDir) throw new Error("Usage: node ac-005-tool-resolution-probe.mjs <server dir containing dist/>");
const dist = (file) => import(pathToFileURL(`${serverDir}/dist/${file}`).href);
const req = createRequire(`${serverDir}/package.json`);
const { defaultToolRegistry } = await import(pathToFileURL(req.resolve("autobyteus-ts/tools/registry/tool-registry.js")).href);
const { AgentDefinition } = await dist("agent-definition/domain/models.js");
const { resolveRuntimeAgentToolExposure } = await dist("agent-execution/shared/runtime-agent-tool-exposure.js");
const { resolveAutoByteusAgentTools } = await dist("agent-execution/backends/autobyteus/autobyteus-agent-tool-resolver.js");
const { AgentToolMcpCatalog } = await dist("agent-tools/mcp/agent-tool-mcp-catalog.js");
const { ProjectTaskToolsMcpAdapterProvider } = await dist("agent-tools/mcp/providers/project-task-tools-mcp-adapter-provider.js");
const { registerProjectTaskTools } = await dist("agent-tools/project-tasks/project-task-native-tools.js");

registerProjectTaskTools();
const projectTool = (name) => /project/.test(name) && name !== "list_projects" && name !== "list_project_tasks";
const catalog = new AgentToolMcpCatalog({ providers: [new ProjectTaskToolsMcpAdapterProvider()] });
console.log("server:", serverDir);
console.log("Project mutation tools this build registers (native):", defaultToolRegistry.listToolNames().filter(projectTool).sort().join(", "));
console.log("Project mutation tools this build serves (Agent Tools MCP):", new ProjectTaskToolsMcpAdapterProvider().getAdapters().map((a) => a.definition.name).filter(projectTool).join(", "));

const cases = {
  "transition list (old + new names)": ["list_projects", "list_project_tasks", "create_or_update_project", "create_project", "update_project", "create_task", "update_task", "delegate_task", "send_message_to"],
  "old name only": ["list_projects", "list_project_tasks", "create_or_update_project", "create_task", "update_task"],
  "new names only": ["list_projects", "list_project_tasks", "create_project", "update_project", "create_task", "update_task"],
};
for (const [label, toolNames] of Object.entries(cases)) {
  const agentDefinition = new AgentDefinition({ name: "Probe", description: "AC-005 probe.", toolNames });
  const exposure = resolveRuntimeAgentToolExposure(agentDefinition, null);
  const messages = [];
  const logger = { warn: (m) => messages.push(`warn: ${m}`), error: (m) => messages.push(`error: ${m}`) };
  let autobyteus;
  try {
    autobyteus = resolveAutoByteusAgentTools({ agentDefinition, runtimeToolExposure: exposure, senderRunId: "probe-run", logger }).actualToolNames.filter(projectTool);
  } catch (error) { autobyteus = `LAUNCH ERROR ${error.message}`; }
  let mcp;
  try { mcp = catalog.resolveRuntimeSessionToolExposure(exposure).enabledTools.filter(projectTool); } catch (error) { mcp = `LAUNCH ERROR ${error.message}`; }
  console.log(`\n[${label}] configured Project mutation names: ${toolNames.filter(projectTool).join(", ")}`);
  console.log(`  AutoByteus (native) gets: ${JSON.stringify(autobyteus)}`);
  console.log(`  Codex/Claude (Agent Tools MCP) get: ${JSON.stringify(mcp)}`);
  console.log(`  resolver messages about project tools: ${JSON.stringify(messages.filter((m) => /project/.test(m)))}`);
  console.log(`  resolver errors: ${messages.filter((m) => m.startsWith("error")).length}`);
}
