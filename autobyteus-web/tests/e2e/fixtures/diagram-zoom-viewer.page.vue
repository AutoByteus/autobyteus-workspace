<template>
  <main
    data-test="diagram-zoom-probe"
    class="min-h-[1800px] bg-slate-100 p-4 text-slate-900 dark:bg-slate-950 dark:text-slate-100"
  >
    <header class="mx-auto mb-6 max-w-[900px] rounded-lg bg-white p-4 shadow-sm dark:bg-slate-900">
      <h1 class="text-xl font-semibold">Diagram zoom viewer executable fixture</h1>
      <p data-test="resolved-locale">{{ resolvedLocale }}</p>
      <div class="mt-3 flex flex-wrap gap-2">
        <button data-test="set-locale-en" type="button" @click="setPreference('en')">English</button>
        <button data-test="set-locale-zh" type="button" @click="setPreference('zh-CN')">简体中文</button>
        <button data-test="replace-conversation-source" type="button" @click="replaceConversationSource">Replace source</button>
        <button data-test="background-action" type="button" @click="backgroundActivations += 1">
          Background action {{ backgroundActivations }}
        </button>
      </div>
    </header>

    <div
      data-test="conversation-scroll-owner"
      class="mx-auto mb-8 h-[520px] w-full max-w-[900px] overflow-auto rounded-lg border border-slate-300 bg-slate-200 dark:border-slate-700 dark:bg-slate-800"
    >
      <div class="flex h-[120px] items-end justify-center pb-3 text-sm text-slate-600">Conversation scroll spacer</div>
      <section
        data-test="conversation-surface"
        class="mx-auto w-full max-w-[820px] rounded-lg border border-slate-300 bg-white p-3 dark:border-slate-700 dark:bg-slate-900"
      >
        <h2 class="font-semibold">Conversation TextSegment</h2>
        <TextSegment :content="conversationMarkdown" />
      </section>
      <div class="h-[420px]"></div>
    </div>

    <section
      data-test="file-preview-surface"
      class="mx-auto mb-8 h-[720px] w-full max-w-[820px] overflow-hidden rounded-lg border border-slate-300 dark:border-slate-700"
    >
      <h2 class="bg-white px-4 pt-3 font-semibold dark:bg-slate-900">Non-conversation MarkdownPreviewer</h2>
      <MarkdownPreviewer :content="filePreviewMarkdown" path="docs/diagram-probe.md" />
    </section>

    <section class="mx-auto mb-8 max-w-[820px] rounded-lg bg-white p-4 dark:bg-slate-900">
      <h2 class="font-semibold">Controlled SVG bounds fallbacks</h2>
      <div class="mt-2 flex flex-wrap gap-2">
        <button data-test="open-missing-viewbox" type="button" @click="rawSvgMode = 'missing'">Missing viewBox</button>
        <button data-test="open-malformed-viewbox" type="button" @click="rawSvgMode = 'malformed'">Malformed viewBox</button>
      </div>
    </section>

    <MermaidDiagramViewer
      v-if="rawSvgMode"
      :svg-content="rawSvgMode === 'missing' ? missingViewBoxSvg : malformedViewBoxSvg"
      @close="rawSvgMode = null"
      @external-link="recordFallbackExternalLink"
    />
  </main>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue';
import TextSegment from '~/components/conversation/segments/TextSegment.vue';
import MarkdownPreviewer from '~/components/fileExplorer/viewers/MarkdownPreviewer.vue';
import MermaidDiagramViewer from '~/components/conversation/segments/renderer/MermaidDiagramViewer.vue';
import { useLocalization } from '~/composables/useLocalization';

const { resolvedLocale, setPreference } = useLocalization();
const backgroundActivations = ref(0);
const sourceRevision = ref(1);
const rawSvgMode = ref<'missing' | 'malformed' | null>(null);

const linkedDenseFlowchart = (revision: number) => `
# Conversation revision ${revision}

\`\`\`mermaid
flowchart TB
  ROOT[Revision ${revision} root] --> A[Planning]
  ROOT --> B[Implementation]
  ROOT --> C[Validation]
  A --> A1[Requirements]
  A --> A2[Architecture]
  A1 --> A3[User journey]
  A2 --> A4[Ownership]
  B --> B1[Renderer]
  B --> B2[Viewer]
  B --> B3[Geometry]
  B1 --> B4[Inline preview]
  B2 --> B5[Modal controls]
  B3 --> B6[Scroll plane]
  C --> C1[Unit coverage]
  C --> C2[Browser coverage]
  C --> C3[Electron boundary]
  C2 --> DOCS[HTTP documentation]
  C2 --> LOCAL[Local fragment]
  click DOCS "https://example.com/diagram-docs" "Open HTTP docs"
  click LOCAL "mailto:diagram-probe@example.com" "Open email link"
\`\`\`
`;

const conversationMarkdown = ref(linkedDenseFlowchart(sourceRevision.value));
const filePreviewMarkdown = `
# File preview

A production-shaped wide sequence diagram:

\`\`\`mermaid
sequenceDiagram
  participant Browser as Browser renderer
  participant Markdown as Shared MarkdownRenderer
  participant Mermaid as MermaidDiagram
  participant Viewer as MermaidDiagramViewer
  participant Policy as Existing external-link policy
  Browser->>Markdown: Render Markdown file preview
  Markdown->>Mermaid: Delegate Mermaid fence
  Mermaid->>Viewer: Transfer one current SVG copy
  Viewer->>Viewer: Fit, zoom, pan, reset
  Viewer-->>Mermaid: Return external HTTP link
  Mermaid-->>Markdown: Preserve authority
  Markdown-->>Policy: Browser or Electron dispatch
  Policy-->>Browser: Observable navigation request
\`\`\`

A simple intrinsic-capped diagram:

\`\`\`mermaid
flowchart LR
  SmallA[A] --> SmallB[B]
\`\`\`
`;

const missingViewBoxSvg = `
<svg width="720" height="360" xmlns="http://www.w3.org/2000/svg">
  <rect x="10" y="10" width="700" height="340" rx="16" fill="#dbeafe" stroke="#1d4ed8" />
  <text x="40" y="80" font-size="36">Missing viewBox fixture</text>
  <a href="mailto:fallback-probe@example.com"><text x="40" y="150" font-size="28">Email fixture link</text></a>
</svg>`;

const malformedViewBoxSvg = `
<svg viewBox="invalid view box" width="640" height="320" xmlns="http://www.w3.org/2000/svg">
  <rect x="20" y="20" width="600" height="280" rx="16" fill="#dcfce7" stroke="#15803d" />
  <text x="50" y="90" font-size="34">Malformed viewBox fixture</text>
  <a href="https://example.com/fallback-docs"><text x="50" y="160" font-size="26">HTTP fixture link</text></a>
</svg>`;

const replaceConversationSource = () => {
  sourceRevision.value += 1;
  conversationMarkdown.value = linkedDenseFlowchart(sourceRevision.value);
};

const recordFallbackExternalLink = (url: string) => {
  const globalWindow = window as typeof window & { __diagramProbeExternalLinks?: string[] };
  globalWindow.__diagramProbeExternalLinks ??= [];
  globalWindow.__diagramProbeExternalLinks.push(url);
};

type DiagramProbeControl = {
  replaceConversationSource: () => void;
  setLocale: (locale: 'en' | 'zh-CN') => Promise<void>;
  getSourceRevision: () => number;
};

onMounted(() => {
  const globalWindow = window as typeof window & {
    __diagramProbe?: DiagramProbeControl;
    __diagramProbeExternalLinks?: string[];
  };
  globalWindow.__diagramProbeExternalLinks = [];
  globalWindow.__diagramProbe = {
    replaceConversationSource,
    setLocale: setPreference,
    getSourceRevision: () => sourceRevision.value,
  };
});

onBeforeUnmount(() => {
  const globalWindow = window as typeof window & { __diagramProbe?: DiagramProbeControl };
  delete globalWindow.__diagramProbe;
});
</script>
