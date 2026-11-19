// @vitest-environment node
// The phone builds' own checks (autobyteus-279, `scripts/mobile-build-checks.mjs`, run by `build-mobile-web.mjs`): the node's
// `/mobile` build fails on any demo code; the demo build fails on a compiled operation the demo neither answers nor lists
// as unreachable, and on a list entry that is no longer needed.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { DEMO_MARKERS, demoOperationCoverage, findDemoCode, handledOperations } from '../mobile-build-checks.mjs';

const temps: string[] = [];
const temp = (files: Record<string, string>): string => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'autobyteus-279-'));
  temps.push(dir);
  for (const [name, text] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(dir, name)), { recursive: true });
    fs.writeFileSync(path.join(dir, name), text);
  }
  return dir;
};
afterEach(() => { for (const dir of temps.splice(0)) fs.rmSync(dir, { recursive: true, force: true }); });

const webRootWith = (unreachable: Record<string, string>) => temp({
  'demo/graphql/operations.ts': 'export type DemoOperations = {\n  GetRunTree: [A, B];\n  ListWorkspaceRunHistory: [A, B];\n};\n',
  'demo/graphql/unreachable-operations.json': JSON.stringify({ reasons: { desktop: 'desktop only' }, operations: unreachable }),
});

describe('the /mobile build check', () => {
  it('finds each demo marker, with its file', () => {
    const build = temp({ '_nuxt/a.js': `x("${DEMO_MARKERS[1]}")`, '_nuxt/b.js': 'clean()', 'index.html': `<script>${DEMO_MARKERS[2]}</script>` });
    expect(findDemoCode(build)).toEqual([
      { file: '_nuxt/a.js', marker: DEMO_MARKERS[1] },
      { file: 'index.html', marker: DEMO_MARKERS[2] },
    ]);
  });

  it('passes a build with no demo code', () => {
    expect(findDemoCode(temp({ '_nuxt/a.js': 'query GetRunTree($a:String){runTree}' }))).toEqual([]);
  });
});

describe('the demo build check', () => {
  const build = () => temp({ '_nuxt/a.js': 'gql`query GetRunTree($kind: String!) {}`; gql`mutation CreateSkill($input: X) {}`; gql`query ListWorkspaceRunHistory {}`' });

  it('reads the handled operations from the DemoOperations table', () => {
    expect([...handledOperations(webRootWith({}))].sort()).toEqual(['GetRunTree', 'ListWorkspaceRunHistory']);
  });

  it('names a compiled operation the demo neither answers nor lists', () => {
    expect(demoOperationCoverage(build(), webRootWith({})).unanswered).toEqual(['CreateSkill']);
  });

  it('passes when every compiled operation is answered or listed with a defined reason', () => {
    expect(demoOperationCoverage(build(), webRootWith({ CreateSkill: 'desktop' }))).toEqual({ unanswered: [], stale: [], unexplained: [], compiled: 3 });
  });

  it('keeps the list exact: no entry for an answered or vanished operation, none with an undefined reason', () => {
    const coverage = demoOperationCoverage(build(), webRootWith({ CreateSkill: 'nowhere', GetRunTree: 'desktop', Gone: 'desktop' }));
    expect(coverage.stale).toEqual(['GetRunTree', 'Gone']);
    expect(coverage.unexplained).toEqual(['CreateSkill']);
  });
});
