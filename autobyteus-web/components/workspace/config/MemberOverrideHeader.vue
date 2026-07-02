<template>
  <div class="px-3 py-3">
    <div class="flex items-start justify-between gap-3">
      <button
        type="button"
        class="flex min-w-0 flex-1 items-start justify-between gap-3 text-left transition-colors hover:text-slate-900 focus:outline-none"
        :aria-expanded="isExpanded ? 'true' : 'false'"
        data-test="member-override-row"
        @click="$emit('toggle')"
      >
        <span class="min-w-0 flex-1 space-y-2 px-1 py-1.5">
          <span class="flex min-w-0 flex-wrap items-center gap-2">
            <span class="truncate text-sm font-semibold text-slate-800">{{ memberName }}</span>
            <span
              class="rounded-full border px-2 py-0.5 text-[0.625rem] font-semibold uppercase tracking-wide"
              :class="isCoordinator ? 'border-indigo-100 bg-indigo-50 text-indigo-700' : 'border-slate-200 bg-slate-50 text-slate-500'"
            >
              {{ isCoordinator ? $t('workspace.components.workspace.config.MemberOverrideItem.coordinator') : $t('workspace.components.workspace.config.MemberOverrideItem.agent_member') }}
            </span>
            <span
              class="rounded-full border px-2 py-0.5 text-xs font-medium"
              :class="hasOverride ? 'border-amber-100 bg-amber-50 text-amber-700' : 'border-emerald-100 bg-emerald-50 text-emerald-700'"
              data-test="member-override-status"
            >
              {{ hasOverride ? $t('workspace.components.workspace.config.MemberOverrideItem.overridden') : $t('workspace.components.workspace.config.MemberOverrideItem.using_team_defaults') }}
            </span>
          </span>

          <span
            v-if="memberBreadcrumb && memberBreadcrumb !== memberName"
            class="block truncate font-mono text-xs text-gray-500"
            :title="memberRouteKey"
            data-test="member-override-breadcrumb"
          >
            {{ memberBreadcrumb }}
          </span>

          <span v-if="!isExpanded && overrideIndicators.length > 0" class="flex flex-wrap items-center gap-1.5">
            <span
              v-for="indicator in overrideIndicators"
              :key="indicator.key"
              class="rounded-full border border-blue-100 bg-blue-50 px-2 py-0.5 text-[0.625rem] font-semibold text-blue-700"
              data-test="member-override-field-indicator"
            >
              {{ $t(indicator.labelKey) }}
            </span>
          </span>
        </span>

        <span
          class="i-heroicons-chevron-down-20-solid mt-2 h-4 w-4 shrink-0 text-slate-400 transition-transform duration-200"
          :class="isExpanded ? 'rotate-180' : ''"
          aria-hidden="true"
        ></span>
      </button>

      <div
        v-if="hasOverride"
        class="flex shrink-0 flex-wrap items-center justify-end gap-2 pt-1"
        data-test="member-override-reset-controls"
      >
        <template v-if="confirmingReset">
          <button
            type="button"
            class="inline-flex items-center justify-center rounded-md border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs font-semibold text-red-700 shadow-sm transition-colors hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            :disabled="disabled"
            data-test="member-override-reset-confirm"
            @click.stop="$emit('confirm-reset')"
          >
            {{ $t('workspace.components.workspace.config.MemberOverrideItem.confirm_reset_to_default') }}
          </button>
          <button
            type="button"
            class="inline-flex items-center justify-center rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            data-test="member-override-reset-cancel"
            @click.stop="$emit('cancel-reset')"
          >
            {{ $t('workspace.components.workspace.config.MemberOverrideItem.cancel_reset') }}
          </button>
        </template>
        <button
          v-else
          type="button"
          class="inline-flex items-center justify-center rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          :disabled="disabled"
          data-test="member-override-reset"
          @click.stop="$emit('request-reset')"
        >
          {{ $t('workspace.components.workspace.config.MemberOverrideItem.reset_to_default') }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useLocalization } from '~/composables/useLocalization'

defineProps<{
  memberName: string
  memberRouteKey: string
  memberBreadcrumb?: string
  isCoordinator?: boolean
  hasOverride: boolean
  isExpanded: boolean
  overrideIndicators: Array<{ key: string; labelKey: string }>
  disabled: boolean
  confirmingReset: boolean
}>()

defineEmits<{
  (e: 'toggle'): void
  (e: 'request-reset'): void
  (e: 'confirm-reset'): void
  (e: 'cancel-reset'): void
}>()

const { t: $t } = useLocalization()
</script>
