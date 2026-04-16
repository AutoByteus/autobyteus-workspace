import type {
  ContextAttachment,
  ContextAttachmentType,
  UploadedContextAttachment,
} from '~/types/conversation';
import type { DraftContextFileOwnerDescriptor } from '~/utils/contextFiles/contextFileOwner';

const UPLOADED_DRAFT_AGENT_ROUTE = /^\/rest\/drafts\/agent-runs\/([^/]+)\/context-files\/([^/?#]+)$/;
const UPLOADED_DRAFT_TEAM_ROUTE =
  /^\/rest\/drafts\/team-runs\/([^/]+)\/members\/([^/]+)\/context-files\/([^/?#]+)$/;
const UPLOADED_FINAL_AGENT_ROUTE = /^\/rest\/runs\/([^/]+)\/context-files\/([^/?#]+)$/;
const UPLOADED_FINAL_TEAM_ROUTE =
  /^\/rest\/team-runs\/([^/]+)\/members\/([^/]+)\/context-files\/([^/?#]+)$/;

const hasScheme = (value: string): boolean => /^[a-zA-Z][a-zA-Z\d+.-]*:/.test(value);

const toPathname = (locator: string): string => {
  try {
    return new URL(locator).pathname;
  } catch {
    return locator;
  }
};

export const getLocatorBasename = (locator: string): string => {
  const pathname = toPathname(locator)
    .split('?')[0]
    .split('#')[0]
    .replace(/\\/g, '/');
  const segments = pathname.split('/').filter(Boolean);
  return segments[segments.length - 1] || pathname || locator;
};

export const getDisplayNameFromStoredFilename = (storedFilename: string): string => {
  const match = storedFilename.match(/^ctx_[^_]+__([^]+)$/);
  return match?.[1] || storedFilename;
};

const decodeStoredFilename = (encoded: string): string => {
  try {
    return decodeURIComponent(encoded);
  } catch {
    return encoded;
  }
};

const decodePathSegment = (encoded: string): string => {
  try {
    return decodeURIComponent(encoded);
  } catch {
    return encoded;
  }
};

const parseUploadedLocator = (
  locator: string,
): {
  storedFilename: string;
  phase: 'draft' | 'final';
  draftOwner?: DraftContextFileOwnerDescriptor;
} | null => {
  const pathname = toPathname(locator);
  const draftAgentMatch = pathname.match(UPLOADED_DRAFT_AGENT_ROUTE);
  if (draftAgentMatch?.[1] && draftAgentMatch?.[2]) {
    return {
      storedFilename: decodeStoredFilename(draftAgentMatch[2]),
      phase: 'draft',
      draftOwner: {
        kind: 'agent_draft',
        draftRunId: decodePathSegment(draftAgentMatch[1]),
      },
    };
  }

  const draftTeamMatch = pathname.match(UPLOADED_DRAFT_TEAM_ROUTE);
  if (draftTeamMatch?.[1] && draftTeamMatch?.[2] && draftTeamMatch?.[3]) {
    return {
      storedFilename: decodeStoredFilename(draftTeamMatch[3]),
      phase: 'draft',
      draftOwner: {
        kind: 'team_member_draft',
        draftTeamRunId: decodePathSegment(draftTeamMatch[1]),
        memberRouteKey: decodePathSegment(draftTeamMatch[2]),
      },
    };
  }

  const finalAgentMatch = pathname.match(UPLOADED_FINAL_AGENT_ROUTE);
  if (finalAgentMatch?.[1] && finalAgentMatch?.[2]) {
    return {
      storedFilename: decodeStoredFilename(finalAgentMatch[2]),
      phase: 'final',
    };
  }

  const finalTeamMatch = pathname.match(UPLOADED_FINAL_TEAM_ROUTE);
  if (finalTeamMatch?.[1] && finalTeamMatch?.[2] && finalTeamMatch?.[3]) {
    return {
      storedFilename: decodeStoredFilename(finalTeamMatch[3]),
      phase: 'final',
    };
  }

  return null;
};

export const inferContextAttachmentType = (
  input: File | string,
  mimeTypeOverride?: string | null,
): ContextAttachmentType => {
  const mimeType = typeof input === 'string' ? mimeTypeOverride?.trim().toLowerCase() ?? '' : input.type.trim().toLowerCase();
  if (mimeType.startsWith('image/')) return 'Image';
  if (mimeType.startsWith('audio/')) return 'Audio';
  if (mimeType.startsWith('video/')) return 'Video';

  const name = typeof input === 'string' ? input : input.name;
  const lower = name.trim().toLowerCase();
  if (/(\.png|\.jpe?g|\.gif|\.webp|\.bmp|\.svg)$/.test(lower)) return 'Image';
  if (/(\.mp3|\.wav|\.m4a|\.flac|\.ogg|\.aac)$/.test(lower)) return 'Audio';
  if (/(\.mp4|\.mov|\.avi|\.mkv|\.webm)$/.test(lower)) return 'Video';
  if (/\.md$/.test(lower)) return 'Markdown';
  if (/\.pdf$/.test(lower)) return 'Pdf';
  if (/\.docx$/.test(lower)) return 'Docx';
  if (/\.pptx$/.test(lower)) return 'Pptx';
  if (/\.xlsx$/.test(lower)) return 'Xlsx';
  if (/\.csv$/.test(lower)) return 'Csv';
  if (/\.json$/.test(lower)) return 'Json';
  if (/\.xml$/.test(lower)) return 'Xml';
  if (/(\.html|\.htm)$/.test(lower)) return 'Html';
  if (/\.py$/.test(lower)) return 'Python';
  if (/\.js$/.test(lower)) return 'Javascript';
  if (/\.txt$/.test(lower)) return 'Text';
  return 'Text';
};

export const createWorkspaceContextAttachment = (
  locator: string,
  type: ContextAttachmentType = inferContextAttachmentType(locator),
): ContextAttachment => ({
  kind: 'workspace_path',
  id: locator,
  locator,
  displayName: getLocatorBasename(locator),
  type,
});

export const createUploadedContextAttachment = (input: {
  storedFilename: string;
  locator: string;
  displayName?: string;
  phase: 'draft' | 'final';
  type: ContextAttachmentType;
}): UploadedContextAttachment => ({
  kind: 'uploaded',
  id: input.storedFilename,
  locator: input.locator,
  storedFilename: input.storedFilename,
  displayName: input.displayName || getDisplayNameFromStoredFilename(input.storedFilename),
  phase: input.phase,
  type: input.type,
});

export const createExternalUrlContextAttachment = (input: {
  locator: string;
  type: ContextAttachmentType;
  displayName?: string;
  id?: string;
}): ContextAttachment => ({
  kind: 'external_url',
  id: input.id || input.locator,
  locator: input.locator,
  displayName: input.displayName || getLocatorBasename(input.locator),
  type: input.type,
});

export const hydrateContextAttachment = (input: {
  locator: string;
  type?: string | null;
  displayName?: string | null;
}): ContextAttachment => {
  const locator = input.locator.trim();
  const type = input.type ? inferContextAttachmentType(locator, input.type) : inferContextAttachmentType(locator);
  const uploaded = parseUploadedLocator(locator);
  if (uploaded) {
    return createUploadedContextAttachment({
      storedFilename: uploaded.storedFilename,
      locator,
      displayName: input.displayName ?? getDisplayNameFromStoredFilename(uploaded.storedFilename),
      phase: uploaded.phase,
      type,
    });
  }

  if (
    locator.startsWith('blob:') ||
    locator.startsWith('data:') ||
    locator.startsWith('http://') ||
    locator.startsWith('https://') ||
    locator.startsWith('/rest/') ||
    locator.startsWith('rest/') ||
    locator.startsWith('file://') ||
    locator.startsWith('local-file://')
  ) {
    return createExternalUrlContextAttachment({
      locator,
      type,
      displayName: input.displayName ?? getLocatorBasename(locator),
    });
  }

  return createWorkspaceContextAttachment(locator, type);
};

export const parseDraftUploadedContextAttachmentLocator = (
  locator: string,
): { storedFilename: string; owner: DraftContextFileOwnerDescriptor } | null => {
  const parsed = parseUploadedLocator(locator);
  if (!parsed?.draftOwner || parsed.phase !== 'draft') {
    return null;
  }

  return {
    storedFilename: parsed.storedFilename,
    owner: parsed.draftOwner,
  };
};

export const isUploadedContextAttachment = (
  attachment: ContextAttachment,
): attachment is UploadedContextAttachment => attachment.kind === 'uploaded';

export const isDraftUploadedContextAttachment = (
  attachment: ContextAttachment,
): attachment is UploadedContextAttachment =>
  attachment.kind === 'uploaded' && attachment.phase === 'draft';

export const coerceDraftUploadedContextAttachment = (
  attachment: ContextAttachment,
): UploadedContextAttachment | null => {
  const hydrated = hydrateContextAttachment({
    locator: attachment.locator,
    type: attachment.type,
    displayName: attachment.displayName,
  });
  if (hydrated.kind !== 'uploaded' || hydrated.phase !== 'draft') {
    return null;
  }

  return {
    ...hydrated,
    displayName: attachment.displayName || hydrated.displayName,
    type: attachment.type,
  };
};

export const isImageContextAttachment = (attachment: ContextAttachment): boolean => attachment.type === 'Image';

export const isBrowserOpenableContextAttachment = (attachment: ContextAttachment): boolean =>
  attachment.kind !== 'workspace_path' || hasScheme(attachment.locator) || attachment.locator.startsWith('/');
