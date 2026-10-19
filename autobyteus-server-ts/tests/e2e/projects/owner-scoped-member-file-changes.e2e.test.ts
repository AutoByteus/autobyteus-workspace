import "reflect-metadata";
import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { until } from "../helpers/agy-runtime-error-fixture.js";
import { callTool, segment, startCollaborationHarness, type CollaborationHarness, type Rec } from "../helpers/collaboration-root-harness.js";

// Team and org member file-change reads name their owner (run-file-change-owner-scoped-reads REQ-002..REQ-006, REQ-008,
// REQ-009; AC-002..AC-005, AC-007..AC-009, AC-011) over the real Studio HTTP/GraphQL server, on roots made by real Team
// and Org runs (scripted AGY actor, tests/fixtures/agy-failure-cli.mjs; no inference):
// - a Team root: its configured member writes a workspace file (`GENERATE_IMAGE:`), it delegates a task agent that writes
//   one too, and the other member keeps writing a file (`WRITE_FILE_HOLD:`, a pending file change);
// - an Org root: its direct agent and the lead of its member team each write a file and each delegate a task agent (an
//   org-root task agent and a member-team task agent) that writes one; another direct agent keeps writing a file.
// While the root runs, `getTeamMemberFileChanges` / `getAgentOrgMemberFileChanges` list each member's files from the live
// record (the pending one included), the owner REST routes serve the bytes of workspace-relative files (task agents too,
// against their own launch workspace) and answer 409 for the pending file. The run-id surfaces give every member nothing
// (the members' runs are active). An agent named under another owner gets an error (list) or 404 (content). After the
// root stops, the same lists and bytes come from the saved record and the pending file answers 404 "not available".
// Each running member is first read only after its recording reached its stored `file_changes.json`: a first live read
// that overlaps a run's first file-change event can leave the live projection without that entry until the run stops
// (RunFileChangeService.load cache race, outside this ticket; follow-up FU-C of run-file-change-owner-scoped-reads).
// Run: env -i PATH="$PATH" HOME="$HOME" TMPDIR="$TMPDIR" RUN_AGY_FAILURE_E2E=1 \
//   ANTIGRAVITY_CLI_COMMAND=$PWD/autobyteus-server-ts/tests/fixtures/agy-failure-cli.mjs \
//   pnpm -C autobyteus-server-ts exec vitest run tests/e2e/projects/owner-scoped-member-file-changes.e2e.test.ts --no-watch
const { home, priorHome } = await vi.hoisted(async () => {
  // A disposable HOME keeps the scripted AGY actor's files out of the user's home.
  if (process.env["RUN_AGY_FAILURE_E2E"] !== "1") return { home: "", priorHome: process.env["HOME"] };
  const nodeFs = await import("node:fs");
  const nodeOs = await import("node:os");
  const nodePath = await import("node:path");
  const priorHome = process.env["HOME"];
  const home = nodeFs.realpathSync(nodeFs.mkdtempSync(nodePath.join(nodeOs.tmpdir(), "owner-scoped-file-changes-home-")));
  process.env["HOME"] = home;
  return { home, priorHome };
});
const cli = process.env.ANTIGRAVITY_CLI_COMMAND ?? "";
const enabled = process.env.RUN_AGY_FAILURE_E2E === "1" && spawnSync(cli, ["--version"], { stdio: "ignore" }).status === 0;
const suite = enabled ? describe : describe.skip;

const BYTES = "fake image bytes";
const NOT_FOUND = JSON.stringify({ detail: "File change not found" });
const NOT_READY = JSON.stringify({ detail: "File change content is not ready yet" });
const NOT_AVAILABLE = JSON.stringify({ detail: "File change content is not available" });
type Root = Awaited<ReturnType<CollaborationHarness["startRoot"]>>;
/** One agent whose files are read: where it lives, and the workspace-relative files it wrote. */
type Member = { label: string; address: string; agentRunId: string; files: string[]; pending?: string };

suite("Team and org member file changes are read through their owner (real HTTP/GraphQL, real Team and Org runs)", () => {
  let h: CollaborationHarness;
  const ids: Rec = {};
  let helperName = "";

  /** A file-change content read over real HTTP. */
  const content = async (route: string) => {
    const response = await fetch(new URL(`/rest${route}`, h.url));
    return { status: response.status, body: await response.text(), type: response.headers.get("content-type"), cache: response.headers.get("cache-control") };
  };
  const served = { status: 200, body: BYTES, type: "image/png", cache: "no-store" };
  const query = async (q: string, variables: Rec) => {
    try { return { data: await h.graphql(q, variables), error: null as string | null }; } catch (error) { return { data: null as Rec | null, error: String((error as Error).message) }; }
  };
  const byRunId = async (runId: string) => (await h.graphql(`query($r:String!){getRunFileChanges(runId:$r){path}}`, { r: runId })).getRunFileChanges as Rec[];
  const runContent = (runId: string, filePath: string) => content(`/runs/${encodeURIComponent(runId)}/file-change-content?path=${encodeURIComponent(filePath)}`);
  const imageIn = (name: string) => path.join(h.workspace, name);
  /** The stored file_changes.json of a run: the folder named after the run under the data dir's memory. */
  const storedChangesOf = async (agentRunId: string): Promise<string[]> => {
    const find = async (dir: string): Promise<string | null> => {
      for (const entry of await fsp.readdir(dir, { withFileTypes: true }).catch(() => [])) {
        if (!entry.isDirectory()) continue;
        const full = path.join(dir, entry.name);
        if (entry.name === agentRunId && fs.existsSync(path.join(full, "file_changes.json"))) return path.join(full, "file_changes.json");
        const found = await find(full);
        if (found) return found;
      }
      return null;
    };
    const file = await find(path.join(h.dataDir, "memory"));
    if (!file) return [];
    return (JSON.parse(await fsp.readFile(file, "utf8")).entries as Rec[]).map((entry) => String(entry.path));
  };
  /** Waits until a member's recorded files reached its stored record (no live read before that; see the header). */
  const recordedOnDisk = (member: { label: string; agentRunId: string }, paths: string[]) =>
    until(async () => { const stored = await storedChangesOf(member.agentRunId); return paths.every((p) => stored.includes(p)); }, `${member.label} recorded on disk`, 60_000);

  beforeAll(async () => {
    h = await startCollaborationHarness("owner-scoped-file-changes-e2e");
    const suffix = Math.random().toString(16).slice(2, 8);
    for (const key of ["manager", "mate", "sibling", "lead", "peer"]) ids[key] = await h.agentDefinition(`OSF ${key} ${suffix}`);
    helperName = `OSF helper ${suffix}`;
    await h.agentDefinition(helperName);
    ids.team = await h.teamDefinition(`OSF Team ${suffix}`, [["manager", ids.manager], ["mate", ids.mate]], "manager");
    ids.squad = await h.teamDefinition(`OSF Squad ${suffix}`, [["lead", ids.lead], ["peer", ids.peer]], "lead");
    ids.org = await h.orgDefinition(`OSF Org ${suffix}`, [
      { memberName: "manager", ref: ids.manager, refType: "AGENT", refScope: "SHARED" },
      { memberName: "sibling", ref: ids.sibling, refType: "AGENT", refScope: "SHARED" },
      { memberName: "squad", ref: ids.squad, refType: "AGENT_TEAM", refScope: "SHARED" }], []);
  }, 180_000);

  afterAll(async () => {
    if (h) await h.close();
    if (home) {
      if (priorHome === undefined) delete process.env["HOME"]; else process.env["HOME"] = priorHome;
      fs.rmSync(home, { recursive: true, force: true });
    }
  }, 180_000);

  /** A member writes a workspace file (scripted generated output inside the workspace: recorded workspace-relative). */
  const writes = (root: Root, member: { agentRunId: string }, name: string) => root.sendTo(member.agentRunId, `GENERATE_IMAGE:${imageIn(name)} \nProduce the image.`);
  /** A member delegates a task agent whose first turn writes a workspace file; returns the task agent. */
  const delegatesWriter = async (root: Root, delegator: { agentRunId: string; address: string }, label: string, name: string): Promise<Member> => {
    const delegated = await root.calls(delegator.agentRunId, delegator.address, callTool("delegate_task", {
      recipient_address: `/${segment(helperName)}`, description: `GENERATE_IMAGE:${imageIn(name)} \nProduce the image.` }));
    expect(delegated, JSON.stringify(delegated)).toMatchObject({ delegated: true, target_kind: "agent" });
    const taskAgent = await root.waitForTaskAgent(delegated.target_agent_run_id as string);
    return { label, address: taskAgent.address, agentRunId: taskAgent.agentRunId!, files: [name] };
  };

  /**
   * The owner-scoped reads of every member, while the root runs (`running`) or after it stopped. `list` and `read` are
   * the owner's list query and content route; `wrongOwner` reads the same agent under another owner.
   */
  const expectOwnerReads = async (input: {
    label: string; running: boolean; members: Member[];
    list: (member: Member) => Promise<{ data: Rec | null; error: string | null }>;
    read: (member: Member, filePath: string) => Promise<Rec>;
    wrongOwner: (member: Member) => Array<Promise<{ data: Rec | null; error: string | null } | Rec>>;
  }) => {
    for (const member of input.members) {
      const label = `${input.label} ${input.running ? "running" : "stopped"}: ${member.label}`;
      const expected = [...member.files, ...(member.pending ? [member.pending] : [])].sort();
      if (input.running) await recordedOnDisk({ label, agentRunId: member.agentRunId }, expected);
      let listed: Rec[] = [];
      await until(async () => {
        const result = await input.list(member);
        if (result.error) throw new Error(result.error);
        listed = Object.values(result.data!)[0] as Rec[];
        return listed.length === expected.length;
      }, `${label}: listed`, 60_000);
      expect(listed.map((entry) => entry.path).sort(), label).toEqual(expected);
      expect(listed.every((entry) => entry.runId === member.agentRunId), label).toBe(true);
      for (const file of member.files) {
        expect(listed.find((entry) => entry.path === file), label).toMatchObject({ type: "image", status: "available", sourceTool: "generated_output" });
        expect(await input.read(member, file), `${label}: ${file}`).toEqual(served);
      }
      if (member.pending) {
        const pending = listed.find((entry) => entry.path === member.pending)!;
        if (input.running) {
          expect(pending, label).toMatchObject({ status: "pending", sourceTool: "write_file" });
          expect(await input.read(member, member.pending), `${label}: pending file while the owner runs`).toMatchObject({ status: 409, body: NOT_READY });
        } else {
          expect(await input.read(member, member.pending), `${label}: pending file after the owner stopped`).toMatchObject({ status: 404, body: NOT_AVAILABLE });
        }
      }
      expect(await input.read(member, "not-recorded.png"), `${label}: unrecorded path`).toMatchObject({ status: 404, body: NOT_FOUND });
      // The run-id surfaces serve standalone runs only: a member gets nothing, running or not (REQ-005).
      expect(await byRunId(member.agentRunId), `${label}: run-id list`).toEqual([]);
      expect(await runContent(member.agentRunId, member.files[0] ?? member.pending!), `${label}: run-id content`).toMatchObject({ status: 404, body: NOT_FOUND });
      // Named under another owner: an error (list) or "not found" (content), never the other run's files (REQ-006).
      const [wrongList, wrongContent] = await Promise.all(input.wrongOwner(member));
      expect((wrongList as Rec).data, `${label}: wrong-owner list`).toBeNull();
      expect((wrongList as Rec).error, `${label}: wrong-owner list`).toMatch(/was not found in/);
      expect(wrongContent, `${label}: wrong-owner content`).toMatchObject({ status: 404, body: NOT_FOUND });
    }
  };

  it("Team root: configured member, team task agent and a pending file, read through the team run; running, then stopped", async () => {
    const root = await h.startRoot("team", ids);
    const other = await h.startRoot("team", ids);
    const manager: Member = { label: "configured member /manager", address: "/manager", agentRunId: root.members["/manager"]!, files: ["team-manager.png"] };
    const mate: Member = { label: "configured member /mate (pending)", address: "/mate", agentRunId: root.members["/mate"]!, files: [], pending: "docs/team-pending.md" };
    writes(root, manager, manager.files[0]!);
    await recordedOnDisk(manager, manager.files);
    const taskAgent = await delegatesWriter(root, manager, "team task agent", "team-task-agent.png");
    root.sendTo(mate.agentRunId, `WRITE_FILE_HOLD:${mate.pending}`);
    const members = [manager, taskAgent, mate];
    const reads = (running: boolean) => expectOwnerReads({
      label: "Team", running, members,
      list: (member) => query(`query($t:String!,$a:String!){getTeamMemberFileChanges(teamRunId:$t,agentRunId:$a){path runId type status sourceTool}}`, { t: root.rootId, a: member.agentRunId }),
      read: (member, filePath) => content(`/team-runs/${encodeURIComponent(root.rootId)}/agent-runs/${encodeURIComponent(member.agentRunId)}/file-change-content?path=${encodeURIComponent(filePath)}`),
      wrongOwner: (member) => [
        query(`query($t:String!,$a:String!){getTeamMemberFileChanges(teamRunId:$t,agentRunId:$a){path}}`, { t: other.rootId, a: member.agentRunId }),
        content(`/team-runs/${encodeURIComponent(other.rootId)}/agent-runs/${encodeURIComponent(member.agentRunId)}/file-change-content?path=${encodeURIComponent(member.files[0] ?? member.pending!)}`),
      ],
    });
    // The member conversation lookup uses the named team only (REQ-004, AC-011): served in its team, an error in another.
    const conversation = (teamRunId: string, agentRunId: string) => query(`query($t:String!,$a:String!){getTeamMemberRunProjection(teamRunId:$t,agentRunId:$a){agentRunId}}`, { t: teamRunId, a: agentRunId });
    const expectConversationLookup = async () => {
      for (const member of members) {
        expect((await conversation(root.rootId, member.agentRunId)).data?.getTeamMemberRunProjection?.agentRunId, member.label).toBe(member.agentRunId);
        expect((await conversation(other.rootId, member.agentRunId)).error, member.label).toContain(`AgentRun '${member.agentRunId}' was not found in root TeamRun '${other.rootId}'.`);
      }
    };

    await reads(true);
    await expectConversationLookup();
    root.close();
    await h.terminate("team", root.rootId);
    other.close();
    await h.terminate("team", other.rootId);
    await reads(false);
    await expectConversationLookup();
  }, 300_000);

  it("Org root: direct agents, a member-team member, an org-root and a member-team task agent, read through the org run; running, then stopped", async () => {
    const root = await h.startRoot("org", ids);
    const other = await h.startRoot("org", ids);
    const manager: Member = { label: "direct agent /manager", address: "/manager", agentRunId: root.members["/manager"]!, files: ["org-manager.png"] };
    const lead: Member = { label: "member-team member /squad/lead", address: "/squad/lead", agentRunId: root.members["/squad/lead"]!, files: ["org-squad-lead.png"] };
    const sibling: Member = { label: "direct agent /sibling (pending)", address: "/sibling", agentRunId: root.members["/sibling"]!, files: [], pending: "docs/org-pending.md" };
    const orgList = `query($o:String!,$m:String!,$a:String!){getAgentOrgMemberFileChanges(orgRunId:$o,memberAddress:$m,agentRunId:$a){path runId type status sourceTool}}`;
    for (const member of [manager, lead]) {
      writes(root, member, member.files[0]!);
      await recordedOnDisk(member, member.files);
    }
    const rootTaskAgent = await delegatesWriter(root, manager, "org-root task agent", "org-task-agent.png");
    const squadTaskAgent = await delegatesWriter(root, lead, "member-team task agent", "org-squad-task-agent.png");
    expect([rootTaskAgent.address, squadTaskAgent.address].every(Boolean), "task agents carry their org address").toBe(true);
    root.sendTo(sibling.agentRunId, `WRITE_FILE_HOLD:${sibling.pending}`);
    const members = [manager, lead, rootTaskAgent, squadTaskAgent, sibling];
    const orgRoute = (orgRunId: string, member: Member, filePath: string, address: string | null = member.address) =>
      content(`/agent-org-runs/${encodeURIComponent(orgRunId)}/agent-runs/${encodeURIComponent(member.agentRunId)}/file-change-content?`
        + `${address === null ? "" : `memberAddress=${encodeURIComponent(address)}&`}path=${encodeURIComponent(filePath)}`);
    const reads = (running: boolean) => expectOwnerReads({
      label: "Org", running, members,
      list: (member) => query(orgList, { o: root.rootId, m: member.address, a: member.agentRunId }),
      read: (member, filePath) => orgRoute(root.rootId, member, filePath),
      wrongOwner: (member) => [
        query(orgList, { o: other.rootId, m: member.address, a: member.agentRunId }),
        orgRoute(other.rootId, member, member.files[0] ?? member.pending!),
      ],
    });
    // The org route needs the member address: missing → 400; another member's address → "not found".
    const expectAddressRules = async () => {
      expect(await orgRoute(root.rootId, manager, manager.files[0]!, null)).toMatchObject({ status: 400, body: JSON.stringify({ detail: "Missing required query parameter: memberAddress" }) });
      expect(await orgRoute(root.rootId, manager, manager.files[0]!, lead.address)).toMatchObject({ status: 404, body: NOT_FOUND });
    };

    await reads(true);
    await expectAddressRules();
    root.close();
    await h.terminate("org", root.rootId);
    other.close();
    await h.terminate("org", other.rootId);
    await reads(false);
    await expectAddressRules();
  }, 300_000);
});
