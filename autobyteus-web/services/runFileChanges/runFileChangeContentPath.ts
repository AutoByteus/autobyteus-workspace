import type { AgentRunReadSubject } from '~/types/agent/agentRunReadSubject';

const segment = encodeURIComponent;

/**
 * The server route of one recorded file change's content, relative to the bound REST base. Each
 * owner kind has its own route, so the server reads only that owner's tree.
 */
export const runFileChangeContentPath = (subject: AgentRunReadSubject, filePath: string): string => {
  const pathQuery = `path=${segment(filePath)}`;
  switch (subject.kind) {
    case 'run':
      return `/runs/${segment(subject.runId)}/file-change-content?${pathQuery}`;
    case 'teamMember':
      return `/team-runs/${segment(subject.teamRunId)}/agent-runs/${segment(subject.agentRunId)}/file-change-content?${pathQuery}`;
    case 'agentOrgMember':
      return `/agent-org-runs/${segment(subject.orgRunId)}/agent-runs/${segment(subject.agentRunId)}/file-change-content`
        + `?memberAddress=${segment(subject.memberAddress)}&${pathQuery}`;
    case 'standaloneMember':
      return `/agent-collaborations/${segment(subject.hostRunId)}/agent-runs/${segment(subject.agentRunId)}/file-change-content`
        + `?memberAddress=${segment(subject.memberAddress)}&${pathQuery}`;
  }
};
