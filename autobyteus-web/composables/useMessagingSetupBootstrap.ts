import { onMounted, onUnmounted, ref, watch } from 'vue';
import { useMessagingChannelBindingSetupStore } from '~/stores/messagingChannelBindingSetupStore';
import { useMessagingChannelBindingOptionsStore } from '~/stores/messagingChannelBindingOptionsStore';
import { useMessagingProviderScopeStore } from '~/stores/messagingProviderScopeStore';
import { useGatewayCapabilityStore } from '~/stores/gatewayCapabilityStore';
import { useGatewaySessionSetupStore } from '~/stores/gatewaySessionSetupStore';

export function useMessagingSetupBootstrap() {
  const gatewayStore = useGatewaySessionSetupStore();
  const capabilityStore = useGatewayCapabilityStore();
  const providerScopeStore = useMessagingProviderScopeStore();
  const bindingStore = useMessagingChannelBindingSetupStore();
  const bindingOptionsStore = useMessagingChannelBindingOptionsStore();

  const bootstrapError = ref<string | null>(null);

  async function bootstrapSetupState(): Promise<void> {
    bootstrapError.value = null;
    gatewayStore.initializeFromConfig();

    try {
      await capabilityStore.loadCapabilities();
      providerScopeStore.initialize(capabilityStore.capabilities);
      await capabilityStore.loadWeComAccounts();
      await bindingStore.loadCapabilities();
      await bindingStore.loadBindingsIfEnabled();
      await bindingOptionsStore.loadTargetOptions();
    } catch (error) {
      bootstrapError.value = error instanceof Error ? error.message : 'Failed to bootstrap setup state';
    }
  }

  onMounted(async () => {
    await bootstrapSetupState();
  });

  watch(
    () => providerScopeStore.selectedProvider,
    (provider) => {
      if (provider === 'WHATSAPP' || provider === 'WECHAT') {
        gatewayStore.setSessionProvider(provider);
      }
    },
    { immediate: true },
  );

  onUnmounted(() => {
    gatewayStore.stopSessionStatusAutoSync('view_unmounted');
  });

  return {
    bootstrapError,
    providerScopeStore,
  };
}
