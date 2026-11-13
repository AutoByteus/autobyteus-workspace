// IMP-04 step 1 (autobyteus-23): writes the real useMarkdownSegments output for fixture.md to $IMP04_OUT/rendered.html.
// Copied temporarily to autobyteus-web/tests/imp04-dump-html.spec.ts and run with
//   IMP04_DIR=<this folder> pnpm -C autobyteus-web exec vitest run tests/imp04-dump-html.spec.ts --no-watch
// then removed; it is not part of the test suite.
// @vitest-environment jsdom
import fs from 'node:fs'
import path from 'node:path'
import { it } from 'vitest'
import { useMarkdownSegments } from '~/composables/useMarkdownSegments'

it('dumps the rendered segments', () => {
  const dir = process.env.IMP04_DIR as string
  const source = fs.readFileSync(path.join(dir, 'fixture.md'), 'utf8')
  const html = useMarkdownSegments(source).parsedSegments.value
    .filter((segment) => segment.type === 'html')
    .map((segment) => segment.content)
    .join('\n')
  fs.writeFileSync(path.join(dir, 'rendered.html'), html)
  fs.writeFileSync(path.join(dir, 'fence-sources.json'), JSON.stringify(
    [...source.matchAll(/^```([a-z]*)\n([\s\S]*?)\n```$/gm)].map((m) => ({ info: m[1], content: `${m[2]}\n` })),
  ))
})
