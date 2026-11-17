import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DelegatedRunsOwnRunsV1AppDataMigration } from "../../../src/app-data-migrations/migrations/delegated-runs-own-runs-v1/delegated-runs-own-runs-v1-app-data-migration.js";
import type { AppDataMigrationRecordRepositoryLike } from "../../../src/app-data-migrations/domain/app-data-migration-types.js";
import { applySelectionToConfiguredMember, commitRuntimeSwitchOnRecord } from "../../../src/run-history/domain/runtime-selection-rule.js";
import { buildRuntimeSwitchMetadata } from "../../../src/run-history/services/agent-run-runtime-switch-commit.js";
import { AgentRunMetadataStore } from "../../../src/run-history/store/agent-run-metadata-store.js";
import { validateTeamRunExecutionTreePayload } from "../../../src/run-history/store/team-run-execution-tree-schema.js";
import {
  MEMBER_EDIT_TEAM, PENDING_SWITCH_AGENT, PENDING_SWITCH_TEAM, SWITCHED_AGENT, TEAM_EDIT_TEAM, paths, pendingSwitch, readJson, runtimeEdit,
  startedOn, writeReleasedRuntimeEdits, writeReleasedWorld, type World,
} from "../../fixtures/app-data-migrations/released-delegation-shape-fixtures.js";

/**
 * autobyteus-508 API-08 (temporary probe, not committed under tests/): a converted Settings edit is exactly what a LIVE
 * Settings save writes from the same started launch (the current rule: `applySelectionToConfiguredMember` for a member,
 * `buildRuntimeSwitchMetadata` for an agent run), and for an edit already made real, that save plus the activation's commit
 * (`commitRuntimeSwitchOnRecord`) with the session it ran on. A converted pending switch is accepted by the activation's
 * commit with its switch ID: the next input makes it real on the new runtime.
 */
const roots: string[] = [];
afterEach(async () => { vi.restoreAllMocks(); await Promise.all(roots.splice(0).map((root) => fs.rm(root, { recursive: true, force: true }))); });
const converted = async (): Promise<World> => {
  const appData = await fs.mkdtemp(path.join(os.tmpdir(), "api08-508-"));
  roots.push(appData);
  const w = { appData, memory: path.join(appData, "memory") };
  await writeReleasedWorld(w);
  await writeReleasedRuntimeEdits(w);
  vi.spyOn(console, "warn").mockImplementation(() => undefined);
  const names = { agentDefinitionName: async () => null, teamDefinitionName: async () => null };
  const ledger = { getRecord: async () => ({ status: "SUCCEEDED" }) } as unknown as Pick<AppDataMigrationRecordRepositoryLike, "getRecord">;
  const result = await new DelegatedRunsOwnRunsV1AppDataMigration(w.appData, w.memory, names, { agentRunHistoryChanged: vi.fn(), collaborationRunHistoryChanged: vi.fn() }, { ledger }).execute();
  expect(result.status).toBe("SUCCEEDED");
  return w;
};
const selectionOf = (edit: ReturnType<typeof runtimeEdit>) => ({ runtimeKind: edit.runtimeKind as any, llmModelIdentifier: edit.llmModelIdentifier, llmConfig: edit.llmConfig });
const SWITCH = pendingSwitch.switchId;

describe("API-08: a converted Settings edit equals a live Settings save (autobyteus-508)", () => {
  const teamMember = async (w: World, teamRunId: string, address: string) => {
    const tree = validateTeamRunExecutionTreePayload(await readJson(paths(w).teamFile(teamRunId)), teamRunId);
    return tree.rootTeam.members.find((member) => member.address === address)!;
  };
  /** The member as it stood before the user's save: the started launch, the session it then had, no source change. */
  const startedMember = (member: any, session: string | null, launchSource?: unknown) => {
    const { pendingRuntimeSwitch: _p, launchSource: _s, ...rest } = member;
    return { ...rest, platformAgentRunId: session, launchConfiguration: { ...member.launchConfiguration, ...startedOn() }, ...(launchSource ? { launchSource } : {}) };
  };

  it("a member's pending switch: the live save writes the same record; the next input's commit accepts it", async () => {
    const w = await converted();
    const member = await teamMember(w, PENDING_SWITCH_TEAM, "/operator");
    const live = applySelectionToConfiguredMember(startedMember(member, pendingSwitch.from.platformAgentRunId) as any, selectionOf(runtimeEdit()), SWITCH);
    expect(member).toEqual(live);
    const commit = commitRuntimeSwitchOnRecord(member, SWITCH, "codex_thread_new");
    expect(commit.kind).toBe("committed");
    expect(commit.kind === "committed" && commit.record).toMatchObject({ platformAgentRunId: "codex_thread_new", launchConfiguration: { runtimeKind: "codex_app_server" } });
    expect(commit.kind === "committed" && Object.hasOwn(commit.record, "pendingRuntimeSwitch")).toBe(false);
  });

  it("a member's own edit made real, a team edit's follower, a member's own edit on another runtime: live save + commit give the same record", async () => {
    const w = await converted();
    const cases: [string, string, string | null, ReturnType<typeof runtimeEdit>, unknown][] = [
      [MEMBER_EDIT_TEAM, "/operator", "codex_thread_7a03", runtimeEdit(), undefined],
      [TEAM_EDIT_TEAM, "/lead", null, runtimeEdit(), undefined],
      [TEAM_EDIT_TEAM, "/checker", null, runtimeEdit("autobyteus", "opus"), { origin: "agent_default", fallbacks: [] }],
    ];
    for (const [team, address, session, edit, source] of cases) {
      const member = await teamMember(w, team, address);
      const saved = applySelectionToConfiguredMember(startedMember(member, "claude_session_before", source) as any, selectionOf(edit), SWITCH);
      const committed = commitRuntimeSwitchOnRecord(saved, SWITCH, session);
      expect(committed.kind, `${team}${address}`).toBe("committed");
      expect(member, `${team}${address}`).toEqual(committed.kind === "committed" ? committed.record : null);
    }
  });

  it("delegated agent runs: the pending one equals the live save; the one made real equals live save + commit", async () => {
    const w = await converted();
    const store = new AgentRunMetadataStore(w.memory);
    const before = (metadata: any, session: string | null) => {
      const { pendingRuntimeSwitch: _p, launchSource: _s, ...rest } = metadata;
      return { ...rest, runtimeKind: "claude_agent_sdk", llmModelIdentifier: "sonnet", llmConfig: null, platformAgentRunId: session };
    };
    const pending = (await store.readMetadata(PENDING_SWITCH_AGENT))!;
    expect(pending).toEqual(buildRuntimeSwitchMetadata({ metadata: before(pending, pendingSwitch.from.platformAgentRunId) as any, selection: selectionOf(runtimeEdit()), switchId: SWITCH }));
    const real = (await store.readMetadata(SWITCHED_AGENT))!;
    const saved = buildRuntimeSwitchMetadata({ metadata: before(real, "claude_session_before") as any, selection: selectionOf(runtimeEdit()), switchId: SWITCH });
    const { pendingRuntimeSwitch: _p, ...committed } = { ...saved, platformAgentRunId: "codex_thread_7a04" };
    expect(real).toEqual(committed);
  });
});
