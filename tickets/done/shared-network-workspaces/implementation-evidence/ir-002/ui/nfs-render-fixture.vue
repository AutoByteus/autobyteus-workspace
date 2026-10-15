<template>
  <main class="h-screen bg-slate-50 p-3 text-slate-900">
    <header class="mb-3 flex flex-wrap gap-3 text-xs">
      <button data-testid="locale-en" @click="setPreference('en')">English</button>
      <button data-testid="locale-zh" @click="setPreference('zh-CN')">简体中文</button>
      <button data-testid="show-fixture" @click="fixture = !fixture">Toggle test-only release fixture (not published)</button>
    </header>
    <div v-if="!fixture" class="h-[calc(100vh-3rem)]"><NodeManager /></div>
    <div v-else class="h-[calc(100vh-3rem)] overflow-auto"><NfsGuideCard :release="release" /></div>
  </main>
</template>
<script setup lang="ts">
import { ref } from 'vue';
import NodeManager from '~/components/settings/NodeManager.vue';
import NfsGuideCard from '~/components/settings/NfsGuideCard.vue';
import { useLocalization } from '~/composables/useLocalization';
import type { NfsPublishedRelease } from '~/utils/nfsLauncherCommands';
definePageMeta({layout:false});
const fixture=ref(false);
const {setPreference}=useLocalization();
const release:NfsPublishedRelease={tag:'render-fixture',installerUrl:'https://release.example.invalid/test-only/install.sh',downloadUrl:'https://release.example.invalid/test-only',qualifiedComputers:['macos','linux']};
</script>
