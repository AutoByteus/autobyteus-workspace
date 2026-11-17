import { describe, expect, it } from "vitest";
import type { DiscoveredRun } from "../../../src/agent-memory/domain/discovered-run.js";
import { buildCatalogEntry } from "../../../src/agent-episodic-catalog/services/catalog-entry-builder.js";
import { renderCatalog } from "../../../src/agent-episodic-catalog/rendering/catalog-markdown-renderer.js";
import { RuntimeKind } from "../../../src/runtime-management/runtime-kind-enum.js";

/** A team member of a team run that a peer node's run delegated, with every fact discovery reports. */
const delegatedTeamMember: DiscoveredRun = {
  runKey: "agent_teams/eng_team_1/sub_team_2/writer_77", runId: "writer_77", memoryDir: "/m/agent_teams/eng_team_1/sub_team_2/writer_77",
  agentName: "writer", teamName: "Engineering Team", memberName: "member-name-marker", orgName: null, workspace: "/w/repo",
  runtimeKind: RuntimeKind.CODEX_APP_SERVER, subject: { kind: "TEAM_MEMBER", teamRunId: "eng_team_1", agentRunId: "writer_77" },
  root: { rootSubjectKind: "agent_team", rootRunId: "eng_team_1" }, agentDefinitionId: "team-local-agent:eng:writer",
  recordedStartAt: "2026-11-10T08:00:00.000Z",
};

const spans = [
  { journalFile: "work_journal_000001.md", path: "/m/agent_teams/eng_team_1/sub_team_2/writer_77/work_journal/work_journal_000001.md", sizeBytes: 2048, from: "2026-11-10 08:05", to: "2026-11-11 10:00" },
  { journalFile: "work_journal_active.md", path: "/m/agent_teams/eng_team_1/sub_team_2/writer_77/work_journal/work_journal_active.md", sizeBytes: 10, from: null, to: null },
];

describe("buildCatalogEntry", () => {
  it("builds exactly the contract's attributes: start and last activity from the journal headers, Task title, workspace, files (AC-013)", () => {
    const entry = buildCatalogEntry({ run: delegatedTeamMember, spans, taskTitle: "  Write the\r\nrelease notes \n" });
    expect(entry).toEqual({
      runId: "writer_77", memoryDir: "/m/agent_teams/eng_team_1/sub_team_2/writer_77", root: { rootSubjectKind: "agent_team", rootRunId: "eng_team_1" },
      agentName: "writer", startedAt: "2026-11-10 08:05", lastActivityAt: "2026-11-11 10:00", taskTitle: "Write the release notes", workspace: "/w/repo",
      journal: { folder: "/m/agent_teams/eng_team_1/sub_team_2/writer_77/work_journal", files: [
        { name: "work_journal_000001.md", from: "2026-11-10 08:05", to: "2026-11-11 10:00", sizeBytes: 2048 },
        { name: "work_journal_active.md", from: null, to: null, sizeBytes: 10 },
      ] },
    });
    // The rendered entry holds no team, org or member address, delegation, node, runtime, Task key, state or file state.
    const text = renderCatalog({ agentDefinitionId: "team-local-agent:eng:writer", folderName: "x", entries: [entry] });
    for (const absent of ["Engineering Team", "member-name-marker", "TEAM_MEMBER", "eng_team_1 ", "codex", "Codex", "open", "closed", "archived", "running", "delegat", "node"]) {
      expect(text).not.toContain(absent);
    }
  });

  it("uses the recorded start without a journal, and none when the records hold none; no Task, no About", () => {
    expect(buildCatalogEntry({ run: delegatedTeamMember, spans: null, taskTitle: null })).toMatchObject({
      startedAt: "2026-11-10 08:00", lastActivityAt: null, taskTitle: null, journal: null,
    });
    expect(buildCatalogEntry({ run: { ...delegatedTeamMember, recordedStartAt: null }, spans: [], taskTitle: "   " })).toMatchObject({
      startedAt: null, taskTitle: null, journal: null,
    });
    expect(buildCatalogEntry({ run: { ...delegatedTeamMember, recordedStartAt: "not a time" }, spans: null, taskTitle: null }).startedAt).toBeNull();
  });
});
