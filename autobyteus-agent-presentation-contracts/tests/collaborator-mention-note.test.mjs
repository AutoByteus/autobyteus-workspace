import test from "node:test";
import assert from "node:assert/strict";
import {
  collaboratorMentionNote,
  collaboratorMentionsDtoSchema,
} from "../dist/index.js";

const productTeam = { name: "Product Team", kind: "agent_team", address: "/product_team", presence: "not_in_run" };
const reviewer = { name: "Code Reviewer (v2)", kind: "agent", address: "/code_reviewer", presence: "not_in_run" };
const GUIDANCE = "Delegate the work with delegate_task to its address; it returns a run ID to follow up with. If it also returns a task_id, call create_or_update_task with that task_id and status DONE when the work is finished; this stops it and removes it from the run.";
const IN_RUN_GUIDANCE = "One already in this run can instead be messaged directly with send_message_to at its address, or use delegate_task for a separate copy.";

test("composes the note after the user's text, steering to delegate_task, and parses it back", () => {
  const content = collaboratorMentionNote.compose("Please ask @Product Team for a UI", [productTeam, reviewer]);
  assert.equal(content, [
    "Please ask @Product Team for a UI",
    "",
    "[Mentioned collaborators]",
    "- Product Team (Agent Team) at /product_team",
    "- Code Reviewer (v2) (Agent) at /code_reviewer",
    GUIDANCE,
  ].join("\n"));
  assert.deepEqual(collaboratorMentionNote.parse(content), {
    text: "Please ask @Product Team for a UI",
    collaborators: [productTeam, reviewer],
  });
});

test("an entry already in the run is marked, and the guidance then also offers send_message_to (AC-003)", () => {
  const packageCreator = { name: "Agent Package Creator", kind: "agent", address: "/agent_package_creator", presence: "in_run" };
  const content = collaboratorMentionNote.compose("please ask @Agent Package Creator", [packageCreator, productTeam]);
  assert.equal(content, [
    "please ask @Agent Package Creator",
    "",
    "[Mentioned collaborators]",
    "- Agent Package Creator (Agent) at /agent_package_creator, already in this run",
    "- Product Team (Agent Team) at /product_team",
    `${GUIDANCE} ${IN_RUN_GUIDANCE}`,
  ].join("\n"));
  assert.deepEqual(collaboratorMentionNote.parse(content), {
    text: "please ask @Agent Package Creator",
    collaborators: [packageCreator, productTeam],
  });
});

const projectTaskManager = { name: "Project Task Manager", kind: "agent", address: "/project_task_manager", presence: "run_agent" };
const RUN_AGENT_GUIDANCE = "Use send_message_to with recipient_address /project_task_manager to message Project Task Manager; delegate_task cannot target it.";

test("a run-agent-only note tells the focused agent to use send_message_to and offers no delegate_task (REQ-004)", () => {
  const content = collaboratorMentionNote.compose("@Project Task Manager please create the follow-up cleanup ticket", [projectTaskManager]);
  assert.equal(content, [
    "@Project Task Manager please create the follow-up cleanup ticket",
    "",
    "[Mentioned collaborators]",
    "- Project Task Manager (Agent) at /project_task_manager, the run's own agent",
    RUN_AGENT_GUIDANCE,
  ].join("\n"));
  assert.ok(!content.includes("Delegate the work"));
  assert.deepEqual(collaboratorMentionNote.parse(content), {
    text: "@Project Task Manager please create the follow-up cleanup ticket",
    collaborators: [projectTaskManager],
  });
});

test("a mixed note keeps the delegate and in-run guidance, then the run-agent sentence", () => {
  const packageCreator = { name: "Agent Package Creator", kind: "agent", address: "/agent_package_creator", presence: "in_run" };
  const content = collaboratorMentionNote.compose("x", [productTeam, projectTaskManager, packageCreator]);
  assert.equal(content, [
    "x",
    "",
    "[Mentioned collaborators]",
    "- Product Team (Agent Team) at /product_team",
    "- Project Task Manager (Agent) at /project_task_manager, the run's own agent",
    "- Agent Package Creator (Agent) at /agent_package_creator, already in this run",
    `${GUIDANCE} ${IN_RUN_GUIDANCE} ${RUN_AGENT_GUIDANCE}`,
  ].join("\n"));
  assert.deepEqual(collaboratorMentionNote.parse(content), { text: "x", collaborators: [productTeam, projectTaskManager, packageCreator] });
});

test("a note whose guidance does not match its entries is not parsed", () => {
  const runAgentWithDelegateGuidance = [
    "x",
    "",
    "[Mentioned collaborators]",
    "- Project Task Manager (Agent) at /project_task_manager, the run's own agent",
    GUIDANCE,
  ].join("\n");
  assert.equal(collaboratorMentionNote.parse(runAgentWithDelegateGuidance), null);
  const notInRunWithInRunGuidance = `x\n\n[Mentioned collaborators]\n- Product Team (Agent Team) at /product_team\n${GUIDANCE} ${IN_RUN_GUIDANCE}`;
  assert.equal(collaboratorMentionNote.parse(notInRunWithInRunGuidance), null);
});

test("notes composed by the previous release still parse (in-run and not-in-run)", () => {
  const previousInRun = `please\n\n[Mentioned collaborators]\n- Agent Package Creator (Agent) at /agent_package_creator, already in this run\n- Product Team (Agent Team) at /product_team\n${GUIDANCE} ${IN_RUN_GUIDANCE}`;
  assert.deepEqual(collaboratorMentionNote.parse(previousInRun)?.collaborators.map((entry) => entry.presence), ["in_run", "not_in_run"]);
  const previous = `please\n\n[Mentioned collaborators]\n- Product Team (Agent Team) at /product_team\n${GUIDANCE}`;
  assert.deepEqual(collaboratorMentionNote.parse(previous), { text: "please", collaborators: [productTeam] });
});

test("a note with no in-run mention is byte-identical to the previous release (AC-004)", () => {
  const content = collaboratorMentionNote.compose("x", [reviewer]);
  assert.equal(content, `x\n\n[Mentioned collaborators]\n- Code Reviewer (v2) (Agent) at /code_reviewer\n${GUIDANCE}`);
  assert.ok(!content.includes("already in this run"));
});

test("a note saved with the collaborator-messaging guidance still parses", () => {
  const saved = [
    "Please ask @Product Team",
    "",
    "[Mentioned collaborators]",
    "- Product Team (Agent Team) at /product_team",
    "Message a collaborator with send_message_to and its address; it starts on its first message. delegate_task to its address spawns a new copy instead, which you follow up by run ID.",
  ].join("\n");
  assert.deepEqual(collaboratorMentionNote.parse(saved), { text: "Please ask @Product Team", collaborators: [productTeam] });
});

test("a note saved before the REQ-009 guidance still parses", () => {
  const saved = [
    "Please ask @Product Team",
    "",
    "[Mentioned collaborators]",
    "- Product Team (Agent Team) at /product_team",
    "Message a collaborator with send_message_to and its address; it starts on its first message.",
  ].join("\n");
  assert.deepEqual(collaboratorMentionNote.parse(saved), { text: "Please ask @Product Team", collaborators: [productTeam] });
});

test("a mention-only message is the note alone", () => {
  const content = collaboratorMentionNote.compose("  ", [productTeam]);
  assert.ok(content.startsWith("[Mentioned collaborators]\n"));
  assert.deepEqual(collaboratorMentionNote.parse(content), { text: "", collaborators: [productTeam] });
});

test("no collaborators leaves the text unchanged; foreign text is not parsed", () => {
  assert.equal(collaboratorMentionNote.compose("hello", []), "hello");
  assert.equal(collaboratorMentionNote.parse("hello"), null);
  assert.equal(collaboratorMentionNote.parse("x\n\n[Mentioned collaborators]\n- bad line\nMessage a collaborator with send_message_to and its address; it starts on its first message."), null);
  assert.throws(() => collaboratorMentionNote.compose("x", [{ name: "Root", kind: "agent", address: "/" }]));
});

test("mentions are at most 8 and unique by kind and definition", () => {
  assert.equal(collaboratorMentionsDtoSchema.parse([{ kind: "agent", definition_id: "a" }, { kind: "agent_team", definition_id: "a" }]).length, 2);
  assert.throws(() => collaboratorMentionsDtoSchema.parse([{ kind: "agent", definition_id: "a" }, { kind: "agent", definition_id: "a" }]));
  assert.throws(() => collaboratorMentionsDtoSchema.parse(Array.from({ length: 9 }, (_, index) => ({ kind: "agent", definition_id: `a${index}` }))));
  assert.throws(() => collaboratorMentionsDtoSchema.parse([{ kind: "agent_org", definition_id: "a" }]));
});
