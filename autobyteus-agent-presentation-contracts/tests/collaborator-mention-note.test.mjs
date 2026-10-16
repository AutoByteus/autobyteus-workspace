import test from "node:test";
import assert from "node:assert/strict";
import {
  collaboratorMentionNote,
  collaboratorMentionsDtoSchema,
} from "../dist/index.js";

const productTeam = { name: "Product Team", kind: "agent_team", address: "/product_team", presence: "not_in_run" };
const reviewer = { name: "Code Reviewer (v2)", kind: "agent", address: "/code_reviewer", presence: "not_in_run" };
const GUIDE = {
  not_in_run: "delegate the task to it with delegate_task; it returns a run ID to follow up with.",
  in_run: "talk with it using send_message_to, or delegate a task to it with delegate_task; that creates a new task agent and returns its run ID to follow up with.",
  own_team: "talk with it using send_message_to; don't delegate to it.",
  run_agent: "talk with it using send_message_to; you can't delegate to it.",
  self: "that is you.",
};
const projectTaskManager = { name: "Project Task Manager", kind: "agent", address: "/project_task_manager", presence: "run_agent" };
const packageCreator = { name: "Agent Package Creator", kind: "agent", address: "/agent_package_creator", presence: "in_run" };
const teammate = { name: "Implementation Engineer", kind: "agent", address: "/implementation_engineer", presence: "own_team" };
const ownTeam = { name: "Software Team", kind: "agent_team", address: "/software_team", presence: "own_team" };
const itself = { name: "Code Reviewer", kind: "agent", address: "/code_reviewer", presence: "self" };

test("composes one line per mention, each with its own guidance, and parses it back (wording §8)", () => {
  const content = collaboratorMentionNote.compose("Please ask @Product Team for a UI", [productTeam, reviewer]);
  assert.equal(content, [
    "Please ask @Product Team for a UI",
    "",
    "[Mentioned agents]",
    `- Product Team (agent team) at /product_team: ${GUIDE.not_in_run}`,
    `- Code Reviewer (v2) (agent) at /code_reviewer: ${GUIDE.not_in_run}`,
  ].join("\n"));
  assert.deepEqual(collaboratorMentionNote.parse(content), {
    text: "Please ask @Product Team for a UI",
    collaborators: [productTeam, reviewer],
  });
});

test("every presence composes its own line and parses back to the same presence", () => {
  const all = [productTeam, packageCreator, teammate, ownTeam, itself, projectTaskManager];
  const content = collaboratorMentionNote.compose("x", all);
  assert.equal(content, [
    "x",
    "",
    "[Mentioned agents]",
    `- Product Team (agent team) at /product_team: ${GUIDE.not_in_run}`,
    `- Agent Package Creator (agent) at /agent_package_creator: ${GUIDE.in_run}`,
    `- Implementation Engineer (agent) at /implementation_engineer, in your team: ${GUIDE.own_team}`,
    `- Software Team (agent team) at /software_team, in your team: ${GUIDE.own_team}`,
    `- Code Reviewer (agent) at /code_reviewer: ${GUIDE.self}`,
    `- Project Task Manager (agent) at /project_task_manager: ${GUIDE.run_agent}`,
  ].join("\n"));
  assert.deepEqual(collaboratorMentionNote.parse(content), { text: "x", collaborators: all });
});

test("a delegate suggestion is never composed for the agent itself, its team or the agent the user started", () => {
  const content = collaboratorMentionNote.compose("x", [teammate, ownTeam, itself, projectTaskManager]);
  assert.ok(!content.includes("delegate a task"));
  assert.ok(!/\b(copy|run ID|collaborator|brought in|already in this run)\b/i.test(content));
});

test("a line whose guidance does not match its presence is not parsed", () => {
  assert.equal(collaboratorMentionNote.parse(`x\n\n[Mentioned agents]\n- Code Reviewer (agent) at /code_reviewer, in your team: ${GUIDE.not_in_run}`), null);
  assert.equal(collaboratorMentionNote.parse(`x\n\n[Mentioned agents]\n- Code Reviewer (agent) at /code_reviewer: some other guidance`), null);
  assert.equal(collaboratorMentionNote.parse("x\n\n[Mentioned agents]"), null);
});

test("the composed note names no task tool and never tells the agent to close a task_id", () => {
  const content = collaboratorMentionNote.compose("x", [productTeam, packageCreator, projectTaskManager]);
  assert.ok(!/create_or_update_task|update_task|create_task|task_id|DONE/.test(content));
});

const SAVED_GUIDANCE = "Delegate the work with delegate_task to its address; it returns a run ID to follow up with.";
// The delegate sentence composed until the tool-neutral release (frozen copy; never composed now).
const PREVIOUS_RELEASE_GUIDANCE = `${SAVED_GUIDANCE} If it also returns a task_id, call create_or_update_task with that task_id and status DONE when the work is finished; this stops it and removes it from the run.`;
const SAVED_IN_RUN_GUIDANCE = "One already in this run can instead be messaged directly with send_message_to at its address, or use delegate_task for a separate copy.";

test("notes saved by the previous release in every combination keep parsing (saved heading, suffixes, guidance)", () => {
  const entry = (c) => `- ${c.name} (${c.kind === "agent" ? "Agent" : "Agent Team"}) at ${c.address}${c.presence === "in_run" ? ", already in this run" : c.presence === "run_agent" ? ", the run's own agent" : ""}`;
  const combinations = [[productTeam], [packageCreator, productTeam], [productTeam, projectTaskManager], [productTeam, projectTaskManager, packageCreator], [projectTaskManager]];
  for (const collaborators of combinations) {
    for (const delegateSentence of [SAVED_GUIDANCE, PREVIOUS_RELEASE_GUIDANCE]) {
      const sentences = [
        ...(collaborators.some((c) => c.presence !== "run_agent") ? [delegateSentence] : []),
        ...(collaborators.some((c) => c.presence === "in_run") ? [SAVED_IN_RUN_GUIDANCE] : []),
        ...collaborators.filter((c) => c.presence === "run_agent").map((c) => `Use send_message_to with recipient_address ${c.address} to message ${c.name}; delegate_task cannot target it.`),
      ];
      const saved = ["please", "", "[Mentioned collaborators]", ...collaborators.map(entry), sentences.join(" ")].join("\n");
      assert.deepEqual(collaboratorMentionNote.parse(saved), { text: "please", collaborators }, saved);
    }
  }
});

test("a saved note whose guidance does not match its entries, or from neither release, is not parsed", () => {
  const runAgentWithDelegateGuidance = `x\n\n[Mentioned collaborators]\n- Project Task Manager (Agent) at /project_task_manager, the run's own agent\n${SAVED_GUIDANCE}`;
  assert.equal(collaboratorMentionNote.parse(runAgentWithDelegateGuidance), null);
  assert.equal(collaboratorMentionNote.parse(`x\n\n[Mentioned collaborators]\n- Product Team (Agent Team) at /product_team\n${SAVED_GUIDANCE} Close it when done.`), null);
  assert.equal(collaboratorMentionNote.parse("x\n\n[Mentioned collaborators]\n- bad line\nMessage a collaborator with send_message_to and its address; it starts on its first message."), null);
});

test("notes saved with the collaborator-messaging guidances still parse", () => {
  for (const guidance of [
    "Message a collaborator with send_message_to and its address; it starts on its first message. delegate_task to its address spawns a new copy instead, which you follow up by run ID.",
    "Message a collaborator with send_message_to and its address; it starts on its first message.",
  ]) {
    const saved = ["Please ask @Product Team", "", "[Mentioned collaborators]", "- Product Team (Agent Team) at /product_team", guidance].join("\n");
    assert.deepEqual(collaboratorMentionNote.parse(saved), { text: "Please ask @Product Team", collaborators: [productTeam] });
  }
});

test("a mention-only message is the note alone", () => {
  const content = collaboratorMentionNote.compose("  ", [productTeam]);
  assert.ok(content.startsWith("[Mentioned agents]\n"));
  assert.deepEqual(collaboratorMentionNote.parse(content), { text: "", collaborators: [productTeam] });
});

test("no mentions leaves the text unchanged; foreign text is not parsed", () => {
  assert.equal(collaboratorMentionNote.compose("hello", []), "hello");
  assert.equal(collaboratorMentionNote.parse("hello"), null);
  assert.throws(() => collaboratorMentionNote.compose("x", [{ name: "Root", kind: "agent", address: "/", presence: "not_in_run" }]));
});

test("mentions are at most 8 and unique by kind and definition", () => {
  assert.equal(collaboratorMentionsDtoSchema.parse([{ kind: "agent", definition_id: "a" }, { kind: "agent_team", definition_id: "a" }]).length, 2);
  assert.throws(() => collaboratorMentionsDtoSchema.parse([{ kind: "agent", definition_id: "a" }, { kind: "agent", definition_id: "a" }]));
  assert.throws(() => collaboratorMentionsDtoSchema.parse(Array.from({ length: 9 }, (_, index) => ({ kind: "agent", definition_id: `a${index}` }))));
  assert.throws(() => collaboratorMentionsDtoSchema.parse([{ kind: "agent_org", definition_id: "a" }]));
});

test("composes the three worked examples of the complete views (§11) exactly", () => {
  assert.equal(
    collaboratorMentionNote.compose("Please check this with @api_e2e_engineer and @Web Researcher, and @code_reviewer you too.", [
      { name: "api_e2e_engineer", kind: "agent", address: "/api_e2e_engineer", presence: "own_team" },
      { name: "Web Researcher", kind: "agent", address: "/web_researcher", presence: "not_in_run" },
      { name: "code_reviewer", kind: "agent", address: "/code_reviewer", presence: "self" },
    ]),
    [
      "Please check this with @api_e2e_engineer and @Web Researcher, and @code_reviewer you too.",
      "",
      "[Mentioned agents]",
      "- api_e2e_engineer (agent) at /api_e2e_engineer, in your team: talk with it using send_message_to; don't delegate to it.",
      "- Web Researcher (agent) at /web_researcher: delegate the task to it with delegate_task; it returns a run ID to follow up with.",
      "- code_reviewer (agent) at /code_reviewer: that is you.",
    ].join("\n"),
  );
  assert.equal(
    collaboratorMentionNote.compose("Ask @Software Engineering Team to look at this.", [
      { name: "Software Engineering Team", kind: "agent_team", address: "/software_engineering_team", presence: "in_run" },
    ]),
    [
      "Ask @Software Engineering Team to look at this.",
      "",
      "[Mentioned agents]",
      "- Software Engineering Team (agent team) at /software_engineering_team: talk with it using send_message_to, or delegate a task to it with delegate_task; that creates a new task agent and returns its run ID to follow up with.",
    ].join("\n"),
  );
  assert.equal(
    collaboratorMentionNote.compose("Report this to @Research Assistant.", [
      { name: "Research Assistant", kind: "agent", address: "/research_assistant", presence: "run_agent" },
    ]),
    [
      "Report this to @Research Assistant.",
      "",
      "[Mentioned agents]",
      "- Research Assistant (agent) at /research_assistant: talk with it using send_message_to; you can't delegate to it.",
    ].join("\n"),
  );
});

test("still parses the earlier composed guidance of the catalog and organization lines (SR-012)", () => {
  const content = [
    "Ask @Product Team and @Notes",
    "",
    "[Mentioned agents]",
    "- Product Team (agent team) at /product_team: delegate a task to it with delegate_task.",
    "- Notes (agent) at /notes: talk with it using send_message_to, or delegate a task to it with delegate_task to have a new task agent work on it.",
  ].join("\n");
  const parsed = collaboratorMentionNote.parse(content);
  assert.deepEqual(parsed?.collaborators.map((entry) => entry.presence), ["not_in_run", "in_run"]);
  assert.equal(parsed?.text, "Ask @Product Team and @Notes");
});
