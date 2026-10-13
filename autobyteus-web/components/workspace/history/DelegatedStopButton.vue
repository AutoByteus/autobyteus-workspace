<template>
  <!-- Like a running run's Stop: neutral at rest and red on hover, on a running copy or collaborator row. -->
  <button
    v-if="visible"
    type="button"
    class="inline-flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500/40 disabled:cursor-default disabled:opacity-60"
    :disabled="stopping"
    :title="label"
    :aria-label="label"
    data-test="workspace-delegated-stop"
    @click.stop="stop"
    @keydown.enter.stop
    @keydown.space.stop
  >
    <Icon icon="heroicons:stop-20-solid" class="h-3.5 w-3.5" :class="stopping ? 'animate-pulse motion-reduce:animate-none' : ''" aria-hidden="true" />
  </button>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Icon } from '@iconify/vue'
import { useLocalization } from '~/composables/useLocalization'
import { useDelegatedLaunchDraftStore } from '~/stores/delegatedLaunchDraftStore'
import { isDelegatedCopyLive } from '~/services/runConfigEditing/delegatedCopyLiveness'
import type { DelegatedReference, DelegatedRoot } from '~/services/runConfigEditing/delegatedLaunchSelectionClient'

/** DS-002: stops one delegated copy or collaborator (and the copies it started) of a live run; it stays restorable. */
const props = defineProps<{ root: DelegatedRoot; reference: DelegatedReference; name: string }>()

const { t } = useLocalization()
const store = useDelegatedLaunchDraftStore()
const stopping = computed(() => store.isStopping(props.root, props.reference))
const visible = computed(() => stopping.value || isDelegatedCopyLive(props.root, props.reference))
const STOP_LABEL_KEY = { idle: 'runSettings.delegated.stop', stopping: 'runSettings.delegated.stopping' } as const
const label = computed(() => t(STOP_LABEL_KEY[stopping.value ? 'stopping' : 'idle'], { name: props.name }))
const stop = (): void => { void store.stop(props.root, props.reference) }
</script>
