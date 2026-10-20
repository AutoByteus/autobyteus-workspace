# Implementation Handoff — dependency-security-and-unused-cleanup

- Ticket folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/dependency-security-and-unused-cleanup/tickets/in-progress/dependency-security-and-unused-cleanup/`
- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/dependency-security-and-unused-cleanup`, branch `codex/dependency-security-and-unused-cleanup`, base `origin/personal` @ `3b2c86ca9e`
- Implementation commits:
  - `9936445f55`: manifests and lockfile, steps 1–6.
  - `79ece48bf4`: DEC-007, the one source line and its test.
  - `7da874ed2b`: DEC-008, `dompurify` exact 3.4.7, and the in-range `markdown-it` 14.3.3.
  - The ticket documents and evidence are committed after them.
- **Status (IR-003): implementation complete; ready for code review.**
  - IMP-DI-001 is resolved by DEC-007 and IMP-DI-002 by DEC-008.
  - The steps 1–6 results hold on the final tree (IMP-11).
  - The implementation-scoped builds and suites pass. Two intermittent test defects are not caused by this change: FU-008 (server) and FU-010 (web).
  - The step-7 matrix (e2e, packaged app, Docker, LM Studio) is left to API/E2E.
- Earlier rounds: IR-001 was blocked by IMP-DI-001 (`axios` typing); IR-002 by IMP-DI-002 (`dompurify` under happy-dom).

## Upstream Artifact Package

- Upstream review applicability and handoff-rule result: architecture review selected and passed (`ARCH-REV-002`, then `ARCH-REV-004` after SR-003/SR-004). Then `ARCH-REV-005` after SR-005. This round routes to the Code Reviewer.
- Requirements doc: `requirements-doc.md` (SR-005 basis, including REQ-006/DEC-007 and DEC-008)
- Investigation notes: `investigation-notes.md`
- Solution revision record: `solution-revision-record.md`
- Design spec: `design-spec.md` (SR-005)
- Supplemental task artifacts: `evidence/SD-00…SD-08`, `probes/`, `follow-ups.md`, `handoff-sr-002.md`, `handoff-sr-003.md`, `handoff-sr-005.md`
- Design review report: `design-review-report.md`
- Architecture review revision record: `architecture-review-revision-record.md`
- Triggering rework report: N/A

## Current Implementation Summary

- Implementation cycle: `Rework` (after IMP-DI-001)
- Implementation revision record: `implementation-revision-record.md`
- Current implementation revision ID: `IR-003`
- Related solution revision IDs: SR-002, SR-003, SR-004, SR-005
- Related architecture-review revision IDs: ARCH-REV-002, ARCH-REV-004, ARCH-REV-005
- Related code-review, API/E2E and delivery revision IDs: N/A
- Triggering finding IDs: IMP-DI-001 (resolved by DEC-007) and IMP-DI-002 (resolved by DEC-008)

DEC-008 and the `markdown-it` fix (`7da874ed2b`, IMP-11):
- **`dompurify`:** `^3.2.2` → exact `3.4.7` in `autobyteus-web`, as a minimal text edit. After `pnpm install` and `pnpm dedupe`, the lockfile has a single `dompurify` 3.4.7.
- **Which copy `mermaid` resolves:** the snapshot `mermaid@11.17.2` → `dompurify: 3.4.7`, and `node_modules/.pnpm/mermaid@11.17.2/node_modules/dompurify` is 3.4.7. This is the copy the design expected.
- **Why DEC-008 holds for `mermaid` too:** MP-002 in the review. `mermaid` calls only `sanitize` and `addHook`. Every advisory still open at 3.4.7 needs `setConfig`, `IN_PLACE`, `SAFE_FOR_TEMPLATES`, Trusted Types or `CUSTOM_ELEMENT_HANDLING`.
  - Open at 3.4.7: GHSA-cmwh-pvxp-8882 and GHSA-55q2-fjhq-7xh7 (moderate); GHSA-6688-9rhm-gjv2, GHSA-c2j3-45gr-mqc4, GHSA-gvmj-g25r-r7wr and GHSA-vxr8-fq34-vvx9 (low).
  - Our own code calls only `sanitize(html, opts)`. A grep for the other APIs and modes finds nothing (IMP-09).
- **`markdown-it`:** after DEC-008 the audit showed a high outside the explained set: GHSA-r7fv-28h4-cvq7 (`markdown-it` <14.3.2, quadratic smartquotes). It was published 2026-10-20T14:34Z, after the IR-001 audit.
  - Design step 5 fixes a newly published in-range advisory. So I ran one-name `pnpm update -r --depth Infinity markdown-it`: 14.1.1 → 14.3.3, and pnpm raised web's specifier to `^14.3.3`. Then dedupe.
  - The lockfile change is only `markdown-it` and the `@mdit/*` snapshot keys that reference it.
  - The two `markdown-it` moderates are fixed too.
- **The web manifest is rebuilt in base key order.** Diff against `79ece48bf4`: only the `dompurify` and `markdown-it` lines.

DEC-007 (`79ece48bf4`):
- `download-media-tool.ts` L118 now reads `const mimeType = String(contentType).split(';')[0].trim();`. Nothing else in the file changed.
- `download-media-tool.test.ts`: the mock helper accepts a missing content-type, and there are 2 new cases:
  - `image/png; charset=binary` → `.png`;
  - no content-type, with URL `…/photo.jpeg` → `.jpeg`.
- Both new cases also passed before the source line changed, so they pin the runtime behavior the line must keep.
- The lockfile is unchanged since `9936445f55`.

What is committed (`9936445f55`, manifests and lockfile only):
- **Bumps:**
  - `autobyteus-web`: `tar` `^7.5.22`; `electron` `42.11.16`, exact, the newest 42.x on 2026-10-20.
  - `autobyteus-ts`: `undici` `^7.29.1`, which `pnpm update` raised to `^7.30.1`.
- **Removals (DEC-005):**
  - 7 web dependencies and 4 web devDependencies; `@nuxtjs/apollo` and `monaco-editor` are kept;
  - `autobyteus-ts` `dotenv` and `ts-node`;
  - `@types/node` in the frontend SDK and the 3 contract packages.
- **In-range loop and parent pass:** one name per `pnpm update -r --depth Infinity`. Round 1 updated 37 names; round 2 left only `undici` (node-gyp) and changed nothing. The parent pass changed the lockfile through `electron-updater` and `mermaid`; `vue`, `express-rate-limit` and `@mermaid-js/parser` were already current. Then `pnpm dedupe`; `--check` exits 0.
- **Specifier raises made by `pnpm update`, all within their major:**
  - web: `axios` `^1.20.0`, `electron-updater` `^6.8.9`, `mermaid` `^11.17.2`, `nuxt` `^3.21.11`, `postcss` `^8.5.31`, `vitest` `^3.2.7`, `ws` `^8.22.0`;
  - `autobyteus-ts`: `axios` `^1.20.0`, `vitest` `^4.1.12`;
  - server: `vitest` `^4.1.12`, `ws` `^8.22.0`;
  - backend SDK: `vitest` `^4.1.12`.
- **Manifest key order:** `pnpm update` writes the manifests with sorted keys. I rebuilt each one as the base text, plus the edits, plus only the version raises. Its JSON content was asserted equal to pnpm's output, and `pnpm install --frozen-lockfile` passes.

## Routing Classification (Mandatory)

- Task size: `Medium`
- Architecture risk: `High`
- Design classification section / evidence reference: `design-spec.md`, "Task Size And Architectural Risk"
- Classification confirmed or changed: `Confirmed`
- Evidence and rationale: the footprint matches the design. The blocker is a requirement and design decision, not a scope change.
- Selected route: `Code Review` (Medium/High)
- Lightweight implementation self-review completed for the direct route: `Not Applicable`
- New design impact or escalation trigger: `None`. IMP-DI-001 and IMP-DI-002 are resolved and kept below as history.
  - The step-5 `markdown-it` fix is the design's own rule for a newly published in-range advisory. It is not an escalation: no source change, no override, no direct-specifier major.
- Conflict with TESTING.md, recorded as the skill requires: Rule 9 would fix the FU-010 test-timing defect as a baseline commit. This ticket's escalation trigger allows no source change beyond DEC-007, so I left it as a follow-up with its cause.

### IMP-DI-002 (resolved by DEC-008, SR-005) — the in-range `dompurify` 3.4.17 breaks 4 web markdown tests under happy-dom

How each part was established:
- The failure: Reproduced (`test:nuxt`, then the 3 files alone).
- The bisect and the environment split: Reproduced, with a standalone probe using the exact sanitize options.
- The code change: Read (the 3.4.7 → 3.4.8 diff).
- Product unaffected: Reproduced, in real Chromium.
- See `evidence/IMP-09-dompurify-happy-dom-design-impact.txt`.

- **What fails:** `pnpm -C autobyteus-web test:nuxt` → `Tests 4 failed | 4626 passed`. The failing tests:
  - `TextSegment.spec.ts` (2): `Unable to get h1` / `h2`;
  - `ThinkSegment.spec.ts` (1): `Unable to get h2`;
  - `MarkdownRenderer.spec.ts` (1): `# Hello World` renders as plain `Hello World`, with no `<h1>`.
- **Why `dompurify` moved:** the loop never named it. It went from 3.3.1 to 3.4.17 with the `mermaid` parent update, because `mermaid` 11.17.2 declares `^3.3.3` and dedupe shares one copy with web's `^3.2.2`.
- **Cause:**
  - DOMPurify 3.4.8 reads the tag name through the `Node.prototype` `nodeName` getter: `getNodeName(currentNode)`. Before, it used `currentNode.nodeName`.
  - happy-dom's `Node.prototype` `nodeName` getter returns `""` for elements, in 15.11.7 and in 21.0.3 alike. jsdom returns `"H1"`, as the spec requires.
  - Bisect under happy-dom: ≤ 3.4.7 keeps `<h1>`; ≥ 3.4.8 drops it. Under jsdom every version keeps it.
  - Not established: why `<p>`/`<strong>` survive while `<h1>` is dropped.
- **Product unaffected:** DOMPurify 3.4.17 with the same options in real Chromium (Chrome 148 / Electron 42) keeps `<h1>Hello World</h1>`. Only the happy-dom test DOM breaks.
- **What did not work as a local fix:**
  - A per-file `@vitest-environment-options` switch to jsdom: the Nuxt test environment fails to start.
  - A test-setup shim for the `nodeName` getter: 11 failures instead of 4.
  - Both were temporary and are reverted.
- **Decision needed.** Every option goes beyond DEC-007 or holds a package back.
  - (a) Hold `dompurify` at 3.4.7. That means an exact pin `"dompurify": "3.4.7"` in `autobyteus-web` (within major), then redo steps 3–6.
    - It leaves 2 moderate and 4 low advisories that 3.4.8–3.4.17 fix: GHSA-cmwh-pvxp-8882, GHSA-55q2-fjhq-7xh7, GHSA-vxr8-fq34-vvx9, GHSA-gvmj-g25r-r7wr, GHSA-c2j3-45gr-mqc4, GHSA-6688-9rhm-gjv2. None is high or critical.
    - Our own call uses none of the affected features.
    - Base was 3.3.1, so 3.4.7 still fixes more than base.
    - This is the smallest change. It fits the design's hold-back rule if "patched" means the ticket's high/critical scope.
    - `mermaid`'s internal DOMPurify use was not analysed.
  - (b) Keep 3.4.17 and fix the web test DOM: a spec-correct `nodeName` in happy-dom, or jsdom for these specs through the Nuxt test config. This is test-harness work beyond DEC-007, and the size is unknown.
  - (c) (a) now, with a follow-up for (b) and an upstream report to happy-dom (or DOMPurify) so the pin can be lifted. **Recommended.**

### IMP-DI-001 (resolved by DEC-007, SR-004) — the `axios` in-range update needs a source change

How each part was established: build failure Reproduced; typing cause Read (both `index.d.ts`); fix Reproduced (diagnostic build); hold-back option Measured (audit data).

- **What fails:** `pnpm -C autobyteus-ts build`.
  - `src/tools/multimedia/download-media-tool.ts(118,38): error TS2339: Property 'split' does not exist on type 'string | number | true | string[] | AxiosHeaders'.`
  - The server's `prebuild`, `build` and `typecheck` fail on the same error, because `prepare:shared` builds `autobyteus-ts` first.
  - The vitest suites still pass, because vitest does not type-check.
- **Cause:** axios 1.20.0 types the lower-case common response keys, `'content-type'` among them, as `AxiosHeaderValue` (`AxiosHeaders | string | string[] | number | boolean | null`). In 1.13.x only the capitalised keys were typed, so `'content-type'` used the untyped index signature. The code at L115-118 reads `response.headers?.['content-type']` and calls `.split(';')`.
- **Why the design's hold-back rule does not apply:** high advisories GHSA-3pq3-5fj3-cg6v and GHSA-542g-h47m-68v8 cover axios `>=1.13.0 <1.20.0`, and 1.20.0 is the newest 1.x. Every version that builds unchanged is still vulnerable.
- **Smallest fix found:**
  - Change: `const mimeType = String(contentType).split(';')[0].trim();`, or narrow it with a `typeof contentType === 'string'` check.
  - Diagnostic result: with that temporary change, the `autobyteus-ts` build, server prebuild, server build and server typecheck all pass. No other source change is needed, as far as the builds and typecheck show.
  - The change is reverted and not committed.
  - Owner: `autobyteus-ts` multimedia download tool. Existing tests: `autobyteus-ts/tests/unit/tools/multimedia/download-media-tool.test.ts` and `tests/integration/tools/multimedia/download-media-tool.test.ts`.
- **Decision needed (requirements and design):** REQ-006 says "no source change", and the escalation trigger fired. Options:
  - (a) Allow this one-line, type-only source change in `autobyteus-ts`; recommended. Runtime behavior is the same, since a real `content-type` header is a string. It keeps the axios fix: 34 advisories in the base audit (12 high, 21 moderate, 1 low), affecting `autobyteus-ts` provider and download calls.
  - (b) Keep `axios` at 1.13.x and record its 34 advisories (12 high) as an explained remainder. Not recommended, because these are runtime fixes in the core LLM and transport library.
- **Effect on the work done:** option (a) changes only source, so steps 1–6 and their evidence stay valid. Option (b) changes the resolution, so steps 3–6 must be redone.

## Reviewed Behavior Implementation Trace

| Behavior ID | Approved Change / Preserved Outcome | Implemented Production Path / Key Files | Result / Notes |
| --- | --- | --- | --- |
| BEH-001 | Runtime libraries at patched versions | lockfile and manifests (`9936445f55`); DEC-007 (`79ece48bf4`) | Prod audit: 0 critical / 13 high, only the explained set (IMP-03). Builds, server typecheck, `test:unit` and `test:integration` pass (IMP-08). DEC-008: `dompurify` 3.4.7, the same copy for `mermaid`; `markdown-it` 14.3.3 (IMP-11). The final audit is the same high/critical set (IMP-11). Markdown specs pass again (IMP-12) |
| BEH-002 | Build and test tooling at patched versions | same | All audit: 6 critical / 46 high, all in the Findings Table (IMP-03). All builds pass after DEC-007 (IMP-08) |
| BEH-003 | Unused packages removed | 6 manifests | All 17 removals absent from the manifests and lockfile importers. `@nuxtjs/apollo` and `monaco-editor` kept. Import providers identical to `SD-07` (IMP-05) |
| BEH-004 | `pnpm dedupe --check` exits 0 | lockfile | Exit 0 (IMP-02, and again on `7da874ed2b`, IMP-11) |
| BEH-005 | Electron 42.11.x | `autobyteus-web/package.json` | `process.versions.electron` = `42.11.16`; `test:electron` 215 passed (IMP-06) |

- Changes stayed within the requirements doc's Scope Guardrail: `Yes`. The only source change is DEC-007. The IMP-DI-002 fix is not made; it is routed.

## Key Files Or Areas

- Manifests:
  - `autobyteus-web/package.json`
  - `autobyteus-ts/package.json`
  - `autobyteus-server-ts/package.json`
  - `autobyteus-application-backend-sdk/package.json`
  - `autobyteus-application-frontend-sdk/package.json`
  - `autobyteus-team-stream-contracts/package.json`
  - `autobyteus-agent-presentation-contracts/package.json`
  - `autobyteus-collaboration-stream-contracts/package.json`
- Lockfile: `pnpm-lock.yaml`
- Blocked source file, not changed: `autobyteus-ts/src/tools/multimedia/download-media-tool.ts` L115-118

## Important Assumptions

- **Lockfile review: new majors deep in the dependency tree (finding; IMP-04).** The design's step 4 expects no major-version change of any package. The lockfile has 131 nodes at a major (or 0.x minor) the package did not have before. Examples: `oxc-*` 0.112 → 0.143, `unimport` 5 → 6, `esbuild` 0.28 alongside 0.27, `diff` 9, `open` 11, `serialize-javascript` 7.
  - 130 of them hang under a parent that was itself updated within its own range, mostly `nuxt` 3.21.1 → 3.21.11 and its toolchain.
  - The other one is `@hono/node-server` 2.1.5 under the unchanged `@modelcontextprotocol/sdk` 1.32.1, whose range is `"^1.19.9 || ^2.0.5"`.
  - So every version is chosen by a declared range, and none of our direct specifiers crosses a major. This is inherent to the in-range method, and the trial would have had the same; it wasn't recorded there.
  - I didn't escalate it separately because no escalation trigger fired. The Solution Designer may want to restate the step-4 rule as "no direct-specifier major" in the same revision.
- **Peers:** the only notice left is the expected `@nuxt/cli` 3.37.0 → `@nuxt/schema@^4.4.6` (optional). The base's `citty` notice is gone (IMP-05).
- **RR-003 is not counted:** `generated/graphql.ts` still imports `@vue/composition-api`, as on base.
- **A first run of steps 2–3 was disturbed.** Another agent ran `git checkout -- .` in this worktree during the loop. I discarded that run completely, reset to base and redid both steps. The evidence shows only the clean run.

## Known Risks

- R-001…R-004 remain for validation: semver slips, Electron 42.4 → 42.11, new advisories, and hidden removal paths. Nothing beyond the builds below has run on the new versions yet.
- `autobyteus-ts/dist` (untracked) was rebuilt from `79ece48bf4` in IMP-08.
- IMP-06's build failures are resolved by DEC-007 (IMP-08).
- FU-008: `package-auto-refresh` failed once in 10 runs. It is not caused by this change, and its root cause is not established. API/E2E may see it in the integration suite.
- FU-010: the `NotificationCenter.spec.ts` order assertion depends on a millisecond tick. It is not caused by this change; the cause is proven and reproduced (IMP-12). API/E2E may see it in `test:nuxt`.
- FU-009: `dompurify` stays held at 3.4.7 until the happy-dom issue is solved.

## Task Design Health Assessment Implementation Check

- Reviewed change posture: Cleanup (security maintenance)
- Reviewed root-cause classification: Legacy Or Compatibility Pressure
- Reviewed refactor decision: no code refactor; removals yes
- Implementation matched the reviewed assessment: `Yes`, as revised by SR-003…SR-005. The original "no source change" premise did not hold for `axios` 1.20 (DEC-007), nor did the plain in-range rule for `dompurify` (DEC-008).
- If challenged, routed as `Design Impact`: `Yes` (IMP-DI-001)
- Evidence / notes: IMP-06, IMP-07

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None` (no overrides, no `--latest`, no `audit --fix`)
- Legacy old-behavior retained in scope: `No`
- Dead code in the touched files and modules removed (Core Principle 7): `Yes` (the DEC-005 removals)
- Dead code found elsewhere, added to `follow-ups.md`: None new
- Shared structures remain tight: `Yes` (N/A)
- Canonical shared design guidance was reapplied during implementation, and file-level design weaknesses were routed upstream when needed: `Yes`
- Changed source implementation files stayed within proactive size-pressure guardrails: `Yes` (no source changed)
- Notes: none

## Persisted Data Transition Check (When Applicable)

- Approved decision: `Not Affected`
- Implementation follows the approved decision: `Yes`
- Deviation: `None`

## Environment Or Dependency Notes

- pnpm 10.28.2, Node 24.
- `pnpm install --resolution-only` is used to show peer issues. On base it rewrote the lockfile with an `eventsource-parser` dedupe, so I restored the base lockfile. On the final tree it changes nothing.
- The Prisma client needs `prebuild` in a fresh worktree.

## Checks Run

Evidence is in the ticket's `evidence/` folder. Full logs are in `/tmp/dep229/` and are not committed.

| Check ID | Command Or Steps | Commit Tested | Environment | Code It Exercises | Behavior / Criteria IDs | Result (`Pass`/`Fail`) | Evidence Files | Look For |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| IMP-01 | Base: `pnpm audit --json`, `--prod --json`; `import-provider-check.mjs` (8 packages); peer issues | `3b2c86ca9e` | macOS, pnpm 10.28.2 | base tree | step 1 | Pass | `IMP-01-baseline.txt` | `ALL {… 'high': 217, 'critical': 18}`; `PROD {… 'high': 91, 'critical': 3}`; `identical to SD-07` |
| IMP-02 | Step 2 edits + install; `probes/update-inrange-loop.sh`; parent pass; `pnpm dedupe`; `pnpm dedupe --check`; manifest diff | `9936445f55` | same | manifests, lockfile | AC-003, REQ-001/002/004 | Pass | `IMP-02-manifests-loop-dedupe.txt` | `round 2: lockfile unchanged, stopping`; `dedupe --check exit=0`; diff shows only the removals and same-major raises |
| IMP-03 | `pnpm audit --json` / `--prod --json`; `fixability.mjs` IN-RANGE rows | `9936445f55` | same | resolved tree | AC-001, AC-002 | Pass | `IMP-03-audit-after.txt` | `AFTER PROD {… 'high': 13, 'critical': 0}`; `AFTER ALL {… 'high': 46, 'critical': 6}`; the only IN-RANGE row is `undici@6.27.0 <- node-gyp` |
| IMP-04 | Lockfile review: packages removed/added, version changes, new majors and their parents | `9936445f55` | same | lockfile | step 4 | Pass (with a finding) | `IMP-04-lockfile-review.txt` | `# NEW-MAJOR count: 130`; parents all `[parent updated]` except `@hono/node-server@2.1.5 <- @modelcontextprotocol/sdk@1.32.1` (range `^1.19.9 \|\| ^2.0.5`) |
| IMP-05 | Peer issues (`--resolution-only`) vs base; `import-provider-check.mjs` vs `SD-07`; removal greps in manifests and lockfile importers | `9936445f55` | same | manifests, lockfile, `node_modules` | AC-004 | Pass | `IMP-05-peers-providers-removals.txt` | `identical to SD-07 (136 lines; …)`; 17 × `manifest=absent lock-importer=absent`; peer `@nuxt/schema@^4.4.6` only |
| IMP-06 | Builds and tests of the 6 contract/SDK packages; `autobyteus-ts` build and test; server prebuild/build/typecheck; web `nuxt build`, voice-input `tar` test, `test:electron`, Electron version | `9936445f55` | macOS | the packages above | AC-005 (part), AC-006 (part), AC-007 (version) | **Fail** (`autobyteus-ts` build and server chain); rest Pass | `IMP-06-builds-and-focused-tests.txt` | `build-ts exit=2`; `error TS2339: Property 'split' does not exist on type 'string \| number \| true \| string[] \| AxiosHeaders'`; `test-ts … 2368 passed`; `web-test-electron … 215 passed \| 1 skipped`; `web-voice-input … 2 passed`; `42.11.16` |
| IMP-07 | Cause analysis (axios `index.d.ts` 1.20.0 vs 1.13.6); hold-back check against the advisories; temporary diagnostic build with `String(contentType)` (reverted) | `9936445f55` + reverted diagnostic | macOS | `download-media-tool.ts`, axios typings | IMP-DI-001 | Pass (diagnosis) | `IMP-07-axios-typing-design-impact.txt` | `GHSA-3pq3-5fj3-cg6v >=1.13.0 <1.20.0 -> patched >=1.20.0`; diagnostic `build-ts exit=0`, `server-typecheck exit=0` |
| IMP-08 | After DEC-007: frozen install; `dedupe --check`; `autobyteus-ts` build and test; server prebuild/build/typecheck/`test:unit`/`test:integration:prepare`/`test:integration` (plus one full rerun); web `test:nuxt --run`; DEC-007 test file alone | `79ece48bf4` | macOS, clean env for `autobyteus-ts` | `autobyteus-ts`, server, web units | REQ-007, AC-005, AC-006 (part), DEC-007 | Pass, except web `test:nuxt` (IMP-DI-002) and 1 intermittent in the first integration run (FU-008) | `IMP-08-after-dec007-suites.txt` | `[verify:runtime-deps] OK`; `test-ts … Tests 2370 passed`; `server-unit … Tests 6310 passed`; integration rerun `Tests 421 passed`; `web-test-nuxt … Tests 4 failed \| 4626 passed`; download tool `Tests 4 passed (4)` |
| IMP-09 | DOMPurify bisect under happy-dom vs jsdom with the exact sanitize options; 3.4.7 → 3.4.8 diff; happy-dom `nodeName` getter probe (15.11.7 and 21.0.3); real-Chromium probe page; tried a per-file jsdom switch and a setup shim (both reverted) | `79ece48bf4` + reverted diagnostics | macOS, happy-dom 15.11.7, jsdom 25.0.1, Chromium 148 | `useMarkdownSegments.ts` sanitize path, `dompurify` | IMP-DI-002 | Pass (diagnosis) | `IMP-09-dompurify-happy-dom-design-impact.txt`, `IMP-09-chromium-probe.html`, `IMP-09-nodename-probe.cjs.txt` | `3.4.8 happy-dom profile+ADD_TAGS : "Hello World\n<p>…`; `3.4.7 happy-dom … "<h1>Hello World</h1>…`; `happy-dom H1 … Node.prototype nodeName getter= ""`; Chromium `"result":"<h1>Hello World</h1>…` |
| IMP-10 | `package-auto-refresh.integration.test.ts`: 5 runs alone, 3 alone under full CPU load, 1 full-suite rerun; watcher package versions base vs now | `79ece48bf4` | macOS | agent package folder watcher | FU-008 | Not caused by this change (root cause not established) | `IMP-10-auto-refresh-intermittent.txt` | `Condition not met within 5000 ms; last value: ["agent:Planner","agent:Scout"]` once; 9 × `Tests 14 passed (14)`; chokidar/readdirp lists identical |

| IMP-11 | DEC-008 edit + `pnpm install`/`dedupe`/`--check`; audit → new `markdown-it` high → one-name in-range update + dedupe; manifest order restored + frozen install; steps 4–6 rechecked: providers, peers, audit, in-range rows, lockfile review | `7da874ed2b` | macOS, pnpm 10.28.2 | manifests, lockfile | DEC-008, AC-001…AC-004, REQ-005 | Pass | `IMP-11-dec008-markdown-it-steps4-6.txt` | `mermaid@11.17.2 -> dompurify: 3.4.7`; `identical to SD-07`; `same high/critical set: True` (ALL and PROD); `# vs IR-001 … dompurify: 3.4.17 -> 3.4.7`, `markdown-it: 14.1.1 -> 14.3.3`; only IN-RANGE row `undici@6.27.0 <- node-gyp` |
| IMP-12 | Web: the 3 markdown specs; `test:nuxt --run`; `pnpm build`; `test:electron --run`; NotificationCenter spec 6× alone + temporary 5 ms diagnostic (reverted) | `7da874ed2b` | macOS, happy-dom 15.11.7 | web units, build | IMP-DI-002 closure, AC-005/AC-006 (web) | Pass, except 1 `test:nuxt` failure from a test timing defect (FU-010) | `IMP-12-web-after-dec008.txt` | `web-3-specs: Test Files 3 passed (3); Tests 24 passed (24)`; `web-test-nuxt … Tests 1 failed \| 4629 passed`; `web-test-electron … Tests 215 passed`; diag `Received: "2 updates available: 1 skill update, 1 agent package update"` |

- Still valid from IMP-08 (`79ece48bf4`): `autobyteus-ts` build and test, server build, typecheck, `test:unit` and `test:integration`. `7da874ed2b` moved only `dompurify` and `markdown-it`, which load only in `autobyteus-web`; neither is in the `autobyteus-ts` or server manifests.
- Not run, and why: the step-7 matrix belongs to API/E2E (design Change Sequence step 7):
  - `pnpm test:e2e`;
  - web guards;
  - the applications' typecheck and build;
  - packaged macOS app, packaged Electron harness and isolated instance;
  - Docker image;
  - the gated LM Studio suite.

## Frontend Rendered-Result Check (When Applicable)

`Not Applicable`: no frontend source changed. The web build, `test:electron` and the Electron version ran (IMP-06). Rendered validation of the Electron 42.11 app is part of step 7 (AC-007).

## Downstream Coverage Hints / Suggested Scenarios

- The step-7 matrix as designed. The lockfile change touches every package, so everything is marked Rerun (TESTING.md).
- Markdown rendering with `dompurify` 3.4.7 and `markdown-it` 14.3.3 in the packaged app: headings, code blocks, KaTeX math and a mermaid diagram in a conversation.
- `xlsx` and the Fastify chain remain in the explained set (FU-001, FU-002).

## API / E2E / Executable Coverage Investigation And Execution Still Required

All of step 7 (AC-005…AC-008).
