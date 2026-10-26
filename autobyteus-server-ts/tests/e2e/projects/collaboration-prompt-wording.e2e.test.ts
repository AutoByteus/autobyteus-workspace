import "reflect-metadata";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { until } from "../helpers/agy-runtime-error-fixture.js";
import { callTool, segment, startCollaborationHarness, stringsOf, type CollaborationHarness, type Rec } from "../helpers/collaboration-root-harness.js";

// collaboration-prompt-wording AC-001/AC-002 (REQ-001..004) and AC-006 (REQ-009), through the real Studio HTTP/WebSocket/GraphQL
// server, the Agent, Agent Team and Agent Org roots, scoped MCP agent tools and the AGY backend. Only the external AGY CLI is
// scripted (tests/fixtures/agy-failure-cli.mjs, `linked_skills`): `CALL_TOOL:{...}` makes an agent call the real tool. No inference.
// - CPW-P: the role each real root gives its agents picks the prompt; the collaboration part the run is started with equals the
//   approved complete view (wording/collaboration-prompt-complete-views.md in the ticket) for each of the ten rows of wording §3, with
//   no own address and no word the agent should not read (§2). The AGY run capsule's main agent file is the composed prompt, which
//   Codex, Claude and ACP receive through the same composer.
// - CPW-M: the `@` note of a message the agent receives is decided for that agent (wording §8): itself, a teammate, the agent the
//   user started (task agent of a standalone run), a sibling of an organization, and an agent only the catalog has.
// Run: env -i PATH="$PATH" HOME="$HOME" TMPDIR="$TMPDIR" RUN_AGY_FAILURE_E2E=1 \
//   ANTIGRAVITY_CLI_COMMAND=$PWD/autobyteus-server-ts/tests/fixtures/agy-failure-cli.mjs \
//   pnpm -C autobyteus-server-ts exec vitest run tests/e2e/projects/collaboration-prompt-wording.e2e.test.ts --no-watch
// COLLABORATION_VIEWS_FILE overrides the views fixture (tests/e2e/fixtures/collaboration-prompt-complete-views.md).
const { home, priorHome } = await vi.hoisted(async () => {
  // A disposable HOME keeps the scripted actors' files out of the user's home.
  if (process.env["RUN_AGY_FAILURE_E2E"] !== "1") return { home: "", priorHome: process.env["HOME"] };
  const nodeFs = await import("node:fs");
  const nodeOs = await import("node:os");
  const nodePath = await import("node:path");
  const priorHome = process.env["HOME"];
  const home = nodeFs.realpathSync(nodeFs.mkdtempSync(nodePath.join(nodeOs.tmpdir(), "cpw-e2e-home-")));
  process.env["HOME"] = home;
  return { home, priorHome };
});
const cli = process.env.ANTIGRAVITY_CLI_COMMAND ?? "";
const enabled = process.env.RUN_AGY_FAILURE_E2E === "1" && spawnSync(cli, ["--version"], { stdio: "ignore" }).status === 0;
const suite = enabled ? describe : describe.skip;

// The approved views' prompt blocks, kept next to the tests (COLLABORATION_VIEWS_FILE may point at another copy).
const viewsPath = process.env.COLLABORATION_VIEWS_FILE ?? path.resolve(__dirname, "../fixtures/collaboration-prompt-complete-views.md");
/** The six `markdown` blocks of the complete views: standalone, task agent, task agent with handoff rules, team member, organization direct agent, organization first bullet. */
const viewBlocks = (): { standalone: string; taskAgent: string; teamMember: string; orgAgent: string; orgBullet: string } => {
  const blocks = [...fs.readFileSync(viewsPath, "utf8").matchAll(/```markdown\n([\s\S]*?)\n```/g)].map((match) => match[1]!);
  if (blocks.length !== 6) throw new Error(`Expected 6 markdown blocks in ${viewsPath}, found ${blocks.length}`);
  // blocks[2] is the task agent that has handoff rules (views §2b).
  return { standalone: blocks[0]!, taskAgent: blocks[1]!, teamMember: blocks[3]!, orgAgent: blocks[4]!, orgBullet: blocks[5]! };
};
const tail = (block: string, heading: string) => block.slice(block.indexOf(heading));
const HANDOFFS = "\n\n### Handoffs";
const stripHandoffs = (text: string) => text.slice(0, text.indexOf(HANDOFFS));
const TEAMMATE_BULLET = "- To talk with a teammate, use `send_message_to` with their address.";

type Row = { role: "standalone" | "task" | "team" | "org"; handoffs: boolean; instruction?: string; orgLine?: boolean };
/** What the views say the collaboration part of the prompt is for a row (the agent identity part is the definition's own). */
const expectedCollaboration = (row: Row): string => {
  const views = viewBlocks();
  const instruction = row.instruction ? `## Team Instruction\n\n${row.instruction}\n\n` : "";
  const handoffsOf = (block: string) => block.slice(block.indexOf(HANDOFFS) + 2);
  if (row.role === "standalone") return stripHandoffs(`${tail(views.standalone, "## Working With Other Agents")}${HANDOFFS}`);
  if (row.role === "task") {
    const base = tail(views.taskAgent, "## Working With Other Agents");
    return `${instruction}${base}${row.handoffs ? `\n\n${handoffsOf(views.teamMember)}` : ""}`;
  }
  const block = row.role === "org" ? views.orgAgent : views.teamMember;
  let body = tail(block, "## AgentTeam Addressing");
  if (!row.handoffs) body = stripHandoffs(body);
  if (row.orgLine) body = body.replace(TEAMMATE_BULLET, views.orgBullet.slice(views.orgBullet.indexOf(TEAMMATE_BULLET)).trim());
  return `${instruction}${body}`;
};
/** The collaboration part of a composed prompt: from the first collaboration heading to the working environment. */
const collaborationPart = (prompt: string): string => {
  const starts = ["## Team Instruction", "## AgentTeam Addressing", "## Working With Other Agents"].map((heading) => prompt.indexOf(heading)).filter((i) => i >= 0);
  const start = Math.min(...starts);
  const end = prompt.indexOf("\n\n## Working Environment", start);
  return (end < 0 ? prompt.slice(start) : prompt.slice(start, end)).trim();
};

suite("Collaboration prompt wording through real roots (real HTTP/WS/GraphQL/scoped MCP, scripted AGY actor)", () => {
  let h: CollaborationHarness;
  const ids: Rec = {};
  const names: Rec = {};
  type RootDriver = Awaited<ReturnType<CollaborationHarness["startRoot"]>>;
  const lines = { team: "Team instruction of CPW Team", org: "Organization instruction of CPW Org" };

  beforeAll(async () => {
    h = await startCollaborationHarness("cpw-e2e");
    const suffix = Math.random().toString(16).slice(2, 8);
    for (const key of ["manager", "mate", "sibling", "outsider", "stranger"]) { names[key] = `CPW ${key} ${suffix}`; ids[key] = await h.agentDefinition(names[key]); }
    names.team = `CPW Team ${suffix}`;
    ids.team = await h.teamDefinition(names.team, [["manager", ids.manager], ["mate", ids.mate]], "manager", {
      instructions: `${lines.team} ${suffix}.`, handoffs: [{ from: "/manager", to: "/mate", rules: ["When the plan is ready."] }] });
    names.squad = `CPW Squad ${suffix}`;
    ids.squad = await h.teamDefinition(names.squad, [["lead", ids.mate], ["peer", ids.stranger]], "lead", {
      instructions: `Squad instruction ${suffix}.`, handoffs: [{ from: "/lead", to: "/peer", rules: ["When the lead is done."] }] });
    names.org = `CPW Org ${suffix}`;
    ids.org = await h.orgDefinition(names.org, [
      { memberName: "manager", ref: ids.manager, refType: "AGENT", refScope: "SHARED" },
      { memberName: "sibling", ref: ids.sibling, refType: "AGENT", refScope: "SHARED" },
      { memberName: "squad", ref: ids.squad, refType: "AGENT_TEAM", refScope: "SHARED" }],
    [{ from: "/manager", to: "/sibling", rules: ["When the plan is ready."] }, { from: "/sibling", to: "/manager", rules: ["When the sibling is done."] }]);
    ids.suffix = suffix;
  }, 180_000);

  afterAll(async () => {
    if (h) await h.close();
    if (home) {
      if (priorHome === undefined) delete process.env["HOME"]; else process.env["HOME"] = priorHome;
      fs.rmSync(home, { recursive: true, force: true });
    }
  }, 180_000);

  /** Team and organization members start when they first receive a message, as in real use; then their prompt exists. */
  const wake = async (root: RootDriver, agentRunId: string) => {
    root.sendTo(agentRunId, "Reply OK.");
    await until(async () => h.promptOf(agentRunId).then(() => true, () => false), `run ${agentRunId} started`, 60_000);
  };

  /** One real row: the run's own prompt equals the approved view, with no own address and no forbidden word. */
  const expectRow = async (label: string, agentRunId: string, address: string, row: Row) => {
    const prompt = await h.promptOf(agentRunId);
    const instruction = /## Team Instruction\n\n([^\n]+)/.exec(prompt)?.[1];
    if (row.instruction === "*") row = { ...row, instruction };
    expect(collaborationPart(prompt), `${label}: collaboration part of the prompt`).toBe(expectedCollaboration(row));
    expect(prompt, `${label}: no own address`).not.toContain(`\`${address}\``);
    expect(prompt, label).not.toMatch(/\b(your address|Your Agent address|Your address in this run)\b/i);
    expect(prompt, `${label}: no word the agent should not read`).not.toMatch(/\b(copy|copies|spawn|spawns|this run(?! id)|your run(?! id)|mounted|collaborator|brought in|nested|Task worker|root AgentTeam)\b/i);
    return prompt;
  };

  it("CPW-P1 Agent root: the host is a standalone agent; a task agent delegated to an outside agent, and a task agent team, get theirs", async () => {
    const root = await h.startRoot("agent", ids);
    await expectRow("row 1 standalone agent", root.managerRunId, `/${segment(names.manager)}`, { role: "standalone", handoffs: false });
    const delegated = await root.calls(root.managerRunId, "/", callTool("delegate_task", { recipient_address: `/${segment(names.outsider)}`, description: "Reply OK." }));
    expect(delegated, JSON.stringify(delegated)).toMatchObject({ delegated: true, target_kind: "agent" });
    await root.waitForTaskAgent(delegated.target_agent_run_id as string);
    await expectRow("row 2 task agent of a standalone agent", delegated.target_agent_run_id as string, `/${segment(names.outsider)}`, { role: "task", handoffs: false });
    // Row 8: a member of a task agent team (no organization line: the root is an Agent).
    const team = await root.calls(root.managerRunId, "/", callTool("delegate_task", { recipient_address: `/${segment(names.team)}`, description: "Reply OK." }));
    expect(team, JSON.stringify(team)).toMatchObject({ delegated: true, target_kind: "team" });
    const teamCopy = await root.waitForTaskAgent(team.target_team_run_id as string);
    const coordinator = teamCopy.members.find((member) => member.address.endsWith("/manager"));
    expect(coordinator, JSON.stringify(teamCopy.members)).toBeTruthy();
    await expectRow("row 8 member of a task agent team", coordinator!.agentRunId, "/manager", { role: "team", handoffs: true, instruction: "*" });
    root.close();
    await h.terminate("agent", root.rootId);
  }, 300_000);

  it("CPW-P2 Team root: members of a user-started team (with and without handoff rules); a task agent of the team", async () => {
    const root = await h.startRoot("team", ids);
    await wake(root, root.members["/manager"]!);
    await wake(root, root.members["/mate"]!);
    await expectRow("row 6 member of a user-started team with handoff rules", root.members["/manager"]!, "/manager", { role: "team", handoffs: true, instruction: "*" });
    await expectRow("row 7 member of a team without handoff rules", root.members["/mate"]!, "/mate", { role: "team", handoffs: false, instruction: "*" });
    const delegated = await root.calls(root.managerRunId, "/manager", callTool("delegate_task", { recipient_address: `/${segment(names.outsider)}`, description: "Reply OK." }));
    expect(delegated, JSON.stringify(delegated)).toMatchObject({ delegated: true, target_kind: "agent" });
    await root.waitForTaskAgent(delegated.target_agent_run_id as string);
    await expectRow("row 3 task agent in a Team run", delegated.target_agent_run_id as string, `/${segment(names.outsider)}`, { role: "task", handoffs: false });
    root.close();
    await h.terminate("team", root.rootId);
  }, 300_000);

  it("CPW-P3 Org root: the direct agent, a member of the organization's team, a task agent, a task agent with handoff rules and a task agent team", async () => {
    const root = await h.startRoot("org", ids);
    await wake(root, root.managerRunId);
    await wake(root, root.members["/squad/lead"]!);
    await expectRow("row 10 direct agent of an organization", root.managerRunId, "/manager", { role: "org", handoffs: true, instruction: "*" });
    await expectRow("row 9 member of an organization's team", root.members["/squad/lead"]!, "/squad/lead", { role: "team", handoffs: true, instruction: "*", orgLine: true });
    const outsider = await root.calls(root.managerRunId, "/manager", callTool("delegate_task", { recipient_address: `/${segment(names.outsider)}`, description: "Reply OK." }));
    expect(outsider, JSON.stringify(outsider)).toMatchObject({ delegated: true, target_kind: "agent" });
    await root.waitForTaskAgent(outsider.target_agent_run_id as string);
    await expectRow("row 4 task agent in an Org run", outsider.target_agent_run_id as string, `/${segment(names.outsider)}`, { role: "task", handoffs: false });
    // Row 5: a task agent at a configured organization address keeps that address's handoff rules and the organization instruction.
    const sibling = await root.calls(root.managerRunId, "/manager", callTool("delegate_task", { recipient_address: "/sibling", description: "Reply OK." }));
    expect(sibling, JSON.stringify(sibling)).toMatchObject({ delegated: true, target_kind: "agent" });
    await root.waitForTaskAgent(sibling.target_agent_run_id as string);
    await expectRow("row 5 task agent with handoff rules", sibling.target_agent_run_id as string, "/sibling", { role: "task", handoffs: true, instruction: "*" });
    // A task agent team created inside an organization: its members get the organization line.
    const squad = await root.calls(root.managerRunId, "/manager", callTool("delegate_task", { recipient_address: `/${segment(names.team)}`, description: "Reply OK." }));
    expect(squad, JSON.stringify(squad)).toMatchObject({ delegated: true, target_kind: "team" });
    const squadCopy = await root.waitForTaskAgent(squad.target_team_run_id as string);
    const lead = squadCopy.members.find((member) => member.address.endsWith("/manager"));
    expect(lead, JSON.stringify(squadCopy.members)).toBeTruthy();
    await expectRow("row 8 member of a task agent team in an organization", lead!.agentRunId, "/manager", { role: "team", handoffs: true, instruction: "*", orgLine: true });
    root.close();
    await h.terminate("org", root.rootId);
  }, 300_000);

  /** Sends a message that mentions one definition and returns the `@` note the agent received with it. */
  const mentioning = async (root: RootDriver, agentRunId: string, address: string, definitionId: string) => {
    const marker = `Reply OK. Marker ${Math.random().toString(16).slice(2, 10)}`;
    root.sendTo(agentRunId, marker, [{ kind: "agent", definition_id: definitionId }]);
    let received = "";
    await until(async () => {
      received = stringsOf(await root.conversationOf(agentRunId, address)).find((text) => text.includes(marker) && text.includes("[Mentioned agents]")) ?? "";
      return received !== "";
    }, `${address} receives the message with its @ note`, 60_000);
    return received.slice(received.indexOf("[Mentioned agents]"));
  };

  it("CPW-R1 Agent root: refusals a task agent reads from its own scoped tools (a task_id, an unknown ID, a name used as an address, itself, a task agent team's ID)", async () => {
    const root = await h.startRoot("agent", ids);
    const delegate = async (name: string) => {
      const result = await root.calls(root.managerRunId, "/", callTool("delegate_task", { recipient_address: `/${segment(name)}`, description: "Reply OK." }));
      expect(result, JSON.stringify(result)).toMatchObject({ delegated: true });
      return result;
    };
    const firstId = (await delegate(names.outsider)).target_agent_run_id as string;
    const secondId = (await delegate(names.stranger)).target_agent_run_id as string;
    await root.waitForTaskAgent(firstId);
    await root.waitForTaskAgent(secondId);
    // Each call is made over the task agent's own scoped MCP endpoint, as its CLI makes it.
    const asFirst = (name: string, args: Rec) => h.mcpCall(firstId, name, args);
    // A task agent has no task_id of its own to delegate with.
    const withTaskId = await asFirst("delegate_task", { recipient_address: `/${segment(names.stranger)}`, task_id: "task-x" });
    expect(withTaskId.text, JSON.stringify(withTaskId)).toContain("You are a task agent, so you can't use task_id. Delegate with a description instead; that work is part of your Task.");
    // An ID the sender never received from a delegation.
    const unknown = await asFirst("send_message_to", { target_agent_run_id: "not_a_task_agent_000", content: "Hello?" });
    expect(unknown.text, JSON.stringify(unknown)).toContain("No running agent has the run id 'not_a_task_agent_000', so the message was not sent. Use an exact run id you were given");
    // SR-003: a name used as an address, on both tools, says what to do instead; a message to oneself is refused plainly.
    const nameAsAddress = await asFirst("send_message_to", { recipient_address: "aic_pm_name", content: "Hello?" });
    expect(nameAsAddress.text, JSON.stringify(nameAsAddress)).toContain("'aic_pm_name' is not a valid address");
    expect(nameAsAddress.text).toContain("use send_message_to with target_agent_run_id set to the sender run id");
    const delegateToName = await asFirst("delegate_task", { recipient_address: "aic_pm_name", description: "Reply OK." });
    expect(delegateToName.text, JSON.stringify(delegateToName)).toContain("'aic_pm_name' is not a valid address");
    const toSelf = await asFirst("send_message_to", { target_agent_run_id: firstId, content: "Hello me?" });
    expect(toSelf.text, JSON.stringify(toSelf)).toContain("You can't send a message to yourself.");
    // A task agent team's own ID is not an agent's: the refusal names its coordinator's ID.
    const squad = await root.calls(root.managerRunId, "/", callTool("delegate_task", { recipient_address: `/${segment(names.team)}`, description: "Reply OK." }));
    expect(squad, JSON.stringify(squad)).toMatchObject({ delegated: true, target_kind: "team" });
    const teamRunId = squad.target_team_run_id as string;
    const coordinatorId = squad.target_team_coordinator_agent_run_id as string;
    const toTeam = await h.mcpCall(root.managerRunId, "send_message_to", { target_agent_run_id: teamRunId, content: "Hello team?" });
    expect(toTeam.text, JSON.stringify(toTeam)).toContain(`${teamRunId} is a task agent team's run id, and send_message_to talks with agents. To talk with the team, use its coordinator's run id: ${coordinatorId}.`);
    root.close();
    await h.terminate("agent", root.rootId);
  }, 300_000);

  // The cross-Task refusal reaches the agent as a result with the §7.3 text (design T-4), not as a tool error.
  it("CPW-R2 Agent root: a task agent messaging an agent of a different Task reads the refusal text", async () => {
    const root = await h.startRoot("agent", ids);
    const delegate = async (name: string) => {
      const result = await root.calls(root.managerRunId, "/", callTool("delegate_task", { recipient_address: `/${segment(name)}`, description: "Reply OK." }));
      expect(result, JSON.stringify(result)).toMatchObject({ delegated: true });
      return result.target_agent_run_id as string;
    };
    const firstId = await delegate(names.outsider);
    const secondId = await delegate(names.stranger);
    await root.waitForTaskAgent(firstId);
    await root.waitForTaskAgent(secondId);
    const crossTask = await h.mcpCall(firstId, "send_message_to", { target_agent_run_id: secondId, content: "Hello?" });
    expect(crossTask.text, JSON.stringify(crossTask)).toContain("You can't message this agent: it works on a different Task.");
    root.close();
    await h.terminate("agent", root.rootId);
  }, 300_000);

  it("CPW-M4 Agent root: a member of a task agent team mentioning its teammate is told the teammate is in its team, at the team's address (SR-011)", async () => {
    const root = await h.startRoot("agent", ids);
    const squad = await root.calls(root.managerRunId, "/", callTool("delegate_task", { recipient_address: `/${segment(names.team)}`, description: "Reply OK." }));
    expect(squad, JSON.stringify(squad)).toMatchObject({ delegated: true, target_kind: "team" });
    const teamCopy = await root.waitForTaskAgent(squad.target_team_run_id as string);
    const lead = teamCopy.members.find((member) => member.address.endsWith("/manager"));
    const mate = teamCopy.members.find((member) => member.address.endsWith("/mate"));
    expect(lead && mate, JSON.stringify(teamCopy.members)).toBeTruthy();
    const note = await mentioning(root, lead!.agentRunId, lead!.address, ids.mate);
    expect(note).toContain(`- ${names.mate} (agent) at ${mate!.address}, in your team: talk with it using send_message_to; don't delegate to it.`);
    expect(note).not.toContain("delegate_task");
    root.close();
    await h.terminate("agent", root.rootId);
  }, 300_000);

  it("CPW-R3 Agent root: catalogue results (views §12) through the real MCP tools — wrong selectors, bad addresses, wrong IDs, bad delegate_task inputs, a teammate", async () => {
    const root = await h.startRoot("agent", ids);
    const delegated = async (name: string, kind: "agent" | "team") => {
      const result = await root.calls(root.managerRunId, "/", callTool("delegate_task", { recipient_address: `/${segment(name)}`, description: "Reply OK." }));
      expect(result, JSON.stringify(result)).toMatchObject({ delegated: true, target_kind: kind });
      return result;
    };
    const agentId = (await delegated(names.outsider, "agent")).target_agent_run_id as string;
    const squad = await delegated(names.team, "team");
    const teamRunId = squad.target_team_run_id as string;
    const coordinatorId = squad.target_team_coordinator_agent_run_id as string;
    await root.waitForTaskAgent(agentId);
    const teamCopy = await root.waitForTaskAgent(teamRunId);
    const mateAddress = teamCopy.members.find((member) => member.address.endsWith("/mate"))!.address;
    const memberAddress = teamCopy.members.find((member) => member.address.endsWith("/manager"))!.address;
    const SENDER = "To answer a message or report your task result, use send_message_to with target_agent_run_id set to the sender run id.";
    const mismatches: string[] = [];
    const check = async (id: string, from: string, tool: string, args: Rec, expected: string[]) => {
      const result = await h.mcpCall(from, tool, args);
      const text = result.text.replace(/\\+"/g, '"');
      for (const part of expected) if (!text.includes(part)) mismatches.push(`${id}: expected "${part}" but the agent read ${result.text.slice(0, 700)}`);
      if (/\b(copy|copies|spawn|collaborator|mounted|brought in)\b/i.test(result.text)) mismatches.push(`${id}: forbidden word in ${result.text.slice(0, 300)}`);
    };
    await check("M-01", agentId, "send_message_to", { recipient_address: memberAddress, content: "x" },
      [`No agent or agent team you can talk with has the address ${memberAddress}. ${SENDER} To have a task done by a new agent, use delegate_task.`]);
    await check("M-02", agentId, "send_message_to", { recipient_address: "/x", target_agent_run_id: agentId, content: "x" },
      [`send_message_to takes exactly one of recipient_address or target_agent_run_id, not both. ${SENDER}`]);
    await check("M-03", agentId, "send_message_to", { content: "x" }, [`send_message_to needs one of recipient_address or target_agent_run_id. ${SENDER}`]);
    await check("M-04", agentId, "send_message_to", { recipient_address: "research_assistant", content: "x" },
      ["'research_assistant' is not a valid address (", `). An address is exact and begins with '/', for example /team/agent. ${SENDER}`]);
    await check("M-05", agentId, "send_message_to", { target_agent_run_id: teamRunId, content: "x" },
      [`${teamRunId} is a task agent team's run id, and send_message_to talks with agents. To talk with the team, use its coordinator's run id: ${coordinatorId}.`]);
    await check("M-11", agentId, "send_message_to", { target_agent_run_id: "research_lead", content: "x" },
      ["No running agent has the run id 'research_lead', so the message was not sent. Use an exact run id you were given: a sender run id (from a message or your new task), or a run id delegate_task returned to you."]);
    await check("M-13", agentId, "send_message_to", { target_agent_run_id: agentId, content: "x" }, ["You can't send a message to yourself."]);
    await check("M-21", coordinatorId, "delegate_task", { recipient_address: mateAddress, description: "x" },
      [`${mateAddress} is in your own team; you can't delegate to it. Talk with it using send_message_to.`]);
    await check("M-22", root.managerRunId, "delegate_task", { recipient_address: "/web_resercher", description: "x" },
      ["'/web_resercher' is not the address of an available agent or agent team. If you have list_available_agents, it shows the addresses you can use."]);
    await check("M-23", root.managerRunId, "delegate_task", { recipient_address: "web researcher", description: "x" },
      ["'web researcher' is not a valid address (", "). An address is exact and begins with '/', for example /team/agent; if you have list_available_agents, it shows the addresses you can delegate to."]);
    await check("M-24", root.managerRunId, "delegate_task", { description: "x" },
      ["delegate_task needs recipient_address (an address beginning with '/') to create a new task agent, or target_agent_run_id / target_team_run_id with task_id to give a saved Task to one of your task agents."]);
    await check("M-25", root.managerRunId, "delegate_task", { target_agent_run_id: agentId, target_team_run_id: teamRunId, task_id: "task_x" },
      ["Invalid delegate_task input: supply exactly one of target_team_run_id (a task agent team) or target_agent_run_id (a task agent)."]);
    await check("M-26", root.managerRunId, "delegate_task", { target_agent_run_id: agentId, task_id: "task_x", description: "x" },
      ["Invalid delegate_task input: with target_team_run_id or target_agent_run_id, supply only that run id and task_id (not description)."]);
    await check("M-27", root.managerRunId, "delegate_task", { recipient_address: "/x", description: "" }, // Catalogue M-27 ends the text with a period; the product text does not (observation, recorded in the execution report).
      ["Invalid delegate_task input: description is required"]);
    await check("M-28", agentId, "delegate_task", { recipient_address: `/${segment(names.stranger)}`, task_id: "task_x" },
      ["You are a task agent, so you can't use task_id. Delegate with a description instead; that work is part of your Task."]);
    // task-keys-and-dependencies (design SR-003 REC-005): the named Task is resolved before the copy checks, so the
    // wrong-run-ID refusals below need a real open Task; an unknown task_id would be refused first.
    const keyProject = (await h.graphql(`mutation($input:CreateProjectInput!){createProject(input:$input){projectId}}`, { input: { name: `CPW keys ${Date.now()}` } })).createProject.projectId as string;
    const openTask = (await h.graphql(`mutation($input:CreateProjectTaskInput!){createProjectTask(input:$input){taskKey}}`, { input: { projectId: keyProject, title: "Reply OK.", description: "Reply OK." } })).createProjectTask.taskKey as string;
    await check("M-34", root.managerRunId, "delegate_task", { target_agent_run_id: "not_my_task_agent", task_id: openTask },
      ["not_my_task_agent is not one of your task agents. Use a run id that delegate_task returned to you, or delegate to a new task agent with recipient_address."]);
    await check("M-35", root.managerRunId, "delegate_task", { target_agent_run_id: coordinatorId, task_id: openTask },
      [`${coordinatorId} is the coordinator of task agent team ${teamRunId}; use target_team_run_id "${teamRunId}".`]);
    await check("M-36", root.managerRunId, "delegate_task", { target_agent_run_id: teamRunId, task_id: openTask },
      [`${teamRunId} is a task agent team's run id; use target_team_run_id "${teamRunId}".`]);
    await check("M-38", root.managerRunId, "delegate_task", { target_team_run_id: agentId, task_id: openTask },
      [`${agentId} is a task agent's run id; use target_agent_run_id "${agentId}".`]);
    expect(mismatches, mismatches.join("\n")).toEqual([]);
    root.close();
    await h.terminate("agent", root.rootId);
  }, 300_000);

  /** The first received text in an agent's conversation that contains `marker` (a task message or a header with its body). */
  const receivedWith = async (root: RootDriver, agentRunId: string, address: string, marker: string) => {
    let found = "";
    await until(async () => { found = stringsOf(await root.conversationOf(agentRunId, address)).find((t) => t.includes(marker)) ?? ""; return found !== ""; },
      `${address} receives ${marker.slice(0, 40)}`, 60_000);
    return found;
  };
  const withAddress = (address: string, runId: string) => `the agent with sender address "${address}" and sender run id "${runId}"`;
  const runIdOnly = (runId: string) => `the agent with sender run id "${runId}"`;

  it("CPW-H1 sender address only where it reaches the sender (T-5): task messages and headers in Agent, Team and Org roots", async () => {
    // Agent root: the agent the user started delegates (its address reaches it → given); the task agent reports (run id only);
    // the task agent delegates further (a task agent sender → run id only); a task agent team member writes to the host from outside its team (run id only).
    const agentRoot = await h.startRoot("agent", ids);
    const host = agentRoot.managerRunId, hostAddress = `/${segment(names.manager)}`;
    const a = (await agentRoot.calls(host, "/", callTool("delegate_task", { recipient_address: `/${segment(names.outsider)}`, description: "Task marker H1-A." }))).target_agent_run_id as string;
    await agentRoot.waitForTaskAgent(a);
    const taskA = await receivedWith(agentRoot, a, `/${segment(names.outsider)}`, "H1-A");
    expect(taskA).toContain(`You have a new task from ${withAddress(hostAddress, host)}.`);
    expect(taskA).toContain("recipient_address set to that sender address or target_agent_run_id set to that sender run id (one of them, not both)");
    await agentRoot.calls(a, `/${segment(names.outsider)}`, callTool("send_message_to", { target_agent_run_id: host, content: "Report marker H1-R." }));
    const report = await receivedWith(agentRoot, host, "/", "H1-R");
    expect(report).toContain(`You received a message from ${runIdOnly(a)}.`);
    expect(report).not.toContain("sender address");
    const b = (await agentRoot.calls(a, `/${segment(names.outsider)}`, callTool("delegate_task", { recipient_address: `/${segment(names.stranger)}`, description: "Task marker H1-B." }))).target_agent_run_id as string;
    await agentRoot.waitForTaskAgent(b);
    const taskB = await receivedWith(agentRoot, b, `/${segment(names.stranger)}`, "H1-B");
    expect(taskB).toContain(`You have a new task from ${runIdOnly(a)}.`);
    expect(taskB).toContain("target_agent_run_id set to that sender run id.");
    expect(taskB).not.toContain("sender address");
    const squad = await agentRoot.calls(host, "/", callTool("delegate_task", { recipient_address: `/${segment(names.team)}`, description: "Task marker H1-T." }));
    const coord = squad.target_team_coordinator_agent_run_id as string;
    const teamCopy = await agentRoot.waitForTaskAgent(squad.target_team_run_id as string);
    const coordAddress = teamCopy.members.find((m) => m.agentRunId === coord)!.address;
    const taskT = await receivedWith(agentRoot, coord, coordAddress, "H1-T");
    expect(taskT).toContain(`You have a new task from ${withAddress(hostAddress, host)}.`);
    await agentRoot.calls(coord, coordAddress, callTool("send_message_to", { target_agent_run_id: host, content: "Team report marker H1-TR." }));
    const teamReport = await receivedWith(agentRoot, host, "/", "H1-TR");
    expect(teamReport).toContain(`You received a message from ${runIdOnly(coord)}.`);
    expect(teamReport).not.toContain("sender address");
    agentRoot.close();
    await h.terminate("agent", agentRoot.rootId);

    // Team root: a teammate's message carries the sender's address.
    const teamRoot = await h.startRoot("team", ids);
    await teamRoot.calls(teamRoot.managerRunId, "/manager", callTool("send_message_to", { recipient_address: "/mate", content: "Teammate marker H1-M." }));
    const mateMsg = await receivedWith(teamRoot, teamRoot.members["/mate"]!, "/mate", "H1-M");
    expect(mateMsg).toContain(`You received a message from ${withAddress("/manager", teamRoot.managerRunId)}.`);
    teamRoot.close();
    await h.terminate("team", teamRoot.rootId);

    // Org root: the organization's direct agent delegates its team (address given).
    const orgRoot = await h.startRoot("org", ids);
    const orgSquad = await orgRoot.calls(orgRoot.managerRunId, "/manager", callTool("delegate_task", { recipient_address: "/squad", description: "Task marker H1-O." }));
    const orgCoord = orgSquad.target_team_coordinator_agent_run_id as string;
    const orgCopy = await orgRoot.waitForTaskAgent(orgSquad.target_team_run_id as string);
    const orgCoordAddress = orgCopy.members.find((m) => m.agentRunId === orgCoord)!.address;
    const taskO = await receivedWith(orgRoot, orgCoord, orgCoordAddress, "H1-O");
    expect(taskO).toContain(`You have a new task from ${withAddress("/manager", orgRoot.managerRunId)}.`);
    orgRoot.close();
    await h.terminate("org", orgRoot.rootId);
  }, 400_000);

  it("CPW-M1 Team root: a teammate and the agent itself are 'in your team' and 'that is you'; an agent only the catalog has is delegated", async () => {
    const root = await h.startRoot("team", ids);
    const mate = await mentioning(root, root.managerRunId, "/manager", ids.mate);
    expect(mate).toContain(`- ${names.mate} (agent) at /mate, in your team: talk with it using send_message_to; don't delegate to it.`);
    expect(mate).not.toContain("delegate_task");
    const self = await mentioning(root, root.managerRunId, "/manager", ids.manager);
    expect(self).toContain(`- ${names.manager} (agent) at /manager: that is you.`);
    const catalog = await mentioning(root, root.managerRunId, "/manager", ids.outsider);
    expect(catalog).toContain(`- ${names.outsider} (agent) at /${segment(names.outsider)}: delegate the task to it with delegate_task; it returns a run id to follow up with.`);
    root.close();
    await h.terminate("team", root.rootId);
  }, 300_000);

  it("CPW-M2 Agent root: a task agent mentioning the agent the user started is told it can't delegate to it", async () => {
    const root = await h.startRoot("agent", ids);
    const delegated = await root.calls(root.managerRunId, "/", callTool("delegate_task", { recipient_address: `/${segment(names.outsider)}`, description: "Reply OK." }));
    const taskAgent = delegated.target_agent_run_id as string;
    await root.waitForTaskAgent(taskAgent);
    const note = await mentioning(root, taskAgent, `/${segment(names.outsider)}`, ids.manager);
    expect(note).toContain(`- ${names.manager} (agent) at /${segment(names.manager)}: talk with it using send_message_to; you can't delegate to it.`);
    root.close();
    await h.terminate("agent", root.rootId);
  }, 300_000);

  it("CPW-M3 Org root: a sibling of the organization is reachable and delegable", async () => {
    const root = await h.startRoot("org", ids);
    const note = await mentioning(root, root.managerRunId, "/manager", ids.sibling);
    expect(note).toContain(`- ${names.sibling} (agent) at /sibling: talk with it using send_message_to, or delegate a task to it with delegate_task; that creates a new task agent and returns its run id to follow up with.`);
    root.close();
    await h.terminate("org", root.rootId);
  }, 300_000);
});
