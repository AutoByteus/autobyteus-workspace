<template>
  <!-- The existing "Update entire skill source?" confirmation (local edits are replaced), shared by the
       skill sources dialog and the Notification Center (DEC-012). -->
  <ConfirmationModal :show="show" :pending="pending" :title="t('skills.sources.updateTitle')"
    :confirm-button-text="t('skills.sources.update')" variant="danger" @confirm="emit('confirm')" @cancel="emit('cancel')">
    <p class="confirm-copy text-sm leading-6 text-slate-600">{{ t('skills.sources.updateWarning') }}</p>
    <div v-if="source" class="confirm-source mt-3 flex items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
      <span class="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-white text-slate-600 ring-1 ring-slate-200" aria-hidden="true">
        <Icon icon="mdi:github" class="h-4 w-4" />
      </span>
      <span class="min-w-0">
        <span class="block truncate text-sm font-medium text-slate-900">{{ source.name }}</span>
        <span class="mt-0.5 block break-all font-mono text-[11.5px] leading-4 text-slate-500">{{ source.repositoryUrl }}</span>
        <span v-if="source.latestRevision" class="version-change mt-1.5 flex flex-wrap items-center gap-x-1.5 text-xs leading-5 text-slate-600">
          <span>{{ source.branch }}</span>
          <span class="font-mono text-[11.5px]" :title="source.installedRevision">{{ source.installedRevision.slice(0, 10) }}</span>
          <Icon icon="heroicons:arrow-right-20-solid" class="h-3.5 w-3.5 text-slate-400" :aria-label="t('skills.sources.latest')" />
          <span class="font-mono text-[11.5px] font-medium text-slate-900" :title="source.latestRevision">{{ source.latestRevision.slice(0, 10) }}</span>
        </span>
      </span>
    </div>
  </ConfirmationModal>
</template>

<script setup lang="ts">
import { Icon } from '@iconify/vue'
import ConfirmationModal from '~/components/common/ConfirmationModal.vue'

/** The GitHub skill source to update: its name, repository, branch and installed → latest revisions. */
export interface SkillSourceUpdateTarget {
  name: string
  repositoryUrl: string
  branch: string | null
  installedRevision: string
  latestRevision: string | null
}

defineProps<{ show: boolean; pending?: boolean; source: SkillSourceUpdateTarget | null }>()
const emit = defineEmits<{ (event: 'confirm'): void; (event: 'cancel'): void }>()
const { t } = useLocalization()
</script>
