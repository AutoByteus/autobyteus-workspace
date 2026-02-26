import { defineStore } from 'pinia';
import { ref } from 'vue';
import { getApolloClient } from '~/utils/apolloClient';
import { GetAgentCustomizationOptions } from '~/graphql/queries/agentCustomizationOptionsQueries';
import type { GetAgentCustomizationOptionsQuery } from '~/generated/graphql';

interface PromptCategory {
  __typename?: 'PromptCategory';
  category: string;
  names: string[];
}

export const useAgentDefinitionOptionsStore = defineStore('agentDefinitionOptions', () => {
  // State
  const toolNames = ref<string[]>([]);
  const inputProcessors = ref<string[]>([]);
  const llmResponseProcessors = ref<string[]>([]);
  const systemPromptProcessors = ref<string[]>([]);
  const toolExecutionResultProcessors = ref<string[]>([]);
  const toolInvocationPreprocessors = ref<string[]>([]);
  const lifecycleProcessors = ref<string[]>([]);
  const promptCategories = ref<PromptCategory[]>([]);
  
  const loading = ref(false);
  const error = ref<any>(null);

  // Actions
  async function fetchAllAvailableOptions() {
    loading.value = true;
    error.value = null;
    try {
      const client = getApolloClient();
      const { data, errors } = await client.query<GetAgentCustomizationOptionsQuery>({
        query: GetAgentCustomizationOptions,
      });

      if (errors && errors.length > 0) {
        throw new Error(errors.map(e => e.message).join(', '));
      }
      
      if (data) {
        toolNames.value = data.availableToolNames || [];
        toolInvocationPreprocessors.value = data.availableOptionalToolInvocationPreprocessorNames || [];
        lifecycleProcessors.value = data.availableOptionalLifecycleProcessorNames || [];
        inputProcessors.value = data.availableOptionalInputProcessorNames || [];
        llmResponseProcessors.value = data.availableOptionalLlmResponseProcessorNames || [];
        systemPromptProcessors.value = data.availableOptionalSystemPromptProcessorNames || [];
        toolExecutionResultProcessors.value = data.availableOptionalToolExecutionResultProcessorNames || [];
        promptCategories.value = data.availablePromptCategories || [];
      }
    } catch (e) {
      error.value = e;
      console.error("Failed to fetch agent definition options:", e);
    } finally {
      loading.value = false;
    }
  }

  return {
    // State
    toolNames,
    inputProcessors,
    llmResponseProcessors,
    systemPromptProcessors,
    toolExecutionResultProcessors,
    toolInvocationPreprocessors,
    lifecycleProcessors,
    promptCategories,
    loading,
    error,
    // Actions
    fetchAllAvailableOptions,
  };
});
