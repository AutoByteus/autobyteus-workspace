<template>
  <div class="h-full w-full bg-white relative">
    <div v-if="!iframeSrc" class="flex items-center justify-center h-full text-gray-500">
      Preparing preview...
    </div>
    <iframe
      v-else
      :src="iframeSrc"
      class="absolute inset-0 w-full h-full border-none"
      sandbox="allow-scripts allow-same-origin"
      title="HTML Preview"
    ></iframe>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onBeforeUnmount, nextTick, computed } from 'vue'
import { useWorkspaceStore } from '~/stores/workspace'
import { useWindowNodeContextStore } from '~/stores/windowNodeContextStore'

const props = defineProps<{
  content: string
  path?: string
}>()

const iframeSrc = ref<string | null>(null)

const workspaceStore = useWorkspaceStore()
const windowNodeContextStore = useWindowNodeContextStore()

const encodePath = (path: string) => path.split('/').map(encodeURIComponent).join('/')

const staticUrl = computed(() => {
  const workspaceId = workspaceStore.activeWorkspace?.workspaceId
  if (!workspaceId || !props.path) return null

  const restBase = windowNodeContextStore.getBoundEndpoints().rest.replace(/\/$/, '')
  return `${restBase}/workspaces/${workspaceId}/static/${encodePath(props.path)}`
})

const buildBlobUrl = async () => {
  if (iframeSrc.value?.startsWith('blob:')) {
    URL.revokeObjectURL(iframeSrc.value)
  }
  iframeSrc.value = null

  const baseUrl = window.location.origin
  const htmlWithBase = `<base href="${baseUrl}/" />\n${props.content || ''}`

  await nextTick()
  const blob = new Blob([htmlWithBase], { type: 'text/html' })
  iframeSrc.value = URL.createObjectURL(blob)
}

const updateSrc = async () => {
  if (staticUrl.value) {
    if (iframeSrc.value?.startsWith('blob:')) {
      URL.revokeObjectURL(iframeSrc.value)
    }
    iframeSrc.value = staticUrl.value
  } else {
    await buildBlobUrl()
  }
}

watch(
  () => [props.content, props.path, staticUrl.value],
  () => {
    updateSrc()
  },
  { immediate: true }
)

onBeforeUnmount(() => {
  if (iframeSrc.value?.startsWith('blob:')) {
    URL.revokeObjectURL(iframeSrc.value)
  }
})
</script>

<style scoped>
.border-none {
  border: none;
}
</style>
