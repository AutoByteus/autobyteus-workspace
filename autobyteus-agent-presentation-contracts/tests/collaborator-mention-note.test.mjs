import test from "node:test";
import assert from "node:assert/strict";
import {
  collaboratorMentionNote,
  collaboratorMentionsDtoSchema,
} from "../dist/index.js";

const productTeam = { name: "Product Team", kind: "agent_team", address: "/product_team" };
const reviewer = { name: "Code Reviewer (v2)", kind: "agent", address: "/code_reviewer" };

test("composes the note after the user's text and parses it back", () => {
  const content = collaboratorMentionNote.compose("Please ask @Product Team for a UI", [productTeam, reviewer]);
  assert.equal(content, [
    "Please ask @Product Team for a UI",
    "",
    "[Mentioned collaborators]",
    "- Product Team (Agent Team) at /product_team",
    "- Code Reviewer (v2) (Agent) at /code_reviewer",
    "Message a collaborator with send_message_to and its address; it starts on its first message.",
  ].join("\n"));
  assert.deepEqual(collaboratorMentionNote.parse(content), {
    text: "Please ask @Product Team for a UI",
    collaborators: [productTeam, reviewer],
  });
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
