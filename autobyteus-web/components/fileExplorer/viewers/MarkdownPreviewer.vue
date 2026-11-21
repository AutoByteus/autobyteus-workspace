<template>
  <div class="h-full overflow-auto bg-white p-4">
    <MarkdownRenderer
      :content="content"
      :image-resource-resolver="imageResourceResolver"
      @relative-link="openRelativeLink"
    />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import MarkdownRenderer from '~/components/conversation/segments/renderer/MarkdownRenderer.vue'
import type { FileRelativeResourceContext } from '~/stores/fileExplorerState'
import { useWindowNodeContextStore } from '~/stores/windowNodeContextStore'
import { useFileExplorerStore } from '~/stores/fileExplorer'
import type { MarkdownImageResourceResolver } from '~/utils/markdownImageResource'
import { resolveWorkspaceMarkdownImageResource, resolveWorkspaceRelativeReference } from '~/utils/fileExplorer/workspaceResourceUrl'

const props = defineProps<{
  content: string
  path?: string
  relativeResourceContext?: FileRelativeResourceContext | null
}>()

const windowNodeContextStore = useWindowNodeContextStore()
const fileExplorerStore = useFileExplorerStore()

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

/**
 * A relative link in a workspace file opens the file it names, relative to this document, as a preview tab of the same
 * workspace (autobyteus-576 FU-002, DEC-002); a read-only workspace stays read-only. A link that leaves the workspace
 * root, a root-absolute one, and any link in a preview that is not a workspace file (a node file) open nothing. A missing
 * file shows the viewer's message in its tab.
 */
const openRelativeLink = (href: string) => {
  const context = props.relativeResourceContext
  const documentPath = props.path
  if (context?.kind !== 'workspace' || !documentPath || href.startsWith('/')) return
  const reference = resolveWorkspaceRelativeReference(href, documentPath)
  if (reference.kind !== 'resolved') return
  void fileExplorerStore.openFilePreview(reference.workspaceRelativePath, context.workspaceId)
}
</script>

<style scoped>
.h-full {
  height: 100%;
}
</style>
