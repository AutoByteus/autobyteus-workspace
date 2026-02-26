<template>
  <form @submit.prevent="handleSubmit" class="space-y-8 bg-white p-8 rounded-lg shadow-md border border-gray-200">
    <!-- Basic Info -->
    <fieldset class="space-y-6">
      <div>
        <label for="name" class="block text-base font-medium text-gray-800">Name</label>
        <input
          type="text"
          id="name"
          v-model="formData.name"
          required
          class="mt-2 block w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-base"
          placeholder="e.g., Software Developer Agent"
        />
      </div>

      <div>
        <label for="role" class="block text-base font-medium text-gray-800">Role</label>
        <input
          type="text"
          id="role"
          v-model="formData.role"
          required
          class="mt-2 block w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-base"
          placeholder="e.g., Senior Software Developer"
        />
      </div>

      <div>
        <label for="description" class="block text-base font-medium text-gray-800">Description</label>
        <textarea
          id="description"
          v-model="formData.description"
          required
          rows="4"
          class="mt-2 block w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-base"
          placeholder="A detailed description of the agent's purpose and capabilities."
        ></textarea>
      </div>

      <div>
        <label class="block text-base font-medium text-gray-800">Avatar</label>
        <p class="mt-1 text-sm text-gray-500">Upload an image to represent this agent in list and detail views.</p>
        <div class="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center">
          <div class="h-24 w-24 rounded-2xl border border-gray-200 bg-gradient-to-br from-indigo-500 via-blue-500 to-cyan-500 p-0.5">
            <div class="h-full w-full overflow-hidden rounded-2xl bg-slate-900 flex items-center justify-center">
              <img
                v-if="formData.avatar_url && !avatarPreviewBroken"
                :src="formData.avatar_url"
                alt="Agent avatar preview"
                class="h-full w-full object-cover"
                @error="avatarPreviewBroken = true"
              />
              <span v-else class="text-xl font-semibold tracking-wide text-white">{{ avatarInitials }}</span>
            </div>
          </div>

          <div class="space-y-2">
            <div class="flex items-center gap-2">
              <button
                type="button"
                class="inline-flex items-center rounded-md border border-indigo-300 px-3 py-1.5 text-sm font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 disabled:cursor-not-allowed disabled:opacity-60"
                :disabled="fileUploadStore.isUploading"
                @click="triggerAvatarPicker"
              >
                Upload Avatar
              </button>
              <button
                v-if="formData.avatar_url"
                type="button"
                class="inline-flex items-center rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 bg-white hover:bg-gray-100"
                @click="clearAvatar"
              >
                Remove
              </button>
            </div>
            <p v-if="fileUploadStore.isUploading" class="text-sm text-indigo-600">Uploading avatar...</p>
            <p v-else-if="avatarUploadError" class="text-sm text-red-600">{{ avatarUploadError }}</p>
            <p v-else class="text-sm text-gray-500">Supported: JPG, PNG, GIF, WEBP</p>
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
    </fieldset>

    <!-- System Prompt Selection -->
    <fieldset class="border-t border-gray-200 pt-8">
      <legend class="text-xl font-semibold text-gray-900">System Prompt</legend>
      <div class="mt-4 grid grid-cols-1 gap-y-6 sm:grid-cols-2 sm:gap-x-6">
        <div>
          <label for="prompt-category" class="block text-base font-medium text-gray-800">Prompt Category</label>
          <select
            id="prompt-category"
            v-model="formData.system_prompt_category"
            class="mt-2 block w-full pl-3 pr-10 py-2.5 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 rounded-md"
          >
            <option value="" disabled>Select a Prompt Category</option>
            <option v-for="category in optionsStore.promptCategories" :key="category.category" :value="category.category">
              {{ category.category }}
            </option>
          </select>
        </div>
        <div>
          <label for="prompt-name" class="block text-base font-medium text-gray-800">Prompt Name</label>
          <select
            id="prompt-name"
            v-model="formData.system_prompt_name"
            :disabled="!formData.system_prompt_category"
            class="mt-2 block w-full pl-3 pr-10 py-2.5 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 rounded-md disabled:bg-gray-100"
          >
            <option value="" disabled>{{ formData.system_prompt_category ? 'Select a name' : 'Select a category first' }}</option>
            <option v-for="name in availablePromptNames" :key="name" :value="name">
              {{ name }}
            </option>
          </select>
        </div>
      </div>
    </fieldset>

    <!-- Skills Configuration -->
    <fieldset class="border-t border-gray-200 pt-8">
      <legend class="text-xl font-semibold text-gray-900">Skills Configuration</legend>
      <div class="mt-4 grid grid-cols-1 gap-x-8 gap-y-8">
        <div>
          <label for="skill_names" class="block text-base font-medium text-gray-800">Skills</label>
          <p class="text-sm text-gray-500 mb-2">Select skills to equip the agent with specific capabilities.</p>
          <GroupableTagInput
            :model-value="formData['skill_names']"
            @update:model-value="formData['skill_names'] = $event"
            :source="getComponentSource('skill_names')"
            placeholder="Add skills..."
            @add-all="handleAddAllSkills"
          />
        </div>
      </div>
    </fieldset>

    <!-- Tool Configuration -->
    <fieldset class="border-t border-gray-200 pt-8">
      <legend class="text-xl font-semibold text-gray-900">Tool Configuration</legend>
      <div class="mt-4 grid grid-cols-1 gap-x-8 gap-y-8">
        <div>
          <label for="tool_names" class="block text-base font-medium text-gray-800">Tools</label>
          <p class="text-sm text-gray-500 mb-2">Select available tools for the agent to use.</p>
          <GroupableTagInput
            :model-value="formData['tool_names']"
            @update:model-value="formData['tool_names'] = $event"
            :source="getComponentSource('tool_names')"
            placeholder="Add tools..."
            :loading="toolStore.loading"
            @add-all="handleAddAllTools"
          />
        </div>
      </div>
    </fieldset>

    <!-- Advanced Settings -->
    <details class="border-t border-gray-200 pt-8">
      <summary class="text-xl font-semibold text-gray-900 cursor-pointer">Optional Processors (Advanced)</summary>
      <p class="text-sm text-gray-500 mt-2 mb-4">
        Only optional processors are shown here. Mandatory processors are applied automatically at runtime.
      </p>
      <fieldset class="mt-4 space-y-8">
        <div v-if="visibleProcessorFields.length === 0" class="text-sm text-gray-500">
          No optional processors available.
        </div>
        <div v-for="field in visibleProcessorFields" :key="field.name">
          <div class="flex justify-between items-baseline mb-1">
            <label :for="field.name" class="block text-base font-medium text-gray-800">{{ field.label }}</label>
            <button
              v-if="hasSelection(field.name)"
              type="button"
              @click="clearSelection(field.name)"
              class="text-sm font-medium text-indigo-600 hover:text-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 rounded-md px-2 py-1 -my-1"
            >
              Clear
            </button>
          </div>
          <p class="text-sm text-gray-500 mb-2">{{ field.helpText }}</p>
          <GroupableTagInput
            :model-value="formData[field.name]"
            @update:model-value="formData[field.name] = $event"
            :source="getComponentSource(field.name)"
            :placeholder="field.placeholder"
          />
        </div>
      </fieldset>
    </details>

    <div class="flex justify-end pt-4 space-x-4">
      <button
        type="button"
        @click="$emit('cancel')"
        class="inline-flex justify-center py-3 px-6 border border-gray-300 shadow-sm text-base font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
      >
        Cancel
      </button>
      <button
        type="submit"
        :disabled="isSubmitting || fileUploadStore.isUploading"
        class="inline-flex justify-center py-3 px-6 border border-transparent shadow-sm text-base font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
      >
        <span v-if="isSubmitting" class="animate-spin h-5 w-5 mr-3 i-heroicons-arrow-path-20-solid" viewBox="0 0 24 24"></span>
        {{ submitButtonText }}
      </button>
    </div>
  </form>
</template>

<script setup lang="ts">
import { reactive, watch, toRefs, computed, onMounted, ref } from 'vue';
import { useAgentDefinitionOptionsStore } from '~/stores/agentDefinitionOptionsStore';
import { useToolManagementStore } from '~/stores/toolManagementStore';
import { useSkillStore } from '~/stores/skillStore';
import { useFileUploadStore } from '~/stores/fileUploadStore';
import GroupableTagInput from '~/components/agents/GroupableTagInput.vue';
import type { GroupedSource, FlatSource } from '~/components/agents/GroupableTagInput.vue';

const props = defineProps<{
  initialData?: any;
  isSubmitting: boolean;
  submitButtonText: string;
  isCreateMode: boolean;
}>();

const emit = defineEmits(['submit', 'cancel']);
const { initialData, isCreateMode } = toRefs(props);

// Stores
const optionsStore = useAgentDefinitionOptionsStore();
const toolStore = useToolManagementStore();
const skillStore = useSkillStore();
const fileUploadStore = useFileUploadStore();
const avatarFileInputRef = ref<HTMLInputElement | null>(null);
const avatarUploadError = ref<string | null>(null);
const avatarPreviewBroken = ref(false);

// Fetch required data on mount
onMounted(async () => {
  optionsStore.fetchAllAvailableOptions();
  skillStore.fetchAllSkills();
  if (toolStore.getLocalToolsByCategory.length === 0) {
    toolStore.fetchLocalToolsGroupedByCategory();
  }
  if (toolStore.getMcpServers.length === 0) {
    await toolStore.fetchMcpServers();
  }
  toolStore.getMcpServers.forEach(server => {
    if (toolStore.getToolsForServer(server.serverId).length === 0) {
      toolStore.fetchToolsForServer(server.serverId);
    }
  });
});

const componentFields = computed(() => [
  { name: 'skill_names', camelCase: 'skillNames', label: 'Skills', placeholder: 'Add skills...', helpText: 'Select skills to equip the agent with specific capabilities.' },
  { name: 'tool_names', camelCase: 'toolNames', label: 'Tools', placeholder: 'Add custom tools...', helpText: 'Select available tools for the agent to use.' },
  { name: 'input_processor_names', camelCase: 'inputProcessorNames', label: 'Input Processors', placeholder: 'Add custom processors...', helpText: 'Customize processors that handle incoming messages.' },
  { name: 'llm_response_processor_names', camelCase: 'llmResponseProcessorNames', label: 'LLM Response Processors', placeholder: 'Add custom processors...', helpText: 'Customize processors that interpret LLM responses.' },
  { name: 'system_prompt_processor_names', camelCase: 'systemPromptProcessorNames', label: 'System Prompt Processors', placeholder: 'Add custom processors...', helpText: 'Customize processors that build the system prompt.' },
  { name: 'tool_execution_result_processor_names', camelCase: 'toolExecutionResultProcessorNames', label: 'Tool Result Processors', placeholder: 'Add custom processors...', helpText: 'Customize processors that handle tool results.' },
  { name: 'tool_invocation_preprocessor_names', camelCase: 'toolInvocationPreprocessorNames', label: 'Tool Invocation Preprocessors', placeholder: 'Add preprocessors...', helpText: 'Run before a tool executes (e.g., resolve media paths).' },
  { name: 'lifecycle_processor_names', camelCase: 'lifecycleProcessorNames', label: 'Lifecycle Processors', placeholder: 'Add custom processors...', helpText: 'Attach processors triggered by agent lifecycle events (e.g. AGENT_READY).' },
]);

const toolSource = computed((): GroupedSource => {
  const localToolGroups = toolStore.getLocalToolsByCategory.map(group => ({
    name: group.categoryName,
    tags: group.tools.map(t => t.name),
    allowAll: true,
  }));
  const mcpServerGroups = toolStore.getMcpServers.map(server => ({
    name: `MCP: ${server.serverId}`,
    tags: toolStore.getToolsForServer(server.serverId).map(t => t.name),
    allowAll: true,
  }));
  return { type: 'grouped', groups: [...localToolGroups, ...mcpServerGroups] };
});

const skillSource = computed((): FlatSource => {
  return {
    type: 'flat',
    tags: skillStore.skills.map(s => s.name)
  };
});

const processorFieldMap: { [key: string]: keyof typeof optionsStore } = {
  'input_processor_names': 'inputProcessors',
  'llm_response_processor_names': 'llmResponseProcessors',
  'system_prompt_processor_names': 'systemPromptProcessors',
  'tool_execution_result_processor_names': 'toolExecutionResultProcessors',
  'tool_invocation_preprocessor_names': 'toolInvocationPreprocessors',
  'lifecycle_processor_names': 'lifecycleProcessors',
};

const getComponentSource = (fieldName: string): GroupedSource | FlatSource => {
  if (fieldName === 'tool_names') {
    return toolSource.value;
  }
  if (fieldName === 'skill_names') {
    return skillSource.value;
  }
  const key = processorFieldMap[fieldName];
  const tags = optionsStore[key] as string[] | undefined;
  return {
    type: 'flat',
    tags: tags || []
  };
};

const visibleProcessorFields = computed(() => {
  return componentFields.value
    .filter(field => field.name in processorFieldMap)
    .filter(field => {
      const key = processorFieldMap[field.name];
      const options = optionsStore[key] as string[] | undefined;
      const selected = (formData as any)[field.name] as string[] | undefined;
      return (options && options.length > 0) || (selected && selected.length > 0);
    });
});

function hasSelection(fieldName: string) {
  const selected = (formData as any)[fieldName] as string[] | undefined;
  return Array.isArray(selected) && selected.length > 0;
}

const getInitialValue = (): { [key: string]: any } => ({
  name: '',
  role: '',
  description: '',
  avatar_url: '',
  system_prompt_category: '',
  system_prompt_name: '',
  ...Object.fromEntries(componentFields.value.map(f => [f.name, [] as string[]]))
});

const formData = reactive(getInitialValue());

watch(initialData, (newData) => {
  if (newData && !isCreateMode.value) {
    formData.name = newData.name || '';
    formData.role = newData.role || '';
    formData.description = newData.description || '';
    formData.avatar_url = newData.avatarUrl || newData.avatar_url || '';
    formData.system_prompt_category = newData.systemPromptCategory || '';
    formData.system_prompt_name = newData.systemPromptName || '';
    componentFields.value.forEach(field => {
      const key = field.name as keyof typeof formData;
      formData[key] = newData[field.camelCase] || newData[key] || [];
    });
  } else {
    Object.assign(formData, getInitialValue());
  }
}, { immediate: true, deep: true });

watch(() => formData.avatar_url, () => {
  avatarPreviewBroken.value = false;
});

const availablePromptNames = computed(() => {
  if (!formData.system_prompt_category) return [];
  const selectedCat = optionsStore.promptCategories.find(c => c.category === formData.system_prompt_category);
  return selectedCat ? selectedCat.names : [];
});

watch(() => formData.system_prompt_category, () => {
  formData.system_prompt_name = '';
});

function handleAddAllTools(groupName: string) {
  let toolsToAdd: string[] = [];
  const mcpPrefix = 'MCP: ';
  if (groupName.startsWith(mcpPrefix)) {
    const serverId = groupName.substring(mcpPrefix.length);
    toolsToAdd = toolStore.getToolsForServer(serverId).map(t => t.name);
  } else {
    const categoryGroup = toolStore.getLocalToolsByCategory.find(g => g.categoryName === groupName);
    if (categoryGroup) {
      toolsToAdd = categoryGroup.tools.map(t => t.name);
    }
  }
  const currentTools = formData.tool_names;
  const newToolSet = new Set([...currentTools, ...toolsToAdd]);
  formData.tool_names = Array.from(newToolSet);
}

function handleAddAllSkills() {
  const allSkills = skillStore.skills.map(s => s.name);
  const currentSkills = formData.skill_names || [];
  const newSkillSet = new Set([...currentSkills, ...allSkills]);
  formData.skill_names = Array.from(newSkillSet);
}

// NEW: Reset to defaults function
function clearSelection(fieldName: string) {
  (formData as any)[fieldName] = [];
}

const avatarInitials = computed(() => {
  const raw = (formData.name || '').trim();
  if (!raw) {
    return 'AI';
  }
  const parts = raw.split(/\s+/).filter(Boolean).slice(0, 2);
  const initials = parts.map(part => part[0]?.toUpperCase() || '').join('');
  return initials || 'AI';
});

function triggerAvatarPicker() {
  avatarFileInputRef.value?.click();
}

function clearAvatar() {
  formData.avatar_url = '';
  avatarUploadError.value = null;
}

async function handleAvatarFileSelected(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) {
    return;
  }
  avatarUploadError.value = null;
  try {
    const uploadedUrl = await fileUploadStore.uploadFile(file);
    formData.avatar_url = uploadedUrl;
  } catch (error: any) {
    avatarUploadError.value =
      fileUploadStore.error ||
      error?.response?.data?.detail ||
      error?.message ||
      'Failed to upload avatar image.';
  } finally {
    input.value = '';
  }
}

const handleSubmit = () => {
  const submissionData = {
    name: formData.name,
    role: formData.role,
    description: formData.description,
    avatarUrl: formData.avatar_url,
    systemPromptCategory: formData.system_prompt_category,
    systemPromptName: formData.system_prompt_name,
    skillNames: formData.skill_names,
    toolNames: formData.tool_names,
    inputProcessorNames: formData.input_processor_names,
    llmResponseProcessorNames: formData.llm_response_processor_names,
    systemPromptProcessorNames: formData.system_prompt_processor_names,
    toolExecutionResultProcessorNames: formData.tool_execution_result_processor_names,
    toolInvocationPreprocessorNames: formData.tool_invocation_preprocessor_names,
    lifecycleProcessorNames: formData.lifecycle_processor_names,
  };
  emit('submit', submissionData);
};
</script>
