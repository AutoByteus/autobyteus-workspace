/**
 * The showcase conversation (autobyteus-279, VIS-007/008): the run whose conversation shows every kind of content, as the
 * node's run projection carries it. Ported from the approved design reference (`autobyteus-web-design` 78b51f73:
 * `mobile-world.mjs` `richConversation`, with `iosDemo.ts` `demoConversation`'s demo rules): no error block, no failed
 * tool, no platform notice; the upgrade check finished; the demo's own wording.
 */
import { DEMO_ORIGIN } from '../../demoIdentity';
import type { Entry } from './agentWork';

const MARKDOWN_ANSWER = [
  '## Release 1.6 at a glance',
  '',
  'The pilot customers get **three changes** that matter to them, and one date that moved. Here is the short version; the longer notes are in `docs/release-notes-1.6.md`.',
  '',
  '### What changed',
  '',
  '1. The export screen now keeps your filters when you leave and come back.',
  '2. Invoices can be sent in the customer’s language, with the *currency* formatted for their country.',
  '3. A failed import now says which row failed, not only that something did.',
  '',
  '### Before you upgrade',
  '',
  '- Back up the `exports/` folder.',
  '- Update the connector to **2.4** or later.',
  '- Re-run the sample import once; it takes about a minute.',
  '',
  'The upgrade check looks like this:',
  '',
  '```bash',
  'pnpm run upgrade:check --target 1.6',
  '```',
  '',
  'and the settings file keeps this shape:',
  '',
  '```json',
  '{',
  '  "release": "1.6",',
  '  "keepFilters": true,',
  '  "invoiceLanguage": "customer"',
  '}',
  '```',
  '',
  'A small helper that formats the date for the announcement:',
  '',
  '```ts',
  'export function announcementDate(date: Date, locale = "en-GB"): string {',
  '  return new Intl.DateTimeFormat(locale, { dateStyle: "long" }).format(date)',
  '}',
  '```',
  '',
  '| Area | Before | In 1.6 |',
  '| --- | --- | --- |',
  '| Export filters | Reset on leave | Kept |',
  '| Invoice language | Account language | Customer language |',
  '| Import errors | Count only | Row and reason |',
  '',
  '> The new date is **Thursday, 12 March**. Everything above ships together.',
  '',
  'Questions? Reply here and I will draft the message for the pilot customers.',
].join('\n')

const TERMINAL_LOG = ['9f3a1c2 Keep export filters when leaving the screen', '4b7d0e8 Format invoice currency by customer country', 'c21e5a9 Name the failing row in import errors', 'a07f6b3 Update connector minimum to 2.4', '5de8c40 Fix the intro typo in the release notes']

/** The showcase's own wording, as the demo's files say it (the sample release notes). */
const DEMO_WORDING: Array<[RegExp, string]> = [
  [/A failed import now says which row failed, not only that something did\./g, 'An import now says which row needs fixing and why.'],
  [/\| Import errors \| Count only \| Row and reason \|/g, '| Import messages | Count only | Row and reason |'],
];
const reworded = (text: string): string => DEMO_WORDING.reduce((out, [from, to]) => out.replace(from, to), text);

/** The showcase's picture, served by the demo node's media route. */
/**
 * The showcase's picture, as the node names a stored media file (`/rest/files/<category>/<name>`, media-storage-service.ts),
 * at the demo node's own origin: on a phone the node serves, the node's relative URL resolves to the node; the demo page
 * is the app's own (`autobyteus-demo://app`), so the demo names its node's origin.
 */
export const SHOWCASE_IMAGE_URL = `${DEMO_ORIGIN}/rest/files/images/release-1-6-banner.svg`;

const UPGRADE_CHECK = 'Connector 2.4 found. Ready to upgrade to 1.6.';

/**
 * The showcase's entries. `at` is the conversation's start (ms); `projectTaskManager` the run id of the agent whose message
 * the second turn shows (a message from another agent names it from its run id).
 */
export const showcaseEntries = (at: number, projectTaskManager: string): Entry[] => {
  const s = (offset: number) => Math.floor((at + offset) / 1000);
  const tool = (invocationId: string, toolName: string, toolArgs: Record<string, unknown>, toolResult: unknown, offset: number): Entry =>
    ({ kind: 'tool_call', invocationId, toolName, toolArgs, toolResult, ts: s(offset) });
  return [
    {
      kind: 'message', role: 'user', ts: s(0),
      content: 'Summarize the 1.6 release notes for the pilot customers. Check the changelog, show me the latest commits and fix the typo in the intro.',
      fileAttachments: [
        { uri: 'docs/release-notes-1.6.md', fileType: 'Text', fileName: 'release-notes-1.6.md' },
        { uri: 'docs/dashboard-before.png', fileType: 'Image', fileName: 'dashboard-before.png' },
        { uri: 'docs/pilot-customers.csv', fileType: 'Text', fileName: 'pilot-customers.csv' },
      ],
    },
    { kind: 'reasoning', content: 'The pilot customers care about the new date and the migration steps. I should read the changelog first, then look at the latest commits, fix the typo and write the summary.', ts: s(8_000) },
    { kind: 'message', role: 'assistant', content: 'I’ll start by reading the changelog and the commit history.', ts: s(9_000) },
    tool('demo-rich-t1', 'read_file', { path: 'docs/release-notes-1.6.md' }, 'Read 84 lines.', 10_000),
    tool('demo-rich-t3', 'run_terminal_command', { command: 'git log --oneline -5' }, { stdout: TERMINAL_LOG.join('\n'), exit_code: 0 }, 12_000),
    tool('demo-rich-t4', 'edit_file', { path: 'docs/release-notes-1.6.md' }, 'Edited docs/release-notes-1.6.md.', 14_000),
    tool('demo-rich-t5', 'write_file', { path: 'docs/pilot-summary.md' }, 'Wrote docs/pilot-summary.md.', 16_000),
    tool('demo-rich-t6', 'run_terminal_command', { command: 'pnpm run upgrade:check --target 1.6' }, { stdout: UPGRADE_CHECK, exit_code: 0 }, 18_000),
    { kind: 'message', role: 'assistant', content: reworded(MARKDOWN_ANSWER), media: { images: [SHOWCASE_IMAGE_URL] }, ts: s(20_000) },
    { kind: 'message', role: 'user', content: 'Thanks. Anything the project manager said that I should know?', ts: s(70_000) },
    {
      kind: 'inter_agent_message', role: 'user', senderAgentRunId: projectTaskManager, senderAddress: '/project_task_manager', ts: s(80_000),
      content: 'You received a message from sender name: project task manager, sender address: /project_task_manager, sender id: project_task_manager\nmessage:\nThe pilot customers asked for the new date in writing. Please include it in the summary and mention the connector minimum.',
    },
    { kind: 'message', role: 'assistant', content: 'Yes: they want the date **in writing**, and the connector minimum (`2.4`) mentioned. Both are in the summary I wrote.', ts: s(82_000) },
  ];
};

/** The showcase's Activity: its conversation's tool calls (the same invocations), as the projection's activities carry them. */
export const showcaseActivities = (at: number): Entry[] => {
  const tool = (n: number, toolName: string, type: string, args: Record<string, unknown>, extra: Record<string, unknown> = {}): Entry => ({
    kind: 'tool', invocationId: `demo-rich-t${n}`, toolName, type, status: 'success', arguments: args, logs: [],
    result: 'ok', error: null, ts: Math.floor((at + n * 20_000) / 1000), ...extra,
  });
  return [
    tool(1, 'read_file', 'tool_call', { path: 'docs/release-notes-1.6.md' }),
    tool(3, 'run_terminal_command', 'terminal_command', { command: 'git log --oneline -5' }, { logs: TERMINAL_LOG, result: { stdout: TERMINAL_LOG.join('\n'), exit_code: 0 } }),
    tool(4, 'edit_file', 'edit_file', { path: 'docs/release-notes-1.6.md' }),
    tool(5, 'write_file', 'write_file', { path: 'docs/pilot-summary.md' }),
    tool(6, 'run_terminal_command', 'terminal_command', { command: 'pnpm run upgrade:check --target 1.6' },
      { logs: ['Checking connector version…', UPGRADE_CHECK], result: { stdout: UPGRADE_CHECK, exit_code: 0 } }),
  ];
};
