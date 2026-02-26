<template>
  <div class="vnc-viewer h-full flex flex-col bg-white">
    <!-- Removed top border div to merge with tabs -->

    <div class="flex-1 overflow-auto">
      <div v-if="serverSettingsStore.isLoading" class="flex items-center justify-center h-full text-sm text-gray-500">
        Loading VNC settings...
      </div>
      <div v-else-if="hosts.length === 0" class="text-sm text-gray-500 space-y-2">
        <p>No VNC hosts configured.</p>
        <p class="text-xs text-gray-400">
          Add <span class="font-mono">AUTOBYTEUS_VNC_SERVER_HOSTS</span> as a comma-separated list (for example
          <span class="font-mono">localhost:6080,localhost:6081</span>).
        </p>
      </div>
      <div v-else class="vnc-stack">
        <VncHostTile
          v-for="host in hosts"
          :key="host.id"
          :host="host"
          :password="vncPassword"
          :auto-connect="true"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { useRuntimeConfig } from 'nuxt/app';
import { useServerSettingsStore } from '~/stores/serverSettings';
import VncHostTile, { type VncHostConfig } from '~/components/workspace/tools/VncHostTile.vue';
import { parseCommaSeparatedHosts } from '~/utils/vncHosts';

const serverSettingsStore = useServerSettingsStore();
const config = useRuntimeConfig();

const VNC_HOSTS_KEY = 'AUTOBYTEUS_VNC_SERVER_HOSTS';
const VNC_PASSWORD_KEYS = ['AUTOBYTEUS_VNC_SERVER_PASSWORD', 'AUTOBYTEUS_VNC_PASSWORD'];

const getSettingValue = (key: string) => {
  return serverSettingsStore.getSettingByKey(key)?.value?.trim() ?? '';
};

const parseHosts = (value: string): VncHostConfig[] => parseCommaSeparatedHosts(value);

const hosts = computed(() => {
  const configuredHosts = getSettingValue(VNC_HOSTS_KEY);
  if (!configuredHosts) return [];
  return parseHosts(configuredHosts);
});

const vncPassword = computed(() => {
  const fromSettings = VNC_PASSWORD_KEYS.map(getSettingValue).find(Boolean);
  return fromSettings || config.public.vncPassword || 'mysecretpassword';
});

onMounted(async () => {
  if (serverSettingsStore.settings.length === 0 && !serverSettingsStore.isLoading) {
    try {
      await serverSettingsStore.fetchServerSettings();
    } catch (error) {
      console.error('Failed to load server settings for VNC hosts:', error);
    }
  }
  console.log('[VNC Viewer] hosts resolved', hosts.value);
});
</script>

<style scoped>
.vnc-stack {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
</style>
