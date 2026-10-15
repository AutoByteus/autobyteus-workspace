import fs from "node:fs/promises";
import path from "node:path";
import type { AcpPrivateSkillAdapter } from "../acp/acp-private-skill-adapter.js";

export const grokPrivateSkills: AcpPrivateSkillAdapter = {
  runtime: "grok",
  launchArgs: (args, profile) => {
    if (args[0] !== "agent") throw new Error("Private Grok skills require agent-mode launch.");
    return ["agent", "--plugin-dir", profile.root, ...args.slice(1)];
  },
  async validate(connection, initialized, profile) {
    if (initialized._meta?.["x.ai/pluginDirs"] !== true) throw new Error("Grok does not support private plugin directories.");
    const payload = await connection.extension("_x.ai/skills/list", { cwd: profile.workingDirectory, refresh: true });
    const rows = (payload as { result?: { skills?: { name: string; path: string; enabled: boolean; plugin_name?: string }[] } }).result?.skills ?? [];
    for (const exposure of profile.exposures) {
      const expected = await fs.realpath(path.join(exposure.sourceRoot, "SKILL.md")).catch(() => null);
      let found = false;
      for (const row of rows) {
        if (row.enabled !== true || row.name !== exposure.skill.name || row.plugin_name !== "autobyteus-configured") continue;
        if (expected && typeof row.path === "string" && await fs.realpath(row.path).catch(() => null) === expected) {
          found = true; break;
        }
      }
      if (!found) throw new Error(`Grok did not discover private configured skill '${exposure.skill.name}'. No shared/copy fallback.`);
    }
  },
};
