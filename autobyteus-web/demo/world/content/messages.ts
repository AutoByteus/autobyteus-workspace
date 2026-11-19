/**
 * The messages among a Team's or an Org's members (autobyteus-279, REQ-004: Messages), as the node's participant messages
 * carry them, ported from the approved design reference (`autobyteus-web-design` 78b51f73: `prototype/ios-demo/iosDemo.ts`).
 */
import type { Entry } from './agentWork';

type Team = { name: string; summary: string } | null

/** Messages among an Org's or a Team's members in the demo, about their own work. */
const LAUNCH_MESSAGES: Array<[string, string, string, string[]]> = [
  ['launch_lead', 'content_writer', 'Draft the announcement and the pilot email from docs/release-notes-1.6.md.', ['docs/release-notes-1.6.md']],
  ['launch_lead', 'release_manager', 'Prepare the release checklist for Thursday, 12 March.', []],
  ['content_writer', 'launch_lead', 'Both drafts are ready for your review.', ['launch/announcement.md', 'launch/pilot-email.md']],
  ['release_manager', 'launch_lead', 'Checklist done. Two items wait for the connector 2.4 build.', ['launch/checklist.md']],
]
export function demoParticipantMessages(node: { id: string; key: string; name: string }, members: Array<{ id: string; name: string }>, at: number, team: Team = null): { messages: Entry[]; pastParticipants: Entry[] } | null {
  if (!node.key.startsWith('product-launch-org-1/')) {
    // Any other member: the messages with its Team's coordinator about the Team's work.
    const lead = members.find((member) => member.id !== node.id)
    if (!lead) return { messages: [], pastParticipants: [] }
    const row = (n: number, from: { id: string }, to: { id: string }, content: string, files: string[] = []): Entry => ({
      messageId: `${node.id}-demo-m${n}`, senderAgentRunId: from.id, receiverAgentRunId: to.id, content, messageType: 'direct_message',
      referenceFiles: files, createdAt: new Date(at + (n + 1) * 90_000).toISOString(),
    })
    return { messages: [
      row(0, lead, node, team ? `${team.summary}. Please take your part.` : 'Please take your part of the Task.', ['README.md']),
      row(1, node, lead, 'My part is done; the result is in the folder.'),
    ], pastParticipants: [] }
  }
  const byName = new Map(members.map((member) => [member.name, member]))
  const messages = LAUNCH_MESSAGES
    .filter(([from, to]) => from === node.name || to === node.name)
    .map(([from, to, content, files], n) => ({
      messageId: `${node.id}-demo-m${n}`, senderAgentRunId: byName.get(from)?.id ?? from, receiverAgentRunId: byName.get(to)?.id ?? to,
      content, messageType: 'direct_message', referenceFiles: files, createdAt: new Date(at + (n + 1) * 90_000).toISOString(),
    }))
  return { messages, pastParticipants: [] }
}

