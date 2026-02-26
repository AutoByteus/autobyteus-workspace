<template>
  <section class="border border-gray-200 rounded-lg p-4">
    <div class="grid grid-cols-1 gap-2 md:grid-cols-3">
      <button
        v-for="option in providerScopeStore.options"
        :key="option.provider"
        type="button"
        class="rounded-lg border px-4 py-3 text-left transition-colors"
        :class="providerCardClass(option.provider)"
        @click="providerScopeStore.setSelectedProvider(option.provider)"
        :data-testid="`provider-scope-${option.provider}`"
      >
        <div class="flex items-center gap-3">
          <div class="flex h-10 w-10 items-center justify-center rounded-md border" :class="providerIconShellClass(option.provider)">
            <IconifyIcon :icon="providerIcon(option.provider)" class="h-6 w-6" />
          </div>
          <div class="min-w-0">
            <p class="text-base leading-5 font-medium">{{ option.label }}</p>
          </div>
        </div>
      </button>
    </div>
  </section>
</template>

<script setup lang="ts">
import { Icon as IconifyIcon } from '@iconify/vue';
import { useMessagingProviderScopeStore } from '~/stores/messagingProviderScopeStore';
import type { MessagingProvider } from '~/types/messaging';

const providerScopeStore = useMessagingProviderScopeStore();

function providerCardClass(provider: MessagingProvider): string {
  if (providerScopeStore.selectedProvider === provider) {
    return 'border-blue-300 bg-blue-50 text-blue-900';
  }
  return 'border-gray-300 bg-white text-gray-700 hover:border-gray-400';
}

function providerIcon(provider: MessagingProvider): string {
  if (provider === 'WHATSAPP') {
    return 'logos:whatsapp-icon';
  }
  if (provider === 'WECHAT') {
    return 'simple-icons:wechat';
  }
  if (provider === 'WECOM') {
    return 'simple-icons:wechatwork';
  }
  return 'logos:discord-icon';
}

function providerIconShellClass(provider: MessagingProvider): string {
  if (provider === 'WHATSAPP') {
    return 'border-emerald-200 bg-emerald-50 text-emerald-600';
  }
  if (provider === 'WECHAT' || provider === 'WECOM') {
    return 'border-sky-200 bg-sky-50 text-sky-600';
  }
  return 'border-indigo-200 bg-indigo-50 text-indigo-600';
}
</script>
