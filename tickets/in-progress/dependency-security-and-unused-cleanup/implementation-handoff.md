# Implementation Handoff — dependency-security-and-unused-cleanup

- Ticket folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/dependency-security-and-unused-cleanup/tickets/in-progress/dependency-security-and-unused-cleanup/`
- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/dependency-security-and-unused-cleanup`, branch `codex/dependency-security-and-unused-cleanup`, base `origin/personal` @ `3b2c86ca9e`
- Implementation commit: `9936445f55` (`fix(deps): apply in-range security updates and remove unused dependencies`); ticket documents and evidence committed after it
- **Status: Blocked by a Design Impact (IMP-DI-001).** Steps 1–6 are done. The `axios` in-range update (1.13 → 1.20.0) breaks the `autobyteus-ts` build with a type error that only a one-line source change fixes. REQ-006 forbids source changes, and no patched axios version below 1.20.0 exists.

## Upstream Artifact Package

- Upstream review applicability and handoff-rule result: architecture review selected and passed (`ARCH-REV-002`). This round routes to the Solution Designer (Design Impact).
- Requirements doc: `requirements-doc.md` (SR-002 basis)
- Investigation notes: `investigation-notes.md`
- Solution revision record: `solution-revision-record.md`
- Design spec: `design-spec.md` (SR-002)
- Supplemental task artifacts: `evidence/SD-00…SD-08`, `probes/`, `follow-ups.md`, `handoff-sr-002.md`
- Design review report: `design-review-report.md`
- Architecture review revision record: `architecture-review-revision-record.md`
- Triggering rework report: N/A

## Current Implementation Summary

- Implementation cycle: `Initial`
- Implementation revision record: `implementation-revision-record.md`
- Current implementation revision ID: `IR-001`
- Related solution revision IDs: SR-002
- Related architecture-review revision IDs: ARCH-REV-002
- Related code-review, API/E2E and delivery revision IDs: N/A
- Triggering finding IDs: N/A (raised: IMP-DI-001)

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
- Selected route: `Solution Designer` (Design Impact)
- Lightweight implementation self-review completed for the direct route: `Not Applicable`
- New design impact or escalation trigger: **IMP-DI-001**, below.

### IMP-DI-001 — the `axios` in-range update needs a source change

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
| BEH-001 | Runtime libraries at patched versions | lockfile and manifests (`9936445f55`) | Prod audit: 0 critical / 13 high, only the explained set (IMP-03). **Blocked:** `autobyteus-ts` does not build with axios 1.20 (IMP-DI-001) |
| BEH-002 | Build and test tooling at patched versions | same | All audit: 6 critical / 46 high, all in the Findings Table (IMP-03). Builds pass except `autobyteus-ts` and the server chain (IMP-06) |
| BEH-003 | Unused packages removed | 6 manifests | All 17 removals absent from the manifests and lockfile importers. `@nuxtjs/apollo` and `monaco-editor` kept. Import providers identical to `SD-07` (IMP-05) |
| BEH-004 | `pnpm dedupe --check` exits 0 | lockfile | Exit 0 (IMP-02) |
| BEH-005 | Electron 42.11.x | `autobyteus-web/package.json` | `process.versions.electron` = `42.11.16`; `test:electron` 215 passed (IMP-06) |

- Changes stayed within the requirements doc's Scope Guardrail: `Yes`. The needed source change was not made; it is routed as IMP-DI-001.

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
- `autobyteus-ts/dist` (untracked) was last built from the reverted diagnostic source. Rebuild before using it.

## Task Design Health Assessment Implementation Check

- Reviewed change posture: Cleanup (security maintenance)
- Reviewed root-cause classification: Legacy Or Compatibility Pressure
- Reviewed refactor decision: no code refactor; removals yes
- Implementation matched the reviewed assessment: `No`. The "no source change" premise does not hold for `axios` 1.20.
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

- Not run, and why: blocked by IMP-DI-001. The remaining step-7 matrix belongs to API/E2E after the decision:
  - server `test:unit` and `test:integration`;
  - `pnpm test:e2e`;
  - web `test:nuxt` and the guards;
  - the applications' typecheck and build;
  - packaged macOS app, packaged Electron harness and isolated instance;
  - Docker image;
  - the gated LM Studio suite.

## Frontend Rendered-Result Check (When Applicable)

`Not Applicable`: no frontend source changed. The web build, `test:electron` and the Electron version ran (IMP-06). Rendered validation of the Electron 42.11 app is part of step 7 (AC-007).

## Downstream Coverage Hints / Suggested Scenarios

- After the decision:
  - rerun IMP-06's failed rows;
  - add a unit assertion that the download tool still picks the extension from `content-type`, for example `image/png; charset=binary` → `.png`.
- The step-7 matrix as designed. The lockfile change touches every package, so everything is marked Rerun (TESTING.md).

## API / E2E / Executable Coverage Investigation And Execution Still Required

All of step 7 (AC-005…AC-008), after IMP-DI-001 is resolved.
