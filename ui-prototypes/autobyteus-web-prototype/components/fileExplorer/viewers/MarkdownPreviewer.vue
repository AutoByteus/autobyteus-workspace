<template>
  <div class="h-full overflow-auto bg-white p-4">
    <MarkdownRenderer
      :content="content"
      :image-resource-resolver="imageResourceResolver"
    />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import MarkdownRenderer from '~/components/conversation/segments/renderer/MarkdownRenderer.vue'
import type { FileRelativeResourceContext } from '~/stores/fileExplorerState'
import { useWindowNodeContextStore } from '~/stores/windowNodeContextStore'
import type { MarkdownImageResourceResolver } from '~/utils/markdownImageResource'
import { resolveWorkspaceMarkdownImageResource } from '~/utils/fileExplorer/workspaceResourceUrl'

const props = defineProps<{
  content: string
  path?: string
  relativeResourceContext?: FileRelativeResourceContext | null
}>()

const windowNodeContextStore = useWindowNodeContextStore()

const imageResourceResolver = computed<MarkdownImageResourceResolver | undefined>(() => {
  const context = props.relativeResourceContext
  const documentPath = props.path
  if (!context || !documentPath) {
    return undefined
  }

  const restBaseUrl = windowNodeContextStore.boundEndpoints.rest
  return (source) => resolveWorkspaceMarkdownImageResource({
    source,
    documentPath,
    context,
    restBaseUrl,
  })
})
</script>

<style scoped>
.h-full {
  height: 100%;
}
</style>
