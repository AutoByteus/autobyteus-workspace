<template>
  <main
    data-test="agent-org-draft-retention-probe"
    class="min-h-screen bg-slate-100 p-4 text-slate-900"
  >
    <section class="mx-auto flex h-[740px] max-w-6xl flex-col overflow-hidden rounded-xl bg-white shadow-sm">
      <header class="border-b border-slate-200 p-3">
        <h1 class="text-lg font-semibold">Session draft retention</h1>
        <nav class="mt-2 flex flex-wrap gap-2" aria-label="Probe surfaces">
          <button data-test="go-org-a-director" type="button" @click="goOrg('org-a', '/director', 'org-a-director')">Org A / director</button>
          <button data-test="go-org-a-writer" type="button" @click="goOrg('org-a', '/writer', 'org-a-writer')">Org A / writer</button>
          <button data-test="go-org-b-reviewer" type="button" @click="goOrg('org-b', '/reviewer', 'org-b-reviewer')">Org B / reviewer</button>
          <button data-test="go-agent-new" type="button" @click="goAgent('temp-agent-new')">New Agent</button>
          <button data-test="go-agent-existing" type="button" @click="goAgent('agent-existing')">Existing Agent</button>
          <button data-test="go-team-new" type="button" @click="goTeam('temp-team-new')">New Team</button>
          <button data-test="go-team-existing" type="button" @click="goTeam('team-existing')">Existing Team</button>
        </nav>
        <output class="mt-2 block text-xs text-slate-500" data-test="probe-current-surface">{{ currentSurface }}</output>
      </header>

      <div class="min-h-0 flex-1">
        <AgentOrgWorkspaceView v-if="surface === 'org'" />
        <div v-else class="flex h-full min-h-0 flex-col justify-end bg-slate-50 p-4" data-test="standalone-composer-surface">
          <div class="rounded-lg border border-slate-200 bg-white">
            <AgentUserInputForm />
          </div>
        </div>
      </div>
    </section>
  </main>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, shallowReactive } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import type { AgentOrgExecutionViewDto } from '@autobyteus/collaboration-stream-contracts';
import AgentOrgWorkspaceView from '~/components/workspace/org/AgentOrgWorkspaceView.vue';
import AgentUserInputForm from '~/components/agentInput/AgentUserInputForm.vue';
import { AgentContext } from '~/types/agent/AgentContext';
import { AgentRunState } from '~/types/agent/AgentRunState';
import { AgentStatus } from '~/types/agent/AgentStatus';
import type { AgentRunConfig } from '~/types/agent/AgentRunConfig';
import { AgentOrgExecutionContext } from '~/services/agentOrgExecution/agentOrgExecutionContext';
import { useAgentOrgContextsStore } from '~/stores/agentOrgContextsStore';
import { useAgentContextsStore } from '~/stores/agentContextsStore';
import { useAgentTeamContextsStore } from '~/stores/agentTeamContextsStore';
import { useAgentSelectionStore } from '~/stores/agentSelectionStore';
import { buildTestTeamContext, testAgentNode } from '~/test-support/currentTeamTestFixtures';

const route = useRoute();
const router = useRouter();
const orgStore = useAgentOrgContextsStore();
const agentStore = useAgentContextsStore();
const teamStore = useAgentTeamContextsStore();
const selectionStore = useAgentSelectionStore();
const NOW = '2026-09-22T00:00:00.000Z';

const createAgentContext = (runId: string, name: string, status = AgentStatus.Offline): AgentContext => {
  const config: AgentRunConfig = {
    agentDefinitionId: `definition-${runId}`,
    agentDefinitionName: name,
    llmModelIdentifier: 'test-model',
    runtimeKind: 'codex_app_server',
    workspaceId: null,
    workspaceMetadata: null,
    autoExecuteTools: false,
    skillAccessMode: 'PRELOADED_ONLY',
    llmConfig: null,
    isLocked: true,
  };
  const context = new AgentContext(config, new AgentRunState(runId, {
    id: runId,
    messages: [],
    createdAt: NOW,
    updatedAt: NOW,
    agentDefinitionId: config.agentDefinitionId,
    agentName: name,
    llmModelIdentifier: config.llmModelIdentifier,
  }));
  context.state.currentStatus = status;
  return context;
};

const launch = {
  runtimeKind: 'codex_app_server' as const,
  llmModelIdentifier: 'test-model',
  llmConfig: null,
  autoExecuteTools: false,
  skillAccessMode: 'PRELOADED_ONLY' as const,
  workspaceRootPath: null,
};

const createOrgView = (
  orgRunId: string,
  members: readonly { address: string; agentRunId: string }[],
): AgentOrgExecutionViewDto => ({
  base_change_sequence: 0,
  is_active: false,
  execution_tree: {
    schemaVersion: 1,
    subjectKind: 'agent_org',
    createdAt: NOW,
    archivedAt: null,
    applicationBinding: null,
    handoffs: [],
    rootOrg: {
      address: '/',
      orgDefinitionId: `definition-${orgRunId}`,
      orgDefinitionName: `Fixture ${orgRunId}`,
      orgRunId,
      defaultLaunchConfiguration: launch,
      members: members.map((member) => ({
        address: member.address,
        agentDefinitionId: `definition-${member.agentRunId}`,
        role: null,
        description: null,
        agentRunId: member.agentRunId,
        platformAgentRunId: null,
        launchConfiguration: launch,
      })),
      taskExecutions: [],
    },
  },
  task_records: { schemaVersion: 1, subjectKind: 'agent_org', orgRunId, records: [] },
  communication_messages: { schemaVersion: 1, subjectKind: 'agent_org', orgRunId, messages: [] },
  agent_statuses: members.map((member) => ({
    member_address: member.address,
    agent_run_id: member.agentRunId,
    status: 'offline' as const,
    trigger: null,
    tool_name: null,
    error_message: null,
    error_details: null,
  })),
});

const orgAContexts = {
  director: createAgentContext('org-a-director', 'director'),
  writer: createAgentContext('org-a-writer', 'writer'),
};
const orgBContext = createAgentContext('org-b-reviewer', 'reviewer');
const orgA = shallowReactive(new AgentOrgExecutionContext({
  orgRunId: 'org-a',
  view: createOrgView('org-a', [
    { address: '/director', agentRunId: 'org-a-director' },
    { address: '/writer', agentRunId: 'org-a-writer' },
  ]),
  entries: [
    { memberAddress: '/director', agentRunId: 'org-a-director', context: orgAContexts.director },
    { memberAddress: '/writer', agentRunId: 'org-a-writer', context: orgAContexts.writer },
  ],
}));
const orgB = shallowReactive(new AgentOrgExecutionContext({
  orgRunId: 'org-b',
  view: createOrgView('org-b', [{ address: '/reviewer', agentRunId: 'org-b-reviewer' }]),
  entries: [{ memberAddress: '/reviewer', agentRunId: 'org-b-reviewer', context: orgBContext }],
}));
const orgADirector = orgA.getAgentContext('org-a-director')!;
const orgAWriter = orgA.getAgentContext('org-a-writer')!;
const orgBReviewer = orgB.getAgentContext('org-b-reviewer')!;
orgA.select({ kind: 'agent_execution', agentRunId: 'org-a-director' });
orgB.select({ kind: 'agent_execution', agentRunId: 'org-b-reviewer' });
orgStore.contexts['org-a'] = orgA;
orgStore.contexts['org-b'] = orgB;

const agentNew = createAgentContext('temp-agent-new', 'New Agent', AgentStatus.Idle);
const agentExisting = createAgentContext('agent-existing', 'Existing Agent', AgentStatus.Idle);
agentStore.runs.set(agentNew.state.runId, agentNew);
agentStore.runs.set(agentExisting.state.runId, agentExisting);

const teamNewMember = createAgentContext('temp-team-new::coordinator', 'New Team coordinator', AgentStatus.Idle);
const teamExistingMember = createAgentContext('team-existing::coordinator', 'Existing Team coordinator', AgentStatus.Idle);
const teamNew = buildTestTeamContext({
  teamRunId: 'temp-team-new',
  coordinatorAddress: '/coordinator',
  rootChildren: [testAgentNode('/coordinator', { agentRunId: teamNewMember.state.runId })],
  contexts: [{ agentRunId: teamNewMember.state.runId, context: teamNewMember }],
});
const teamExisting = buildTestTeamContext({
  teamRunId: 'team-existing',
  coordinatorAddress: '/coordinator',
  rootChildren: [testAgentNode('/coordinator', { agentRunId: teamExistingMember.state.runId })],
  contexts: [{ agentRunId: teamExistingMember.state.runId, context: teamExistingMember }],
});
teamStore.teams = new Map([
  ['temp-team-new', teamNew],
  ['team-existing', teamExisting],
]);

const surface = computed(() => String(route.query.probeSurface || 'org'));
const currentSurface = computed(() => {
  if (surface.value === 'org') return `${String(route.query.orgRunId || '')}:${String(route.query.agentRunId || '')}`;
  return `${surface.value}:${selectionStore.selectedRunId || ''}`;
});

const goOrg = async (orgRunId: string, memberAddress: string, agentRunId: string): Promise<void> => {
  selectionStore.clearSelectionWithoutShellNavigation();
  await router.push({ path: route.path, query: {
    probeSurface: 'org', rootSubjectKind: 'agent_org', mode: 'history',
    orgRunId, memberAddress, agentRunId,
  } });
};
const goAgent = async (runId: string): Promise<void> => {
  selectionStore.selectRunWithoutShellNavigation(runId, 'agent');
  await router.push({ path: route.path, query: { probeSurface: 'agent', runId } });
};
const goTeam = async (rootTeamRunId: string): Promise<void> => {
  selectionStore.selectRunWithoutShellNavigation(rootTeamRunId, 'team');
  await router.push({ path: route.path, query: { probeSurface: 'team', rootTeamRunId } });
};

const files = (context: AgentContext) => context.contextFilePaths.map((attachment) => ({
  kind: attachment.kind,
  id: attachment.id,
  locator: attachment.locator,
  displayName: 'displayName' in attachment ? attachment.displayName : undefined,
  phase: 'phase' in attachment ? attachment.phase : undefined,
}));
const snapshot = () => ({
  route: { ...route.query },
  currentSurface: currentSurface.value,
  orgA: {
    retainedRoot: orgStore.contextFor('org-a') === orgA,
    director: {
      retainedContext: orgStore.contextFor('org-a')?.getAgentContext('org-a-director') === orgADirector,
      requirement: orgADirector.requirement,
      files: files(orgADirector),
    },
    writer: {
      retainedContext: orgStore.contextFor('org-a')?.getAgentContext('org-a-writer') === orgAWriter,
      requirement: orgAWriter.requirement,
      files: files(orgAWriter),
    },
  },
  orgB: {
    retainedRoot: orgStore.contextFor('org-b') === orgB,
    reviewer: {
      retainedContext: orgStore.contextFor('org-b')?.getAgentContext('org-b-reviewer') === orgBReviewer,
      requirement: orgBReviewer.requirement,
      files: files(orgBReviewer),
    },
  },
  agents: {
    new: { requirement: agentNew.requirement, files: files(agentNew) },
    existing: { requirement: agentExisting.requirement, files: files(agentExisting) },
  },
  teams: {
    new: { requirement: teamNewMember.requirement, files: files(teamNewMember) },
    existing: { requirement: teamExistingMember.requirement, files: files(teamExistingMember) },
  },
});

if (import.meta.client) window.__agentOrgDraftRetentionProbe = { snapshot };
onBeforeUnmount(() => {
  if (import.meta.client) delete window.__agentOrgDraftRetentionProbe;
});

declare global {
  interface Window {
    __agentOrgDraftRetentionProbe?: { snapshot: typeof snapshot };
  }
}
</script>

<style scoped>
button {
  border: 1px solid rgb(203 213 225);
  border-radius: 0.375rem;
  padding: 0.375rem 0.625rem;
  background: white;
  font-size: 0.75rem;
}
button:hover,
button:focus-visible {
  background: rgb(238 242 255);
  border-color: rgb(129 140 248);
}
</style>
