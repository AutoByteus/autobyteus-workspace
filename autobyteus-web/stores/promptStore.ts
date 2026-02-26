import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { getApolloClient } from '~/utils/apolloClient';
import { GET_PROMPTS, GET_PROMPT_BY_ID } from '~/graphql/queries/prompt_queries';
import { CREATE_PROMPT, UPDATE_PROMPT, ADD_NEW_PROMPT_REVISION, DELETE_PROMPT, MARK_ACTIVE_PROMPT } from '~/graphql/mutations/prompt_mutations';
import { GetAgentCustomizationOptions } from '~/graphql/queries/agentCustomizationOptionsQueries';

interface Prompt {
  __typename?: 'Prompt';
  id: string;
  name: string;
  category: string;
  promptContent: string;
  description?: string | null;
  suitableForModels?: string | null;
  version: number;
  createdAt: string;
  updatedAt: string;
  parentPromptId?: string | null;
  isActive: boolean;
}

interface DeleteResult {
  __typename?: 'DeleteResult';
  success: boolean;
  message: string;
}

export const usePromptStore = defineStore('prompt', () => {

  // State
  const prompts = ref<Prompt[]>([]);
  const loading = ref(false);
  const error = ref('');
  const selectedPrompt = ref<Prompt | null>(null);
  const deleteResult = ref<DeleteResult | null>(null);

  // Actions
  async function fetchPrompts(isActive: boolean | null = null) {
    if (prompts.value.length > 0) return; // Data already exists, rely on cache.
    loading.value = true;
    error.value = '';

    try {
      const client = getApolloClient();
      const { data, errors } = await client.query({
        query: GET_PROMPTS,
        variables: { isActive },
        // Uses default 'cache-first'
      });

      if (errors && errors.length > 0) {
        throw new Error(errors.map((e) => e.message).join(', '));
      }

      if (data?.prompts) {
        prompts.value = data.prompts;
      }
    } catch (e: any) {
      error.value = e.message;
      throw e;
    } finally {
      loading.value = false;
    }
  }

  async function reloadPrompts() {
    loading.value = true;
    error.value = '';

    try {
      const client = getApolloClient();
      const { data, errors } = await client.query({
        query: GET_PROMPTS,
        variables: { isActive: null },
        fetchPolicy: 'network-only', // Force network request to bypass cache
      });

      if (errors && errors.length > 0) {
        throw new Error(errors.map((e) => e.message).join(', '));
      }

      if (data?.prompts) {
        prompts.value = data.prompts;
      }
    } catch (e: any) {
      error.value = e.message;
      throw e;
    } finally {
      loading.value = false;
    }
  }

  async function fetchPromptById(id: string): Promise<Prompt | null> {
    loading.value = true;
    error.value = '';

    try {
      const client = getApolloClient();
      const { data, errors } = await client.query({
        query: GET_PROMPT_BY_ID,
        variables: { id },
        // Uses default 'cache-first'
      });

      if (errors && errors.length > 0) {
        throw new Error(errors.map((e) => e.message).join(', '));
      }
      
      loading.value = false;
      if (data?.promptDetails) {
        selectedPrompt.value = data.promptDetails;
        return data.promptDetails;
      } else {
        return null;
      }
    } catch (e: any) {
      error.value = e.message;
      loading.value = false;
      throw e;
    }
  }

  async function createPrompt(
    name: string,
    category: string,
    promptContent: string,
    description?: string,
    suitableForModels?: string,
  ) {
    try {
      const client = getApolloClient();
      const { data, errors } = await client.mutate({
        mutation: CREATE_PROMPT,
        variables: { input: { name, category, promptContent, description, suitableForModels } },
        refetchQueries: [
          { query: GET_PROMPTS },
          { query: GetAgentCustomizationOptions }
        ]
      });

      if (errors && errors.length > 0) {
        throw new Error(errors.map(e => e.message).join(', '));
      }

      if (data?.createPrompt) {
        const newPrompt = data.createPrompt;
        prompts.value = [...prompts.value, newPrompt];
        return newPrompt;
      }
      throw new Error('Failed to create prompt: No data returned');
    } catch (e: any) {
      error.value = e.message;
      throw e;
    }
  }

  async function updatePrompt(
    id: string,
    promptContent?: string,
    description?: string,
    suitableForModels?: string,
    isActive?: boolean,
    name?: string,
    category?: string,
  ) {
    try {
      const client = getApolloClient();
      const { data, errors } = await client.mutate({
        mutation: UPDATE_PROMPT,
        variables: { input: { id, promptContent, description, suitableForModels, isActive, name, category } },
        refetchQueries: [{ query: GetAgentCustomizationOptions }]
      });

      if (errors && errors.length > 0) {
        throw new Error(errors.map(e => e.message).join(', '));
      }

      if (data?.updatePrompt) {
        const updatedPrompt = data.updatePrompt;
        const index = prompts.value.findIndex(p => p.id === updatedPrompt.id);
        if (index !== -1) {
          const newPrompts = [...prompts.value];
          newPrompts[index] = updatedPrompt;
          prompts.value = newPrompts;
        }
        return updatedPrompt;
      }
      throw new Error('Failed to update prompt: No data returned');
    } catch (e: any) {
      error.value = e.message;
      throw e;
    }
  }

  async function addNewPromptRevision(
    id: string,
    newPromptContent: string,
  ) {
    try {
      const client = getApolloClient();
      const { data, errors } = await client.mutate({
        mutation: ADD_NEW_PROMPT_REVISION,
        variables: { input: { id, newPromptContent } },
        refetchQueries: [{ query: GET_PROMPTS }]
      });

      if (errors && errors.length > 0) {
        throw new Error(errors.map(e => e.message).join(', '));
      }

      if (data?.addNewPromptRevision) {
        return data.addNewPromptRevision;
      }
      throw new Error('Failed to add new prompt revision: No data returned');
    } catch (e: any) {
      error.value = e.message;
      throw e;
    }
  }

  async function setActivePrompt(promptId: string) {
    try {
      const client = getApolloClient();
      const { data, errors } = await client.mutate({
        mutation: MARK_ACTIVE_PROMPT,
        variables: { input: { id: promptId } },
        refetchQueries: [{ query: GET_PROMPTS }]
      });

      if (errors && errors.length > 0) {
        throw new Error(errors.map(e => e.message).join(', '));
      }

      if (data?.markActivePrompt) {
        return data.markActivePrompt;
      }
      throw new Error('Failed to mark prompt as active: No data returned');
    } catch (e: any) {
      error.value = e.message;
      throw e;
    }
  }

  async function deletePrompt(id: string) {
    loading.value = true;
    error.value = '';
    deleteResult.value = null;

    try {
      const client = getApolloClient();
      const { data, errors } = await client.mutate({
        mutation: DELETE_PROMPT,
        variables: { input: { id } },
        refetchQueries: [
          { query: GET_PROMPTS },
          { query: GetAgentCustomizationOptions }
        ]
      });

      if (errors && errors.length > 0) {
        throw new Error(errors.map(e => e.message).join(', '));
      }

      if (data?.deletePrompt) {
        deleteResult.value = data.deletePrompt;
        if (deleteResult.value.success) {
          prompts.value = prompts.value.filter(p => p.id !== id);
        }
        return deleteResult.value;
      }
      throw new Error('Failed to delete prompt: No data returned');
    } catch (e: any) {
      error.value = e.message;
      throw e;
    } finally {
      loading.value = false;
    }
  }

  function setSelectedPrompt(prompt: Prompt | null) {
    selectedPrompt.value = prompt;
  }

  function clearError() {
    error.value = '';
  }

  function clearDeleteResult() {
    deleteResult.value = null;
  }

  // Getters
  const getPrompts = computed(() => prompts.value);
  const getLoading = computed(() => loading.value);
  const getError = computed(() => error.value);
  const getSelectedPrompt = computed(() => selectedPrompt.value);
  const getDeleteResult = computed(() => deleteResult.value);

  return {
    // State refs
    prompts,
    loading,
    error,
    selectedPrompt,
    deleteResult,
    // Actions
    fetchPrompts,
    reloadPrompts,
    fetchPromptById,
    createPrompt,
    updatePrompt,
    addNewPromptRevision,
    setActivePrompt,
    deletePrompt,
    setSelectedPrompt,
    clearError,
    clearDeleteResult,
    // Getters
    getPrompts,
    getLoading,
    getError,
    getSelectedPrompt,
    getDeleteResult,
  };
});
