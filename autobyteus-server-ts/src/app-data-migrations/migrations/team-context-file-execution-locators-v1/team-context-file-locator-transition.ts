import fs from "node:fs/promises";
import path from "node:path";
import { AgentMemoryLayout } from "../../../agent-memory/store/agent-memory-layout.js";
import { TeamExecutionIndex } from "../../../agent-team-execution/services/team-execution-index.js";
import { AgentOrgExecutionIndex } from "../../../agent-org-execution/services/agent-org-execution-index.js";
import { validateTeamRunExecutionTreePayload } from "../../../run-history/store/team-run-execution-tree-schema.js";
import { validateAgentOrgRunExecutionTreePayload } from "../../../run-history/store/agent-org-run-execution-tree-schema.js";
import { getTeamRunExecutionTreePath } from "../../../run-history/store/team-run-execution-tree-path.js";
import { getAgentOrgRunExecutionTreePath } from "../../../run-history/store/agent-org-run-execution-tree-path.js";
import { assertStoredFilename, buildFinalContextFileLocator, parseFinalContextFileOwnerDescriptor } from "../../../context-files/domain/context-file-owner-types.js";
import { listContextFileRecordSources, transformContextFileRecordLocators, type ContextFileRecordSource } from "../../../context-files/services/context-file-record-locators.js";

type Owner = { teamRunId: string; agentRunId: string; address: string; directory: string };
export type LocatorMapping = { field: string; original: string; target: string; agentRunId: string; proof: "source-trace" | "unique-physical-owner" };
const readJson = async (file: string) => JSON.parse(await fs.readFile(file, "utf8"));
const directories = async (directory: string): Promise<string[]> => {
  const entries = await fs.readdir(directory, { withFileTypes: true }).catch((error: NodeJS.ErrnoException) => {
    if (error.code === "ENOENT") return [];
    throw error;
  });
  if (entries.some((entry) => entry.isSymbolicLink())) throw new Error(`Unsupported symlink under '${directory}'.`);
  return entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort();
};

/** No historical selectors escape this startup-only converter. */
export class TeamContextFileLocatorTransition {
  private readonly owners: Owner[] = [];
  private readonly roots: string[] = [];
  private readonly agents: string[] = [];
  private readonly layout: AgentMemoryLayout;
  constructor(private readonly memoryDir: string, private readonly baseUrl: string) {
    this.layout = new AgentMemoryLayout(memoryDir);
  }

  async discover(): Promise<ContextFileRecordSource[]> {
    for (const id of await directories(this.layout.getTeamRootDirPath())) {
      const root = this.layout.getTeamDirPath({ rootTeamRunId: id, ancestorTeamRunIds: [] });
      const index = new TeamExecutionIndex(validateTeamRunExecutionTreePayload(await readJson(getTeamRunExecutionTreePath(root)), id));
      for (const team of index.listTeamExecutions()) this.roots.push(this.layout.getRootExecutionDirPath(index.getTeamRunPhysicalScope(team.teamRunId)));
      for (const agent of index.listAgentExecutions()) {
        const directory = this.layout.getRootedAgentRunDirPath(index.getTeamRunPhysicalScope(agent.containingTeamRunId), agent.agentRunId);
        this.agents.push(directory);
        this.owners.push({ teamRunId: agent.containingTeamRunId, agentRunId: agent.agentRunId, address: agent.address, directory });
      }
    }
    for (const id of await directories(this.layout.getOrgRootDirPath())) {
      const root = this.layout.getOrgDirPath(id);
      const index = new AgentOrgExecutionIndex(validateAgentOrgRunExecutionTreePayload(await readJson(getAgentOrgRunExecutionTreePath(root)), id));
      this.roots.push(root);
      for (const team of index.listTeams()) this.roots.push(this.layout.getRootExecutionDirPath(index.getPhysicalScopeForTeam(team.teamRunId)));
      for (const agent of index.listAgents()) this.agents.push(this.layout.getRootedAgentRunDirPath(index.getPhysicalScopeForAgent(agent.agentRunId), agent.agentRunId));
    }
    for (const id of await directories(this.layout.getStandaloneRootDirPath())) this.agents.push(this.layout.getStandaloneRunDirPath(id));
    const sources = await listContextFileRecordSources({ rootDirectories: this.roots, agentDirectories: this.agents });
    for (const source of sources) await this.assertContainedRegularFile(source.filePath);
    return sources;
  }

  async assertContainedRegularFile(file: string): Promise<void> {
    const root = await fs.realpath(this.memoryDir);
    const actual = await fs.realpath(file);
    if (actual !== path.resolve(root, path.relative(this.memoryDir, file)) || !actual.startsWith(`${root}${path.sep}`) || !(await fs.lstat(file)).isFile()) {
      throw new Error(`Not a contained regular migration file: '${file}'.`);
    }
  }

  async transform(source: ContextFileRecordSource, text: string, mappings: LocatorMapping[] = []): Promise<string> {
    return transformContextFileRecordLocators(source, text, (uri, field) => this.locator(uri, source, field, mappings).catch((error) => {
      throw new Error(`${source.filePath}:${field}: ${(error as Error).message}`);
    }));
  }

  private async locator(uri: string, source: ContextFileRecordSource, field: string, mappings: LocatorMapping[]): Promise<string> {
    let prefix = "", rawPath: string, suffix: string;
    if (/^https?:\/\//i.test(uri)) {
      const parsed = new URL(uri);
      if (parsed.origin !== new URL(this.baseUrl).origin && !["localhost", "127.0.0.1", "[::1]"].includes(parsed.hostname)) return uri;
      prefix = uri.match(/^https?:\/\/[^/?#]+/i)![0];
      const remainder = uri.slice(prefix.length);
      const cut = remainder.search(/[?#]/);
      rawPath = cut < 0 ? remainder : remainder.slice(0, cut);
      suffix = cut < 0 ? "" : remainder.slice(cut);
    } else if (uri.startsWith("/rest/") || uri.startsWith("rest/")) {
      const cut = uri.search(/[?#]/);
      rawPath = cut < 0 ? uri : uri.slice(0, cut);
      suffix = cut < 0 ? "" : uri.slice(cut);
    } else return uri;
    const relative = rawPath.startsWith("rest/");
    const pathname = relative ? `/${rawPath}` : rawPath;
    const match = pathname.match(/^\/rest\/team-runs\/([^/]+)\/(members|agent-runs)\/([^/]+)\/context-files\/([^/]+)$/);
    if (!match) return uri;
    const teamRunId = decodeURIComponent(match[1]!);
    const current = match[2] === "agent-runs";
    const selector = decodeURIComponent(match[3]!);
    const filename = assertStoredFilename(decodeURIComponent(match[4]!));
    // Validate identities before using any matching data as a filesystem authority.
    parseFinalContextFileOwnerDescriptor({ kind: "team_member_final", teamRunId, agentRunId: current ? selector : "historical-selector" });
    const scoped = this.owners.filter((owner) => owner.teamRunId === teamRunId && (current ? owner.agentRunId === selector
      : owner.address === selector || !selector.startsWith("/") && (owner.address === `/${selector}` || owner.address.split("/").at(-1) === selector)));
    const matches: Owner[] = [];
    for (const owner of scoped) {
      const file = path.join(owner.directory, "context_files", filename);
      try { await this.assertContainedRegularFile(file); matches.push(owner); }
      catch (error) { if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error; }
    }
    const provenance = source.kind === "trace" ? matches.filter((owner) => source.filePath.startsWith(`${owner.directory}${path.sep}`)) : [];
    const candidates = provenance.length === 1 ? provenance : matches;
    if (candidates.length !== 1) throw new Error(`Expected one proven attachment owner for '${uri}'; found ${candidates.length}.`);
    const owner = candidates[0]!;
    if (current) return uri;
    const locator = buildFinalContextFileLocator({ kind: "team_member_final", teamRunId, agentRunId: owner.agentRunId }, filename);
    const target = prefix + (relative ? locator.slice(1) : locator) + suffix;
    mappings.push({ field, original: uri, target, agentRunId: owner.agentRunId, proof: provenance.length === 1 ? "source-trace" : "unique-physical-owner" });
    return target;
  }
}
