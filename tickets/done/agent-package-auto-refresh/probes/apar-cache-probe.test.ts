import { describe, it, expect } from "vitest";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { FileAgentDefinitionProvider } from "../../src/agent-definition/providers/file-agent-definition-provider.js";
import { AgentDefinitionPersistenceProvider } from "../../src/agent-definition/providers/agent-definition-persistence-provider.js";
import { CachedAgentDefinitionProvider } from "../../src/agent-definition/providers/cached-agent-definition-provider.js";

const md = (name: string) => `---\nname: ${name}\ndescription: ${name} desc\n---\nInstructions for ${name}\n`;

describe("APAR probe: agent cache with an invalid agent-config.json", () => {
  it("records behavior", async () => {
    const base = await fs.mkdtemp(path.join(os.tmpdir(), "apar-"));
    const appData = path.join(base, "data");
    const pkg = path.join(base, "pkg");
    for (const d of [path.join(appData, "agents"), path.join(appData, "agent-teams"), path.join(appData, "agent-orgs"), path.join(pkg, "agents", "good"), path.join(pkg, "agents", "broken")]) await fs.mkdir(d, { recursive: true });
    await fs.writeFile(path.join(pkg, "agents", "good", "agent.md"), md("Good"));
    await fs.writeFile(path.join(pkg, "agents", "broken", "agent.md"), md("Broken"));
    await fs.writeFile(path.join(pkg, "agents", "broken", "agent-config.json"), "{ \"toolNames\": [");
    const appConfig = {
      getAgentsDir: () => path.join(appData, "agents"),
      getAgentTeamsDir: () => path.join(appData, "agent-teams"),
      getAgentOrgsDir: () => path.join(appData, "agent-orgs"),
      getAdditionalAgentPackageRoots: () => [pkg],
    } as never;
    const applicationBundleService = {
      listApplicationOwnedAgentSources: async () => [],
      listApplicationOwnedTeamSources: async () => [],
      getApplicationOwnedAgentSourceById: async () => null,
    } as never;
    const file = new FileAgentDefinitionProvider({ appConfig, applicationBundleService });
    const cached = new CachedAgentDefinitionProvider(new AgentDefinitionPersistenceProvider(file));
    const results: Record<string, string> = {};
    try { results.getAll = (await cached.getAll()).map((d) => d.id).join(","); } catch (e) { results.getAll = `THROWS ${(e as Error).name}: ${(e as Error).message}`; }
    try { results.getGood = String((await cached.getById("good"))?.id); } catch (e) { results.getGood = `THROWS ${(e as Error).name}`; }
    await fs.writeFile(path.join(pkg, "agents", "broken", "agent-config.json"), "{}");
    try { results.getGoodAfterFixNoRefresh = String((await cached.getById("good"))?.id); } catch (e) { results.getGoodAfterFixNoRefresh = `THROWS ${(e as Error).name}`; }
    await cached.refresh();
    results.afterRefresh = (await cached.getAll()).map((d) => d.id).sort().join(",");
    // team-like half-written: agent folder with no agent.md
    await fs.mkdir(path.join(pkg, "agents", "halfwritten"), { recursive: true });
    await cached.refresh();
    results.halfWrittenFolderNoMd = (await cached.getAll()).map((d) => d.id).sort().join(",");
    console.log("APAR_PROBE_RESULT", JSON.stringify(results, null, 2));
    await fs.rm(base, { recursive: true, force: true });
    expect(true).toBe(true);
  });
});
