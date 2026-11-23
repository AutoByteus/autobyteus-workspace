import fs from "node:fs/promises";
import path from "node:path";

/**
 * Released Org tree v1 worlds (org-teams-follow-definition, data migration guideline §9): hand-built in the shapes the last
 * release before the container wrote, never from real data. The software development department: a direct agent
 * `/concierge`, the Team `/software_engineering_team` (members `/solution_designer` coordinator and `/code_reviewer`), and
 * the Team `/product_design_prototyping_team` (member `/product_prototyper`).
 */
type Json = Record<string, unknown>;
export const ORG = "sdd_org_1";
export const SET = "set_team_1";
export const PDP = "pdp_team_1";
export const P = "/software_engineering_team";
export const CREATED = "2026-09-21T11:47:04.136Z";

/** A released launch; `skillAccessMode` is a released key outside today's launch shape (dropped by the conversion). */
export const releasedLaunch = (model: string, extra: Json = { skillAccessMode: "PRELOADED_ONLY" }): Json => ({
  runtimeKind: "codex_app_server", llmModelIdentifier: model, llmConfig: null, autoExecuteTools: true, workspaceRootPath: "/home/u/workspace", ...extra,
});
const agentNode = (address: string, agentRunId: string, model = "gpt-6-astra"): Json => ({
  address, agentDefinitionId: address.split("/").at(-1)!.replace(/_/g, "-"), role: null, description: null, agentRunId, platformAgentRunId: null,
  launchConfiguration: releasedLaunch(model),
});

export type ReleasedOrgOptions = Readonly<{ agents?: boolean; teams?: boolean; applicationBinding?: Json | null; collaborators?: boolean; orgRunId?: string }>;

/** The released Org tree v1. */
export const releasedOrgTree = (options: ReleasedOrgOptions = {}): Json => {
  const orgRunId = options.orgRunId ?? ORG;
  const members: Json[] = [];
  if (options.teams !== false) {
    members.push({ address: P, teamDefinitionId: "software-engineering-team", role: null, description: null, teamRunId: SET,
      coordinatorAddress: `${P}/solution_designer`, defaultLaunchConfiguration: releasedLaunch("gpt-6-astra"),
      members: [agentNode(`${P}/solution_designer`, "solution_designer_1"), agentNode(`${P}/code_reviewer`, "code_reviewer_1", "reviewer-model")] });
    members.push({ address: "/product_design_prototyping_team", teamDefinitionId: "product-design-prototyping-team", role: null, description: null, teamRunId: PDP,
      coordinatorAddress: "/product_design_prototyping_team/product_prototyper", defaultLaunchConfiguration: releasedLaunch("gpt-6-astra"),
      members: [agentNode("/product_design_prototyping_team/product_prototyper", "product_prototyper_1")] });
  }
  if (options.agents !== false) members.push(agentNode("/concierge", "concierge_1"));
  const handoffs: Json[] = [];
  if (options.teams !== false) {
    handoffs.push({ from: `${P}/solution_designer`, to: `${P}/code_reviewer`, rules: ["When the design is ready for review."] });
    handoffs.push({ from: `${P}/solution_designer`, to: "/product_design_prototyping_team/product_prototyper", rules: ["When a product design request is ready."] });
  }
  if (options.agents !== false && options.teams !== false) handoffs.push({ from: "/concierge", to: P, rules: ["When a software request arrives."] });
  return {
    subjectKind: "agent_org", createdAt: CREATED, archivedAt: null, applicationBinding: options.applicationBinding ?? null, handoffs,
    rootOrg: { address: "/", orgDefinitionId: "software-development-department", orgDefinitionName: "Software Development Department", orgRunId,
      defaultLaunchConfiguration: releasedLaunch("gpt-6-astra"), members, ...(options.collaborators ? { collaborators: [] } : {}) },
  };
};

export const message = (id: string, sender: string, receiver: string, extra: Json = {}): Json => ({
  messageId: id, senderAgentRunId: sender, receiverAgentRunId: receiver, content: `${id} content`, messageType: "handoff", referenceFiles: [],
  createdAt: "2026-11-22T10:00:00.000Z", ...extra,
});

/** The released Org log: an intra-Team line, cross-unit lines, a line with a run outside the Org, a user line to a member. */
export const releasedOrgLog = (): Json[] => [
  message("m_intra", "solution_designer_1", "code_reviewer_1"),
  message("m_cross", "concierge_1", "solution_designer_1"),
  message("m_cross_back", "product_prototyper_1", "concierge_1"),
  message("m_outside", "code_reviewer_1", "delegated_writer_1", { counterpart: { address: null, nodeId: null } }),
  message("m_user", "user", "concierge_1", { messageType: "user_message" }),
];

const write = async (file: string, content: string) => { await fs.mkdir(path.dirname(file), { recursive: true }); await fs.writeFile(file, content); };

/** A memory folder with a released Org: its tree, its log, its members' folders (each with a trace), its residue. */
export const writeReleasedOrg = async (memoryDir: string, options: ReleasedOrgOptions & Readonly<{ log?: Json[] | null }> = {}): Promise<void> => {
  const orgRunId = options.orgRunId ?? ORG;
  const orgDir = path.join(memoryDir, "agent_orgs", orgRunId);
  const tree = releasedOrgTree(options);
  await write(path.join(orgDir, "agent_org_run_execution_tree.json"), JSON.stringify(tree, null, 2));
  if (options.log !== null) await write(path.join(orgDir, "agent_org_communication_messages_active.jsonl"), (options.log ?? releasedOrgLog()).map((line) => `${JSON.stringify(line)}\n`).join(""));
  await write(path.join(orgDir, "agent_org_task_delegation_records.json"), JSON.stringify({ schemaVersion: 1, subjectKind: "agent_org", orgRunId, records: [] }));
  for (const member of (tree.rootOrg as Json).members as Json[]) {
    if (member.teamRunId) {
      for (const agent of member.members as Json[]) await write(path.join(orgDir, String(member.teamRunId), String(agent.agentRunId), "raw_traces_active.jsonl"), "{\"trace\":1}\n");
    } else {
      await write(path.join(orgDir, String(member.agentRunId), "raw_traces_active.jsonl"), "{\"trace\":1}\n");
    }
  }
};

/**
 * The released Org as `v1.5.14-beta.7` (autobyteus-587) left it after files came from another node (SR-017): a Team member
 * (`code_reviewer_1`) and the direct agent (`concierge_1`) each received a file (the line only in the Org log, with
 * `counterpart.nodeId`; the bytes linked under the member's `received_files/<sender>/`); the member forwarded a file of
 * its own folder to a delegated run (that run's log, an active and a sealed file); an ad-hoc Task names a member file;
 * traces name received files in `file_attachments` and `media` and in their prose. One entry is under another data
 * directory's `agent_orgs/` (unreachable before the conversion; never this conversion's).
 */
export const BETA7 = Object.freeze({ peerNode: "srv_peer_node", foreign: "/srv/other-data/memory/agent_orgs/sdd_org_1/concierge_1/received_files/x/old.md" });
export const writeBeta7CrossNodeOrg = async (appDataDir: string, memoryDir: string) => {
  const orgDir = path.join(memoryDir, "agent_orgs", ORG);
  const reviewerDir = path.join(orgDir, SET, "code_reviewer_1");
  const conciergeDir = path.join(orgDir, "concierge_1");
  const files = {
    spec: path.join(reviewerDir, "received_files", "peer_lead_1", "spec.md"),
    notes: path.join(reviewerDir, "notes.md"),
    brief: path.join(conciergeDir, "received_files", "peer_lead_2", "brief.pdf"),
    picture: path.join(conciergeDir, "received_files", "peer_lead_2", "picture.png"),
  };
  const fromPeer = { counterpart: { address: null, nodeId: BETA7.peerNode } };
  await writeReleasedOrg(memoryDir, { log: [
    ...releasedOrgLog(),
    message("m_peer_member", "peer_lead_1", "code_reviewer_1", { ...fromPeer, referenceFiles: [files.spec] }),
    message("m_peer_agent", "peer_lead_2", "concierge_1", { ...fromPeer, referenceFiles: [files.brief, files.picture] }),
    message("m_foreign", "concierge_1", "solution_designer_1", { referenceFiles: [BETA7.foreign] }),
  ] });
  await write(files.spec, "SPEC BYTES");
  await write(files.notes, "NOTES BYTES");
  await write(files.brief, "BRIEF BYTES");
  await write(files.picture, "PNG BYTES");
  // The member forwarded its own file to a delegated run of the Org (that run's own log: one sealed, one active file).
  const delegated = path.join(memoryDir, "agents", "delegated_writer_1");
  await write(path.join(delegated, "communication_messages_000001.jsonl"), `${JSON.stringify(message("m_fwd_old", "code_reviewer_1", "delegated_writer_1", { referenceFiles: [files.notes] }))}\n`);
  await write(path.join(delegated, "communication_messages_active.jsonl"), `${JSON.stringify(message("m_fwd", "code_reviewer_1", "delegated_writer_1", { referenceFiles: [files.notes, files.spec] }))}\n`);
  await write(path.join(appDataDir, "ad-hoc-tasks", "task_cross", "task.json"), `${JSON.stringify({ taskId: "task_cross", description: "Review the spec.",
    referenceFiles: [files.spec], status: "IN_PROGRESS", createdAt: CREATED, updatedAt: CREATED }, null, 2)}\n`);
  const prose = (file: string) => `Message from peer_lead.\nReference files:\n- ${file}`;
  await write(path.join(reviewerDir, "raw_traces_active.jsonl"), [
    { id: "t1", trace_type: "user", content: prose(files.spec), file_attachments: [{ uri: files.spec, file_type: "text", file_name: "spec.md" }] },
    { id: "t2", trace_type: "assistant", content: `I read ${files.spec}.` },
  ].map((line) => `${JSON.stringify(line)}\n`).join(""));
  await write(path.join(reviewerDir, "raw_traces_000001.jsonl"), `${JSON.stringify({ id: "t0", trace_type: "user", content: "Earlier.",
    file_attachments: [{ uri: files.notes, file_type: "text", file_name: "notes.md" }] })}\n`);
  await write(path.join(conciergeDir, "raw_traces_active.jsonl"), `${JSON.stringify({ id: "c1", trace_type: "user", content: prose(files.brief),
    media: { images: [files.picture] }, file_attachments: [{ uri: files.brief, file_type: "pdf", file_name: "brief.pdf" }] })}\n`);
  return files;
};

/** A Task (ad-hoc) whose entries name the Org as delegating run: one by the agent unit, one by a Team member, one old (no delegator). */
export const writeTaskNamingOrg = async (appDataDir: string, orgRunId = ORG): Promise<string> => {
  const file = path.join(appDataDir, "ad-hoc-tasks", "task_1", "agent_run_resources.json");
  await write(file, JSON.stringify({ entries: [
    { role: "assigned", execution: { agentRunId: "writer_copy_1" }, delegatedFrom: { delegatingRun: { kind: "agent_org", runId: orgRunId }, delegatorAgentRunId: "concierge_1" }, open: true },
    { role: "assigned", execution: { teamRunId: "review_copy_1" }, delegatedFrom: { delegatingRun: { kind: "agent_org", runId: orgRunId }, delegatorAgentRunId: "code_reviewer_1" }, open: true },
    { role: "assigned", execution: { agentRunId: "old_copy_1" }, delegatedFrom: { delegatingRun: { kind: "agent_org", runId: orgRunId } }, open: false },
    { role: "assigned", execution: { agentRunId: "peer_copy_1" }, delegatedFrom: { delegatingRun: { kind: "agent_org", runId: orgRunId }, delegatorAgentRunId: "concierge_1", nodeId: "srv_peer" }, open: true },
  ] }, null, 2));
  return file;
};

/** A delegated agent run's own file naming the Org as its delegating run (delegated by the agent unit). */
export const writeDelegatedRunNamingOrg = async (memoryDir: string, orgRunId = ORG): Promise<string> => {
  const file = path.join(memoryDir, "agents", "writer_copy_1", "run_metadata.json");
  await write(file, JSON.stringify({ runId: "writer_copy_1", agentDefinitionId: "writer", workspaceRootPath: "/home/u/workspace", memoryDir: path.dirname(file),
    llmModelIdentifier: "m", llmConfig: null, autoExecuteTools: true, runtimeKind: "codex_app_server", platformAgentRunId: null, address: "/writer",
    delegatedFrom: { delegatingRun: { kind: "agent_org", runId: orgRunId }, delegatorAgentRunId: "concierge_1" } }, null, 2));
  return file;
};
