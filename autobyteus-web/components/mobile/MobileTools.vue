<template>
  <section class="flex h-full flex-col overflow-hidden" data-testid="mobile-tools">
    <header class="shrink-0 border-b border-slate-200 bg-white px-5 py-4">
      <p class="text-xs font-semibold uppercase tracking-[0.18em] text-blue-600">Tools</p>
      <h2 class="text-xl font-bold text-slate-950">Terminal and VNC</h2>
      <p class="mt-1 truncate text-sm text-slate-500">{{ workspaceSubtitle }}</p>
      <div class="mt-3 grid grid-cols-2 gap-2" data-testid="mobile-tools-tabs">
        <button
          v-for="tool in tools"
          :key="tool.id"
          type="button"
          class="rounded-2xl px-3 py-2 text-sm font-semibold"
          :class="activeTool === tool.id ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'"
          :data-testid="`mobile-tools-tab-${tool.id}`"
          @click="activeTool = tool.id"
        >
          {{ tool.label }}
        </button>
      </div>
    </header>

    <div class="min-h-0 flex-1 overflow-y-auto bg-slate-50 p-5">
      <article
        v-if="activeTool === 'terminal' && !terminalWorkspaceId"
        class="rounded-3xl border border-dashed border-slate-300 bg-white p-6 text-center"
        data-testid="mobile-tools-no-workspace"
      >
        <p class="font-semibold text-slate-900">Choose a workspace for Terminal</p>
        <p class="mt-2 text-sm text-slate-500">
          Terminal sessions connect to one workspace at a time. Open a run or workspace before connecting.
        </p>
        <button type="button" class="mt-4 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white" @click="$emit('chooseWork')">
          Choose workspace
        </button>
      </article>

      <article
        v-else-if="activeTool === 'terminal'"
        class="flex h-[58vh] min-h-[22rem] flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm"
        data-testid="mobile-terminal-panel"
      >
        <div class="shrink-0 border-b border-slate-200 px-4 py-3">
          <p class="text-sm font-bold text-slate-950">Workspace Terminal</p>
          <p class="mt-1 break-all text-xs text-slate-500">{{ terminalWorkspaceLabel }}</p>
        </div>
        <Terminal class="min-h-0 flex-1" :workspace-id="terminalWorkspaceId" />
      </article>

      <article
        v-else
        class="min-h-[24rem] rounded-3xl border border-slate-200 bg-white p-4 shadow-sm"
        data-testid="mobile-vnc-panel"
      >
        <div class="mb-3 rounded-2xl bg-blue-50 px-3 py-2 text-sm text-blue-800">
          VNC uses the configured server hosts. Use phone-reachable hostnames or private-network IPs rather than desktop-only loopback addresses.
        </div>
        <div class="h-[62vh] min-h-[22rem] overflow-hidden rounded-2xl border border-slate-200">
          <VncViewer />
        </div>
      </article>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import Terminal from '~/components/workspace/tools/Terminal.vue';
import VncViewer from '~/components/workspace/tools/VncViewer.vue';
import { useWorkspaceStore, type WorkspaceInfo } from '~/stores/workspace';
import type { MobileWorkContext } from '~/types/mobileWork';

const props = defineProps<{
  context: MobileWorkContext | null;
}>();

defineEmits<{
  chooseWork: [];
}>();

type MobileToolId = 'terminal' | 'vnc';

const tools: Array<{ id: MobileToolId; label: string }> = [
  { id: 'terminal', label: 'Terminal' },
  { id: 'vnc', label: 'VNC' },
];

const workspaceStore = useWorkspaceStore();
const activeTool = ref<MobileToolId>('terminal');

const normalizeRootPath = (value: string | null | undefined): string => {
  const normalized = (value || '').trim().replace(/\\/g, '/');
  if (!normalized || normalized === '/') {
    return normalized;
  }
  return normalized.replace(/\/+$/, '');
};

const rootPathForWorkspace = (workspace: WorkspaceInfo): string => normalizeRootPath(
  workspace.absolutePath || workspace.workspaceConfig?.root_path || workspace.workspaceConfig?.rootPath || '',
);

const workspaceFromContext = computed<WorkspaceInfo | null>(() => {
  const context = props.context;
  if (!context) {
    return null;
  }
  if (context.kind === 'workspace') {
    return workspaceStore.workspaces[context.workspaceId] ?? null;
  }
  if (context.kind !== 'agent-run' && context.kind !== 'team-run') {
    return null;
  }
  const contextRoot = normalizeRootPath(context.workspaceRootPath);
  if (!contextRoot) {
    return null;
  }
  return workspaceStore.allWorkspaces.find((workspace) => rootPathForWorkspace(workspace) === contextRoot) ?? null;
});

const terminalWorkspaceId = computed(() => workspaceFromContext.value?.workspaceId || '');
const terminalWorkspaceLabel = computed(() => workspaceFromContext.value?.absolutePath || workspaceFromContext.value?.name || 'Selected workspace');
const workspaceSubtitle = computed(() => {
  if (workspaceFromContext.value) {
    return workspaceFromContext.value.absolutePath || workspaceFromContext.value.name || 'Selected workspace';
  }
  if (props.context?.kind === 'agent-definition' || props.context?.kind === 'team-definition') {
    return 'Choose or launch a workspace-backed run before opening Terminal.';
  }
  return 'Terminal needs a workspace; VNC uses configured reachable hosts.';
});
</script>
