# Implementation Handoff

Ticket: autobyteus-412 `node-update-failure-and-release-order`. Worktree
`/Users/normy/autobyteus_org/autobyteus-worktrees/node-update-failure-and-release-order`, branch
`codex/node-update-failure-and-release-order`, base and target `origin/personal` at `6225a734a3`.

Commits on the branch:

- `90330172be` docs(ticket): the upstream documents (requirements, investigation, solution revision record, design spec, follow-ups, design handoff, design review report, architecture review revision record) and the Solution Designer's `docs/design-cases.md` Case 10 edit, committed as received.
- `df789a89a5` fix(node-update): the implementation (code, tests, workflow, docs). **The commit under review.**
- The commit after it holds this handoff, the revision record and `evidence/` (no code).

## Upstream Artifact Package

- Upstream review applicability and handoff-rule result: architecture review selected and passed (ARCH-REV-002, no open findings). `task_size=Medium`, `architectural_risk=High` → the returned rule routes to `/software_engineering_team/code_reviewer`.
- Requirements doc: `tickets/in-progress/node-update-failure-and-release-order/requirements-doc.md` (Approved, SR-001)
- Investigation notes: `.../investigation-notes.md`
- Solution revision record: `.../solution-revision-record.md` (SR-002 current)
- Design spec (required on every route): `.../design-spec.md` (SR-002, `Ready`)
- Supplemental task artifacts: None
- Design review report: `.../design-review-report.md` (ARCH-REV-002, Pass)
- Architecture review revision record: `.../architecture-review-revision-record.md`
- Triggering rework report, revision record, or evidence: N/A (initial round)

(All paths are under `/Users/normy/autobyteus_org/autobyteus-worktrees/node-update-failure-and-release-order/`.)

## Current Implementation Summary

- Implementation cycle: `Initial`
- Implementation revision record: `.../implementation-revision-record.md`
- Current implementation revision ID: `IR-001`
- Related solution revision IDs: `SR-001` (requirements), `SR-002` (design)
- Related architecture-review revision IDs: `ARCH-REV-002`
- Related code-review revision IDs: `CRR-001` — Pass, no findings (`code-review-report.md`, commit `405c28d45e`; informational, no implementation action)
- Related API/E2E revision IDs: `N/A`
- Related delivery revision IDs: `N/A`
- Triggering finding IDs: `N/A`

FU-003 (stale automatic-update failure):

- `decideNodeAutoUpdate.ts`: new pure rule `isSupersededFailure(entry, status)`: true only for `AUTO_FAILED`, `status.target?.version === entry.version`, `relation` `same`/`older`, `update?.state !== 'running'`. `decideNodeAutoUpdate` and `reconcileNodeAutoUpdate` are unchanged.
- `nodeAutoUpdateRecord.ts`: `remove(entryId): boolean` (atomic save; false when absent).
- `nodeAutoUpdater.ts`: `reconcile` applies the superseded rule first (remove + emit, return). New public `recheckFailure(entryId)` follows the design's steps 1–8: returns when stopped or the ID is in `checking`/`follows`; reads the entry, returns unless `AUTO_FAILED`, notes V; finds the remote node by entry ID (switch not read, packaged flag not read); adds the ID to `checking`; `getStatus(node.baseUrl, V)`; returns when stopped or no status; re-reads the entry and removes it only when it is still the `AUTO_FAILED` entry for V and the rule holds; emits; releases `checking` in `finally`. No `requestUpdate` call.
- IPC `node-auto-update:recheck` (`NODE_AUTO_UPDATE_IPC_RECHECK` in `shared/nodeAutoUpdateTypes.ts`): `registerNodeAutoUpdateIpc` gains a `recheck: (entryId: string) => void` parameter; the handler forwards a string ID and returns nothing. `electronApplication.ts` now creates the updater before registering the IPC and passes `(entryId) => void updater.recheckFailure(entryId)`.
- Preload `recheckNodeAutoUpdate(entryId)`, typed in `electron/types.d.ts` and `types/electron.d.ts` as `Promise<void>`.
- `nodeAutoUpdateStore.recheck(entryId)`: calls the preload only when the entry is `AUTO_FAILED` and the desktop shell is present.
- `NodeServerUpdate.vue`: one watch (`immediate: true`) on `${status?.version}|${status?.update?.state}|${autoEntry?.version}|${autoEntry?.outcome}`; on each change, in the cell part only, it calls `autoUpdates.recheck(entryId)` when a status is present and the entry is `AUTO_FAILED`. A rejected call is logged with `console.warn`, as `NodeAutoUpdate.vue` does for mark-read.

FU-004 (release order), `.github/workflows/release-desktop.yml` `publish-release`:

- The `latest*.yml` lines are removed from both softprops `files` lists; nothing else in those steps changed.
- New step "Wait for the server packages" (after both softprops steps, no `if:`): exits 0 with a `::notice::` when the checked-out ref has no `autobyteus-server-ts/docker/system-level.json`. Otherwise it builds the six names `autobyteus-server-${RELEASE_TAG#v}-linux-{x64,arm64}{.tar.gz,.json,.json.sig}` and polls `gh release view "$RELEASE_TAG" --json assets --jq '.assets[].name'` up to 120 times, `sleep 30` after each incomplete poll (60 minutes). A failed `gh release view` counts as "all missing" and the wait goes on (its stderr stays in the log). On timeout: `::error::The server packages of <tag> did not appear within 60 minutes; missing: <names>. The desktop updater files were not published. Rerun the Server Docker Release's failed jobs, then rerun this job.`, exit 1.
- New step "Publish the desktop updater files" (no `if:`, so a failed wait stops it): `gh release upload "$RELEASE_TAG"` with the four explicit paths and `--clobber`. Both steps have `GH_TOKEN: ${{ github.token }}`, `GH_REPO: ${{ github.repository }}` and `RELEASE_TAG`.
- New step test `scripts/tests/test_desktop_release_server_package_wait.py`: fake `gh` and `sleep` on `PATH`; the expected names come from the starter's own `archiveName`/`descriptionName`. The workflow has no test-only knob.

Docs: `RELEASE.md` (Watching The Rollout: the order and the `createdAt` check; the partial-release sentence; Recovery: "The server packages are missing", including the Android-fails / 30-min / 60-min case; Workflow Reference: "Desktop publish order"), `autobyteus-web/docs/electron_packaging.md` (Automatic Node Updates: the rule and the recheck; Release-Preparation Window: the order), `autobyteus-web/docs/settings.md` (Update automatically: the recheck), and `autobyteus-web/docs/github-actions-tag-build.md` (Publish Behavior and Cross-Workflow Release Timing; see Important Assumptions).

## Routing Classification (Mandatory)

- Task size (`Small`/`Medium`/`Large`): `Medium`
- Architecture risk (`Low`/`High`): `High`
- Design classification section / evidence reference: design-spec.md, "Task Size And Architectural Risk"
- Classification confirmed or changed: `Confirmed`
- Evidence and rationale for confirmation or change: the change stayed inside the two named owners (11 source files in `autobyteus-web`, one workflow job, docs, tests). The risk drivers are all present as designed: the release publish order changes (deployment behavior, RSK-001/002), there is a new window→main IPC command, a new record removal, and a second record writer under the existing per-node guard.
- Selected route (`Direct API/E2E`/`Code Review`/`Solution Designer`): `Code Review`
- Lightweight implementation self-review completed for the direct route: `Not Applicable` (Code Review route)
- New design impact or escalation trigger: `None`. No change to the starter, C1/C2, `decideNodeAutoUpdate`, the one-attempt rule, release creation or the binaries.

## Reviewed Behavior Implementation Trace

| Behavior ID | Approved Change / Preserved Outcome | Implemented Production Path / Key Files | Result / Notes |
| --- | --- | --- | --- |
| BEH-001 | Superseded `AUTO_FAILED` removed at passes/follows and at a recheck; a failure for V stays while the node is older; one attempt per version | DS-001: `NodeAutoUpdater.checkNode` → `getStatus(?target=appVersion)` → `reconcile` → `isSupersededFailure` → `NodeAutoUpdateRecord.remove` → `emitChange`. DS-002: `recheckFailure` (steps 1–8). Files: `decideNodeAutoUpdate.ts`, `nodeAutoUpdateRecord.ts`, `nodeAutoUpdater.ts` | Done. RUN-02 reproduction failed before (IMP-01) and passes after (IMP-02). AC-001/002/004 and AR-002/AR-003 cases in IMP-03 |
| BEH-002 | The card shows no failure for a version the node runs or passed, switch on or off; its own notice then shows as with no outcome | DS-002: `NodeServerUpdate.vue` watch → `nodeAutoUpdateStore.recheck` → preload `recheckNodeAutoUpdate` → IPC `node-auto-update:recheck` → `recheckFailure` → broadcast `node-auto-update:changed` → store → `NodeAutoUpdate.vue` (no line), `NodeServerUpdate.vue` (`autoReported` false → notice) | Done in source and component tests (IMP-05). `NodeAutoUpdate.vue` unchanged, as the design's derived-consumer row says. The packaged window→main path is not exercised here (see Not run) |
| BEH-003 | Binaries → wait for six package files (bounded, skipped for refs without packages) → updater files | DS-003: `release-desktop.yml` `publish-release`: softprops ×2 (no `latest*.yml`) → "Wait for the server packages" → "Publish the desktop updater files" | Done. Step test IMP-07 (AC-005 wait logic, AC-006 timeout, AC-007 skip). Real order: only on the next tag (RSK-002) |
| BEH-004 | Desktops offered V only after the packages | No app change; follows from BEH-003 (electron-updater reads `latest*.yml`) | Preserved `release-preparing` handling untouched |
| BEH-005 | RELEASE.md states the order and the recovery | `RELEASE.md` Watching The Rollout, Recovery, Workflow Reference | Done (AC-008, for review) |

- Changes stayed within the requirements doc's Scope Guardrail: `Yes`

## Key Files Or Areas

Source (`autobyteus-web/`): `electron/nodeAutoUpdate/{decideNodeAutoUpdate,nodeAutoUpdateRecord,nodeAutoUpdater,nodeAutoUpdateIpc}.ts`, `shared/nodeAutoUpdateTypes.ts`, `electron/application/electronApplication.ts` (`startNodeAutoUpdates`), `electron/preload.ts`, `electron/types.d.ts`, `types/electron.d.ts`, `stores/nodeAutoUpdateStore.ts`, `components/settings/nodes/NodeServerUpdate.vue`.

Workflow: `.github/workflows/release-desktop.yml` (job `publish-release`, last three blocks).

Tests:

- `electron/nodeAutoUpdate/__tests__/decideNodeAutoUpdate.spec.ts`: case (a), the rule's examples table, including AR-003.
- `nodeAutoUpdateRecord.spec.ts`: `remove`, and QR-002, a file with the RUN-01 shape read unchanged.
- `nodeAutoUpdater.spec.ts`: the RUN-02 reproduction, AC-004, AR-003 at the updater, and a `recheckFailure` block with (b), (c) and the guard, stop and no-ask cases.
- `nodeAutoUpdateIpc.spec.ts` (new): the handler forwards only a string ID.
- `components/settings/nodes/__tests__/NodeAutoUpdate.spec.ts`: case (d) and AC-003.
- `scripts/tests/test_desktop_release_server_package_wait.py` (new).

Docs: `RELEASE.md`, `autobyteus-web/docs/{electron_packaging,settings,github-actions-tag-build}.md`.

## Important Assumptions

- Test placement: design case (d) names `NodeServerUpdate.spec.ts`. The cases are in `NodeAutoUpdate.spec.ts` instead. That spec mounts the same `NodeServerUpdate` row (cell + notice) and already has the preload mock, registry snapshots and the `node-auto-update:changed` callback that (d) needs; `NodeServerUpdate.spec.ts` has no desktop shell. No `nodeAutoUpdateStore` spec exists ("if present"); `store.recheck` is exercised through these component tests, including its `AUTO_FAILED`-only gate.
- Added beyond the mapping: `nodeAutoUpdateIpc.spec.ts`, a small test of the new handler (string-only, returns nothing, does not touch the record).
- `autobyteus-web/docs/github-actions-tag-build.md` is not in the design's doc list. It describes this exact job's published file list and timing, and would be wrong after the change. Updated in the same commit; the delivery engineer's docs sync can confirm.
- `recheckFailure` looks up the node with `nodeType === 'remote'` ("any remote entry"), consistent with the record holding remote entries only.
- The wait sleeps after every incomplete poll, including the 120th, so the bound is exactly 120 × 30 s = 60 minutes, as the server workflow's own wait does.

## Known Risks

- RSK-001 (intended): a late or failed server package job now also holds back the desktop updater files; RELEASE.md Recovery describes it.
- RSK-002: the real asset order is visible only on the next tag; RELEASE.md gives the `createdAt` check (AC-005) for the delivery engineer.
- The card's address and the entry's `baseUrl` may differ; the main process then cannot reach the node and the failure stays (accepted in the design).
- P-003 (cosmetic): a recheck that arrives while a pass holds `checking` for the node is dropped; the line stays until the card's key changes again. Covered as "a second recheck while the first waits is dropped"; no queueing added, per the design.
- Shell portability of the wait step: it runs on the runner's bash 5; the step test ran it with macOS bash 3.2, so both behave the same for the constructs used.

## Task Design Health Assessment Implementation Check

- Reviewed change posture: `Bug Fix` (two defects)
- Reviewed root-cause classification: `Missing Invariant` (FU-003 record owner; FU-004 release order)
- Reviewed refactor decision (`Refactor Needed Now`/`No Refactor Needed`/`Deferred`): `No Refactor Needed`
- Implementation matched the reviewed assessment (`Yes`/`No`): `Yes`
- If challenged, routed as `Design Impact` (`Yes`/`No`/`N/A`): `N/A`
- Evidence / notes: both fixes landed in the existing owners. `nodeAutoUpdater.ts` grew 154 → 186 non-empty lines; the rule stayed pure; the renderer holds no copy of the rule.

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None`
- Legacy old-behavior retained in scope: `No` (the `latest*.yml` lines moved from softprops to the new step; no dual upload)
- Dead code in the touched files and modules removed (Core Principle 7): `Yes`. The design's `git grep` check stands. My check found nothing newly dead: every new export has a caller (`isSupersededFailure` ← `nodeAutoUpdater`; `remove` ← `nodeAutoUpdater`; `NODE_AUTO_UPDATE_IPC_RECHECK` ← IPC; `recheckFailure` ← wiring; `recheck` ← card).
- Dead code found elsewhere, added to `follow-ups.md`: None
- Shared structures remain tight (no one-for-all base or overlapping parallel shapes introduced): `Yes` (`NodeAutoUpdateEntry` unchanged)
- Canonical shared design guidance was reapplied during implementation, and file-level design weaknesses were routed upstream when needed: `Yes`
- Changed source implementation files stayed within proactive size-pressure guardrails: `Yes`. Largest touched: `electronApplication.ts` 444 → 445 non-empty lines. Largest delta: `nodeAutoUpdater.ts` +32.
- Notes: none.

## Persisted Data Transition Check (When Applicable)

- Approved decision: `Directly Usable — No Migration`
- Design-spec decision reference: design-spec.md, "Persisted Data / State Transition Decision"
- Implementation follows the approved decision without an unapproved migration or version-specific runtime fallback: `Yes`
- Direct-use evidence or discard/rebuild result, when applicable: `nodeAutoUpdateRecord.spec.ts` "412 QR-002": a file with the RUN-01 entries (`docker-8001`, `docker-8003`, `AUTO_FAILED` beta.7) is read unchanged. The superseded rule then clears such entries at the next check (IMP-02/03).
- Migration implementation and focused checks, only when `Migration Required`: N/A
- Deviation from the reviewed transition decision: `None`

## Environment Or Dependency Notes

- Fresh worktree: `pnpm install --frozen-lockfile`, then `nuxt prepare` (`.nuxt/tsconfig.json` is needed by the Electron test transform), then `pnpm -C autobyteus-web prepare:shared-types`. The last one builds `autobyteus-application-sdk-contracts/dist` and `autobyteus-application-backend-sdk/dist`, which `stores/__tests__/applicationHostStore.spec.ts` imports. Both `dist/` folders are generated and untracked; they are left in the worktree and not committed. (A first IMP-06 run failed to load that spec after I had removed them; rebuilt and rerun, recorded in the IMP-06 header.)
- No user node, user desktop or user data was touched. RUN-01/02 data appears only as fixtures.

## Checks Run

Evidence folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/node-update-failure-and-release-order/tickets/in-progress/node-update-failure-and-release-order/evidence/`. Environment for all: macOS 26 arm64, Node v22.23.1, Python 3.9.6, bash 3.2.57.

| Check ID | Command Or Steps | Commit Tested | Environment | Code It Exercises | Behavior / Criteria IDs | Result (`Pass`/`Fail`) | Evidence Files | Look For |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| IMP-01 | `pnpm -C autobyteus-web exec vitest run --config ./electron/vitest.config.ts electron/nodeAutoUpdate/__tests__/nodeAutoUpdater.spec.ts -t RUN-02` | `6225a734a3` + the new test only | as above | `nodeAutoUpdater.reconcile` before the fix | BEH-001, AC-001 (reproduction) | Fail (expected) | `IMP-01-reproduction-run02-before.log` | `"outcome": "AUTO_FAILED"` under `Received`, `Tests  1 failed` |
| IMP-02 | same as IMP-01 | `df789a89a5` | as above | rule + `reconcile` + `remove` | BEH-001, AC-001 | Pass | `IMP-02-reproduction-run02-after.log` | `Tests  1 passed` |
| IMP-03 | `… vitest run --config ./electron/vitest.config.ts electron/nodeAutoUpdate --reporter=verbose` | `df789a89a5` | as above | `electron/nodeAutoUpdate/*` | BEH-001; AC-001, AC-002, AC-004, AC-009; QR-002; design (a)(b)(c) | Pass | `IMP-03-electron-node-auto-update.log` | `Tests  88 passed (88)`; case names `(b) a switch-off node`, `(c) AR-002`, `AR-003` |
| IMP-04 | `… vitest run --config ./electron/vitest.config.ts` (whole Electron suite) | `df789a89a5` | as above | Electron main, preload-adjacent, updater | AC-009 | Pass | `IMP-04-electron-full.log` | `Tests  444 passed \| 1 skipped (445)` |
| IMP-05 | `NUXT_TEST=true pnpm -C autobyteus-web exec vitest run components/settings/nodes --reporter=verbose` | `df789a89a5` | happy-dom | `NodeServerUpdate.vue`, `NodeAutoUpdate.vue`, `nodeAutoUpdateStore` | BEH-002; AC-003; design (d) | Pass | `IMP-05-web-nodes-components.log` | `Tests  67 passed (67)`; `412 (d)` case names |
| IMP-06 | `pnpm -C autobyteus-web prepare:shared-types`; `NUXT_TEST=true pnpm -C autobyteus-web exec vitest run components/settings stores` | `df789a89a5` | happy-dom | settings components and all stores | AC-009 | Pass | `IMP-06-web-settings-stores.log` | `Tests  1544 passed (1544)` |
| IMP-07 | `python3 -m unittest scripts/tests/test_desktop_release_server_package_wait.py -v` | `df789a89a5` | fake `gh`/`sleep` | the two new workflow steps; publish job structure | BEH-003; AC-005 (wait logic), AC-006, AC-007 | Pass | `IMP-07-workflow-step-test.log` | `Ran 11 tests`, `OK` |
| IMP-08 | `python3 -m unittest scripts/tests/test_release_channel_workflow_steps.py scripts/tests/test_desktop_release_beta.py scripts/tests/test_server_package_release.py scripts/tests/test_merge_latest_mac_metadata.py` | `df789a89a5` | as above | the other release workflow steps | AC-009 (release unchanged otherwise) | Pass | `IMP-08-release-workflow-tests.log` | `Ran 43 tests`, `OK` |
| IMP-09 | `pnpm -C autobyteus-web typecheck`; `guard:web-boundary`; `guard:localization-boundary`; `audit:localization-literals` | `df789a89a5` | as above | Nuxt app, Electron main, build scripts, cross-package tests | — | Pass | `IMP-09-typecheck-guards.log` | `production errors: 0; test-file errors: 96 in 41 files (baseline 96 in 41 files)`, `[typecheck] PASS`, `Passed with zero unresolved findings.` |
| IMP-10 | Mutations, each restored: (A) the card watch keyed on the answer alone; (B) the workflow at `6225a734a3` | `df789a89a5` | as above | proves (d) and IMP-07 guard against the old shapes | AR-001; BEH-003 | Pass (the tests fail on the mutants) | `IMP-10-mutation-checks.log` | (A) `Tests  2 failed \| 4 passed`; (B) `FAILED (failures=10)` |

- Not run, and why:
  - An isolated packaged desktop with an isolated Docker node (the design's validation constraint; AC-001/AC-003 end to end, including the packaged preload → IPC → `recheckFailure` wiring and the reordered `startNodeAutoUpdates`). The card reaches a node through its identity probe and C1's `relation` comes from a starter, so it needs a real isolated Docker node; that environment is API/E2E's. Never the user's nodes 8001/8003.
  - TESTING.md Fresh-start build: its path rule matches `.github/workflows/**` and `scripts/**`. The build-only release run skips `publish-release`, so it cannot exercise this change. The design leaves recording this to API/E2E and delivery.
  - The real asset order on a tag (AC-005 on GitHub, RSK-002): delivery, on the next release, on the user's word.
  - The full `test:nuxt` suite beyond `components/settings` and `stores`.

## Frontend Rendered-Result Check (When Applicable)

- Affected surfaces / journeys: Settings → Nodes, a remote node's server cell: the "Automatic update failed" line goes away, and the row notice shows (for example "Updated to `<version>`.").
- Approved UI/UX, interaction, requirement, or design references: REQ-002, AC-003, DEC-004 (no new UI, wording or state).
- Existing design system, shared components, and adjacent product surfaces reviewed: `NodeAutoUpdate.vue`, `NodeServerUpdate.vue` (unchanged markup; only a watch added).
- Testing guideline or development / preview instructions and rendered surface used: component rendering with `@vue/test-utils` (happy-dom), the full two-part row, real Pinia stores, mocked preload API and node fetch.
- States, layouts, viewports, and interactions inspected: first view with the entries arriving after the first answer; the failure shown, then gone after the broadcast; no "Updated automatically" line in its place; the notice hidden while the stale failure stands and "Updated to 1.5.12." after it is dropped; no recheck for `AUTO_UPDATED`/`PENDING`/no entry.
- Visual or interaction issues found and corrected: none. The change removes an existing line and adds no markup.
- Check IDs with the supporting evidence, and remaining unverified states or limitations: IMP-05 and IMP-10(A). Not inspected in a real desktop window (see Not run); it is a DOM-level check, not a visual one.

## Downstream Coverage Hints / Suggested Scenarios

- Isolated packaged desktop + isolated Docker node, record seeded `AUTO_FAILED` for V with the node already on V. Run it switch off and switch on, and check the record file afterwards (AC-001, AC-003).
  - On the first Nodes view the line disappears without a reload.
  - `node-auto-updates.json` loses the entry, and it does not become `AUTO_UPDATED`.
- Same, with the node older than V: the line stays and no `POST` reaches the node (AC-004, the one-attempt rule).
- The card's own "Update to V" on a node with a stale V failure: after success, the failure goes and "Updated to V." shows (AC-003).
- A pass (2 min after start) with the switch on and the node on V clears the entry with no window open (DS-001).
- On the next tag: `gh release view <tag> --json assets --jq '.assets[] | [.createdAt, .name] | @tsv' | sort` shows every `latest*.yml` after all six `autobyteus-server-*` files (AC-005).

## API / E2E / Executable Coverage Investigation And Execution Still Required

Yes. The isolated desktop + isolated Docker node scenarios above. The Fresh-start build decision for the `.github/workflows/**` and `scripts/**` paths. The real-tag order is checked by delivery.
