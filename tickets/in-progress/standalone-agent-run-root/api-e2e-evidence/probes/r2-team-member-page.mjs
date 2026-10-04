// TEMPORARY: collaborator-Team member page via the standaloneMember server query (dev stack).
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
const H = process.argv[2];
const gql = async (query, variables = {}) => { const r = await fetch("http://127.0.0.1:8000/graphql", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ query, variables }) }); const b = await r.json(); if (b.errors?.length) throw new Error(JSON.stringify(b.errors)); return b.data; };
const s = randomUUID().slice(0, 4);
const def = async (name, instructions) => (await gql("mutation($input: CreateAgentDefinitionInput!) { createAgentDefinition(input: $input) { id } }", { input: { name, description: "api-e2e", category: "api-e2e", instructions, toolNames: [] } })).createAgentDefinition.id;
const lead = await def(`Pg Lead ${s}`, "When another agent messages you, reply to it with send_message_to (its sender address) and the word NOTED. Keep it short.");
const mate = await def(`Pg Mate ${s}`, "Reply in one short sentence without tools.");
const team = (await gql("mutation($input: CreateAgentTeamDefinitionInput!) { createAgentTeamDefinition(input: $input) { id } }", { input: { name: `Pg Team ${s}`, description: "api-e2e", instructions: "Work together.", coordinatorMemberName: "lead", nodes: [{ memberName: "lead", ref: lead, refScope: "SHARED" }, { memberName: "mate", ref: mate, refScope: "SHARED" }], handoffs: [] } })).createAgentTeamDefinition.id;
console.log(JSON.stringify({ lead, mate, team }));
