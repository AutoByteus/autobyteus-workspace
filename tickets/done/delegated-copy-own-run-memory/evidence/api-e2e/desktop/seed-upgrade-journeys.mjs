#!/usr/bin/env node
// Seeds definitions for the delegated-copy-own-run-memory upgrade journey (on the RELEASED build first) through the public
// GraphQL API of an isolated instance. Adds an Agent hub (Hub Assistant) that delegates an Agent (Code Reviewer, which writes a
// file: file changes) and a Team (Research Squad), besides the Team forest and the Org of the earlier journey.
// Usage: node seed-forest-journeys.mjs <backendUrl> <out.json>
// Forest: Forest Team (/lead, /mate) — the lead delegates the catalog team /research_squad (a task agent team); its coordinator
// delegates the catalog team /build_crew (a task agent team inside the first one's delegation); its coordinator answers.
// Org: Studio (/manager + the mounted team /research_squad) — the manager delegates /research_squad (a copy of the mounted team),
// whose coordinator delegates /build_crew.
import { writeFileSync } from "node:fs";

const [backend, out] = process.argv.slice(2);
const gql = async (query, variables) => {
  const response = await fetch(new URL("/graphql", backend), { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ query, variables }) });
  const body = await response.json();
  if (!response.ok || body.errors?.length || !body.data) throw new Error(JSON.stringify(body.errors ?? body));
  return body.data;
};
const agent = async (name, description, instructions) => (await gql(`mutation($input:CreateAgentDefinitionInput!){createAgentDefinition(input:$input){id name}}`,
  { input: { name, role: "assistant", description, instructions, toolNames: [] } })).createAgentDefinition;
const team = async (name, description, members, coordinator) => (await gql(`mutation($input:CreateAgentTeamDefinitionInput!){createAgentTeamDefinition(input:$input){id name}}`,
  { input: { name, description, instructions: "Work briefly.", coordinatorMemberName: coordinator, nodes: members.map(([memberName, ref]) => ({ memberName, ref, refScope: "SHARED" })), handoffs: [] } })).createAgentTeamDefinition;
const org = async (name, members) => (await gql(`mutation($input:CreateAgentOrgDefinitionInput!){createAgentOrgDefinition(input:$input){id name}}`,
  { input: { name, description: "Journey organization", instructions: "Work briefly.", handoffs: [], members } })).createAgentOrgDefinition;

const r = {};
r.crewBuilder = await agent("Crew Builder", "Builds the answer", "Do the task you are given in one short sentence, then report the result to the agent that gave you the task.");
r.crewChecker = await agent("Crew Checker", "Checks", "Help when asked.");
r.buildCrew = await team("Build Crew", "Builder and checker", [["crew_builder", r.crewBuilder.id], ["crew_checker", r.crewChecker.id]], "crew_builder");
r.squadLead = await agent("Squad Lead", "Leads the research squad",
  "When you receive a task, delegate it to the agent team at address /build_crew with delegate_task. When its report arrives, report the result to the agent that gave you the task.");
r.squadPeer = await agent("Squad Peer", "Peer", "Help when asked.");
r.researchSquad = await team("Research Squad", "Lead and peer", [["squad_lead", r.squadLead.id], ["squad_peer", r.squadPeer.id]], "squad_lead");
r.forestLead = await agent("Forest Lead", "Leads the forest team",
  "When the user asks for something, delegate it to the agent team at address /research_squad with delegate_task. When its report arrives, tell the user the result in one short sentence.");
r.forestMate = await agent("Forest Mate", "Mate", "Help when asked.");
r.forestTeam = await team("Forest Team", "Lead and mate", [["lead", r.forestLead.id], ["mate", r.forestMate.id]], "lead");
r.studioManager = await agent("Studio Manager", "Delegates to the organization's team",
  "When the user gives you work, delegate it to the agent team at address /research_squad with delegate_task. When its report arrives, tell the user the result in one short sentence.");
r.studio = await org("Studio", [
  { memberName: "manager", ref: r.studioManager.id, refType: "AGENT", refScope: "SHARED" },
  { memberName: "research_squad", ref: r.researchSquad.id, refType: "AGENT_TEAM", refScope: "SHARED" }]);
r.codeReviewer = await agent("Code Reviewer", "Reviews and writes notes",
  "When you receive a task, create a file named review-notes.md in your workspace containing one short sentence about the task, then report done to the agent that gave you the task.");
r.hubAssistant = await agent("Hub Assistant", "A long-lived hub that hands work out",
  "When the user gives you work, delegate it with delegate_task as the user says (an agent at /code_reviewer, or the agent team at /research_squad). When a report arrives, tell the user the result in one short sentence.");
writeFileSync(out, JSON.stringify(r, null, 2) + "\n");
console.log(Object.keys(r).join(" "));
