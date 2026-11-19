/**
 * What the demo's agents did before the demo opened (autobyteus-279, REQ-004): each agent's conversation and Activity, as
 * the node's run projection carries them (`RunProjectionConversationEntry` entries), ported from the approved design reference (`autobyteus-web-design` 78b51f73: `prototype/ios-demo/iosDemo.ts`). Keys are the agents'
 * content keys (`demo/world/content/runs.ts`): a member's is `<run key>/<member name>`.
 */
export type Entry = Record<string, unknown>
const fromAgent = (name: string, address: string, text: string, ts: number): Entry => ({
  kind: 'inter_agent_message', role: 'user', ts,
  content: `You received a message from sender name: ${name}, sender address: ${address}, sender id: ${address.replace(/^\//, '')}\nmessage:\n${text}`,
})
const said = (content: string, ts: number): Entry => ({ kind: 'message', role: 'assistant', content, ts })
const toolCall = (id: string, toolName: string, toolArgs: Record<string, unknown>, toolResult: string, ts: number): Entry => ({ kind: 'tool_call', invocationId: id, toolName, toolArgs, toolResult, ts })

const MEMBER_WORK: Record<string, (s: (minutes: number) => number) => Entry[]> = {
  'product-launch-org-1/launch_lead': (s) => [
    { kind: 'message', role: 'user', content: 'Prepare the 1.6 launch: the announcement, the email to the pilot customers and the release checklist.', ts: s(0) },
    toolCall('lead-1', 'read_file', { path: 'docs/release-notes-1.6.md' }, 'Read 18 lines.', s(1)),
    toolCall('lead-2', 'send_message_to', { recipient: '/content_writer', content: 'Draft the announcement and the pilot email from docs/release-notes-1.6.md.' }, 'Delivered to /content_writer.', s(2)),
    toolCall('lead-3', 'send_message_to', { recipient: '/release_manager', content: 'Prepare the release checklist for Thursday, 12 March.' }, 'Delivered to /release_manager.', s(3)),
    said('I asked content_writer for the announcement and the pilot email, and release_manager for the checklist. I will review both and post the launch plan here.', s(4)),
  ],
  'product-launch-org-1/content_writer': (s) => [
    fromAgent('launch lead', '/launch_lead', 'Draft the announcement and the pilot email from docs/release-notes-1.6.md.', s(0)),
    toolCall('cw-1', 'read_file', { path: 'docs/release-notes-1.6.md' }, 'Read 18 lines.', s(1)),
    toolCall('cw-2', 'write_file', { path: 'launch/announcement.md' }, 'Wrote launch/announcement.md.', s(2)),
    toolCall('cw-3', 'write_file', { path: 'launch/pilot-email.md' }, 'Wrote launch/pilot-email.md.', s(3)),
    said('Both drafts are in `launch/`: the announcement and the pilot email. The email asks the customers to update the connector to 2.4 first.', s(4)),
  ],
  'product-launch-org-1/release_manager': (s) => [
    fromAgent('launch lead', '/launch_lead', 'Prepare the release checklist for Thursday, 12 March.', s(0)),
    toolCall('rm-1', 'write_file', { path: 'launch/checklist.md' }, 'Wrote launch/checklist.md.', s(1)),
    said('The checklist is in `launch/checklist.md`. Two items wait for the connector 2.4 build; everything else is done.', s(2)),
  ],
  'engineering-team-1/implementation_engineer': (s) => [
    fromAgent('solution designer', '/solution_designer', 'Requirements are approved: keep the export filters when the user leaves the export screen. Keep the change small.', s(0)),
    toolCall('ie-1', 'read_file', { path: 'src/export/filters.ts' }, 'Read 4 lines.', s(1)),
    toolCall('ie-2', 'edit_file', { path: 'src/export/filters.ts' }, 'Edited src/export/filters.ts.', s(2)),
    toolCall('ie-3', 'run_terminal_command', { command: 'pnpm test export' }, '12 tests passed.', s(3)),
    said('The export screen now restores the saved filters. The tests pass; handing over to code_reviewer.', s(4)),
  ],
}

/** The work of a Team's roles (by the member's name), about their Team's own task. */
type Team = { name: string; summary: string } | null
const ROLE_WORK: Record<string, (s: (minutes: number) => number, team: Team) => Entry[]> = {
  solution_designer: (s, team) => [
    fromAgent('project task manager', '/project_task_manager', `${team?.summary ?? 'The Task'}. Please design the change.`, s(0)),
    toolCall('sd-1', 'read_file', { path: 'docs/pilot-summary.md' }, 'Read 9 lines.', s(1)),
    toolCall('sd-2', 'send_message_to', { recipient: '/implementation_engineer', content: 'Requirements are approved. Keep the change small.' }, 'Delivered to /implementation_engineer.', s(2)),
    said('The requirements are approved and with implementation_engineer. I will review the result with code_reviewer.', s(3)),
  ],
  implementation_engineer: (s) => [
    fromAgent('solution designer', '/solution_designer', 'Requirements are approved: keep the export filters when the user leaves the export screen. Keep the change small.', s(0)),
    toolCall('ie-1', 'read_file', { path: 'src/export/filters.ts' }, 'Read 4 lines.', s(1)),
    toolCall('ie-2', 'edit_file', { path: 'src/export/filters.ts' }, 'Edited src/export/filters.ts.', s(2)),
    toolCall('ie-3', 'run_terminal_command', { command: 'pnpm test export' }, '12 tests passed.', s(3)),
    said('The export screen now restores the saved filters. The tests pass; handing over to code_reviewer.', s(4)),
  ],
  code_reviewer: (s) => [
    fromAgent('implementation engineer', '/implementation_engineer', 'The change is ready for review: src/export/filters.ts.', s(0)),
    toolCall('cr-1', 'read_file', { path: 'src/export/filters.ts' }, 'Read 4 lines.', s(1)),
    toolCall('cr-2', 'run_terminal_command', { command: 'pnpm test export' }, '12 tests passed.', s(2)),
    said('Reviewed: the change is small and the tests cover it. Approved.', s(3)),
  ],
  campaign_lead: (s) => [
    { kind: 'message', role: 'user', content: 'Plan the 1.6 launch campaign across email, social and the website.', ts: s(0) },
    toolCall('cl-1', 'read_file', { path: 'launch/announcement.md' }, 'Read 5 lines.', s(1)),
    toolCall('cl-2', 'send_message_to', { recipient: '/copywriter', content: 'Write three social posts from launch/announcement.md.' }, 'Delivered to /copywriter.', s(2)),
    toolCall('cl-3', 'send_message_to', { recipient: '/designer', content: 'Make the website banner for Thursday, 12 March.' }, 'Delivered to /designer.', s(3)),
    said('The campaign is split: posts with copywriter, the banner with designer, the email from the launch folder. I will put it together here.', s(4)),
  ],
  copywriter: (s) => [
    fromAgent('campaign lead', '/campaign_lead', 'Write three social posts from launch/announcement.md.', s(0)),
    toolCall('cw-m1', 'read_file', { path: 'launch/announcement.md' }, 'Read 5 lines.', s(1)),
    said('Three posts are drafted: filters that stay, invoices in your customer’s language, and imports that name the row to fix.', s(2)),
  ],
  designer: (s) => [
    fromAgent('campaign lead', '/campaign_lead', 'Make the website banner for Thursday, 12 March.', s(0)),
    toolCall('ds-1', 'read_file', { path: 'docs/dashboard-after.png' }, 'Opened the screenshot.', s(1)),
    said('The banner uses the new export screen and the date. Ready for the campaign lead.', s(2)),
  ],
  triage_lead: (s) => [
    { kind: 'message', role: 'user', content: 'Triage the open desktop support threads.', ts: s(0) },
    toolCall('tl-1', 'read_file', { path: 'docs/pilot-customers.csv' }, 'Read 5 lines.', s(1)),
    toolCall('tl-2', 'send_message_to', { recipient: '/answer_writer', content: 'Answer the two connector questions; both need connector 2.4.' }, 'Delivered to /answer_writer.', s(2)),
    said('Four threads triaged: two are about the connector (answer_writer has them), two are fixed in 1.6.', s(3)),
  ],
  answer_writer: (s) => [
    fromAgent('triage lead', '/triage_lead', 'Answer the two connector questions; both need connector 2.4.', s(0)),
    toolCall('aw-1', 'read_file', { path: 'docs/release-notes-1.6.md' }, 'Read 18 lines.', s(1)),
    said('Both answers are drafted: update the connector to 2.4, then upgrade.', s(2)),
  ],
}
ROLE_WORK['Code Searcher'] = (s) => [
  fromAgent('implementation engineer', '/implementation_engineer', 'Find where the export screen keeps its filters.', s(0)),
  toolCall('cs-1', 'search_files', { query: 'filters' }, 'src/export/filters.ts', s(1)),
  toolCall('cs-2', 'read_file', { path: 'src/export/filters.ts' }, 'Read 4 lines.', s(2)),
  said('The filters are restored in `src/export/filters.ts` (`restoreFilters`). That is the place to change.', s(3)),
]

/** The demo's own agents (top-level runs): one piece of work each, with a tool call, about their run's title. */
const AGENT_WORK: Record<string, { tool: string; args: (summary: string) => Record<string, unknown>; result: string; answer: string }> = {
  'Agent Package Creator': { tool: 'read_file', args: () => ({ path: 'docs/release-notes-1.6.md' }), result: 'Read 7 lines.', answer: 'The package is laid out: the agent’s instructions, its tools and a short description for the agent store.' },
  'Market Researcher': { tool: 'search_web', args: (q) => ({ query: q }), result: 'Found 6 pricing pages.', answer: 'Three comparable products; two changed their tiers in October. The comparison is in the folder.' },
  Codex: { tool: 'run_terminal_command', args: () => ({ command: 'pnpm test probe' }), result: '1 test fixed, 24 passed.', answer: 'The probe test waited on a timer that never fired; it now waits for the answer. All tests pass.' },
  'Personal Assistant': { tool: 'read_file', args: () => ({ path: 'docs/pilot-summary.md' }), result: 'Read 9 lines.', answer: 'Your week: school pickups Monday and Thursday, the dentist Wednesday at 4, the budget review Friday morning.' },
  'Writing Coach': { tool: 'read_file', args: () => ({ path: 'launch/pilot-email.md' }), result: 'Read 9 lines.', answer: 'A tighter opening: “Release 1.6 ships on Thursday, 12 March, with the three changes you asked for.”' },
  'Weekly Planner': { tool: 'read_file', args: () => ({ path: 'launch/checklist.md' }), result: 'Read 6 lines.', answer: 'Two items are blocked this week: both wait for the connector 2.4 build.' },
  'Travel Planner': { tool: 'search_web', args: (q) => ({ query: q }), result: 'Found 4 flights.', answer: 'The morning flight is shorter and costs a little more; the evening one has a long layover. I would take the morning one.' },
  'Refactoring Assistant': { tool: 'edit_file', args: () => ({ path: 'src/export/filters.ts' }), result: 'Edited src/export/filters.ts.', answer: 'The helpers are renamed and every import is updated; the tests pass.' },
  'Contract Reader': { tool: 'read_file', args: () => ({ path: 'docs/lease-renewal.md' }), result: 'Read 7 lines.', answer: 'Three things to ask the landlord: the notice period, who pays for repairs, and whether the rent can change mid-term.' },
}
export function demoAgentEntries(node: { id: string; name: string; summary: string }, at: number): Entry[] | null {
  const work = AGENT_WORK[node.name]
  if (!work) return null
  const s = (minutes: number): number => Math.floor((at + minutes * 60_000) / 1000)
  return [
    { kind: 'message', role: 'user', content: node.summary, ts: s(0) },
    toolCall(`${node.id}-w1`, work.tool, work.args(node.summary), work.result, s(1)),
    said(work.answer, s(2)),
  ]
}
const asActivities = (nodeId: string, entries: Entry[]): Entry[] => entries.filter((entry) => entry.kind === 'tool_call').map((entry, n) => ({
  kind: 'tool', invocationId: `${nodeId}-demo-a${n}`, toolName: entry.toolName,
  type: entry.toolName === 'write_file' ? 'write_file' : entry.toolName === 'edit_file' ? 'edit_file' : entry.toolName === 'run_terminal_command' ? 'terminal_command' : 'tool_call',
  status: 'success', contextText: Object.values(entry.toolArgs as Record<string, unknown>)[0], arguments: entry.toolArgs, logs: [], result: entry.toolResult, error: null, ts: entry.ts,
}))
export const demoAgentActivities = (node: { id: string; name: string; summary: string }, at: number): Entry[] | null => {
  const entries = demoAgentEntries(node, at)
  return entries ? asActivities(node.id, entries) : null
}

const workOf = (node: { id: string; name: string }, team: Team): ((s: (minutes: number) => number) => Entry[]) | null => {
  const own = MEMBER_WORK[node.id]
  if (own) return own
  const role = ROLE_WORK[node.name]
  return role ? (s) => role(s, team) : null
}

/** A member's conversation in the demo; members without their own get a short one about their Team's work. */
export function demoMemberEntries(node: { id: string; name: string }, team: { name: string; summary: string } | null, at: number): Entry[] {
  const s = (minutes: number): number => Math.floor((at + minutes * 60_000) / 1000)
  const own = workOf(node, team)
  if (own) return own(s)
  return [
    fromAgent('coordinator', '/coordinator', team ? `${team.summary}. Please take your part of it.` : 'Please take your part of the Task.', s(0)),
    said(team ? `On it: my part of “${team.summary}”. I will post the result here.` : 'On it. I will post the result here.', s(1)),
  ]
}

/** A member's Activity in the demo: the tool calls of its conversation. */
export function demoMemberActivities(node: { id: string; name: string; status: string }, at: number, team: Team = null): Entry[] | null {
  const own = workOf(node, team)
  if (!own) return null
  const s = (minutes: number): number => Math.floor((at + minutes * 60_000) / 1000)
  return asActivities(node.id, own(s))
}
