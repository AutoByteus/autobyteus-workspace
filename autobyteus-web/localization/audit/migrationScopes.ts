export type LocalizationMigrationScope = {
  scopeId:
    | 'M-001'
    | 'M-002'
    | 'M-003'
    | 'M-004'
    | 'M-005'
    | 'M-006'
    | 'M-007'
    | 'M-008'
    | 'M-009'
    | 'M-010'
    | 'M-011'
    | 'M-012'
    | 'M-013';
  status: 'closed';
  description: string;
  include: string[];
};

export const localizationMigrationScopes: LocalizationMigrationScope[] = [
  {
    scopeId: 'M-001',
    status: 'closed',
    description: 'app root, landing shell, navigation, and layouts',
    include: ['app.vue', 'pages/index.vue', 'layouts/', 'components/app/', 'components/layout/', 'components/AppLeftPanel.vue'],
  },
  {
    scopeId: 'M-002',
    status: 'closed',
    description: 'settings shell and settings feature surfaces',
    include: ['pages/settings.vue', 'components/settings/'],
  },
  {
    scopeId: 'M-003',
    status: 'closed',
    description: 'agent management UI',
    include: ['pages/agents.vue', 'components/agents/'],
  },
  {
    scopeId: 'M-004',
    status: 'closed',
    description: 'team management UI',
    include: ['pages/agent-teams.vue', 'components/agentTeams/'],
  },
  {
    scopeId: 'M-005',
    status: 'closed',
    description: 'applications UI',
    include: ['pages/applications/', 'components/applications/'],
  },
  {
    scopeId: 'M-006',
    status: 'closed',
    description: 'skills UI',
    include: ['pages/skills.vue', 'components/skills/'],
  },
  {
    scopeId: 'M-007',
    status: 'closed',
    description: 'memory and media UI',
    include: ['pages/memory.vue', 'pages/media.vue', 'components/memory/'],
  },
  {
    scopeId: 'M-008',
    status: 'closed',
    description: 'workspace, conversation, progress, and tabs UI',
    include: ['pages/workspace.vue', 'components/workspace/', 'components/conversation/', 'components/progress/', 'components/tabs/'],
  },
  {
    scopeId: 'M-009',
    status: 'closed',
    description: 'tools, sync, and file explorer UI',
    include: ['pages/tools.vue', 'components/tools/', 'components/sync/', 'components/fileExplorer/'],
  },
  {
    scopeId: 'M-010',
    status: 'closed',
    description: 'shared UI building blocks and empty/loading/error states',
    include: ['components/common/', 'components/ui/'],
  },
  {
    scopeId: 'M-011',
    status: 'closed',
    description: 'agent input surfaces',
    include: ['components/agentInput/'],
  },
  {
    scopeId: 'M-012',
    status: 'closed',
    description: 'server surfaces',
    include: ['components/server/'],
  },
  {
    scopeId: 'M-013',
    status: 'closed',
    description: 'stores, composables, and services that emit user-facing product feedback',
    include: ['stores/', 'composables/', 'services/'],
  },
];
