# API/E2E Execution Coverage Report

## Round

- Coverage investigation: `tickets/in-progress/agent-avatars-669/api-e2e-coverage-investigation.md`
- API/E2E revision record and current revision ID: `tickets/in-progress/agent-avatars-669/api-e2e-revision-record.md`, `API-REV-001`
- Test progress log: `tickets/in-progress/agent-avatars-669/api-e2e-test-progress.md`
- Round and trigger: round 1; IR-001 (code `950061c296`), code review CRR-001 Pass (`f1d6c89356`).
- Prior round reviewed: none.
- Deviations from the plan:
  - The new GitHub e2e spec passed alone (API-004, first run), then failed in the whole suite. The cause was F-1, not
    the load. AV-02 now pins the replacement's time, so the failure is deterministic.
  - D-003 failed once in my harness (a glyph the probe does not draw) and passed after the fix (API-012).
- Evidence folder: `tickets/in-progress/agent-avatars-669/evidence/api-e2e/`

## Routing Classification

- Task size: `Large`
- Architectural risk: `High`
- Input route: `Reviewed`
- Failure route: `Code Review` (failure-origin review of F-1)
- Proportional test-code review decision: `Required` (with the failure-origin review: one new server e2e spec, four new
  probe cases, one new phone-probe module)

## Tested Builds And Environments

| Env ID | Commit Tested | Platform / OS | Runtime, Browser, Or App Build | Other Settings |
| --- | --- | --- | --- | --- |
| ENV-1 | `f1d6c89356` (code `950061c296`) | macOS arm64, Node 22 | worktree server unit, web, server e2e suites | `env -i PATH HOME=<fresh> TMPDIR`; the server e2e with the system TMPDIR |
| ENV-2 | same, plus my test edits | macOS arm64, headless Chrome | `definition-avatars-probe.mjs`: the worktree's built node on a temp data root and HOME, scripted AGY CLI, `nuxt dev`, the phone bundle at `/mobile` (phone host `192.168.77.69` mapped to 127.0.0.1) | desktop 1440×900, phone 390×844 |
| ENV-3 | same | macOS arm64 | the installed app `electron-dist/mac-arm64/AutoByteus.app` (built 16:08 from this worktree, after the last product-code commit), an isolated instance on a copy of the probe's data root | `file://` window, 1440×900 |
| ENV-4 | same | macOS arm64, headless Chrome | `mobile-shell-probe.mjs --cases=MSP-121`: probe nodes alpha and beta (paired peers), the phone bundle, `nuxt dev` | phone 390×844, desktop 1440×900 |

## Cases

| Case ID | Criteria | Surface | Command Or Steps | Env | Result | Evidence Files | Look For | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| API-001 | AC-002, AC-005, AC-006 | server unit suite | `pnpm -C autobyteus-server-ts test:unit` | ENV-1 | Pass | `API-001-003-suites/server-unit-summary.txt` | `1117 passed`, `9308 passed` | includes `definition-avatars.test.ts` (9: a peer 403, no credential 401), `definition-avatar-file.test.ts` (16), `definition-avatar-address.test.ts` (18) |
| API-002 | AC-003, AC-006 | web suite | `pnpm -C autobyteus-web test:nuxt` | ENV-1 | Pass (2 base failures) | `API-001-003-suites/web-suite-failures.txt` | `819 passed`, `6399 passed`; `"unanswered": ["SetUsageLimitSwitchEnabled"]`; `NodeRow.vue … text-[11px] @ line 39` | both on the base, files unchanged here: FU-001 (new) and autobyteus-541 FU-001 |
| API-003 | AC-001, AC-006 | server e2e suite | `pnpm test:e2e` (root) | ENV-1 | Fail (F-1); other failures environment | `API-001-003-suites/server-e2e-failures.txt` | `124 passed`, `563 passed`; AV-02 `expected '/rest/definition-avatars/agent/writer…' not to be …`; 3 × `Brief Studio importable package missing`; terminal expected `/tmp/api669/…`, got `/private/tmp/api669/…` | |
| API-003b | — | the 4 environment failures | `pnpm -C autobyteus-server-ts test:integration:prepare`; the 4 files with HOME `/private/tmp/…` | ENV-1 | Pass | `API-001-003-suites/server-e2e-env-rerun.txt` | `4 passed (4)`, `16 passed` | my environment, not the branch |
| API-004 | AC-001, AC-002, AC-003 (GitHub) | GraphQL and `/rest/definition-avatars` through the real GitHub import and update (fake GitHub) | new `tests/e2e/agent-definitions/definition-avatars-github.e2e.test.ts` (AV-01, AV-02) | ENV-1 | **Fail** (AV-02: F-1); AV-01 Pass | `API-004-github-e2e/av-github-pinned-red.txt`, `F-1-stale-version.md` | AV-01: PNG, WebP and JPEG addresses `?v=<12 hex>`, exact bytes and types, no file → null. AV-02: user picture wins across the update; after reset `new bytes give a new version: expected … not to be …`. The rest of AV-02 passed in the first run (natural timing) and under the diagnosis: removed team picture → null and old address 404; 2 MiB PNG and text `avatar.jpg` ignored with one line each | see Failure F-1 |
| API-005 | AC-001, AC-002 | local and Git-clone-shaped packages | probe A-001 | ENV-2 | Pass | `API-005-014-probe/definition-avatars-probe.json` | 6 definitions (4 agents incl. team-local `lead` and the clone's `reviewer`, team, org): address, 200, `image/png`, exact bytes; `broken` loads, no picture, one log line | |
| API-006 | AC-001 | replaced picture, local | probe A-002 | ENV-2 | Pass | same | agent `?v=6f0596b0176f` → `?v=11d8d7e4c988` through the watcher; team `c5ffc4f8172a` → `d62c83fc0017` through `reloadAgentPackage` | an in-place write has a new ms mtime, so F-1 does not show here |
| API-007 | AC-003 | GraphQL input rule | probe A-003 | ENV-2 | Pass | same | upload → `avatarUrl` = `userAvatarUrl`, `AVATAR` personal; the package address saved → cleared, nothing personal; `null` → cleared | |
| API-008 | AC-004, AC-005 (copies), AC-006 | desktop `nuxt dev` 1440×900 | probe D-001 | ENV-2 | Pass | `desktop-1440x900-*.png` | catalogs, team detail, Workspaces tree, conversation, Runs view, editor; `"copies": {"count": 20, "distinctSources": [one crew address]}`; slot sizes 64, 36, 32, 20, 16 px; broken and Daily Assistant initials | screenshots reviewed |
| API-009 | AC-004, AC-005 | phone 390×844 | probe P-001 | ENV-2 | Pass | `phone-390x844-run-list.png`, JSON | 25 rows all pictured, 20 copies; `distinctObjectUrls: 3`; one fetch per address (hub 1, writer 1, crew 1); `"authorization": "Bearer <phone credential>"`, no key in any address | browser errors: 7 × `/favicon.ico` 401 (known, recorded by every phone probe) |
| API-010 | AC-004 | installed `file://` window | probe E-001 | ENV-3 | Pass | `installed-1440x900-*.png` | 26 pictures, every source `http://127.0.0.1:<port>/rest/definition-avatars/…`, none `file:///rest/…` | |
| API-011 | AC-003, AC-006, CRR-001 C-2 | desktop agent editor | new probe D-002 | ENV-2 | Pass | `desktop-1440x900-agent-editor-after-remove.png`, JSON | upload + save → `userAvatarUrl` `/rest/files/…` shown; reopen: no caption, Remove 1; description-only save → `userAvatarUrl` unchanged; Remove + save → `null`, package address shown; refill: package picture, caption 1, Remove 0 | C-2: a form saving other fields keeps the user's picture |
| API-012 | AC-003, AC-006, CRR-001 C-2 | desktop team editor (Crew) | new probe D-003 | ENV-2 | Pass | `desktop-1440x900-team-editor-after-remove.png`, JSON; round 1 failure `D-003-r1-harness-glyph.png` | before: the package picture captioned, no Remove; then as API-011 | round 1 failed in my harness (`syntheticPng('T')`: no glyph) |
| API-013 | CRR-001 C-3 (held) | phone: a failed picture fetch | new probe P-002: the first fetch of the hub's picture aborted | ENV-2 | Pass (measured) | `phone-390x844-c3-after-failure.png`, JSON | `afterFailure` fallback; `after15s` fallback, `recoveredWithoutReload: false`; `afterReload` picture, drawn | as CRR-001 holds: the failure is remembered for the session, and the fallback is correct |
| API-014 | CRR-001 C-3 (held) | phone: a failed first read of the agents' pictures | new probe P-003: the first `GetAgentDefinitionAvatars` aborted | ENV-2 | Pass (measured) | `phone-390x844-c3-definitions-read-failed.png`, JSON | `afterFailure` fallback (team pictures still shown); `after15s` fallback; a definition change → picture (`recoveredByChange: true`, 3 reads after); reload → picture | recovers at the next definition change or a reload |
| API-015 | AC-004 (peer), REQ-004, DEC-006 | phone run list and desktop Runs view | new `mobile-definition-avatar-cases.mjs` MSP-121 (`mobile-shell-probe.mjs --cases=MSP-121`) | ENV-4 | Pass | `API-015-peer-row/msp121-cases.json`, `MSP-121-phone-peer-row-fallback.png`, `MSP-121-desktop-peer-row-fallback.png` | alpha's same-ID `publisher` has `?v=9d37f1c22167` (picked up by the watcher); the PTM's peer row `…/peer_agent:publisher_…`: phone `state fallback`, `src null`; desktop (matched by run id) `fallback`, initials `P`, chip `beta-node` | `unknownBrowserErrors: 0`, cleanup clean |
| API-016 | AC-005 (peer 403) | route | `definition-avatars.test.ts` "refuses a peer node's credential (403) and a request without one (401)" in API-001 | ENV-1 | Pass | `API-001-003-suites/server-unit-summary.txt` | `✓ … definition-avatars.test.ts (9 tests)` | the probe process sends the owner credential on every loopback request, so the stack cannot send a peer's |
| API-017 | AC-007 | docs | read `autobyteus-server-ts/docs/modules/agent_packages.md` "Package Pictures", `agent_definition.md` "Avatar", `autobyteus-web/docs/agent_management.md` "Avatars" | — | Pass | (this row) | the four names, 1 MiB, signature, one candidate, `DEFINITION_AVATAR_IGNORED`, the route and its access; `avatarUrl` / `userAvatarUrl` and the input rule; the order and the fallback | |
| API-018 | — | server typecheck | `pnpm -C autobyteus-server-ts typecheck` | ENV-1 | Pass | (this row) | `production errors: 0; test-file errors: 972 in 299 files (baseline 972 in 299 files)` | the new spec adds none |

## Acceptance-Criteria Proof

| Acceptance-Criteria ID | Critical | Proven By | Result | Notes |
| --- | --- | --- | --- | --- |
| AC-001 | Yes | API-004, API-005, API-006 | **Not proven (F-1)** | import works from GitHub, local and Git-clone-shaped packages, for agent, team and org. Replacing a picture and updating fails when the replacement has the same size and the same whole-second time: the version stays and clients keep the old picture |
| AC-002 | Yes | API-001, API-004, API-005 | Proven | end to end: 2 MiB PNG, text named `avatar.png` and `avatar.jpg`, one log line each, the definition loads, fallback. A text named `avatar.webp` and two candidates: the reader's unit spec |
| AC-003 | Yes | API-004 (AV-02 up to the address check), API-007, API-011, API-012 | Proven | upload, reset, remove; no package file → fallback |
| AC-004 | Yes | API-008, API-009, API-010, API-015 | Proven | desktop, installed window, phone; 20 copies, one picture; a peer row falls back |
| AC-005 | Yes | API-009, API-016 | Proven | header, not address; 20 rows one fetch; peer 403 |
| AC-006 | Yes | API-001, API-002, API-011, API-012 | Proven | the setting and its reset; saving other fields keeps the user's picture (C-2) |
| AC-007 | No | API-017 | Proven | |

## Failure F-1

- **What:** a package update that replaces `avatar.*` with a file of the same size and the same modification time keeps
  the old address version. The route then answers the old ETag (`"<size>-<mtime>"`) with the new bytes, so a client
  revalidating the picture it holds gets 304. The phone's object-URL cache is keyed by address. The old picture stays
  until the file changes again or the node restarts.
- **Where:** `readDefinitionAvatar` in `autobyteus-server-ts/src/agent-package-definitions/domain/definition-avatar-file.ts`.
  Its hash cache is reused while `size` and `mtimeMs` are unchanged (design N-3). Tar keeps times in whole seconds, and
  the update extracts a new file (a new inode) with the archive's time.
- **Reproduction:** AV-02, `pnpm -C autobyteus-server-ts exec vitest run tests/e2e/agent-definitions/definition-avatars-github.e2e.test.ts`.
  It is red 3 of 3 with the time pinned, and 1 of 3 with natural timing.
- **Diagnosis (not committed):** with `ino` and `ctimeMs` in the cache check, AV-02 passes (2 of 2).
- **How likely for real:** it needs the same size and the same second. That happens with an archive tool that fixes
  entry times, with two revisions archived within one second, or with a time-keeping copy. A GitHub tarball carries its
  commit's time, so separate commits normally differ. Rare, but silent.
- **The change signal is the design's:** design S-1 N-3: "the hash is reused while the file's size and mtime are unchanged (a per-path cache)". The unit spec
  `definition-avatar-file.test.ts` "does not read an unchanged picture again … (N-3)" pins it: other bytes of the same
  size, written with the same whole-second time, keep the old hash. A fix that also compares `ino` and `ctimeMs` (or
  reads the bytes when the time is whole seconds) changes that spec and N-3's wording.
- **Preliminary classification:** `Design Impact` (N-3's change signal against AC-001), with a small local fix in view.
  The code reviewer's failure-origin review decides whether it goes back as a local fix with an N-3 note, or to the
  Solution Designer.

## Test-Code Changes For Review

| File | Change |
| --- | --- |
| `autobyteus-server-ts/tests/e2e/agent-definitions/definition-avatars-github.e2e.test.ts` | new: AV-01, AV-02 (fake GitHub, two revisions; PNG, WebP, JPEG; the user's picture across an update, reset, a removed and two invalid pictures; F-1's pinned time) |
| `autobyteus-web/tests/e2e/definition-avatars-probe.mjs` | D-002 (agent editor), D-003 (team editor), P-002 (failed picture fetch), P-003 (failed first read); header lines |
| `autobyteus-web/tests/e2e/mobile-definition-avatar-cases.mjs` | new: MSP-121 (a peer row's fallback, phone and desktop) |
| `autobyteus-web/tests/e2e/mobile-shell-probe.mjs` | imports and runs the module after 541's cases; header line |

## Confidence

- Result: **Fail** (F-1). Confidence in this result: **93%**.
- F-1 is deterministic with the time pinned, and the route's 304 shows the user-visible effect.
- Every other criterion is proven on real surfaces: desktop, the installed window, the phone, and a real peer pair.
- What lowers confidence:
  - the effect in a real browser after a same-second update was inferred from the route's headers, not rendered;
  - C-3's behaviour is measured, not judged: CRR-001 holds it as by design.
