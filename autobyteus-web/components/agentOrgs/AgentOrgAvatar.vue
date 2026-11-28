<template>
  <!-- An Org's avatar on its pages: its picture (the user's, else the package's), else its initials (autobyteus-669 W-1). -->
  <DefinitionAvatar
    class="h-16 w-16 flex-none rounded-xl bg-slate-100 text-2xl font-semibold tracking-wide text-slate-700"
    kind="org"
    :name="name"
    :avatar-url="avatarUrl"
    :alt="name"
  >
    <template #fallback><span>{{ initials }}</span></template>
  </DefinitionAvatar>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import DefinitionAvatar from '~/components/common/DefinitionAvatar.vue'
const props = defineProps<{ name: string; avatarUrl?: string | null }>()
const initials = computed(() => props.name.trim().split(/\s+/).slice(0, 2).map(part => part[0]?.toUpperCase() || '').join('') || 'AO')
</script>
