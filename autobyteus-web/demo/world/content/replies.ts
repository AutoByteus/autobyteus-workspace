/**
 * The demo's scripted answers (autobyteus-279, REQ-005), ported from the approved design reference
 * (`autobyteus-web-design` 78b51f73: `prototype/ios-demo/iosDemo.ts`): a send gets an answer in that agent's own
 * conversation. A send with an attached file reads it; a Team or Org member reports on its part (`demoMemberReply`); the
 * showcase run continues its own work (its release notes); any other run looks at its own folder. Every answer ends with
 * the specification's one closing line (its copy table; members answer the same way).
 */
const quoted = (content: string): string => {
  const asked = content.trim().replace(/\s+/g, ' ')
  return asked.length > 80 ? `${asked.slice(0, 77)}…` : asked
}
export const SAMPLE_LINE = 'This is the demo, so this answer is a sample. With your own computer, your agent does the work and answers here the same way.'
export type DemoReplyOf = Readonly<{ showcase: boolean; member: boolean }>;

export const replyFor = (of: DemoReplyOf, content: string, attached: string[] = []): { tool: string; args: Record<string, unknown>; result: string; text: string } => (attached.length
  ? {
      tool: 'read_file', args: { path: attached[0]!.split('/').pop() }, result: `Read ${attached[0]!.split('/').pop()}.`,
      text: [`I read ${attached.map((path) => `\`${path.split('/').pop()}\``).join(', ')}. Here is how I would start on “${quoted(content || 'this file')}”.`, '', '1. Pick out what matters in the file.', '2. Do the work step by step in this run’s folder.', '3. Post the result here.', '', SAMPLE_LINE].join('\n'),
    }
  : of.member
  ? {
      tool: 'list_directory', args: { path: 'launch' }, result: 'announcement.md, checklist.md, pilot-email.md',
      text: [`Here is where I am on “${quoted(content)}”: my part is in the folder, and I am waiting on the others in my team for the rest. I will post the result here.`, '', SAMPLE_LINE].join('\n'),
    }
  : of.showcase
  ? {
      tool: 'read_file', args: { path: 'docs/release-notes-1.6.md' }, result: 'Read 18 lines of docs/release-notes-1.6.md.',
      text: [`Here is how I would start on “${quoted(content)}”.`, '', '1. Take the three changes and the date from `docs/release-notes-1.6.md`.', '2. Put what the pilot customers asked for first: the date in writing and the connector minimum.', '3. Write it to the folder and post the short version here.', '', SAMPLE_LINE].join('\n'),
    }
  : {
      tool: 'list_directory', args: { path: 'demo-workspace' }, result: 'README.md, docs/, launch/, src/',
      text: [`Here is how I would start on “${quoted(content)}”.`, '', '1. Look through this run’s folder for what is already there.', '2. Do the work step by step: read and write files, run commands, or ask other agents for help.', '3. Post the result here and keep the files in the folder.', '', SAMPLE_LINE].join('\n'),
    })

export const words = (text: string): string[] => {
  const parts = text.split(/(?<=\s)/)
  const chunks: string[] = []
  for (let i = 0; i < parts.length; i += 3) chunks.push(parts.slice(i, i + 3).join(''))
  return chunks
}
