<template>
  <div class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
    <div class="flex flex-wrap items-center gap-2">
      <h3 class="text-base font-semibold text-slate-900">{{ title }}</h3>
      <span class="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
        {{ artifactTypeLabel }}
      </span>
    </div>

    <p v-if="summary" class="mt-2 text-sm text-slate-600">{{ summary }}</p>

    <div class="mt-4">
      <template v-if="resolvedUrl && isEmbeddableUrl">
        <iframe
          :src="resolvedUrl"
          class="min-h-[24rem] w-full rounded-lg border border-slate-200"
          title="Artifact preview"
        />
      </template>

      <template v-else-if="resolvedUrl && isImageUrl">
        <img :src="resolvedUrl" :alt="title" class="max-h-[28rem] rounded-lg border border-slate-200 object-contain" />
      </template>

      <template v-else>
        <div class="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">
          <p class="font-medium text-slate-900">Artifact reference</p>
          <pre class="mt-2 whitespace-pre-wrap break-all text-xs text-slate-700">{{ referenceSummary }}</pre>
          <a
            v-if="resolvedUrl"
            :href="resolvedUrl"
            target="_blank"
            rel="noreferrer"
            class="mt-3 inline-flex text-sm font-medium text-blue-700 hover:text-blue-800"
          >
            Open artifact
          </a>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useWindowNodeContextStore } from '~/stores/windowNodeContextStore'
import type {
  ApplicationArtifactRef,
  ApplicationMemberArtifactProjection,
} from '~/types/application/ApplicationSession'
import { resolveApplicationAssetUrl } from '~/utils/application/applicationAssetUrl'

const props = defineProps<{
  artifact: ApplicationMemberArtifactProjection
}>()

const windowNodeContextStore = useWindowNodeContextStore()

const title = computed(() => props.artifact.title.trim() || 'Untitled artifact')
const summary = computed(() => props.artifact.summary?.trim() || '')
const artifactTypeLabel = computed(() => props.artifact.artifactType || 'artifact')

const resolveArtifactUrl = (artifactRef: ApplicationArtifactRef): string | null => {
  if (artifactRef.kind === 'URL') {
    return artifactRef.url
  }

  if (artifactRef.kind === 'BUNDLE_ASSET') {
    try {
      return resolveApplicationAssetUrl(
        artifactRef.assetPath,
        windowNodeContextStore.getBoundEndpoints().rest,
      )
    } catch {
      return null
    }
  }

  return null
}

const resolvedUrl = computed(() => resolveArtifactUrl(props.artifact.artifactRef))
const isImageUrl = computed(() => /\.(png|jpe?g|gif|webp|svg)$/i.test(resolvedUrl.value || ''))
const isEmbeddableUrl = computed(() => /\.(html?|pdf)$/i.test(resolvedUrl.value || ''))

const referenceSummary = computed(() => {
  const artifactRef = props.artifact.artifactRef
  if (artifactRef.kind === 'WORKSPACE_FILE') {
    return JSON.stringify({
      kind: artifactRef.kind,
      workspaceId: artifactRef.workspaceId ?? null,
      path: artifactRef.path,
    }, null, 2)
  }

  if (artifactRef.kind === 'INLINE_JSON') {
    return JSON.stringify({
      kind: artifactRef.kind,
      mimeType: artifactRef.mimeType,
      value: artifactRef.value,
    }, null, 2)
  }

  return JSON.stringify(artifactRef, null, 2)
})
</script>
