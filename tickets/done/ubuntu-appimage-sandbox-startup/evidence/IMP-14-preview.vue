<template>
  <main class="min-h-screen bg-slate-50 p-6">
    <h1 class="mb-4 text-lg font-semibold">Managed update component preview — synthetic state</h1>
    <div class="mb-5 flex flex-wrap gap-3 text-sm">
      <button id="ready" @click="show('ready')">Ready</button>
      <button id="refused" @click="show('refused')">Refused</button>
      <button id="gone" @click="show('stage-gone')">Receipt lost</button>
      <button id="en" @click="setPreference('en')">English</button>
      <button id="zh" @click="setPreference('zh-CN')">中文</button>
    </div>
    <section id="preview-panel" class="w-full max-w-sm rounded-xl border border-gray-200 bg-white px-5 py-4 shadow-sm">
      <h2 class="text-sm font-semibold text-gray-900">{{ $t('settings.notifications.app.name') }}</h2>
      <AutoUpdateSwitch kind="app" variant="panel" />
      <ul class="list-none"><NotificationRow v-if="row" :row="row" /></ul>
    </section>
    <output id="actions" class="mt-4 block text-xs text-gray-500">{{ actions }}</output>
  </main>
</template>
<script setup lang="ts">
import { computed, ref } from 'vue'
import AutoUpdateSwitch from '~/components/notifications/AutoUpdateSwitch.vue'
import NotificationRow from '~/components/notifications/NotificationRow.vue'
import { useAppUpdateStore } from '~/stores/appUpdateStore'
import { useUpdateNotificationsStore } from '~/stores/updateNotificationsStore'
definePageMeta({ layout: false })
const { setPreference } = useLocalization()
const app = useAppUpdateStore()
const notices = useUpdateNotificationsStore()
const actions = ref('')
const row = computed(() => notices.rows.find(item => item.kind === 'app'))
app.isElectron = true
app.setAutomaticUpdate = async enabled => { app.automaticUpdate = enabled; actions.value = `automatic:${enabled}`; return true }
app.installUpdateAndRestart = async () => { actions.value = 'install-requested' }
app.downloadUpdate = async () => { actions.value = 'download-requested' }
function show(state: 'ready' | 'refused' | 'stage-gone') {
  app.applyRemoteState({ activationMode: 'managed-quit', status: state === 'ready' ? 'downloaded' : 'idle',
    currentVersion: '1.5.13', availableVersion: '1.5.14', automaticUpdate: true,
    autoCheck: { enabled: true, intervalMinutes: 60 }, updateStaged: state === 'ready',
    notification: { version: '1.5.14', fromVersion: '1.5.13', foundAt: new Date().toISOString(), read: false,
      state: 'waiting', handledVersion: null, releasePageUrl: null, outcome: state === 'ready' ? null : 'MANUAL_INSTALL_FAILED',
      outcomeReason: state === 'ready' ? null : state, outcomeStep: null } })
}
show('ready')
</script>
