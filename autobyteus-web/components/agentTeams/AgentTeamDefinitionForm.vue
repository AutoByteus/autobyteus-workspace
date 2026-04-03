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
          <label for="team-category" class="block text-sm font-medium text-slate-700">Category</label>
          <input
            id="team-category"
            v-model="formData.category"
            type="text"
            class="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            placeholder="e.g., software-engineering"
          />
        </div>

        <div class="mt-3">
          <label for="team-instructions" class="block text-sm font-medium text-slate-700">Instructions</label>
          <textarea
            id="team-instructions"
            v-model="formData.instructions"
            rows="8"
            class="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 font-mono text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            placeholder="Enter the team coordinator's instructions..."
            required
          />
        </div>
      </section>

      <section class="grid grid-cols-1 gap-4 xl:grid-cols-[18rem_minmax(0,1fr)_16rem]">
        <AgentTeamLibraryPanel
          :search="librarySearch"
          :agent-items="filteredAgentItems"
          :team-items="filteredTeamItems"
          @update:search="updateLibrarySearch"
          @add="addNodeFromLibrary"
          @dragstart-item="handleLibraryDragStart"
        />

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
                node.refType === 'AGENT' ? 'shadow-sm' : '',
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
                    :class="node.refType === 'AGENT' ? 'bg-blue-50 text-blue-700' : 'bg-violet-50 text-violet-700'"
                  >
                    {{ node.refType === 'AGENT' ? 'AGENT' : 'TEAM' }}
                  </span>

                  <div
                    v-if="node.refType === 'AGENT'"
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

        <AgentTeamMemberDetailsPanel
          :selected-node="selectedNode"
          :reference-name="selectedReferenceName"
          :coordinator-enabled="selectedNodeIsCoordinator"
          :coordinator-error="formErrors.coordinatorMemberName"
          @update-member-name="updateSelectedMemberName"
          @toggle-coordinator="toggleSelectedCoordinator"
        />
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
import AgentTeamLibraryPanel from './form/AgentTeamLibraryPanel.vue';
import AgentTeamMemberDetailsPanel from './form/AgentTeamMemberDetailsPanel.vue';
import {
  buildSubmitNodes,
  createInitialFormData,
  type LibraryItem,
  mapInitialTeamNodes,
  useAgentTeamDefinitionFormState,
} from './form/useAgentTeamDefinitionFormState';
import { useFileUploadStore } from '~/stores/fileUploadStore';
import { useAgentDefinitionStore } from '~/stores/agentDefinitionStore';
import { useAgentTeamDefinitionStore } from '~/stores/agentTeamDefinitionStore';

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

const formErrors = reactive<Record<string, string>>({});
const formData = reactive(createInitialFormData());

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

const currentTeamDefinitionId = computed(() => initialData.value?.id ?? null);
const agentDefinitions = computed(() => agentDefStore.sharedAgentDefinitions || []);
const teamDefinitions = computed(() => agentTeamDefStore.agentTeamDefinitions || []);

const nameValid = computed(() => Boolean(formData.name.trim()));
const descriptionValid = computed(() => Boolean(formData.description.trim()));
const instructionsValid = computed(() => Boolean(formData.instructions.trim()));
const membersValid = computed(() => formData.nodes.length > 0);
const coordinatorValid = computed(() => {
  if (!formData.coordinatorMemberName) {
    return false;
  }
  return formData.nodes.some(
    (node) => node.refType === 'AGENT' && node.memberName === formData.coordinatorMemberName,
  );
});

const canSubmit = computed(() => (
  nameValid.value
  && descriptionValid.value
  && instructionsValid.value
  && membersValid.value
  && coordinatorValid.value
));
const {
  addNodeFromLibrary,
  clearErrors,
  filteredAgentItems,
  filteredTeamItems,
  getReferenceName,
  handleCanvasDrop,
  isCoordinator,
  isCanvasDragOver,
  librarySearch,
  onLibraryDragStart,
  removeNode,
  selectNode,
  selectedNode,
  selectedNodeIndex,
  toggleCoordinator,
  updateSelectedMemberName,
  validateForm,
} = useAgentTeamDefinitionFormState({
  formData,
  formErrors,
  currentTeamDefinitionId,
  agentDefinitions,
  teamDefinitions,
  getAgentDefinitionById: agentDefStore.getAgentDefinitionById,
  getAgentTeamDefinitionById: agentTeamDefStore.getAgentTeamDefinitionById,
});

const updateLibrarySearch = (value: string) => {
  librarySearch.value = value;
};

const handleLibraryDragStart = ({ event, item }: { event: DragEvent; item: LibraryItem }) => {
  onLibraryDragStart(event, item);
};

const selectedReferenceName = computed(() => (
  selectedNode.value ? getReferenceName(selectedNode.value) : ''
));

const selectedNodeIsCoordinator = computed(() => (
  selectedNode.value ? isCoordinator(selectedNode.value) : false
));

const toggleSelectedCoordinator = () => {
  if (!selectedNode.value) {
    return;
  }
  toggleCoordinator(selectedNode.value);
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
    category: formData.category.trim() || undefined,
    description: formData.description.trim(),
    instructions: formData.instructions.trim(),
    coordinatorMemberName: formData.coordinatorMemberName,
    nodes: buildSubmitNodes(formData.nodes),
    avatarUrl: formData.avatarUrl,
  };

  emit('submit', payload);
};

watch(
  initialData,
  (newData) => {
    clearErrors();
    Object.assign(formData, createInitialFormData());

    if (newData) {
      formData.name = newData.name || '';
      formData.category = newData.category || '';
      formData.description = newData.description || '';
      formData.instructions = newData.instructions || '';
      formData.coordinatorMemberName = newData.coordinatorMemberName || '';
      formData.avatarUrl = newData.avatarUrl || newData.avatar_url || '';
      formData.nodes = mapInitialTeamNodes(newData.nodes || []);
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
