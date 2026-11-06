/**
 * The files of the AutoByteus-owned dsh home (`DSH_HOME`), verified against dsh 0.2.2-rc.1 (RT-018, RT-022):
 * the home patch dsh layers over its ACP profile, and the plugin that adds the agent's instructions literally.
 */

/** The variables each run's launch sets for the home patch (a discovery launch sets neither). */
export const DSH_INSTRUCTIONS_FILE_VARIABLE = "AUTOBYTEUS_DSH_INSTRUCTIONS_FILE";
export const DSH_SKILLS_DIR_VARIABLE = "AUTOBYTEUS_DSH_SKILLS_DIR";

export const DSH_INSTRUCTIONS_PLUGIN_FILE_NAME = "autobyteus-agent-instructions.mjs";

/**
 * dsh's own tools that AutoByteus replaces (DEC-006): subagents, workflows, goals and plugin installs (collaboration
 * goes through AutoByteus). dsh's ACP profile loads no team or ask-user tool, so it needs no row for them.
 */
const DISABLED_DSH_TOOLS = Object.freeze([
  "tool-subagent",
  "tool-subagent-fork",
  "tool-subagent-control",
  "tool-workflow",
  "tool-goal",
  "tool-plugin-manager",
]);

/**
 * The home patch: no dsh persona (the instructions are the agent's own), the instructions plugin, only the skills
 * folder the run gives (no default roots: never `.agents/skills` of an enclosing repository, DEC-008; an empty list
 * when the launch sets none), no session-log upload (DEC-004), and the replaced tools off.
 */
export const buildDshHomePatch = (pluginPath: string): string => [
  "# AutoByteus-owned home patch for DeepSeek Harness runs. Written by the AutoByteus server; edits are replaced.",
  "- id: system-prompt",
  "  config:",
  "    personaPrefix: ''",
  "- insert:",
  "    - id: autobyteus-agent-instructions",
  `      name: ${JSON.stringify(pluginPath)}`,
  "      config:",
  `        instructionsFile: !!js process.env.${DSH_INSTRUCTIONS_FILE_VARIABLE}`,
  "- id: skill-filesystem",
  "  config:",
  "    includeDefaultRoots: false",
  `    customSkillDirs: !!js "process.env.${DSH_SKILLS_DIR_VARIABLE} ? [process.env.${DSH_SKILLS_DIR_VARIABLE}] : []"`,
  "- id: session-log-deepseek",
  "  config:",
  "    enabled: false",
  ...DISABLED_DSH_TOOLS.flatMap((id) => [`- id: ${id}`, "  disabled: true"]),
  "",
].join("\n");

/**
 * The plugin: one system-prompt section with the run's instructions file as literal text (`interpolate: false`, so
 * `{{…}}` stays as written, DEC-017). Without a file (discovery) it adds nothing.
 */
export const DSH_INSTRUCTIONS_PLUGIN_SOURCE = `// AutoByteus agent instructions as one literal dsh system-prompt section. Written by the AutoByteus server.
import { readFileSync } from "node:fs";
export const name = "autobyteus-agent-instructions";
export const inject = ["systemPrompt"];
export function apply(ctx, config) {
  if (!config.instructionsFile) return;
  const text = readFileSync(config.instructionsFile, "utf8");
  ctx.systemPrompt.section({ name: "autobyteus:agent-instructions", order: 0, text, interpolate: false });
}
`;
