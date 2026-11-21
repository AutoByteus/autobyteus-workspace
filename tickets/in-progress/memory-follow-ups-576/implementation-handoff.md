# Implementation Handoff

Ticket folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/memory-follow-ups-576/tickets/in-progress/memory-follow-ups-576`
Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/memory-follow-ups-576`, branch `codex/memory-follow-ups-576` (base `origin/personal` @ `61fd6f41f7`).

Commits, one per item in the design's order:

| Item | Commit |
| --- | --- |
| FU-009 folder names up to 255 bytes | `72f7ebe040` (and `570aab87d2`, a comment reflow) |
| FU-008 probes | `5999a84ca8` |
| FU-005 personal-settings `afterAll` | `f9a26707eb` |
| FU-006 SM-12 | `4562d8ae5f` |
| FU-003 workspace menus, skill loader | `f31553c9ee` |
| FU-002 relative Markdown links | `8c3810df95` |
| FU-007 DCF-E2E-007 | `8850dc3f99` |

The ticket documents, this handoff and evidence IMP-01…IMP-10 are in `56c61c3ecb`.

## SR-002: FU-008's Bound Revised (IR-002)

After CRR-001 CR-001 (API-REV-001; API-05b) the Solution Designer revised design item 8. The fix is in `3b39828501`; its records and evidence IMP-11 and IMP-12 follow in the next commit.

- **The SR-001 bound was wrong.** It read `child.exitCode`/`signalCode` when its timer ran, and Node sets those only when it processes the exit. After a main-thread block past the bound, the expired timer runs before the poll phase that delivers the exit, so an exited child read as running and was reported as timed out.
- **Now** `probe-time-bound.ts`:
  - learns the exit from the child's `exit` event (a flag; disarm removes the listener);
  - defers the timer's decision with `setImmediate`, which runs after the same loop turn's poll phase;
  - then gives an exited child up to 1 s for its `close`. Only a running child, or a `close` that never comes, times out, with `RUNTIME_PROBE_TIMED_OUT { runtime, command, boundMs }`; for Grok that is the time-out code.
  - The callers (`antigravity-cli-capability.ts`, `grok/grok-build-capability.ts`) are unchanged.
- **Tests:**
  - the real-order case, a real `process.execPath -e ""` that exits while the main thread is blocked (`Atomics.wait`) past a 200 ms bound, returns its real result;
  - the never-exits and late-close cases stay, with a fake `EventEmitter` child.
  - Negative controls: the SR-001 field check and an event-only check without the deferral both fail the real-order case (IMP-11).
- **Two choices within the design** (also in the revision record):
  - The input type is `ProbeChildExit`, the `exit` notification's `once`/`removeListener`. The design names `Pick<ChildProcess, "once">` plus the old fields, but nothing reads the fields any more, and disarm needs `removeListener`.
  - The real-order test blocks 1,500 ms rather than 600 ms, so the child's Node start fits inside the block on this loaded host.
- **AC-007:** decided by DEC-005; nothing changed in that test.

## Upstream Artifact Package

- Upstream review applicability and handoff-rule result: Medium / Low, direct route; no architecture review selected
- Requirements doc: `requirements-doc.md` (SR-001, Approved; FU-004 waits for DEC-004)
- Investigation notes: `investigation-notes.md` (I-1…I-8)
- Solution revision record: `solution-revision-record.md`
- Design spec (required on every route): `design-spec.md` (SR-001, Ready)
- Supplemental task artifacts: `handoff-implementation.md`; the 554 evidence in `tickets/done/semantic-memory-for-every-agent/` (`follow-ups.md`, `evidence/`)
- Design review report: `N/A — not applicable`
- Architecture review revision record: `N/A — not applicable`
- Triggering rework report, revision record, or evidence: N/A (initial)

## Current Implementation Summary

Seven of the eight follow-ups are implemented, each in its existing owner; FU-004 waits for the founder (DEC-004; with the recommended answer (a) there is no code).

- **FU-009:** an agent definition's folder keeps `encodeURIComponent(id)` up to 255 bytes; only longer ids are shortened.
- **FU-008:** the Antigravity and Grok probes no longer report a time-out for a child that has already exited, and Grok reports a real time-out as one.
- **FU-005, FU-006, FU-007:** three E2E tests no longer fail for the wrong reason.
- **FU-003:** the workspace menus offer only places to run, and a skill workspace is always released.
- **FU-002:** a relative link in a workspace file's Markdown preview opens the linked file.

Two causes turned out different from the investigation's (I-5, I-7). Both are host file-event latency, not product defects, and both fixes stay in the tests (§ Reviewed Behavior Implementation Trace).

- Implementation cycle: `Design Impact` (SR-002; after `Initial` IR-001)
- Implementation revision record: `implementation-revision-record.md`
- Current implementation revision ID: `IR-002`
- Related solution revision IDs: `SR-001`, `SR-002`
- Related architecture-review revision IDs: `N/A`
- Related code-review revision IDs: `CRR-001`
- Related API/E2E revision IDs: `API-REV-001`
- Related delivery revision IDs: `N/A`
- Triggering finding IDs: `CR-001`

## Routing Classification (Mandatory)

- Task size (`Small`/`Medium`/`Large`): `Medium`
- Architecture risk (`Low`/`High`): `Low`
- Design classification section / evidence reference: `design-spec.md` § Task Size And Architectural Risk
- Classification confirmed or changed: `Confirmed`
- Evidence and rationale for confirmation or change:
  - Every change is local to its named owner, plus two small owned helpers: `probe-time-bound.ts` and `runnableWorkspaceKind.ts`.
  - No contract, persistence or ownership change. The Grok diagnostic code for a time-out is an existing code (`GROK_MODEL_DISCOVERY_TIMEOUT`), now used where the design asks.
  - The FU-005 and FU-007 causes are test-side, so the escalation trigger ("FU-007 turns out to be a product defect") did not fire.
- Selected route (`Direct API/E2E`/`Code Review`/`Solution Designer`): `Direct API/E2E`
- Lightweight implementation self-review completed for the direct route: `Yes`. I read the whole source diff against the design and the principles. One comment line went past the file's width and was reflowed (`570aab87d2`). The other findings are recorded below as deviations or follow-ups.
- New design impact or escalation trigger: `None`

## Reviewed Behavior Implementation Trace

| Behavior ID | Approved Change / Preserved Outcome | Implemented Production Path / Key Files | Result / Notes |
| --- | --- | --- | --- |
| REQ-001 / AC-001 (FU-009) | Full encoded name up to 255 bytes; longer ids shortened (120 bytes, `#`, 16 hex) | `agent-memory-layout.ts`: `MAX_FULL_DEFINITION_FOLDER_NAME_BYTES = 255`. Docs: `agent_memory.md`, `agent_episodic_catalog.md`. The 554 release note's rare-id bullet is replaced. IC-03's copy of the decision and the probe's long team id (now 274 encoded bytes) follow the new limit | Implemented. Unit: 255 bytes → full name, 256 → shortened; the semantic folder, the episodic folder and the `semantic_ws_` lookup agree. Negative control at 200 fails the new cases (IMP-01). The 554 DEC-016 text stays as archived; this ticket's REQ-001 and DEC-001 correct it to 255 |
| REQ-008 / AC-008 (FU-008; revised in SR-002, see above) | A bound that fires after the child exited waits for its `close` and the real result; a real time-out is a time-out (Grok: not `GROK_CLI_UNSUPPORTED`) and is logged with the command and the bound | `runtime-management/probe-time-bound.ts` (`armProbeTimeBound`: an exited child gets up to 1 s more; otherwise `RUNTIME_PROBE_TIMED_OUT { runtime, command, boundMs }`), used by `antigravity-cli-capability.ts` `runCommand` and `grok/grok-build-capability.ts` `runProbe`. Grok's `timedOut` is now always `GROK_MODEL_DISCOVERY_TIMEOUT` (with the deadline cause when the step's deadline set the bound) | Implemented. Unit with fake timers; per probe, a real CLI that exits at once but holds its stdout open past the bound returns the real result, and a hanging Grok CLI gives the time-out code and the log line. The old probes fail all 4 real-process cases (IMP-02) |
| REQ-005 / AC-005 (FU-005) | `afterAll` finishes within its hook limit | `package-personal-settings.e2e.test.ts`: real timers first (as designed), and the hook limit `IN_PROCESS_SERVER_HOOK_TIMEOUT_MS` from `tests/helpers/os-latency-under-load.ts` | Implemented. **The cause differs from I-5.** Real timers first did not end the time-out. `app.close()` took 11.4 s and 26.1 s with real timers, and a 50 ms interval never ran during it, so the main thread was blocked closing the in-process server's package and skill folder watchers. `fseventsd` was at 160–172% CPU. This is TESTING.md's "File watching on a busy Mac" rule for such a hook (IMP-03). AC-005's three passes are API/E2E's |
| REQ-006 / AC-006 (FU-006) | SM-12's setup binds root too | `agent-semantic-memory.e2e.test.ts` SM-12: a regular file at `folderOf(id)`, checked unchanged and removed in `finally`; the reason matches `EEXIST\|ENOTDIR`; the `chmod` is gone | Implemented; 10/10 with the scripted AGY gate (IMP-04) |
| REQ-003 / AC-003 (FU-003) | The menus offer only `filesystem` and `temp`; a skill workspace registered by the Skills page is always released | `utils/workspace/runnableWorkspaceKind.ts`, used by `runHistoryReadModel.ts` (same result as before: a missing kind is `filesystem`; `isTemp` and the fixed temp id stay temp), `ChatWorkspaceMenu.vue` `userWorkspaces` and `useMobileLaunchWorkspaces.ts` `workspaceItems`. `SkillWorkspaceLoader.vue` has a `disposed` flag: a registration that resolves after unmount is unregistered at once | Implemented. Specs on the real store; the old sources fail the 3 new specs (IMP-05) |
| REQ-002 / AC-002 (FU-002) | A relative link opens the linked file (relative to the document, without its `#fragment`) as a preview tab of the same workspace. Out of the root: nothing. Missing: the viewer's message. External and `#heading` links, and node files, as before | `workspaceResourceUrl.ts` `resolveWorkspaceRelativeReference` (the image resolver's existing rule, now shared). `MarkdownRenderer.vue` emits `relative-link`. `MarkdownPreviewer.vue` `openRelativeLink` → `fileExplorerStore.openFilePreview` for workspace files only; root-absolute links open nothing | Implemented. Spec on the real renderer (IMP-06). Rendered probe in the read-only semantic view inside a shortened (`#`) folder (IMP-07): SMV-103 opens the linked file in a preview tab with no Edit mode; SMV-104 shows a missing file's message; SMV-105 opens nothing for a link out of the folder |
| REQ-007 / AC-007 (FU-007) | Cause recorded; DCF-E2E-007 waits for the write's detection before asserting the lookup | `agent-package-definitions-live-refresh.e2e.test.ts` DCF-E2E-007: `osFileEvents(dir, paths)`, a raw `fs.watch` started before each write, waits until the OS has delivered the written paths (limit `OS_FILE_EVENT_WAIT_MS`; a time-out is labelled `ENVIRONMENT`), for (a) the new agent, (b) the edit and (c) the deletion. The settle-window assertion holds for the lookup that first lists the new agent: nothing was published before it | Implemented. **Cause:** host file-event latency, not the product (IMP-08). Alone on macOS, a raw `fs.watch` saw the write at 6,053 ms and the lookup listed the agent at 6,241 ms. In a test-owned `node:22` Linux container from the worktree (events in 0 ms), the whole file passes 10/10 and the unchanged test passes as well. On macOS the fixed test now ends `ENVIRONMENT` (no OS event in 30 s), as do DCF-E2E-002 and -003 on the same waits |
| REQ-004 / AC-004 (FU-004) | Per DEC-004 | None | Waits for the founder. With the recommended answer (a) there is no code |

- Changes stayed within the requirements doc's Scope Guardrail: `Yes`

## Key Files Or Areas

Server:
- `src/agent-memory/store/agent-memory-layout.ts`
- `src/runtime-management/probe-time-bound.ts` (new), `antigravity-cli-capability.ts`, `grok/grok-build-capability.ts`
- docs `agent_memory.md`, `agent_episodic_catalog.md`
- tests: `definition-folder-names.test.ts`, `probe-time-bound.test.ts` (new), `antigravity-cli-capability.test.ts`, `grok-build-capability.test.ts`, e2e `package-personal-settings`, `agent-semantic-memory` (SM-12), `agent-package-definitions-live-refresh` (DCF-E2E-007), `application-import-codex-launch` (IC-03's copy of the decision)

Web:
- `utils/workspace/runnableWorkspaceKind.ts` (new), `stores/runHistoryReadModel.ts`, `components/chat/ChatWorkspaceMenu.vue`, `composables/mobile/useMobileLaunchWorkspaces.ts`, `components/skills/SkillWorkspaceLoader.vue`
- `utils/fileExplorer/workspaceResourceUrl.ts`, `components/conversation/segments/renderer/MarkdownRenderer.vue`, `components/fileExplorer/viewers/MarkdownPreviewer.vue`
- specs: `runnableWorkspaceKind.spec.ts`, `SkillWorkspaceLoader.spec.ts`, `MarkdownPreviewer.relativeLinks.spec.ts` (new), plus cases in `ChatWorkspaceMenu.spec.ts` and `useMobileLaunchWorkspaces.spec.ts`
- `tests/e2e/semantic-memory-view-probe.mjs` (SMV-100 at 255; SMV-103…105)

Ticket: `tickets/done/semantic-memory-for-every-agent/release-notes.md` (the rare-id bullet).

## Important Assumptions

- AC-008's "time-out message naming the command and bound" is the logged `RUNTIME_PROBE_TIMED_OUT { runtime, command, boundMs }` (REQ-008: "log the command and the bound"). The user-facing diagnostic keeps its fixed text: the diagnostics never carry paths or output.
- A root-absolute link (`/x`) in a workspace file is not relative and opens nothing (REQ-002 names relative links only).
- FU-002 covers every workspace-file Markdown preview, the mobile file viewer included, since it uses the same previewer. Only the desktop Files panel was rendered (IMP-07).

## Known Risks

- **This Mac's file events** were 2–6 s late, and at times no event came in 30 s (`fseventsd` at 137–172% CPU, 23–26 GB resident). On this host DCF-E2E-002, -003 and -007 can end in `ENVIRONMENT`, and AC-007's "passes alone on this host three times" may not be reachable until `fseventsd` is healthy. Restarting it is out of scope (requirements).
- **A missing workspace file** shows the node's raw answer `{"error":"File not found: <absolute path>"}` as the document. That is how every unreadable workspace file shows today: follow-up `FU-001` in this ticket's `follow-ups.md`.
- **Cold Vite cache:** the first probe run on this new worktree failed in the CR-001 step (the page reloaded the Memory address instead of reaching `/chat`); the next run passed 41/41. The 554 delivery saw the same.

## Task Design Health Assessment Implementation Check

- Reviewed change posture: `Bug Fix` + `Cleanup`
- Reviewed root-cause classification: `Local Implementation Defect`
- Reviewed refactor decision: `No Refactor Needed`
- Implementation matched the reviewed assessment: `Yes`
- If challenged, routed as `Design Impact`: `N/A`
- Evidence / notes:
  - The repeated predicate became one helper, as designed.
  - The "timer fired counts as timed out" absence rule became an explicit check of the child's state.
  - The FU-005 and FU-007 causes are test-side (host latency), so no product owner changed.

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None`
- Legacy old-behavior retained in scope: `No`
- Dead code in the touched files and modules removed (Core Principle 7): `Yes`. SM-12's `chmod` setup and the inline workspace-kind predicates are gone. The image resolver's inline path rule now lives in the shared resolver. No unused export is left.
- Dead code found elsewhere, added to `follow-ups.md`: None
- Shared structures remain tight: `Yes`
- Canonical shared design guidance was reapplied during implementation: `Yes`
- Deviations from a design principle decided during implementation:
  - **FU-008, one owner instead of "in both files".** The design places the timer check in each probe. I put the check, the 1 s grace and the log line in `armProbeTimeBound`, used by both. Principle 13: one policy with two callers gets one owner, so the two copies cannot drift. It is not an empty layer: it owns the exited check, the grace and the log.
  - **FU-002 reuses the image resolver's rule.** The design describes the resolution steps; the image resolver already implemented exactly those steps. Principle 11: one derivation, now `resolveWorkspaceRelativeReference`, used by images and links.
- Changed source implementation files stayed within proactive size-pressure guardrails: `Yes`. The largest is `ChatWorkspaceMenu.vue` at 409 effective lines (+3).
- Notes: none

## Persisted Data Transition Check (When Applicable)

- Approved decision: FU-009 `Not Affected`; FU-004 per DEC-004 (a) `Not Affected`
- Design-spec decision reference: `design-spec.md` § Persisted Data / State Transition Decision
- Implementation follows the approved decision without an unapproved migration or version-specific runtime fallback: `Yes`
- Direct-use evidence: the 554 check of the founder's node (554 IMP-22) found no folder name over 200 bytes; 554 is not released
- Deviation from the reviewed transition decision: `None`

## Environment Or Dependency Notes

- macOS (Darwin 25.5), Node v22.23.1, pnpm 10.28.2. The new worktree was set up as TESTING.md says: `pnpm install --frozen-lockfile`, `pnpm -C autobyteus-server-ts prebuild` and `prepare:shared`, `nuxt prepare`, then `pnpm -C autobyteus-server-ts build` for the probe. No dependency or build input changed.
- FU-007's Linux run: a test-owned `node:22-bookworm` container (label `owner=autobyteus-576-test`), with the tracked files of the worktree copied in and installed there. It was removed afterwards. The founder's `autobyteus-server-*` containers were not touched.

## Checks Run

Evidence is in `evidence/`, each file with a header (check, command, commit, environment, date). Every run used `env -i` with test-owned data; e2e runs used a new temp `HOME` where the file needs one.

| Check ID | Command Or Steps | Commit Tested | Environment | Code It Exercises | Behavior / Criteria IDs | Result | Evidence Files | Look For |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| IMP-01 | server unit: agent-memory, episodic catalog, workspaces; negative control with the limit at 200 | `72f7ebe040` | macOS, Node 22 | folder-name rule, catalog, `semantic_ws_` lookup | REQ-001, AC-001 | Pass | `IMP-01-fu009-folder-name-unit.log` | `Test Files  35 passed (35)`; control `Tests  4 failed \| 14 passed (18)` |
| IMP-02 | `probe-time-bound`, Antigravity and Grok capability tests; negative control with the old probes (the SR-001 bound; superseded for the bound by IMP-11) | `5999a84ca8` | macOS, Node 22 | both probes and the shared bound | REQ-008, AC-008 | Pass | `IMP-02-fu008-probe-unit.log` | `Tests  63 passed (63)`; control `Tests  4 failed \| 54 passed (58)` |
| IMP-03 | `package-personal-settings.e2e` alone: before, real timers alone, two diagnostics, the fix; raw `fs.watch` | `f9a26707eb` | macOS, Node 22, `fseventsd` 160–172% | the e2e `afterAll` | REQ-005 | Pass (fix) | `IMP-03-fu005-personal-settings-afterall.log` | before `Hook timed out in 10000ms`; `FU005DIAG app.close 26090 ms; event-loop max gap 0 ms`; fix `Tests  7 passed (7)`, exit 0 |
| IMP-04 | `agent-semantic-memory.e2e` with the scripted AGY gate | `4562d8ae5f` | macOS, Node 22 | SM-12 setup | REQ-006 | Pass | `IMP-04-fu006-sm12.log` | `✓ SM-12`; `Tests  10 passed (10)` |
| IMP-05 | web specs: skills, menu, mobile picker, `utils/workspace`, run history; negative control | `f31553c9ee` | macOS, Node 22 | menus, loader, run-history rule | REQ-003, AC-003 | Pass | `IMP-05-fu003-workspace-menus.log` | `Tests  120 passed (120)`; control `3 failed \| 14 passed (17)` |
| IMP-06 | web specs: `components/fileExplorer/viewers`; negative control | `8c3810df95` | macOS, Node 22 | renderer, previewer, shared resolver | REQ-002, AC-002 | Pass | `IMP-06-fu002-relative-links.log` | `Tests  48 passed (48)`; control fails `opens a relative link…` only |
| IMP-07 | rendered probe after `pnpm -C autobyteus-server-ts build` | `8c3810df95` | macOS, Chromium (Playwright), Nuxt dev | Memory page, semantic folder view, links | REQ-001, REQ-002 (AC-002 UI) | Pass | `IMP-07-rendered-probe.log`, `IMP-07-*.png` | `Pass (41/41 checks)`; SMV-100…105 `true` |
| IMP-08 | DCF-E2E-007: macOS timed diagnostic, fixed file on macOS; fixed file and unchanged test on Linux | `8850dc3f99` | macOS (as above); Linux `node:22-bookworm` | the live-refresh test's waits | REQ-007 | Pass on Linux; `ENVIRONMENT` on macOS | `IMP-08-fu007-live-refresh.log` | `FU007DIAG {"firstListAtMs":374,…"scoutListedAtMs":6241,"rawFsWatchEventMs":6053}`; Linux `Tests  10 passed (10)` |
| IMP-09 | server typecheck; server unit for the touched areas, runtime consumers and architecture | `8850dc3f99` | macOS, Node 22 | all server changes | all | Pass | `IMP-09-server-typecheck-and-unit.log` | `production errors: 0; test-file errors: 1006 in 315 files (baseline 1006 in 315 files)`; `Test Files  122 passed \| 4 skipped (126)` |
| IMP-11 | SR-002: `probe-time-bound`, Antigravity and Grok capability tests; the real-order case against the SR-001 bound and against an event-only bound without the deferral | `3b39828501` | macOS, Node 22 | `probe-time-bound.ts` and both probes | REQ-008, AC-008 (SR-002) | Pass | `IMP-11-sr002-probe-bound-unit.log` | `Tests  64 passed (64)`; both controls `expected "vi.fn()" to not be called at all, but actually been called 1 times` |
| IMP-12 | SR-002: server typecheck; server unit for runtime-management, llm-management, model selection, Antigravity backends, collaborator launch | `3b39828501` | macOS, Node 22 | the probes' consumers | REQ-008 | Pass | `IMP-12-sr002-typecheck-and-runtime-unit.log` | `production errors: 0; test-file errors: 1006 in 315 files (baseline 1006 in 315 files)`; `Test Files  74 passed \| 4 skipped (78)` |
| IMP-10 | web typecheck; web specs for the touched folders | `8850dc3f99` | macOS, Node 22 | all web changes | all | Pass | `IMP-10-web-typecheck-and-specs.log` | `production errors: 0; test-file errors: 86 in 36 files (baseline 86 in 36 files)`; `Test Files  193 passed (193)` |

- Not run, and why:
  - AC-005's and AC-007's three passes on this host: API/E2E's, and AC-007 depends on this host's file events (Known Risks).
  - The full server unit, integration and e2e suites, and the full web suite: left to API/E2E. Only the touched areas ran here.
  - FU-002 on the mobile file viewer and in the Electron app: not rendered here.

## Frontend Rendered-Result Check (When Applicable)

- Affected surfaces / journeys:
  - the Files panel's Markdown preview (workspaces, Skills page, the read-only semantic memory view);
  - the chat / Run Settings workspace menu and the mobile launch picker (now filtered);
  - the Skills page's loader.
- Approved references: REQ-002 and REQ-003, DEC-002 and DEC-003; the semantic memory view's approved UI/UX spec from 554 (unchanged).
- Existing design system and adjacent surfaces reviewed: links open as the tree opens files, into a preview tab of the same panel, so no new UI was added.
- Rendered surface used: `autobyteus-web/tests/e2e/semantic-memory-view-probe.mjs`, the real built server, Nuxt dev and Chromium at 1440×900, as TESTING.md's browser probes describe.
- States inspected:
  - the opened linked file (second tab, preview only, the folder still read-only);
  - a missing file;
  - a link out of the folder (nothing opens).

  All three ran inside a shortened `#` folder. The menus' filtering is covered by specs on the real store, not rendered.
- Visual or interaction issues found: the missing-file message is the node's raw JSON (screenshot `IMP-07-relative-link-missing-file.png`). It is today's message for any unreadable workspace file, recorded as `FU-001` and not changed here.
- Limitations: mobile and Electron not rendered; the probe's first run on a cold Vite cache failed in an unrelated step (Known Risks).

## Downstream Coverage Hints / Suggested Scenarios

- FU-005, AC-005: run `package-personal-settings.e2e.test.ts` alone three times. Note `fseventsd` CPU with each run: the hook now allows 60 s, and the close took 11–26 s here.
- FU-007, AC-007: run the live-refresh file with the AGY gate three times on this host. An `ENVIRONMENT` failure means the OS delivered no event, not a product verdict. The proof run is in a Linux container (IMP-08 shows how).
- FU-008: the 554 Grok replay catalog test (`lists the Grok Build catalog…`) and `own-stream-turns-read-once`'s AGY model discovery under load are the real-world cases the fix targets.
- FU-002 in the Electron app: a skill whose `SKILL.md` links `references/x.md` opens it in a tab. In the semantic view, a link opens nothing editable.
- FU-003: open the Skills page, then the chat workspace menu: no skill entry. Leave the Skills page while a skill loads: no skill entry remains.

## API / E2E / Executable Coverage Investigation And Execution Still Required

- AC-005 and AC-007: three passes alone on this host.
- The full server unit, integration and E2E suites, and the full web suite.
- FU-002 in the Electron app, and on the mobile file viewer if in scope.
- FU-004: nothing, unless DEC-004 is answered (b).
