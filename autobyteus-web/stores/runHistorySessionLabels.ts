type WorkspaceHistorySessionKind = 'agent' | 'team';
export type WorkspaceHistorySessionTitleSource = 'explicit' | 'summary' | 'fallback';

export interface WorkspaceHistorySessionDisplayLabel {
  title: string;
  subtitle: string;
  rawSummary: string;
  titleSource: WorkspaceHistorySessionTitleSource;
}

export interface ResolveWorkspaceHistorySessionDisplayLabelInput {
  kind: WorkspaceHistorySessionKind;
  explicitTitle?: string | null;
  summary?: string | null;
  sourceName?: string | null;
  memberCount?: number | null;
}

const USER_REQUIREMENT_PREFIX = /^\s*(?:[*_`~]+)?\s*(?:\[\s*user requirement\s*\]|user requirement)\s*(?:[*_`~]+)?\s*[:：\-–—]?\s*(?:[*_`~]+)?\s*/i;

const normalizeWhitespace = (value: string): string => value.replace(/\s+/g, ' ').trim();

const stripKnownPromptWrappers = (value: string): string => {
  let next = normalizeWhitespace(value);
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const stripped = normalizeWhitespace(next.replace(USER_REQUIREMENT_PREFIX, ''));
    if (stripped === next) {
      break;
    }
    next = stripped;
  }

  return normalizeWhitespace(next.replace(/^\*+\s*/, '').replace(/\s*\*+$/, ''));
};

export const cleanWorkspaceHistorySessionTitle = (value: string | null | undefined): string => {
  const normalized = normalizeWhitespace(value || '');
  if (!normalized) {
    return '';
  }
  return stripKnownPromptWrappers(normalized);
};

const fallbackTitleForKind = (kind: WorkspaceHistorySessionKind): string => (
  kind === 'team' ? 'Untitled team session' : 'Untitled session'
);

const fallbackSourceNameForKind = (kind: WorkspaceHistorySessionKind): string => (
  kind === 'team' ? 'Team' : 'Agent'
);

const buildSubtitle = (input: ResolveWorkspaceHistorySessionDisplayLabelInput): string => {
  const sourceName = cleanWorkspaceHistorySessionTitle(input.sourceName) || fallbackSourceNameForKind(input.kind);
  if (input.kind === 'agent') {
    return `${sourceName} · agent session`;
  }

  const memberCount = Number(input.memberCount ?? 0);
  if (Number.isFinite(memberCount) && memberCount > 0) {
    return `${sourceName} (${memberCount})`;
  }

  return sourceName;
};

export const resolveWorkspaceHistorySessionDisplayLabel = (
  input: ResolveWorkspaceHistorySessionDisplayLabelInput,
): WorkspaceHistorySessionDisplayLabel => {
  const explicitTitle = cleanWorkspaceHistorySessionTitle(input.explicitTitle);
  const summaryTitle = cleanWorkspaceHistorySessionTitle(input.summary);
  const titleSource: WorkspaceHistorySessionTitleSource = explicitTitle
    ? 'explicit'
    : summaryTitle
      ? 'summary'
      : 'fallback';

  return {
    title: explicitTitle || summaryTitle || fallbackTitleForKind(input.kind),
    subtitle: buildSubtitle(input),
    rawSummary: input.summary || '',
    titleSource,
  };
};
