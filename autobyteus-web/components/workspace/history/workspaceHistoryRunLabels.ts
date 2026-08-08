import type { TeamTreeNode } from '~/stores/runHistoryTypes';

const USER_REQUIREMENT_PREFIX = /^\s*(?:\*\*)?\s*(?:\[\s*user requirement\s*\]|user requirement)\s*(?:\*\*)?\s*[:\-]?\s*/i;

const stripSummaryPrefix = (summary: string | null | undefined): string => {
  const trimmed = summary?.trim() || '';
  if (!trimmed) {
    return '';
  }
  return trimmed.replace(USER_REQUIREMENT_PREFIX, '').trim();
};

export const formatRunLabel = (summary: string | null | undefined): string => {
  const cleaned = stripSummaryPrefix(summary);
  return cleaned.length > 0 ? cleaned : 'Untitled task';
};

export const formatTeamRunLabel = (team: Pick<TeamTreeNode, 'summary'>): string => {
  const cleaned = stripSummaryPrefix(team.summary);
  return cleaned.length > 0 ? cleaned : 'Untitled team run';
};
