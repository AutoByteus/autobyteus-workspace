<template>
  <!-- remote-runs-in-tree: marks a run that another node runs, with that node's name. -->
  <span
    class="remote-node-chip inline-flex flex-shrink-0 items-center rounded bg-slate-100 text-slate-600"
    :class="size === 'header' ? 'h-5 max-w-[7rem] gap-1 px-1.5 text-xs' : 'h-4 max-w-[5.5rem] gap-1 px-1 text-[0.625rem]'"
    data-test="remote-node-chip"
    :data-node-name="nodeName"
    :title="label"
    :aria-label="label"
    role="img"
  >
    <Icon icon="heroicons:computer-desktop-20-solid" :class="size === 'header' ? 'h-3.5 w-3.5' : 'h-3.5 w-3.5 flex-shrink-0'" aria-hidden="true" />
    <span class="truncate font-medium leading-none">{{ nodeName }}</span>
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Icon } from '@iconify/vue'
import { useLocalization } from '~/composables/useLocalization'

const props = withDefaults(defineProps<{ nodeName: string; size?: 'row' | 'header' }>(), { size: 'row' })
const { t } = useLocalization()
const label = computed(() => t('remote.chip.label', { node: props.nodeName }))
</script>
