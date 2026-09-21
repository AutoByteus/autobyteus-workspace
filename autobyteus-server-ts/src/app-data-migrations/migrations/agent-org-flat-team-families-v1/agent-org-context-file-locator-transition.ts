import { assertMigrationRootId, migrationPathExists, type HistoryCandidatePlan } from "./agent-org-history-candidate-plan.js";
import fs from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { AgentMemoryLayout } from "../../../agent-memory/store/agent-memory-layout.js";
import { validateAgentOrgStatePackage } from "../../../agent-org-execution/services/agent-org-state-package-validator.js";
import { AgentOrgExecutionIndex } from "../../../agent-org-execution/services/agent-org-execution-index.js";
import { validateAgentOrgRunExecutionTreePayload } from "../../../run-history/store/agent-org-run-execution-tree-schema.js";
import { getAgentOrgRunExecutionTreePath } from "../../../run-history/store/agent-org-run-execution-tree-path.js";
import type { AtomicRunPackageFileCommitWriter } from "../../../run-history/store/atomic-run-package-file-commit-writer.js";
import { assertStoredFilename, buildFinalContextFileLocator } from "../../../context-files/domain/context-file-owner-types.js";
import { listContextFileRecordSources, transformContextFileRecordLocators, type ContextFileRecordSource } from "../../../context-files/services/context-file-record-locators.js";
import { validateTaskDelegationRecordsV1Payload } from "../../../agent-team-execution/task-delegation/records/task-delegation-records-v1-schema.js";
import { validateTeamCommunicationMessagesV1Payload } from "../../../services/team-communication/team-communication-v1-schema.js";
import { validateAgentOrgTaskDelegationRecordsV1 } from "../../../agent-org-execution/persistence/agent-org-task-delegation-records-v1-schema.js";
import { validateAgentOrgCommunicationMessagesV1 } from "../../../agent-org-execution/persistence/agent-org-communication-messages-v1-schema.js";

type RootPlan = { id: string; source: string; index: AgentOrgExecutionIndex };
type FilePlan = { source: ContextFileRecordSource; hash: string; targetHash: string; dependencies: Set<string> };
const digest = (text: string) => createHash("sha256").update(text).digest("hex");
const readJson = async (file: string) => JSON.parse(await fs.readFile(file, "utf8"));
const fileExists = async (file: string) => fs.stat(file).then((stat) => stat.isFile()).catch((error: NodeJS.ErrnoException) => {
  if (error.code === "ENOENT") return false;
  throw error;
});

/** Initial-family-cutover only: old selector knowledge never enters normal file readers. */
export class AgentOrgContextFileLocatorTransition {
  private readonly layout: AgentMemoryLayout;
  readonly dependencies = new Map<string, Set<string>>();
  private readonly referencedRoots = new Map<string, RootPlan>();
  private readonly roots = new Map<string, RootPlan>();
  readonly failures = new Map<string, string>();
  private readonly recordRoots = new Map<string, string>();
  private readonly agentDirectories: string[] = [];
  constructor(memoryDir: string, private readonly writer: AtomicRunPackageFileCommitWriter, private readonly baseUrl: () => string) {
    this.layout = new AgentMemoryLayout(memoryDir);
  }

  async prepareAndCommit(plans: readonly HistoryCandidatePlan[]): Promise<void> {
    // Keep every selected owner's metadata, even when its sidecar preflight fails:
    // referrers using a mounted Team selector must still acquire that dependency.
    for (const plan of plans) if (plan.kind !== "index-only") {
      this.roots.set(plan.id, { id: plan.id, source: plan.source, index: plan.index });
    }
    for (const plan of plans) {
      if (plan.kind === "index-only") continue;
      this.recordRoots.set(plan.source, plan.id);
      this.dependencies.set(plan.id, new Set([plan.id]));
      try { await this.addRoot({ id: plan.id, source: plan.source, index: plan.index }, plan.kind !== "source-root"); }
      catch (error) { this.fail(new Set([plan.id]), plan.source, error); }
    }
    const sources: ContextFileRecordSource[] = [];
    for (const [directory, id] of this.recordRoots) {
      if (this.failures.has(id)) continue;
      try {
        sources.push(...await listContextFileRecordSources({ rootDirectories: [directory],
          agentDirectories: this.agentDirectories.filter((agent) => agent.startsWith(`${directory}${path.sep}`)) }));
      } catch (error) { this.fail(new Set([id]), directory, error); }
    }
    const plan: FilePlan[] = [];
    // Complete ownership/physical proof for every file before the first record write.
    for (const source of sources) {
      const dependencies = new Set<string>();
      const own = [...this.recordRoots].find(([directory]) => source.filePath.startsWith(`${directory}${path.sep}`))?.[1];
      if (own && this.failures.has(own)) continue;
      if (own && this.roots.has(own)) dependencies.add(own);
      try {
        const text = await fs.readFile(source.filePath, "utf8");
        if (source.kind !== "trace") this.validateSidecar(source, text, own!);
        const target = await transformContextFileRecordLocators(source, text, (uri, field) => this.transform(uri, dependencies).catch((error) => {
          throw new Error(`${field}: ${error instanceof Error ? error.message : String(error)}`);
        }));
        if (own) for (const id of dependencies) this.dependencies.get(own)?.add(id);
        plan.push({ source, hash: digest(text), targetHash: digest(target), dependencies });
      } catch (error) {
        if (own) for (const id of dependencies) this.dependencies.get(own)?.add(id);
        this.fail(dependencies, source.filePath, error);
      }
    }
    for (const file of plan) {
      if ([...file.dependencies].some((id) => this.failures.has(id))) continue;
      try {
        const text = await fs.readFile(file.source.filePath, "utf8");
        if (digest(text) !== file.hash) throw new Error("Source changed after locator preflight.");
        const target = await transformContextFileRecordLocators(file.source, text, (uri) => this.transform(uri, new Set()));
        if (digest(target) !== file.targetHash) throw new Error("Physical ownership changed after locator preflight.");
        if (text !== target) {
          const result = await this.writer.writeSerializedText({ file: "context_file_locators", filePath: file.source.filePath, text: target });
          if (result.outcome !== "committed") throw new Error(`Locator write ${result.outcome}:${result.stage}.`);
        }
        const actual = await fs.readFile(file.source.filePath, "utf8");
        if (actual !== target) throw new Error("Locator strict reread differs from planned bytes.");
        await transformContextFileRecordLocators(file.source, actual, async (uri) => {
          if (await this.transform(uri, new Set()) !== uri) throw new Error("Locator did not reach current target.");
          return uri;
        });
      } catch (error) { this.fail(file.dependencies, file.source.filePath, error); }
    }
  }

  /** Pre-rename uses the source slot; target-only retry uses the moved slot. No path guessing. */
  async validateRoot(directory: string, id: string): Promise<void> {
    const plan = this.roots.get(id);
    if (!plan || this.failures.has(id)) throw new Error(this.failures.get(id) ?? `Missing locator plan for '${id}'.`);
    const source = plan.source;
    plan.source = directory;
    try {
      const agents = plan.index.listAgents().map((agent) => this.agentDirectory(plan, agent.agentRunId));
      for (const file of await listContextFileRecordSources({ rootDirectories: [directory], agentDirectories: agents })) {
        const text = await fs.readFile(file.filePath, "utf8");
        if (await transformContextFileRecordLocators(file, text, (uri) => this.transform(uri, new Set())) !== text) {
          throw new Error(`Uncommitted locator transition in '${file.filePath}'.`);
        }
      }
    } catch (error) { plan.source = source; throw error; }
    // The current physical slot becomes authoritative only after successful validation.
  }

  private validateSidecar(source: ContextFileRecordSource, text: string, id: string): void {
    const value = JSON.parse(text);
    const org = path.basename(source.filePath).startsWith("agent_org_");
    if (source.kind === "tasks") {
      if (org) validateAgentOrgTaskDelegationRecordsV1(value, id);
      else validateTaskDelegationRecordsV1Payload(value, id);
    } else {
      if (org) validateAgentOrgCommunicationMessagesV1(value, id);
      else validateTeamCommunicationMessagesV1Payload(value, id);
    }
  }

  private async addRoot(plan: RootPlan, org: boolean): Promise<void> {
    const rawTasks = await readJson(path.join(plan.source, org ? "agent_org_task_delegation_records.json" : "task_delegation_records.json"));
    const rawMessages = await readJson(path.join(plan.source, org ? "agent_org_communication_messages.json" : "team_communication_messages.json"));
    const taskRecords = org ? validateAgentOrgTaskDelegationRecordsV1(rawTasks, plan.id)
      : validateAgentOrgTaskDelegationRecordsV1({ schemaVersion: 1, subjectKind: "agent_org", orgRunId: plan.id,
        records: validateTaskDelegationRecordsV1Payload(rawTasks, plan.id).records }, plan.id);
    const communicationMessages = org ? validateAgentOrgCommunicationMessagesV1(rawMessages, plan.id)
      : validateAgentOrgCommunicationMessagesV1({ schemaVersion: 1, subjectKind: "agent_org", orgRunId: plan.id,
        messages: validateTeamCommunicationMessagesV1Payload(rawMessages, plan.id).messages }, plan.id);
    validateAgentOrgStatePackage({ executionTree: plan.index.tree, taskRecords, communicationMessages });
    this.roots.set(plan.id, plan);
    this.agentDirectories.push(...plan.index.listAgents().map((agent) => this.agentDirectory(plan, agent.agentRunId)));
  }
  private agentDirectory(plan: RootPlan, agentRunId: string): string {
    const scope = plan.index.getPhysicalScopeForAgent(agentRunId);
    const canonical = this.layout.getRootedAgentRunDirPath(scope, agentRunId);
    return path.join(plan.source, path.relative(this.layout.getOrgDirPath(plan.id), canonical));
  }
  private async transform(uri: string, dependencies: Set<string>): Promise<string> {
    let pathname: string, prefix = "", suffix = "";
    if (/^https?:\/\//.test(uri)) {
      const url = new URL(uri);
      if (url.origin !== new URL(this.baseUrl()).origin && !["localhost", "127.0.0.1", "::1"].includes(url.hostname)) return uri;
      pathname = url.pathname;
      // Preserve the original origin spelling and query/fragment exactly.
      const authority = uri.match(/^https?:\/\/[^/?#]+/)![0];
      prefix = authority; suffix = uri.slice(authority.length + pathname.length);
    } else if (uri.startsWith("/rest/") || uri.startsWith("rest/")) {
      const cut = uri.search(/[?#]/);
      const rawPath = cut < 0 ? uri : uri.slice(0, cut);
      pathname = rawPath.startsWith("/") ? rawPath : `/${rawPath}`;
      prefix = uri.startsWith("/") ? "" : "relative";
      suffix = cut < 0 ? "" : uri.slice(cut);
    } else return uri;
    const old = pathname.match(/^\/rest\/(team-runs|agent-org-runs)\/([^/]+)\/members\/([^/]+)\/context-files\/([^/]+)$/);
    const current = pathname.match(/^\/rest\/agent-org-runs\/([^/]+)\/agent-runs\/([^/]+)\/context-files\/([^/]+)$/);
    if (!old && !current) {
      if (/^\/rest\/drafts\/agent-org-runs\//.test(pathname)) throw new Error("Saved Org draft requires independently proven ownership before cutover.");
      return uri;
    }
    const rootOrTeam = decodeURIComponent(old ? old[2]! : current![1]!);
    const selector = decodeURIComponent(old ? old[3]! : current![2]!);
    const filename = assertStoredFilename(decodeURIComponent(old ? old[4]! : current![3]!));
    assertMigrationRootId(rootOrTeam);
    const candidates = [...this.roots.values()];
    if (!candidates.some((plan) => plan.id === rootOrTeam || old?.[1] === "team-runs" && plan.index.getTeam(rootOrTeam))) {
      let referenced = this.referencedRoots.get(rootOrTeam);
      if (!referenced && await migrationPathExists(this.layout.getOrgDirPath(rootOrTeam))) {
        if (await migrationPathExists(this.layout.getTeamDirPath({ rootTeamRunId: rootOrTeam, ancestorTeamRunIds: [] }))) throw new Error("Referenced root has a family collision.");
        const source = this.layout.getOrgDirPath(rootOrTeam);
        const tree = validateAgentOrgRunExecutionTreePayload(await readJson(getAgentOrgRunExecutionTreePath(source)), rootOrTeam);
        referenced = { id: rootOrTeam, source, index: new AgentOrgExecutionIndex(tree) };
        this.referencedRoots.set(rootOrTeam, referenced);
      }
      if (referenced) candidates.push(referenced);
    }
    const plans = candidates.filter((plan) => old?.[1] === "team-runs"
      ? plan.id === rootOrTeam || plan.index.getTeam(rootOrTeam) !== null : plan.id === rootOrTeam);
    if (!plans.length) {
      if (old?.[1] === "team-runs" && !this.failures.has(rootOrTeam)) return uri; // Unchanged flat Team family.
      dependencies.add(rootOrTeam);
      throw new Error("Referenced Org root is missing or invalid.");
    }
    plans.forEach((plan) => { if (this.roots.has(plan.id)) dependencies.add(plan.id); });
    const matches: { plan: RootPlan; agentRunId: string }[] = [];
    for (const plan of plans) {
      for (const agent of plan.index.listAgents()) {
        const containingTeam = agent.host.hostKind === "team" ? agent.host.hostRunId : plan.id;
        if (current ? agent.agentRunId !== selector : agent.address !== selector || old![1] === "team-runs" && containingTeam !== rootOrTeam) continue;
        if (await fileExists(path.join(this.agentDirectory(plan, agent.agentRunId), "context_files", filename))) matches.push({ plan, agentRunId: agent.agentRunId });
      }
    }
    if (matches.length !== 1) throw new Error(`Expected one physical attachment owner; found ${matches.length}.`);
    const match = matches[0]!;
    if (current) return uri;
    const target = buildFinalContextFileLocator({ kind: "org_member_final", orgRunId: match.plan.id, agentRunId: match.agentRunId }, filename);
    return (prefix === "relative" ? target.slice(1) : prefix + target) + suffix;
  }
  private fail(dependencies: Set<string>, file: string, error: unknown): void {
    const reason = `${file}: ${error instanceof Error ? error.message : String(error)}`;
    // A malformed selected file blocks its owner and known candidate dependencies.
    for (const id of dependencies.size ? dependencies : [file]) this.failures.set(id, reason);
  }
}
