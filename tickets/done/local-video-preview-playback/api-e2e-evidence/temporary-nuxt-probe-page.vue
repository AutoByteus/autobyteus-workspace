<template>
  <main id="api-e2e-local-preview">
    <section id="video-subject">
      <VideoPlayer :url="videoUrl" />
    </section>
    <section id="file-subject">
      <FileViewer
        v-if="file"
        :file="file"
        mode="preview"
        :read-only="true"
      />
    </section>
  </main>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import FileViewer from '~/components/fileExplorer/FileViewer.vue';
import VideoPlayer from '~/components/fileExplorer/viewers/VideoPlayer.vue';
import type { FileDataType } from '~/stores/fileExplorerState';

definePageMeta({ layout: false });

const videoUrl = ref<string | null>(null);
const file = ref<{
  path: string;
  type: FileDataType;
  content: string | null;
  url: string | null;
} | null>(null);

onMounted(() => {
  (window as any).__apiE2ELocalPreview = {
    setVideoUrl: (value: string | null) => {
      videoUrl.value = value;
    },
    setFile: (value: typeof file.value) => {
      file.value = value;
    },
  };
});
</script>

<style scoped>
#api-e2e-local-preview {
  width: 900px;
  min-height: 700px;
}
#video-subject,
#file-subject {
  width: 880px;
  height: 320px;
}
</style>
