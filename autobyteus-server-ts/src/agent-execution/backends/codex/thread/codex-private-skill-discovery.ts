import fs from "node:fs/promises";
import path from "node:path";
import type { RuntimeSkillProfile } from "../../shared/runtime-skill-profile.js";
import type { CodexAppServerClient } from "../../../../runtime-management/codex/client/codex-app-server-client.js";

/** Match canonical source paths: Codex can resolve a directory link before listing it.
 * The native result, not the link spelling, is the usable skill name/manifest path.
 */
export async function discoverCodexPrivateSkills(client: Pick<CodexAppServerClient, "request">, cwd: string, profile: RuntimeSkillProfile): Promise<string> {
  const response = await client.request<{ data?: { cwd: string; skills?: { name: string; path: string; enabled: boolean }[] }[] }>(
    "skills/list", { cwds: [cwd], forceReload: true },
  );
  const rows = (response.data ?? []).filter(entry => entry.cwd === cwd).flatMap(entry => entry.skills ?? []);
  const mapped: string[] = [];
  for (const exposure of profile.exposures) {
    const expected = await fs.realpath(path.join(exposure.sourceRoot, "SKILL.md")).catch(() => null);
    let discovered: (typeof rows)[number] | undefined;
    for (const row of rows) {
      if (!row.enabled || row.name !== exposure.skill.name || typeof row.path !== "string") continue;
      if (expected && await fs.realpath(row.path).catch(() => null) === expected) { discovered = row; break; }
    }
    if (!discovered) throw new Error(`Codex did not discover private configured skill '${exposure.skill.name}'. No shared/copy fallback.`);
    mapped.push(`- ${exposure.skill.name}: native skill $${discovered.name}; manifest ${discovered.path}.`);
  }
  return mapped.length ? "\n\n## Configured private skills\n" + mapped.join("\n") : "";
}
