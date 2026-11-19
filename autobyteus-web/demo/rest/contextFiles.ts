/**
 * The demo node's context file routes (autobyteus-279), as the node answers them (`context-files.ts`): the size limits, a
 * draft upload, the finalize of a message's drafts, and each draft's or final file's read; a draft can be deleted.
 */
import type { DemoDraftOwner, DemoFinalOwner } from '../world/contextFiles';
import type { DemoWorld } from '../world/DemoWorld';
import type { DemoRestRoute } from './index';

const MiB = 1024 * 1024;
/** The demo's published limits (UI spec, Form And Input Validation): 25 MB for files, 200 MB for audio and video. */
const OTHER_MAX_BYTES = 25 * MiB;
const AUDIO_VIDEO_MAX_BYTES = 200 * MiB;
const AUDIO_VIDEO_MIME_TYPES = ['audio/mpeg', 'audio/wav', 'audio/mp4', 'video/mp4', 'video/quicktime', 'video/webm'];
const maxBytesFor = (mimeType: string) => (AUDIO_VIDEO_MIME_TYPES.includes(mimeType) ? AUDIO_VIDEO_MAX_BYTES : OTHER_MAX_BYTES);
const json = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json; charset=utf-8' } });
const detail = (message: string, status: number) => json({ detail: message }, status);

const DRAFT_KINDS = new Set(['agent_draft', 'team_member_draft', 'org_member_draft']);
const FINAL_KINDS = new Set(['agent_final', 'team_member_final', 'org_member_final']);
const ownerOf = <T extends { kind: string }>(value: unknown, kinds: Set<string>): T => {
  const owner = (typeof value === 'string' ? JSON.parse(value) : value) as T | null;
  if (!owner || !kinds.has(owner.kind)) throw new Error(`Unsupported owner kind '${String(owner?.kind)}'.`);
  return owner;
};

const fileResponse = (world: DemoWorld, url: URL): Response => {
  const file = world.contextFiles.read(url.pathname);
  return file
    ? new Response(file.bytes, { status: 200, headers: { 'content-type': file.mimeType, 'content-security-policy': 'sandbox allow-scripts', 'x-content-type-options': 'nosniff' } })
    : detail('File not found.', 404);
};

const isFinalFile = (pathname: string): boolean => /^\/rest\/(runs\/[^/]+|team-runs\/[^/]+\/agent-runs\/[^/]+|agent-org-runs\/[^/]+\/agent-runs\/[^/]+)\/context-files\/[^/]+$/.test(pathname);

export const contextFileRoutes: DemoRestRoute[] = [
  { method: 'GET', match: (url) => url.pathname === '/rest/context-files/size-limits',
    answer: () => json({ otherFileMaxBytes: OTHER_MAX_BYTES, audioVideoMaxBytes: AUDIO_VIDEO_MAX_BYTES, audioVideoMimeTypes: AUDIO_VIDEO_MIME_TYPES }) },
  {
    method: 'POST', match: (url) => url.pathname === '/rest/context-files/upload',
    answer: async (_url, request, world) => {
      const form = await request.formData();
      const file = form.get('file');
      if (!(file instanceof File)) return detail('No file uploaded.', 400);
      const maxBytes = maxBytesFor(file.type);
      if (file.size > maxBytes) return json({ code: 'CONTEXT_FILE_TOO_LARGE', detail: `The file is larger than ${maxBytes / MiB} MB.`, maxBytes }, 413);
      try {
        return json(await world.contextFiles.upload(ownerOf<DemoDraftOwner>(form.get('owner'), DRAFT_KINDS), file));
      } catch (error) {
        return detail(error instanceof Error ? error.message : 'Upload failed.', 400);
      }
    },
  },
  {
    method: 'POST', match: (url) => url.pathname === '/rest/context-files/finalize',
    answer: async (_url, request, world) => {
      try {
        const body = await request.json() as { draftOwner: unknown; finalOwner: unknown; attachments?: Array<{ storedFilename?: string; displayName?: string }> };
        const attachments = (body.attachments ?? []).map((item) => ({ storedFilename: String(item.storedFilename ?? ''), displayName: String(item.displayName ?? '') }));
        return json({ attachments: world.contextFiles.finalize(ownerOf<DemoDraftOwner>(body.draftOwner, DRAFT_KINDS), ownerOf<DemoFinalOwner>(body.finalOwner, FINAL_KINDS), attachments) });
      } catch (error) {
        return detail(error instanceof Error ? error.message : 'Finalize failed.', 400);
      }
    },
  },
  { method: 'GET', match: (url) => url.pathname.startsWith('/rest/drafts/'), answer: (url, _request, world) => fileResponse(world, url) },
  { method: 'DELETE', match: (url) => url.pathname.startsWith('/rest/drafts/'),
    answer: (url, _request, world) => (world.contextFiles.delete(url.pathname) ? new Response(null, { status: 204 }) : detail('File not found.', 404)) },
  { method: 'GET', match: (url) => isFinalFile(url.pathname), answer: (url, _request, world) => fileResponse(world, url) },
];
