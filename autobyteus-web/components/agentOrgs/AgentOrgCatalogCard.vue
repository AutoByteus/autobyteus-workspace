<template>
  <article class="group rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-all duration-200 hover:border-slate-300 hover:shadow-md" :data-test="`org-card-${org.id}`">
    <div class="grid grid-cols-1 gap-4 sm:grid-cols-[4rem_minmax(0,1fr)_auto] sm:items-start">
      <AgentOrgAvatar :name="org.name" :avatar-url="org.avatarUrl" />
      <div class="min-w-0">
        <h3 class="truncate text-xl font-semibold text-slate-900">{{ org.name }}</h3>
        <p class="mt-1 line-clamp-2 text-sm text-slate-600">{{ org.description }}</p>
        <DefinitionCatalogIssueBadge :issues="org.catalogIssues" />
      </div>
      <div class="flex w-full flex-col gap-2 sm:w-auto sm:items-end">
        <button type="button" class="inline-flex min-w-[104px] justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2" @click="$emit('run', org.id)">{{ t('agentOrgs.experience.actions.run') }}</button>
        <button type="button" class="inline-flex items-center text-sm font-medium text-slate-500 transition-colors hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2" @click="$emit('view-details', org.id)">{{ t('agentOrgs.experience.actions.viewDetails') }} <span class="ml-1" aria-hidden="true">→</span></button>
      </div>
    </div>

    <AgentOrgCatalogMemberChips :org="org" />
  </article>
</template>

<script setup lang="ts">
import AgentOrgAvatar from './AgentOrgAvatar.vue'
import AgentOrgCatalogMemberChips from './AgentOrgCatalogMemberChips.vue'
import DefinitionCatalogIssueBadge from '~/components/definitions/DefinitionCatalogIssueBadge.vue'
import { useLocalization } from '~/composables/useLocalization'
import type { AgentOrgDefinition } from '~/stores/agentOrgDefinitionStore'

/** One Org on the Orgs catalog page: identity, catalog issues of the Org and its org-owned definitions, actions and member roles. */
defineProps<{ org: AgentOrgDefinition }>()
defineEmits<{ (event: 'run', id: string): void; (event: 'view-details', id: string): void }>()
const { t } = useLocalization()
</script>
