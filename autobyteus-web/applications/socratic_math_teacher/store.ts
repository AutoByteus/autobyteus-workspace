import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { getApolloClient } from '~/utils/apolloClient';
import { RunApplication, SetApplicationConfiguration } from '~/graphql/mutations/applicationMutations';
import { GetApplicationConfiguration } from '~/graphql/queries/applicationQueries';
import type { ContextFilePath } from '~/types/conversation';

interface RunApplicationResult {
  runApplication: {
    solutionText: string;
    animationUrl: string;
    status: string;
  };
}

const APP_ID = "socratic_math_teacher";

export const useSocraticMathTeacherStore = defineStore('socraticMathTeacherApp', () => {
  // --- STATE ---
  const isLoading = ref(false);
  const error = ref<string | null>(null);
  const solutionText = ref<string | null>(null);
  const animationUrl = ref<string | null>(null);
  const agentLlmConfig = ref<Record<string, string>>({});
  const isConfigLoading = ref(false);

  // --- GETTERS ---
  const configSummary = computed(() => {
    return Object.entries(agentLlmConfig.value)
      .map(([agent, model]) => `${agent}: ${model.split('/').pop()}`)
      .join(', ');
  });

  // --- ACTIONS ---
  function reset() {
    // Keep isLoading as is, because a reset might be triggered while a new process starts.
    // The solveAndAnimate function will manage the loading state.
    error.value = null;
    solutionText.value = null;
    animationUrl.value = null;
  }

  async function loadConfiguration() {
    isConfigLoading.value = true;
    try {
      const client = getApolloClient();
      const { data } = await client.query({
        query: GetApplicationConfiguration,
        variables: { appId: APP_ID },
        fetchPolicy: 'network-only',
      });
      if (data?.getApplicationConfiguration) {
        agentLlmConfig.value = data.getApplicationConfiguration;
      } else {
        // If no config is saved on the backend, initialize with an empty object.
        // The UI will populate defaults based on required agents.
        agentLlmConfig.value = {};
      }
    } catch (e) {
      console.error("Failed to load application configuration from backend:", e);
      // On error, initialize with an empty object.
      agentLlmConfig.value = {};
    } finally {
      isConfigLoading.value = false;
    }
  }

  async function saveConfiguration(newConfig: Record<string, string>) {
    try {
      const client = getApolloClient();
      await client.mutate({
        mutation: SetApplicationConfiguration,
        variables: { appId: APP_ID, configData: newConfig },
      });
      agentLlmConfig.value = newConfig;
    } catch (e) {
      console.error("Failed to save application configuration:", e);
      // Optionally handle the error in the UI
    }
  }

  async function solveAndAnimate(problemText: string, contextFiles: ContextFilePath[]) {
    isLoading.value = true;
    error.value = null;
    solutionText.value = null;
    animationUrl.value = null;

    try {
      const client = getApolloClient();
      const result = await client.mutate<RunApplicationResult>({
        mutation: RunApplication,
        variables: {
          appId: APP_ID,
          input: {
            problem_text: problemText,
            agent_llm_config: agentLlmConfig.value,
            context_files: contextFiles.map(cf => ({ path: cf.path, type: cf.type.toUpperCase() }))
          }
        }
      });

      if (result?.data?.runApplication) {
        const payload = result.data.runApplication;
        if (payload.status === 'success') {
          solutionText.value = payload.solutionText;
          animationUrl.value = `${payload.animationUrl}&t=${new Date().getTime()}`;
        } else {
          throw new Error("Application execution failed.");
        }
      } else {
        throw new Error("Invalid response from server.");
      }
    } catch (e: any) {
      console.error("Error running Socratic Math Teacher application:", e);
      error.value = e.message || "An unknown error occurred.";
    } finally {
      isLoading.value = false;
    }
  }

  // Initialize config on store creation
  loadConfiguration();

  return {
    isLoading,
    error,
    solutionText,
    animationUrl,
    agentLlmConfig,
    isConfigLoading,
    configSummary,
    loadConfiguration,
    saveConfiguration,
    solveAndAnimate,
    reset,
  };
});
