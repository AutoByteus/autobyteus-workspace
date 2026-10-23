<template>
  <div class="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-900" role="alert" :data-testid="testId">
    <p class="font-medium"><span aria-hidden="true">✗ </span>{{ t(k('hint.cantReach'), { node, address: hint.firstTried }) }}</p>
    <p class="mt-1 text-red-800">{{ t(k('hint.loopback'), { node }) }}</p>
    <p class="mt-2 flex flex-wrap items-center gap-x-3 gap-y-2">
      <template v-if="hint.suggestion">
        <span class="text-red-900">{{ t(k('hint.try'), { address: hint.suggestion }) }}</span>
        <button
          type="button"
          class="rounded-md border border-red-300 bg-white px-2.5 py-1 text-sm font-medium text-red-800 hover:bg-red-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
          :data-testid="`${testId}-use`"
          @click="emit('use', hint.suggestion)"
        >{{ t(k('hint.use')) }}</button>
      </template>
      <button
        type="button"
        class="text-sm font-medium text-red-800 underline underline-offset-2 hover:text-red-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
        :data-testid="`${testId}-guide`"
        @click="emit('guide')"
      >{{ t(k('hint.guide')) }}</button>
    </p>
  </div>
</template>

<script setup lang="ts">
import { useLocalization } from '~/composables/useLocalization'
import { NODES_PAGE_KEY, type NodeAddressHintModel } from '~/utils/nodeConnectionErrorText'

/** The Docker loopback hint (UIS-006): the node that runs in Docker, what it tried, and the address to use instead. */
defineProps<{ node: string; hint: NodeAddressHintModel; testId: string }>()
const emit = defineEmits<{ use: [address: string]; guide: [] }>()
const { t } = useLocalization()
const k = (key: string): string => `${NODES_PAGE_KEY}${key}`
</script>
