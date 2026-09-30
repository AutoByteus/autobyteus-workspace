<template>
  <Modal v-if="conflicts.length > 0" data-testid="skill-name-conflict-dialog" style="z-index: 1100" @click="closeOnBackdrop">
    <div class="px-6 pt-5 pb-4">
      <div class="flex items-start gap-3">
        <div class="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-red-100">
          <Icon icon="heroicons:exclamation-triangle" class="h-5 w-5 text-red-600" />
        </div>
        <div class="min-w-0 flex-1">
          <h3 id="modal-headline" class="text-base font-semibold text-gray-900">{{ $t('skills.nameConflict.title') }}</h3>
          <p class="mt-1 text-sm text-gray-600">{{ $t('skills.nameConflict.body') }}</p>
        </div>
      </div>
      <ul class="mt-4 max-h-72 space-y-3 overflow-y-auto" data-testid="skill-name-conflict-rows">
        <li
          v-for="conflict in conflicts"
          :key="`${conflict.name}:${conflict.incomingPath}`"
          class="rounded-md border border-gray-200 bg-gray-50 px-3 py-2"
          :data-testid="`skill-name-conflict-${conflict.name}`"
        >
          <div class="text-sm font-semibold text-gray-900">{{ conflict.name }}</div>
          <div class="mt-1 flex min-w-0 items-baseline gap-2 text-xs text-gray-600">
            <span class="shrink-0">{{ $t('skills.nameConflict.alreadyInstalled') }}</span>
            <span class="truncate font-mono text-gray-800" :title="conflict.existingPath">{{ conflict.existingPath }}</span>
          </div>
          <div class="mt-0.5 flex min-w-0 items-baseline gap-2 text-xs text-gray-600">
            <span class="shrink-0">{{ $t('skills.nameConflict.incoming') }}</span>
            <span class="truncate font-mono text-gray-800" :title="conflict.incomingPath">{{ conflict.incomingPath }}</span>
          </div>
        </li>
      </ul>
    </div>
    <div class="flex justify-end border-t border-gray-100 bg-gray-50 px-6 py-3">
      <button
        ref="okButton"
        type="button"
        class="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
        data-testid="skill-name-conflict-ok"
        @click="skillNames.dismissConflicts()"
      >
        {{ $t('skills.nameConflict.ok') }}
      </button>
    </div>
  </Modal>
</template>

<script setup lang="ts">
import { nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { Icon } from '@iconify/vue'
import Modal from '~/components/common/Modal.vue'
import { useSkillNamesStore } from '~/stores/skillNamesStore'

/**
 * "Duplicate skill names" pop-up (D-19, REQ-023). Opens whenever a skill folder, an agent package
 * import/update/reload or a new skill is rejected with `SKILL_NAME_CONFLICT`. OK, Esc and a
 * backdrop click close it. Its z-index sits above the Skill sources dialog (1000) that can open it.
 */
const skillNames = useSkillNamesStore()
const { conflicts } = storeToRefs(skillNames)
const okButton = ref<HTMLButtonElement | null>(null)

const closeOnBackdrop = (event: MouseEvent): void => {
  if (!(event.target as Element | null)?.closest('[role="dialog"]')) skillNames.dismissConflicts()
}
const closeOnEscape = (event: KeyboardEvent): void => {
  if (event.key === 'Escape' && conflicts.value.length > 0) skillNames.dismissConflicts()
}

watch(() => conflicts.value.length > 0, async (open) => {
  if (open) {
    window.addEventListener('keydown', closeOnEscape)
    await nextTick()
    okButton.value?.focus()
  } else {
    window.removeEventListener('keydown', closeOnEscape)
  }
}, { immediate: true })

onBeforeUnmount(() => window.removeEventListener('keydown', closeOnEscape))
</script>
