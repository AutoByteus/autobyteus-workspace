// IMP-03 step 2 (autobyteus-24): renders /tmp/icw-self/doc.md (documentText of mobile-code-wrap-cases.mjs) through the real
// useMarkdownSegments; copied temporarily to autobyteus-web/tests/ and run with `pnpm exec vitest run <file> --no-watch`.
// @vitest-environment jsdom
import fs from 'node:fs'
import { it } from 'vitest'
import { useMarkdownSegments } from '~/composables/useMarkdownSegments'
it('dump', () => {
  const src = fs.readFileSync('/tmp/icw-self/doc.md', 'utf8')
  for (const [name, actions] of [['chat', true], ['file', false]] as const) {
    const segs = useMarkdownSegments(src, undefined, { enableEventMonitorFileActions: actions }).parsedSegments.value
    fs.writeFileSync(`/tmp/icw-self/rendered-${name}.html`, segs.map((s) => s.type === 'html' ? `<div class="markdown-body prose dark:prose-invert prose-gray max-w-none">${s.content}</div>` : '<div class="mermaid-segment-container"></div>').join('\n'))
  }
})
