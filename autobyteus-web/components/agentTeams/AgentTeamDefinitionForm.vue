<template>
  <form @submit.prevent="handleSubmit" class="rounded-xl border border-slate-200 bg-white shadow-sm">
    <div class="space-y-6 p-6">
      <section class="rounded-lg border border-slate-200 bg-slate-50 p-4">
        <h2 class="text-base font-semibold text-slate-900">Basics</h2>
        <div class="mt-3 grid grid-cols-1 gap-4 lg:grid-cols-[16rem_minmax(0,1fr)_minmax(0,1fr)] lg:items-start">
          <div>
            <div class="flex items-start gap-3">
              <div class="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-100 text-slate-700">
                <img
                  v-if="formData.avatarUrl && !avatarPreviewBroken"
                  :src="formData.avatarUrl"
                  alt="Team avatar preview"
                  class="h-full w-full object-cover"
                  @error="avatarPreviewBroken = true"
                />
                <span v-else class="text-xl font-semibold tracking-wide text-slate-600">{{ avatarInitials }}</span>
              </div>
              <div class="space-y-2">
                <div class="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    class="inline-flex items-center rounded-md border border-blue-200 bg-blue-50 px-3 py-1.5 text-sm font-medium text-blue-700 hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-60"
                    :disabled="fileUploadStore.isUploading"
                    @click="triggerAvatarPicker"
                  >
                    Upload Avatar
                  </button>
                  <button
                    v-if="formData.avatarUrl"
                    type="button"
                    class="inline-flex items-center rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100"
                    @click="clearAvatar"
                  >
                    Remove
                  </button>
                </div>
                <p class="text-xs text-slate-500">PNG/JPG, square recommended</p>
                <p v-if="fileUploadStore.isUploading" class="text-xs text-blue-600">Uploading avatar...</p>
                <p v-else-if="avatarUploadError" class="text-xs text-red-600">{{ avatarUploadError }}</p>
              </div>
            </div>
            <input
              ref="avatarFileInputRef"
              type="file"
              class="hidden"
              accept="image/jpeg,image/png,image/gif,image/webp"
              @change="handleAvatarFileSelected"
            />
          </div>

          <div>
            <label for="team-name" class="block text-sm font-medium text-slate-700">Team Name</label>
            <input
              id="team-name"
              v-model="formData.name"
              type="text"
              class="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              placeholder="e.g., Content Production Unit"
              required
            />
            <p class="mt-1 text-xs text-slate-500">Member names auto-fill from dragged item names.</p>
            <p v-if="formErrors.name" class="mt-1 text-xs text-red-600">{{ formErrors.name }}</p>
          </div>

          <div>
            <label for="team-description" class="block text-sm font-medium text-slate-700">Team Description</label>
            <textarea
              id="team-description"
              v-model="formData.description"
              rows="2"
              class="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              placeholder="Describe the team's purpose and goals..."
              required
            />
            <p v-if="formErrors.description" class="mt-1 text-xs text-red-600">{{ formErrors.description }}</p>
          </div>
        </div>

        <div class="mt-3">
          <label for="team-role" class="block text-sm font-medium text-slate-700">Team Role</label>
          <input
            id="team-role"
            v-model="formData.role"
            type="text"
            class="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            placeholder="e.g., End-to-end content generation"
          />
        </div>
      </section>

      <section class="grid grid-cols-1 gap-4 xl:grid-cols-[18rem_minmax(0,1fr)_16rem]">
        <aside class="rounded-lg border border-slate-200 bg-white p-3">
          <h3 class="text-sm font-semibold text-slate-900">Agent & Team Library</h3>
          <div class="relative mt-2">
            <input
              v-model="librarySearch"
              type="text"
              class="block w-full rounded-md border border-slate-300 bg-white py-2 pl-8 pr-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              placeholder="Search agents and teams..."
            />
            <svg class="pointer-events-none absolute left-2 top-2.5 h-4 w-4 text-slate-400" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M9 3a6 6 0 104.472 10.001l2.763 2.764a1 1 0 001.414-1.414l-2.764-2.763A6 6 0 009 3zm-4 6a4 4 0 118 0 4 4 0 01-8 0z" clip-rule="evenodd" />
            </svg>
          </div>

          <div class="mt-3 max-h-[26rem] space-y-4 overflow-y-auto pr-1">
            <div>
              <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">My Agents</p>
              <div class="mt-2 space-y-2">
                <div
                  v-for="item in filteredAgentItems"
                  :key="`AGENT-${item.id}`"
                  draggable="true"
                  class="flex items-center justify-between gap-2 rounded-md border border-slate-200 bg-white px-2 py-2 text-sm text-slate-800"
                  @dragstart="onLibraryDragStart($event, item)"
                >
                  <button
                    type="button"
                    class="flex min-w-0 items-center gap-2 text-left"
                    @click="addNodeFromLibrary(item)"
                  >
                    <span class="text-slate-400">⋮⋮</span>
                    <span class="truncate font-medium">{{ item.name }}</span>
                  </button>
                  <span class="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700">AGENT</span>
                </div>
                <p v-if="filteredAgentItems.length === 0" class="text-xs text-slate-400">No agents found.</p>
              </div>
            </div>

            <div>
              <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">My Teams</p>
              <div class="mt-2 space-y-2">
                <div
                  v-for="item in filteredTeamItems"
                  :key="`TEAM-${item.id}`"
                  draggable="true"
                  class="flex items-center justify-between gap-2 rounded-md border border-slate-200 bg-white px-2 py-2 text-sm text-slate-800"
                  @dragstart="onLibraryDragStart($event, item)"
                >
                  <button
                    type="button"
                    class="flex min-w-0 items-center gap-2 text-left"
                    @click="addNodeFromLibrary(item)"
                  >
                    <span class="text-slate-400">⋮⋮</span>
                    <span class="truncate font-medium">{{ item.name }}</span>
                  </button>
                  <span class="rounded-full bg-violet-50 px-2 py-0.5 text-[10px] font-semibold text-violet-700">TEAM</span>
                </div>
                <p v-if="filteredTeamItems.length === 0" class="text-xs text-slate-400">No teams found.</p>
              </div>
            </div>
          </div>

          <p class="mt-3 text-xs text-slate-500">Drag items from this library into Team Canvas</p>
        </aside>

        <section
          class="rounded-lg border border-slate-200 bg-white p-3"
          @drop.prevent="handleCanvasDrop"
          @dragover.prevent="isCanvasDragOver = true"
          @dragleave="isCanvasDragOver = false"
        >
          <div class="flex items-center justify-between gap-2">
            <h3 class="text-sm font-semibold text-slate-900">Team Canvas</h3>
            <div class="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-700">
              <div class="h-6 w-6 overflow-hidden rounded-md bg-slate-200">
                <img v-if="formData.avatarUrl && !avatarPreviewBroken" :src="formData.avatarUrl" alt="Team avatar" class="h-full w-full object-cover" />
                <div v-else class="flex h-full w-full items-center justify-center text-[10px] font-semibold text-slate-700">{{ avatarInitials }}</div>
              </div>
              <span class="max-w-[10rem] truncate">{{ formData.name || 'Untitled Team' }}</span>
            </div>
          </div>

          <p class="mt-2 text-xs text-slate-500">Dragged from Library -> Canvas</p>

          <div class="mt-3 space-y-2">
            <div
              v-for="(node, index) in formData.nodes"
              :key="`${node.memberName}-${index}`"
              class="rounded-md border p-3"
              :class="[
                selectedNodeIndex === index ? 'border-blue-300 bg-blue-50/40' : 'border-slate-200 bg-white',
                node.referenceType === 'AGENT' ? 'shadow-sm' : '',
              ]"
              @click="selectNode(index)"
            >
              <div class="flex items-start justify-between gap-3">
                <div class="min-w-0">
                  <p class="truncate text-sm font-semibold text-slate-900">{{ node.memberName }}</p>
                  <p class="truncate text-xs text-slate-500">Source: {{ getReferenceName(node) }}</p>
                </div>

                <div class="flex shrink-0 items-center gap-2">
                  <span
                    class="rounded-full px-2 py-0.5 text-[10px] font-semibold"
                    :class="node.referenceType === 'AGENT' ? 'bg-blue-50 text-blue-700' : 'bg-violet-50 text-violet-700'"
                  >
                    {{ node.referenceType === 'AGENT' ? 'AGENT' : 'TEAM' }}
                  </span>

                  <div
                    v-if="node.referenceType === 'AGENT'"
                    class="inline-flex items-center gap-2 text-xs text-slate-600"
                    @click.stop
                  >
                    <span>Coordinator</span>
                    <button
                      type="button"
                      role="switch"
                      :aria-checked="isCoordinator(node)"
                      class="relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1"
                      :class="isCoordinator(node) ? 'bg-blue-600' : 'bg-slate-300'"
                      @click.stop="toggleCoordinator(node)"
                    >
                      <span class="sr-only">Toggle coordinator</span>
                      <span
                        aria-hidden="true"
                        class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform"
                        :class="isCoordinator(node) ? 'translate-x-4' : 'translate-x-0.5'"
                      />
                    </button>
                  </div>

                  <button
                    type="button"
                    class="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                    @click.stop="removeNode(index)"
                    aria-label="Remove member"
                  >
                    ✕
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div
            class="mt-3 rounded-md border border-dashed p-6 text-center text-sm"
            :class="isCanvasDragOver ? 'border-blue-400 bg-blue-50 text-blue-700' : 'border-slate-300 bg-slate-50 text-slate-500'"
          >
            Drop agents and teams here to build your team
          </div>

          <p v-if="formErrors.nodes" class="mt-2 text-xs text-red-600">{{ formErrors.nodes }}</p>
        </section>

        <aside class="rounded-lg border border-slate-200 bg-white p-3">
          <h3 class="text-sm font-semibold text-slate-900">Member Details</h3>
          <template v-if="selectedNode">
            <div class="mt-3 space-y-3">
              <p class="text-xs text-slate-500">Member names auto-fill from dragged item name.</p>

              <div>
                <label class="block text-xs font-medium text-slate-600">Member Name</label>
                <input
                  :value="selectedNode.memberName"
                  type="text"
                  class="mt-1 block w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  @input="updateSelectedMemberName(($event.target as HTMLInputElement).value)"
                />
              </div>

              <div>
                <p class="text-xs font-medium text-slate-600">Type</p>
                <p class="mt-1 text-sm text-slate-900">{{ selectedNode.referenceType }}</p>
              </div>

              <div>
                <p class="text-xs font-medium text-slate-600">Source</p>
                <p class="mt-1 text-sm text-slate-900">{{ getReferenceName(selectedNode) }}</p>
              </div>

              <div>
                <p class="text-xs font-medium text-slate-600">Coordinator</p>
                <div class="mt-1 inline-flex items-center gap-2 text-sm text-slate-800" v-if="selectedNode.referenceType === 'AGENT'">
                  <span>{{ isCoordinator(selectedNode) ? 'Enabled' : 'Disabled' }}</span>
                  <button
                    type="button"
                    role="switch"
                    :aria-checked="isCoordinator(selectedNode)"
                    class="relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1"
                    :class="isCoordinator(selectedNode) ? 'bg-blue-600' : 'bg-slate-300'"
                    @click="toggleCoordinator(selectedNode)"
                  >
                    <span class="sr-only">Toggle coordinator</span>
                    <span
                      aria-hidden="true"
                      class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform"
                      :class="isCoordinator(selectedNode) ? 'translate-x-4' : 'translate-x-0.5'"
                    />
                  </button>
                </div>
                <p v-else class="mt-1 text-sm text-slate-500">Only AGENT members can be coordinator.</p>
              </div>
            </div>
          </template>
          <p v-else class="mt-3 text-sm text-slate-500">Select a member in Team Canvas to edit details.</p>

          <p v-if="formErrors.coordinatorMemberName" class="mt-2 text-xs text-red-600">{{ formErrors.coordinatorMemberName }}</p>
        </aside>
      </section>
    </div>

    <div class="border-t border-slate-200 bg-slate-50 px-6 py-4">
      <div class="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div class="flex flex-wrap items-center gap-3 text-xs font-medium">
          <span :class="nameValid ? 'text-emerald-700' : 'text-slate-500'">{{ nameValid ? '✓' : '○' }} Team Name {{ nameValid ? 'set' : 'required' }}</span>
          <span :class="membersValid ? 'text-emerald-700' : 'text-slate-500'">{{ membersValid ? '✓' : '○' }} At least 1 member {{ membersValid ? 'added' : 'required' }}</span>
          <span :class="coordinatorValid ? 'text-emerald-700' : 'text-slate-500'">{{ coordinatorValid ? '✓' : '○' }} Coordinator {{ coordinatorValid ? 'assigned' : 'required' }}</span>
        </div>

        <div class="flex items-center justify-end gap-2">
          <button
            type="button"
            @click="$emit('cancel')"
            class="inline-flex items-center rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
          >
            Cancel
          </button>
          <button
            type="submit"
            :disabled="!canSubmit || isSubmitting || fileUploadStore.isUploading"
            class="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <span v-if="isSubmitting" class="mr-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-b-transparent"></span>
            {{ submitButtonText }}
          </button>
        </div>
      </div>
    </div>
  </form>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, toRefs, watch } from 'vue';
import { useFileUploadStore } from '~/stores/fileUploadStore';
import { useAgentDefinitionStore } from '~/stores/agentDefinitionStore';
import { useAgentTeamDefinitionStore, type TeamMemberInput } from '~/stores/agentTeamDefinitionStore';

type ReferenceType = 'AGENT' | 'AGENT_TEAM';

interface LibraryItem {
  id: string;
  name: string;
  referenceType: ReferenceType;
}

const props = defineProps<{
  initialData?: any;
  isSubmitting: boolean;
  submitButtonText: string;
}>();

const emit = defineEmits(['submit', 'cancel']);
const { initialData } = toRefs(props);

const fileUploadStore = useFileUploadStore();
const agentDefStore = useAgentDefinitionStore();
const agentTeamDefStore = useAgentTeamDefinitionStore();

const avatarFileInputRef = ref<HTMLInputElement | null>(null);
const avatarUploadError = ref<string | null>(null);
const avatarPreviewBroken = ref(false);

const librarySearch = ref('');
const selectedNodeIndex = ref<number | null>(null);
const isCanvasDragOver = ref(false);

const formErrors = reactive<Record<string, string>>({});

const getInitialFormData = () => ({
  name: '',
  role: '',
  description: '',
  avatarUrl: '',
  coordinatorMemberName: '',
  nodes: [] as TeamMemberInput[],
});

const formData = reactive(getInitialFormData());

const clearErrors = () => {
  Object.keys(formErrors).forEach((key) => delete formErrors[key]);
};

const avatarInitials = computed(() => {
  const raw = (formData.name || '').trim();
  if (!raw) {
    return 'AT';
  }
  const parts = raw.split(/\s+/).filter(Boolean).slice(0, 2);
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return parts.map((part) => part[0]?.toUpperCase() ?? '').join('') || 'AT';
});

const currentTeamId = computed(() => initialData.value?.id ?? null);

const agentLibraryItems = computed<LibraryItem[]>(() =>
  (agentDefStore.agentDefinitions || []).map((agent) => ({
    id: agent.id,
    name: agent.name,
    referenceType: 'AGENT',
  })),
);

const teamLibraryItems = computed<LibraryItem[]>(() =>
  (agentTeamDefStore.agentTeamDefinitions || [])
    .filter((team) => team.id !== currentTeamId.value)
    .map((team) => ({
      id: team.id,
      name: team.name,
      referenceType: 'AGENT_TEAM',
    })),
);

const filteredAgentItems = computed(() => {
  const query = librarySearch.value.trim().toLowerCase();
  if (!query) {
    return agentLibraryItems.value;
  }
  return agentLibraryItems.value.filter((item) => item.name.toLowerCase().includes(query));
});

const filteredTeamItems = computed(() => {
  const query = librarySearch.value.trim().toLowerCase();
  if (!query) {
    return teamLibraryItems.value;
  }
  return teamLibraryItems.value.filter((item) => item.name.toLowerCase().includes(query));
});

const selectedNode = computed(() => {
  if (selectedNodeIndex.value === null) {
    return null;
  }
  return formData.nodes[selectedNodeIndex.value] || null;
});

const nameValid = computed(() => Boolean(formData.name.trim()));
const descriptionValid = computed(() => Boolean(formData.description.trim()));
const membersValid = computed(() => formData.nodes.length > 0);
const coordinatorValid = computed(() => {
  if (!formData.coordinatorMemberName) {
    return false;
  }
  return formData.nodes.some(
    (node) => node.referenceType === 'AGENT' && node.memberName === formData.coordinatorMemberName,
  );
});

const canSubmit = computed(() => nameValid.value && descriptionValid.value && membersValid.value && coordinatorValid.value);

const getReferenceName = (node: TeamMemberInput): string => {
  if (node.referenceType === 'AGENT') {
    return agentDefStore.getAgentDefinitionById(node.referenceId)?.name || node.referenceId;
  }
  return agentTeamDefStore.getAgentTeamDefinitionById(node.referenceId)?.name || node.referenceId;
};

const buildMemberBaseName = (rawName: string): string => {
  const normalized = rawName
    .trim()
    .replace(/\s+/g, '_')
    .replace(/[^a-zA-Z0-9_]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toLowerCase();

  return normalized || 'member';
};

const buildUniqueMemberName = (rawName: string): string => {
  const baseName = buildMemberBaseName(rawName);
  const used = new Set(formData.nodes.map((node) => node.memberName));
  if (!used.has(baseName)) {
    return baseName;
  }

  let counter = 2;
  while (used.has(`${baseName}_${counter}`)) {
    counter += 1;
  }
  return `${baseName}_${counter}`;
};

const addNodeFromLibrary = (item: LibraryItem) => {
  const newNode: TeamMemberInput = {
    memberName: buildUniqueMemberName(item.name),
    referenceType: item.referenceType,
    referenceId: item.id,
  };

  formData.nodes.push(newNode);
  selectedNodeIndex.value = formData.nodes.length - 1;

  if (!formData.coordinatorMemberName && newNode.referenceType === 'AGENT') {
    formData.coordinatorMemberName = newNode.memberName;
  }
};

const onLibraryDragStart = (event: DragEvent, item: LibraryItem) => {
  if (!event.dataTransfer) {
    return;
  }
  event.dataTransfer.effectAllowed = 'copy';
  event.dataTransfer.setData('application/json', JSON.stringify(item));
};

const handleCanvasDrop = (event: DragEvent) => {
  isCanvasDragOver.value = false;
  const payload = event.dataTransfer?.getData('application/json');
  if (!payload) {
    return;
  }

  try {
    const item = JSON.parse(payload) as LibraryItem;
    if (!item?.id || !item?.name || !item?.referenceType) {
      return;
    }
    addNodeFromLibrary(item);
  } catch (error) {
    console.error('Failed to parse dropped team member payload:', error);
  }
};

const selectNode = (index: number) => {
  selectedNodeIndex.value = index;
};

const removeNode = (index: number) => {
  const removedNodeName = formData.nodes[index]?.memberName;
  formData.nodes.splice(index, 1);

  if (formData.coordinatorMemberName === removedNodeName) {
    formData.coordinatorMemberName = '';
  }

  if (selectedNodeIndex.value === null) {
    return;
  }
  if (formData.nodes.length === 0) {
    selectedNodeIndex.value = null;
  } else if (selectedNodeIndex.value >= formData.nodes.length) {
    selectedNodeIndex.value = formData.nodes.length - 1;
  } else if (selectedNodeIndex.value === index) {
    selectedNodeIndex.value = Math.max(0, index - 1);
  }
};

const isCoordinator = (node: TeamMemberInput) => formData.coordinatorMemberName === node.memberName;

const toggleCoordinator = (node: TeamMemberInput) => {
  if (node.referenceType !== 'AGENT') {
    return;
  }
  formData.coordinatorMemberName = isCoordinator(node) ? '' : node.memberName;
};

const updateSelectedMemberName = (nextNameRaw: string) => {
  if (!selectedNode.value) {
    return;
  }
  const nextName = nextNameRaw.trim();
  const oldName = selectedNode.value.memberName;
  selectedNode.value.memberName = nextName;

  if (formData.coordinatorMemberName === oldName) {
    formData.coordinatorMemberName = nextName;
  }
};

const validateForm = () => {
  clearErrors();
  let valid = true;

  if (!formData.name.trim()) {
    formErrors.name = 'Team name is required.';
    valid = false;
  }

  if (!formData.description.trim()) {
    formErrors.description = 'Team description is required.';
    valid = false;
  }

  if (formData.nodes.length === 0) {
    formErrors.nodes = 'Add at least one member.';
    valid = false;
  }

  const memberNames = new Set<string>();
  for (const node of formData.nodes) {
    if (!node.memberName.trim()) {
      formErrors.nodes = 'Each member needs a name.';
      valid = false;
      break;
    }
    if (!node.referenceId) {
      formErrors.nodes = 'Each member needs a source reference.';
      valid = false;
      break;
    }
    if (memberNames.has(node.memberName)) {
      formErrors.nodes = 'Member names must be unique.';
      valid = false;
      break;
    }
    memberNames.add(node.memberName);

    if (currentTeamId.value && node.referenceType === 'AGENT_TEAM' && node.referenceId === currentTeamId.value) {
      formErrors.nodes = 'A team cannot include itself as a nested team member.';
      valid = false;
      break;
    }
  }

  if (!formData.coordinatorMemberName) {
    formErrors.coordinatorMemberName = 'Coordinator is required.';
    valid = false;
  } else {
    const coordinatorExists = formData.nodes.some(
      (node) => node.referenceType === 'AGENT' && node.memberName === formData.coordinatorMemberName,
    );
    if (!coordinatorExists) {
      formErrors.coordinatorMemberName = 'Coordinator must be one of the AGENT members.';
      valid = false;
    }
  }

  return valid;
};

const triggerAvatarPicker = () => {
  avatarFileInputRef.value?.click();
};

const clearAvatar = () => {
  formData.avatarUrl = '';
  avatarUploadError.value = null;
};

const handleAvatarFileSelected = async (event: Event) => {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) {
    return;
  }

  avatarUploadError.value = null;
  try {
    const uploadedUrl = await fileUploadStore.uploadFile(file);
    formData.avatarUrl = uploadedUrl;
  } catch (error: any) {
    avatarUploadError.value = fileUploadStore.error || error?.message || 'Failed to upload avatar image.';
  } finally {
    input.value = '';
  }
};

const handleSubmit = () => {
  if (!validateForm()) {
    return;
  }

  const payload = {
    name: formData.name.trim(),
    role: formData.role.trim(),
    description: formData.description.trim(),
    coordinatorMemberName: formData.coordinatorMemberName,
    nodes: formData.nodes.map((node) => ({
      memberName: node.memberName.trim(),
      referenceType: node.referenceType,
      referenceId: node.referenceId,
    })),
    avatarUrl: formData.avatarUrl,
  };

  emit('submit', payload);
};

watch(
  initialData,
  (newData) => {
    clearErrors();
    Object.assign(formData, getInitialFormData());

    if (newData) {
      formData.name = newData.name || '';
      formData.role = newData.role || '';
      formData.description = newData.description || '';
      formData.coordinatorMemberName = newData.coordinatorMemberName || '';
      formData.avatarUrl = newData.avatarUrl || newData.avatar_url || '';
      formData.nodes = JSON.parse(JSON.stringify(newData.nodes || []));
      selectedNodeIndex.value = formData.nodes.length > 0 ? 0 : null;
    } else {
      selectedNodeIndex.value = null;
    }
  },
  { immediate: true, deep: true },
);

watch(
  () => formData.avatarUrl,
  () => {
    avatarPreviewBroken.value = false;
  },
);

onMounted(() => {
  if (agentDefStore.agentDefinitions.length === 0) {
    agentDefStore.fetchAllAgentDefinitions();
  }
  if (agentTeamDefStore.agentTeamDefinitions.length === 0) {
    agentTeamDefStore.fetchAllAgentTeamDefinitions();
  }
});
</script>
