#!/usr/bin/env node
// Seeds the definitions for the AC-008 live journeys through the public GraphQL API of an isolated instance.
// Usage: node seed-live-journeys.mjs <backendUrl> <out.json>
// J1 standalone agent delegates and its task agent reports by ID; J2 a team member hands off by its rules;
// J3 an organization's Project Task Manager delegates to the organization's team and its coordinator reports by ID.
// Instructions never mention IDs or addresses of replies: what to do with them comes from the product's prompt text.
import { writeFileSync } from "node:fs";

const [backend, out] = process.argv.slice(2);
if (!backend || !out) throw new Error("usage: seed-live-journeys.mjs <backendUrl> <out.json>");
const gql = async (query, variables) => {
  const response = await fetch(new URL("/graphql", backend), { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ query, variables }) });
  const body = await response.json();
  if (!response.ok || body.errors?.length || !body.data) throw new Error(JSON.stringify(body.errors ?? body));
  return body.data;
};
const agent = async (name, description, instructions) => (await gql(`mutation($input:CreateAgentDefinitionInput!){createAgentDefinition(input:$input){id name}}`,
  { input: { name, role: "assistant", description, instructions, toolNames: [] } })).createAgentDefinition;
const team = async (name, description, instructions, members, coordinator, handoffs = []) => (await gql(`mutation($input:CreateAgentTeamDefinitionInput!){createAgentTeamDefinition(input:$input){id name}}`,
  { input: { name, description, instructions, coordinatorMemberName: coordinator, nodes: members.map(([memberName, ref]) => ({ memberName, ref, refScope: "SHARED" })), handoffs } })).createAgentTeamDefinition;
const org = async (name, description, instructions, members, handoffs = []) => (await gql(`mutation($input:CreateAgentOrgDefinitionInput!){createAgentOrgDefinition(input:$input){id name}}`,
  { input: { name, description, instructions, handoffs, members } })).createAgentOrgDefinition;

const result = {};
// J1
result.researchLead = await agent("Research Lead", "Plans and delegates research",
  "You coordinate research. When the user asks a question, delegate it to the agent at address /research_helper with delegate_task, using the question as the task description. When that task agent reports its answer, tell the user the answer in one short sentence.");
result.researchHelper = await agent("Research Helper", "Answers research questions",
  "Answer the question you are given in one short sentence, then report your answer to the agent that gave you the task.");
// J2
result.writer = await agent("Writer", "Writes one sentence", "When asked, write one short sentence about the sea. Then follow your handoff rules.");
result.reviewer = await agent("Reviewer", "Approves sentences", "When you receive a sentence from another agent, reply to the agent that sent it with the single word APPROVED.");
result.reviewCrew = await team("Review Crew", "Writer and reviewer", "Work together briefly.",
  [["writer", result.writer.id], ["reviewer", result.reviewer.id]], "writer",
  [{ from: "/writer", to: "/reviewer", rules: ["When you have written the sentence, hand it to the reviewer."] }]);
// J3
result.ptm = await agent("Project Task Manager", "Delegates project work to the organization's teams",
  "When the user gives you work, delegate it to the agent team at address /delivery_squad with delegate_task, using the work as the task description. When its coordinator reports back, tell the user the result in one short sentence.");
result.coordinator = await agent("Coordinator", "Leads the delivery squad", "Do the task you are given in one short sentence, then report the result to the agent that gave you the task.");
result.builder = await agent("Builder", "Builds", "Help the coordinator when asked.");
result.deliverySquad = await team("Delivery Squad", "Coordinator and builder", "Deliver briefly.",
  [["coordinator", result.coordinator.id], ["builder", result.builder.id]], "coordinator");
result.studio = await org("Studio", "Organization for the live journey", "Follow requests briefly.",
  [{ memberName: "project_task_manager", ref: result.ptm.id, refType: "AGENT", refScope: "SHARED" },
    { memberName: "delivery_squad", ref: result.deliverySquad.id, refType: "AGENT_TEAM", refScope: "SHARED" }]);
writeFileSync(out, JSON.stringify(result, null, 2) + "\n");
console.log(JSON.stringify(Object.fromEntries(Object.entries(result).map(([key, value]) => [key, value.id])), null, 2));
