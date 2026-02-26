<template>
  <div class="h-full flex flex-col overflow-hidden">
    <div class="flex-1 overflow-auto p-8 space-y-6">
      <div
        v-if="bootstrapError"
        class="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-amber-700 text-sm"
        data-testid="messaging-bootstrap-error"
      >
        {{ bootstrapError }}
      </div>

      <ProviderSetupScopeCard />
      <DiscordSetupFlow v-if="providerScopeStore.selectedProvider === 'DISCORD'" />
      <WeComSetupFlow v-else-if="providerScopeStore.selectedProvider === 'WECOM'" />
      <WeChatSetupFlow v-else-if="providerScopeStore.selectedProvider === 'WECHAT'" />
      <WhatsAppSetupFlow v-else />
    </div>
  </div>
</template>

<script setup lang="ts">
import { useMessagingSetupBootstrap } from '~/composables/useMessagingSetupBootstrap';
import ProviderSetupScopeCard from '~/components/settings/messaging/ProviderSetupScopeCard.vue';
import DiscordSetupFlow from '~/components/settings/messaging/flows/DiscordSetupFlow.vue';
import WeChatSetupFlow from '~/components/settings/messaging/flows/WeChatSetupFlow.vue';
import WeComSetupFlow from '~/components/settings/messaging/flows/WeComSetupFlow.vue';
import WhatsAppSetupFlow from '~/components/settings/messaging/flows/WhatsAppSetupFlow.vue';

const { bootstrapError, providerScopeStore } = useMessagingSetupBootstrap();
</script>
