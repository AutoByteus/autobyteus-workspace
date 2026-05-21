export type MobileTaskTab = 'chat' | 'runs' | 'files' | 'tools' | 'activity';

export type MobileCatalogSegmentId = 'recent' | 'agents' | 'teams' | 'workspaces';

export type MobileCatalogSegmentStatus = 'idle' | 'loading' | 'success' | 'error';

export type MobileWorkContext =
  | {
      kind: 'agent-run';
      runId: string;
      agentDefinitionId: string;
      title: string;
      summary: string;
      workspaceRootPath: string;
      isActive: boolean;
      lastActivityAt: string;
      statusLabel: string;
    }
  | {
      kind: 'team-run';
      teamRunId: string;
      teamDefinitionId: string;
      title: string;
      summary: string;
      workspaceRootPath: string;
      focusedMemberRouteKey: string;
      isActive: boolean;
      lastActivityAt: string;
      statusLabel: string;
    }
  | {
      kind: 'agent-definition';
      agentDefinitionId: string;
      title: string;
      description: string;
    }
  | {
      kind: 'team-definition';
      teamDefinitionId: string;
      title: string;
      description: string;
      memberCount: number;
    }
  | {
      kind: 'workspace';
      workspaceId: string;
      title: string;
      rootPath: string;
    };

export type MobileWorkListItem = {
  key: string;
  label: string;
  detail: string;
  meta: string;
  context: MobileWorkContext;
};

export type MobileCatalogSegmentState<TItem = MobileWorkListItem> = {
  id: MobileCatalogSegmentId;
  status: MobileCatalogSegmentStatus;
  items: TItem[];
  errorMessage: string;
};

export type MobileRunSetupIntent =
  | {
      kind: 'agent';
      agentDefinitionId: string;
      workspaceId?: string;
      revision: number;
    }
  | {
      kind: 'team';
      teamDefinitionId: string;
      workspaceId?: string;
      revision: number;
    };

export type MobileRunSetupIntentRequest =
  | {
      kind: 'agent';
      agentDefinitionId: string;
      workspaceId?: string;
    }
  | {
      kind: 'team';
      teamDefinitionId: string;
      workspaceId?: string;
    };

export function mobileWorkContextKey(context: MobileWorkContext): string {
  switch (context.kind) {
    case 'agent-run':
      return `agent-run:${context.runId}`;
    case 'team-run':
      return `team-run:${context.teamRunId}:${context.focusedMemberRouteKey}`;
    case 'agent-definition':
      return `agent-definition:${context.agentDefinitionId}`;
    case 'team-definition':
      return `team-definition:${context.teamDefinitionId}`;
    case 'workspace':
      return `workspace:${context.workspaceId}`;
  }
}

export function mobileWorkContextTitle(context: MobileWorkContext | null): string {
  if (!context) {
    return 'Choose work';
  }
  return context.title;
}

export function mobileWorkContextSubtitle(context: MobileWorkContext | null): string {
  if (!context) {
    return 'No current context selected';
  }
  switch (context.kind) {
    case 'agent-run':
      return `${context.statusLabel} · Agent run`;
    case 'team-run':
      return `${context.statusLabel} · Team run`;
    case 'agent-definition':
      return 'Agent profile';
    case 'team-definition':
      return `${context.memberCount} members · Team profile`;
    case 'workspace':
      return context.rootPath || 'Workspace';
  }
}

export function preferredTabForMobileContext(context: MobileWorkContext): MobileTaskTab {
  switch (context.kind) {
    case 'workspace':
      return 'files';
    case 'agent-definition':
    case 'team-definition':
      return 'runs';
    case 'agent-run':
    case 'team-run':
      return 'chat';
  }
}
