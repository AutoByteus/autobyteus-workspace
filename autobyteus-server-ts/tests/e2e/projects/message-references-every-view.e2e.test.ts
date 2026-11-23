import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createHash, randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import { afterAll, describe, expect, it } from "vitest";
import { segment, type Rec } from "../helpers/collaboration-root-harness.js";
import {
  createRoot, killBuiltStudios, managerOf, startBuiltStudio, terminateRoot, treeRunIds, until,
  type BuiltStudio, type Kind, type Root,
} from "../helpers/built-studio-roots.js";

// autobyteus-615 AC-007 (REQ-006): the invariant "every listed reference opens", on the BUILT Studio server (`dist/app.js`), real
// HTTP/GraphQL/WebSocket and real tools. Only the external AGY CLI is scripted (`tests/fixtures/agy-failure-cli.mjs`,
// `linked_skills`): `CALL_TOOL:{...}` makes an agent call the real tool.
// For a standalone Agent root, a Team root and an Agent Org root, the Manager delegates a task agent and a task team; then
//  - the Manager sends each a message with a reference file (between two runs: stored in both runs' logs);
//  - the task team's lead sends its teammate a message with a reference file (inside the delegated run: only in its log, the
//    case that broke, test-gap-report.md);
//  - the task agent answers the Manager with a reference file (between two runs, written by the delegated run).
// Then, for every view (each root's own Manager tab; the task agent's own tab; each task team member's tab), every message of
// `collaborationParticipantMessages` (every page) has every reference fetched through the link the web builds
// (`messageReferenceContentPath`: the list's key) and answers 200 with the file's bytes. It checks the property, not one
// example: a later move of messages, or a new kind of run, fails it. The builder is unit-tested per row kind in the web.
// Prerequisite: `pnpm -C autobyteus-server-ts build` for the current worktree (a stale dist is not proof).
// Run: env -i PATH="$PATH" HOME="$(cd "$(mktemp -d)" && pwd -P)" TMPDIR="$TMPDIR" RUN_AGY_FAILURE_E2E=1 \
//   ANTIGRAVITY_CLI_COMMAND=$PWD/autobyteus-server-ts/tests/fixtures/agy-failure-cli.mjs \
//   pnpm -C autobyteus-server-ts exec vitest run tests/e2e/projects/message-references-every-view.e2e.test.ts --no-watch
const cli = process.env.ANTIGRAVITY_CLI_COMMAND ?? "";
const enabled = process.env.RUN_AGY_FAILURE_E2E === "1" && spawnSync(cli, ["--version"], { stdio: "ignore" }).status === 0;
const suite = enabled ? describe : describe.skip;

const KINDS: Kind[] = ["agent", "team", "org"];
const ROOT_KIND = { agent: "agent", team: "agent_team", org: "agent_org" } as const;
const MEMBERS = ["lead", "member"] as const;
const PAGE_QUERY = `query($rootKind:String!,$rootRunId:String!,$agentRunId:String!,$before:JSON){
  collaborationParticipantMessages(rootKind:$rootKind,rootRunId:$rootRunId,agentRunId:$agentRunId,before:$before)}`;

/** The web's reference ID mirror (`agentOrgReferenceProjection.ts`) and link (`messageReferenceContentPath`), as the web builds them. */
const referenceIdOf = (messageId: string, file: string) => createHash("sha256").update(`${messageId}\0${file}`).digest("hex");
const referenceLink = (key: { rootKind: string; rootRunId: string }, messageId: string, file: string) =>
  `collaboration-messages/${encodeURIComponent(key.rootKind)}/${encodeURIComponent(key.rootRunId)}/messages/${encodeURIComponent(messageId)}`
  + `/references/${encodeURIComponent(referenceIdOf(messageId, file))}/content`;

type View = Readonly<{ label: string; rootKind: string; rootRunId: string; agentRunId: string }>;

suite("AC-007: every reference listed in every view opens (built server, scripted AGY)", () => {
  let root = "";
  let server: BuiltStudio | null = null;
  afterAll(async () => {
    await server?.stop().catch(() => undefined);
    killBuiltStudios();
    if (root) await fs.rm(root, { recursive: true, force: true });
  }, 60_000);

  /** Every message of one view, every page, as the Messages tab loads them (newest first, the cursor is the last row). */
  const allMessages = async (s: BuiltStudio, view: View): Promise<Rec[]> => {
    const messages: Rec[] = [];
    let before: Rec | null = null;
    for (;;) {
      const page = (await s.gql(PAGE_QUERY, { rootKind: view.rootKind, rootRunId: view.rootRunId, agentRunId: view.agentRunId, before }))
        .collaborationParticipantMessages as { messages: Rec[]; hasMore: boolean };
      messages.push(...page.messages);
      if (!page.hasMore) return messages;
      const last = page.messages.at(-1)!;
      before = { createdAt: last.createdAt, messageId: last.messageId };
    }
  };

  it("MRV-1 standalone, Team and Org roots with a delegated task agent and task team: each view's every reference answers its bytes", async () => {
    root = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), "message-references-every-view-e2e-")));
    const workspace = path.join(root, "workspace");
    for (const dir of ["home", "workspace", path.join("workspace", "refs")]) await fs.mkdir(path.join(root, dir));
    await fs.writeFile(path.join(root, ".env"), "APP_ENV=test\nAUTOBYTEUS_SERVER_HOST=http://127.0.0.1:8000\n");
    const s = server = await startBuiltStudio(root, { ANTIGRAVITY_CLI_COMMAND: cli, AGY_FAKE_CASE: "linked_skills" });
    const tag = randomUUID().slice(0, 6);
    const names = { manager: `MRV Manager ${tag}`, worker: `MRV Writer ${tag}`, crew: `MRV Crew ${tag}`, team: `MRV Team ${tag}`, org: `MRV Org ${tag}` };
    const agent = async (name: string) => (await s.gql(`mutation($input:CreateAgentDefinitionInput!){createAgentDefinition(input:$input){id}}`,
      { input: { name, role: "assistant", description: name, instructions: "Follow the request.", toolNames: [] } })).createAgentDefinition.id as string;
    const team = async (name: string, coordinator: string, nodes: Array<[string, string]>) =>
      (await s.gql(`mutation($input:CreateAgentTeamDefinitionInput!){createAgentTeamDefinition(input:$input){id}}`,
        { input: { name, description: name, instructions: "Follow requests.", coordinatorMemberName: coordinator,
          nodes: nodes.map(([memberName, ref]) => ({ memberName, ref, refScope: "SHARED" })) } })).createAgentTeamDefinition.id as string;
    const manager = await agent(names.manager);
    const worker = await agent(names.worker);
    const crew = await team(names.crew, "lead", MEMBERS.map((member) => [member, worker]));
    const teamRoot = await team(names.team, "manager", [["manager", manager]]);
    const org = (await s.gql(`mutation($input:CreateAgentOrgDefinitionInput!){createAgentOrgDefinition(input:$input){id}}`,
      { input: { name: names.org, description: names.org, instructions: "Deliver.", handoffs: [], members: [
        { memberName: "manager", ref: manager, refType: "AGENT", refScope: "SHARED" },
        { memberName: "worker", ref: worker, refType: "AGENT", refScope: "SHARED" },
        { memberName: "crew", ref: crew, refType: "AGENT_TEAM", refScope: "SHARED" }] } })).createAgentOrgDefinition.id as string;

    /** A file listed by one message: its bytes are unique, so a wrong file can never pass. */
    const reference = async (name: string) => {
      const file = path.join(workspace, "refs", `${name}-${tag}.md`);
      const bytes = `MRV ${name} ${tag}\n`;
      await fs.writeFile(file, bytes);
      return { file, bytes };
    };
    const bytesOf = new Map<string, string>();
    const views: View[] = [];
    /**
     * Each scripted send and the views it must be listed in, so the property is never checked over empty lists: a message of
     * the Manager in the root's Manager tab; the message inside the task team in both members' tabs. Whether a delegated run's
     * own tab also lists its messages with the delegator is the message view's own rule; whatever a view lists is checked.
     */
    const expected: Array<{ file: string; views: string[] }> = [];

    for (const kind of KINDS) {
      const r = await createRoot(s, kind, { manager, team: teamRoot, org }, workspace);
      const m = await managerOf(s, r);
      const address = (definition: "worker" | "crew") => kind === "org" ? `/${definition}` : `/${segment(names[definition])}`;
      const toAgent = await m.call("delegate_task", { recipient_address: address("worker"), description: `Write the ${kind} notes.` });
      expect(toAgent, JSON.stringify(toAgent)).toMatchObject({ delegated: true, target_kind: "agent" });
      const toTeam = await m.call("delegate_task", { recipient_address: address("crew"), description: `Review the ${kind} notes.` });
      expect(toTeam, JSON.stringify(toTeam)).toMatchObject({ delegated: true, target_kind: "team" });
      const taskAgent = toAgent.target_agent_run_id as string;
      const taskTeam = toTeam.target_team_run_id as string;
      const lead = toTeam.target_team_coordinator_agent_run_id as string;
      await until(async () => { const ids = await treeRunIds(s, r); return ids.includes(taskAgent) && ids.includes(taskTeam); }, `${kind}: both delegated runs in the tree`);
      const tree = (await s.gql(`query($id:String!){getTeamRunResumeConfig(teamRunId:$id){executionTree}}`, { id: taskTeam })).getTeamRunResumeConfig.executionTree;
      const teammate = (tree.root_team.members as Rec[]).find((entry) => entry.address === "/member")!.agent_run_id as string;

      const rootView = `${kind} root: Manager`;
      const agentView = `${kind}: task agent`;
      const leadView = `${kind}: task team lead`;
      const memberView = `${kind}: task team member`;
      views.push(
        { label: rootView, rootKind: ROOT_KIND[kind], rootRunId: r.rootId, agentRunId: r.managerRunId },
        { label: agentView, rootKind: "agent", rootRunId: taskAgent, agentRunId: taskAgent },
        { label: leadView, rootKind: "agent_team", rootRunId: taskTeam, agentRunId: lead },
        { label: memberView, rootKind: "agent_team", rootRunId: taskTeam, agentRunId: teammate },
      );

      // Between two runs: the Manager to each delegated run.
      for (const [target, name, listedIn] of [[taskAgent, `${kind}-to-agent`, [rootView]], [lead, `${kind}-to-lead`, [rootView]]] as const) {
        const ref = await reference(name);
        bytesOf.set(ref.file, ref.bytes);
        expected.push({ file: ref.file, views: [...listedIn] });
        expect(await m.call("send_message_to", { target_agent_run_id: target, content: `Notes for ${name}.`, reference_files: [ref.file] }))
          .toMatchObject({ accepted: true });
      }
      m.close();
      // Inside the delegated team: its lead to its teammate (only in the team's own log).
      const inside = await reference(`${kind}-inside-team`);
      bytesOf.set(inside.file, inside.bytes);
      expected.push({ file: inside.file, views: [leadView, memberView] });
      const leadTools = await managerOf(s, { kind: "team", rootId: taskTeam, managerRunId: lead } satisfies Root);
      expect(await leadTools.call("send_message_to", { recipient_address: "/member", content: "Check this draft.", reference_files: [inside.file] }))
        .toMatchObject({ accepted: true });
      leadTools.close();
      // The task agent answers the Manager (between two runs, written by the delegated run).
      const answer = await reference(`${kind}-agent-answer`);
      bytesOf.set(answer.file, answer.bytes);
      expected.push({ file: answer.file, views: [rootView] });
      const agentTools = await managerOf(s, { kind: "agent", rootId: taskAgent, managerRunId: taskAgent } satisfies Root);
      expect(await agentTools.call("send_message_to", { target_agent_run_id: r.managerRunId, content: "Done; see the file.", reference_files: [answer.file] }))
        .toMatchObject({ accepted: true });
      agentTools.close();
    }

    // Every view, every listed message, every reference: through the web's link, 200 and the file's bytes.
    const listedIn = new Map<string, Set<string>>();
    const opened: Rec[] = [];
    for (const view of views) {
      const wanted = expected.filter((entry) => entry.views.includes(view.label)).map((entry) => entry.file);
      let last: Rec[] = [];
      const messages = await until(async () => {
        last = await allMessages(s, view);
        const files = new Set(last.flatMap((message) => message.referenceFiles as string[]));
        return wanted.every((file) => files.has(file)) ? last : null;
      }, `${view.label}: every expected message is listed`, 90_000).catch((error: Error) => {
        const listed = last.map((message) => ({ from: message.senderAgentRunId, to: message.receiverAgentRunId, files: (message.referenceFiles as string[]).map((file) => path.basename(file)) }));
        throw new Error(`${error.message}; wanted ${JSON.stringify(wanted.map((file) => path.basename(file)))}; listed ${JSON.stringify(listed)}`);
      });
      for (const message of messages) {
        for (const file of message.referenceFiles as string[]) {
          const response = await fetch(`${s.url}/rest/${referenceLink(view, message.messageId as string, file)}`);
          const body = await response.text();
          expect({ view: view.label, file, status: response.status, body }).toEqual({ view: view.label, file, status: 200, body: bytesOf.get(file) });
          listedIn.set(file, (listedIn.get(file) ?? new Set()).add(view.label));
          opened.push({ view: view.label, messageId: message.messageId, file: path.basename(file) });
        }
      }
    }
    // Each scripted reference was listed (and opened) in each view it belongs to.
    for (const entry of expected) expect([...(listedIn.get(entry.file) ?? [])], path.basename(entry.file)).toEqual(expect.arrayContaining(entry.views));
    console.log(`MRV-1 opened ${opened.length} references in ${views.length} views: ${JSON.stringify(opened)}`);
    // The views that listed each reference (recorded; the assertion above is each view's every listed reference).
    console.log(`MRV-1 listed in: ${JSON.stringify(Object.fromEntries([...listedIn].map(([file, labels]) => [path.basename(file), [...labels]])))}`);

    for (const view of views.filter((entry) => entry.label.endsWith("root: Manager"))) {
      await terminateRoot(s, { kind: KINDS[["agent", "agent_team", "agent_org"].indexOf(view.rootKind)]!, rootId: view.rootRunId, managerRunId: view.agentRunId });
    }
    await s.stop();
    server = null;
  }, 900_000);
});
