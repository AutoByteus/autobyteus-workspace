/**
 * The demo node's file content routes (autobyteus-279), as the node answers them: a node file by its absolute path
 * (`node-files.ts`), a workspace file by its relative path (`workspaces.ts`; Files' pictures), a run's or member's file change (`run-file-changes.ts`), a message's reference file
 * (`team-communication.ts`, `agent-org-references.ts`, `agent-collaboration-references.ts`), and a conversation's picture
 * (`media.ts`). Every file comes from the demo folder; a file it does not have is the node's refusal.
 */
import sha256 from 'crypto-js/sha256';
import { DEMO_IMAGE_SVG } from '../world/content/files';
import type { DemoAgent, DemoRun, DemoWorld } from '../world/DemoWorld';
import { folderFile, isFolderPath, relativeToFolder, type FolderFile } from '../world/folder';
import { participantMessageOf } from '../world/participantMessages';
import { addressOf } from '../world/projections';
import { DEMO_WORKSPACE_ID } from '../graphql/definitions';
import { fileChangesOf } from '../graphql/runs';
import type { DemoRestRoute } from './index';

const json = (body: unknown, status: number): Response =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json; charset=utf-8' } });

/** A user file as the node sends one (`user-file-reply.ts`): its type, walled off, never cached. */
const userFile = (file: FolderFile): Response => new Response(file.body, { status: 200, headers: {
  'content-type': file.mimeType, 'content-security-policy': 'sandbox allow-scripts', 'x-content-type-options': 'nosniff', 'cache-control': 'no-store',
} });

/** A GET route by a path pattern; its answer gets the pattern's decoded groups. */
const get = (pattern: RegExp, answer: (groups: string[], url: URL, world: DemoWorld) => Response): DemoRestRoute => ({
  method: 'GET',
  match: (url) => pattern.test(url.pathname),
  answer: (url, _request, world) => answer(pattern.exec(url.pathname)!.slice(1).map(decodeURIComponent), url, world),
});

const runOf = (world: DemoWorld, runId: string, kind: DemoRun['kind']): DemoRun | null => {
  const run = world.run(runId);
  return run && run.kind === kind ? run : null;
};

const memberOf = (run: DemoRun | null, agentRunId: string): DemoAgent | null => run?.agents.find((agent) => agent.agentRunId === agentRunId) ?? null;

/** A file change's content: the file the agent wrote, from the folder (the node's 404 when it has none). */
const fileChangeContent = (world: DemoWorld, agent: DemoAgent | null, url: URL): Response => {
  const path = url.searchParams.get('path')?.trim();
  if (!path) return json({ detail: 'Missing required query parameter: path' }, 400);
  const entry = agent ? fileChangesOf(world, agent).find((change) => change.path === path) : null;
  if (!entry) return json({ detail: 'File change not found' }, 404);
  const file = folderFile(path);
  return file ? userFile(file) : json({ detail: 'File change content is not available' }, 404);
};

/** A message's reference by its id (`sha256(messageId \0 path)`, the node's and the web's), from the folder. */
const referenceContent = (world: DemoWorld, rootKind: string, rootRunId: string, messageId: string, referenceId: string): Response => {
  const message = participantMessageOf(world, rootKind, rootRunId, messageId);
  const path = message?.referenceFiles.find((file) => sha256(`${messageId}\0${file}`).toString() === referenceId);
  const relative = path ? relativeToFolder(path) : null;
  const file = relative === null ? null : folderFile(relative);
  return file ? userFile(file) : json({ detail: 'Team communication reference was not found.', code: 'REFERENCE_NOT_FOUND' }, 404);
};

export const contentRoutes: DemoRestRoute[] = [
  get(/^\/rest\/node-files\/content$/, (_groups, url) => {
    const absolute = url.searchParams.get('path') ?? '';
    if (!absolute.startsWith('/') || absolute.split('/').includes('..')) {
      return json({ code: 'NODE_FILE_PATH_INVALID', message: "The path must be an absolute path without '..' segments." }, 400);
    }
    const relative = relativeToFolder(absolute);
    if (relative !== null && isFolderPath(relative)) return json({ code: 'NODE_FILE_IS_FOLDER', message: 'This path is a folder, not a file.' }, 400);
    const file = relative === null ? null : folderFile(relative);
    return file ? userFile(file) : json({ code: 'NODE_FILE_NOT_FOUND', message: 'No file exists at this path.' }, 404);
  }),

  get(/^\/rest\/workspaces\/([^/]+)\/content$/, ([workspaceId], url) => {
    const path = url.searchParams.get('path');
    if (!path) return json({ detail: 'Missing required query parameter: path' }, 400);
    if (workspaceId !== DEMO_WORKSPACE_ID) return json({ detail: 'Workspace not found' }, 404);
    const file = folderFile(path);
    return file ? userFile(file) : json({ detail: 'File not found in workspace' }, 404);
  }),

  get(/^\/rest\/runs\/([^/]+)\/file-change-content$/, ([runId], url, world) =>
    fileChangeContent(world, runOf(world, runId!, 'agent')?.coordinator ?? null, url)),
  get(/^\/rest\/team-runs\/([^/]+)\/agent-runs\/([^/]+)\/file-change-content$/, ([teamRunId, agentRunId], url, world) =>
    fileChangeContent(world, memberOf(runOf(world, teamRunId!, 'team'), agentRunId!), url)),
  get(/^\/rest\/agent-org-runs\/([^/]+)\/agent-runs\/([^/]+)\/file-change-content$/, ([orgRunId, agentRunId], url, world) => {
    const memberAddress = url.searchParams.get('memberAddress')?.trim();
    if (!memberAddress) return json({ detail: 'Missing required query parameter: memberAddress' }, 400);
    const agent = memberOf(runOf(world, orgRunId!, 'org'), agentRunId!);
    return fileChangeContent(world, agent && addressOf(agent) === memberAddress ? agent : null, url);
  }),

  get(/^\/rest\/team-runs\/([^/]+)\/team-communication\/messages\/([^/]+)\/references\/([^/]+)\/content$/, ([runId, messageId, referenceId], _url, world) =>
    referenceContent(world, 'agent_team', runId!, messageId!, referenceId!)),
  get(/^\/rest\/agent-org-runs\/([^/]+)\/communication\/messages\/([^/]+)\/references\/([^/]+)\/content$/, ([runId, messageId, referenceId], _url, world) =>
    referenceContent(world, 'agent_org', runId!, messageId!, referenceId!)),
  get(/^\/rest\/agent-collaborations\/([^/]+)\/communication\/messages\/([^/]+)\/references\/([^/]+)\/content$/, ([runId, messageId, referenceId], _url, world) =>
    referenceContent(world, 'agent', runId!, messageId!, referenceId!)),

  // The showcase's picture (`SHOWCASE_IMAGE_PATH`), the one media file of the demo.
  get(/^\/rest\/media\/images\/release-1-6-banner\.svg$/, () => userFile({ mimeType: 'image/svg+xml', body: DEMO_IMAGE_SVG })),
];
