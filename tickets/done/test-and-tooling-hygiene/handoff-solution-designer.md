# Handoff — Solution Designer → Implementation Engineer (autobyteus-253, test-and-tooling-hygiene)

- Result classification: `Architecture Design Complete` (direct route: `task_size=Medium`, `architectural_risk=Low`; no independent architecture review selected by the rules)
- Package identifier: `test-and-tooling-hygiene`; Project Task `autobyteus-253` (name this key in every report)
- Current SR entry: `SR-001`
- Requested by: `/project_task_manager` (run id `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`); it expects the final report to come back through the Solution Designer
- Approval state: requirements `Approved` by the Solution Designer within the Task's direction, user informed in the conversation (2026-10-24); no `Needs user` decision; design `Ready`
- Worktree / branch: `/Users/normy/autobyteus_org/autobyteus-worktrees/test-and-tooling-hygiene` / `codex/test-and-tooling-hygiene`
- Base: `origin/personal` @ `8b34e8ae108a281b0c93c679c60883df28a30773` (2026-10-24); finalization target `origin/personal` through `finalize/test-and-tooling-hygiene` merged `--no-ff` (RELEASE.md). No release is asked for.
- Ticket folder (absolute): `/Users/normy/autobyteus_org/autobyteus-worktrees/test-and-tooling-hygiene/tickets/in-progress/test-and-tooling-hygiene/` — these documents are untracked in the worktree; commit them with your first commit (stage paths explicitly, never `git add -A`).
- Dependencies are installed and `nuxt prepare` is done in this worktree; run `pnpm -C autobyteus-server-ts prebuild` / `test:integration:prepare` as TESTING.md says. No temporary diagnostics remain in the tree.

## Original request (summary)

Task `autobyteus-253`, "Test and tooling hygiene found by autobyteus-229, 191 and 209" (apply TESTING.md Rule 9: find the cause, do not just rerun), plus comments from 278, 280, 282, 210 and 259, plus the Project Task Manager's message: fix each item or show it is not a defect, with the reason; prove the result from a **clean clone of `personal` (not a worktree)**; no release; ask the user only for a decision that really needs him. FU-011 of 229 is `autobyteus-220`: do not duplicate.

## What to build (see `design-spec.md`, Target Subsystem / Folder / File Mapping, for every file)

| Work item | Requirement / AC | Cause found (investigation notes) | Fix |
| --- | --- | --- | --- |
| W-01 architecture guard (280 FU-001) | REQ-001 / AC-001 | OBS-T1: `3e3a7b08cc` added a default-port `getInstance()` caller | Add the file to the exact list with the reason (DEC-001) |
| W-02 watcher (229 FU-008, 209 FU-003) | REQ-002, REQ-003 / AC-002…AC-004 | OBS-W1…W6: the OS drops events right after arming and while chokidar adds a watch for a new folder | Product: `sink.reconcilePackageFolder` + watcher catch-up (300 ms debounce after `ready` and after `addDir`/`unlinkDir`) + quiet reconcile set in the reloader; tests: remove the fixed sleeps; unit tests; 40-run loops under load |
| W-03 double schema build (209 FU-004) | REQ-004 / AC-005 | OBS-G1 | `type-graphql` → `2.0.0-rc.4` (range `^2.0.0-rc.4`), new unit case, remove the memoizing mock. No pin needed (answer for the Task) |
| W-04 NotificationCenter (229 FU-010) | REQ-005 / AC-006 | OBS-T2 | Fixed distinct `foundAt` |
| W-05 LM Studio (229 FU-012) | REQ-006 / AC-007 | OBS-T3: `reinitialize()` does not discover local models; `reloadModels(LMSTUDIO)` does | Preflight + `ctx.skip(reason)`, `reloadModels`, no silent `return` |
| W-06 harness build (229 FU-013) | REQ-007 / AC-008 | OBS-T4 | `hostElectronBuildScript(platform)` + node test |
| W-07 doc (229 FU-014) | REQ-008 / AC-009 | OBS-T4 | Real commands in `electron_packaging.md` |
| W-08 Grok probe (280 FU-003) | REQ-009 / AC-010 | OBS-T5 | `timeoutMs` option, tests pass 30 s, one case proves the bound |
| W-09 extension spec (210 FU-002) | REQ-010 / AC-011 | OBS-T6 | `vi.setConfig({ testTimeout: 30_000 })` |
| W-10 dead tests (282 FU-001) | REQ-011 / AC-012 | OBS-T7 | Delete 36 files, 3 exclusions, stale doc lines |
| W-11 vue-tsc (278 FU-003) | REQ-012 / AC-013 | OBS-T8 | Type-only fixes in the five named files; assertions unchanged |
| W-12 file explorer socket (259 FU-004) | REQ-013 / AC-014 | OBS-T9 | Detach handlers before `close`; unit cases |
| W-13 drain test (259 FU-005) | REQ-014 / AC-015 | OBS-T10 | Wait for the `failed` event |
| W-14 | REQ-015 | — | Nothing: FU-011 is `autobyteus-220` |

## Reproductions to start from

- Watcher: `evidence/probes/SD-watcher-probe.test.ts` (copy to `autobyteus-server-ts/tests/tmp-probe/`, command in the design spec's Guidance for Implementation; never commit it). Strong red: remove `sleep(300)` after `whenReady()` in `package-auto-refresh.integration.test.ts` — about half of runs fail before the fix.
- LM Studio: `evidence/probes/SD-lmstudio-registry-probe.test.ts`.
- Measured numbers: `evidence/SD-reproduction-results.txt`.

## Constraints

- Preserve what every touched test asserts; no weaker assertion; no `@ts-ignore` for W-11.
- One commit per work item, named as a baseline fix with the test and cause (TESTING.md Rule 9). Stage explicit paths.
- Server `test:unit`, `test:integration` and `typecheck` stay green; run the server suites after the `type-graphql` bump (shared foundation: TESTING.md rerun-by-impact rule 4 → everything reruns).
- LM Studio run: one local model at a time, prefer `qwen/qwen3.6-35b-a3b` through `LMSTUDIO_TARGET_TEXT_MODEL`, unload what you loaded, clean environment (TESTING.md). Never touch the user's running AutoByteus or `~/.autobyteus`.
- Out of scope (follow-ups, `follow-ups.md`): FU-001 (the other ~885 web type errors), FU-002 (delegated-launch E2E). Add rows there if you find more; do not widen the ticket.

## Expected output

Implementation handoff with the per-item evidence (commands, results, the 40-run loop results for AC-004, the 20-run loops for AC-006/AC-010, the live and the closed-port LM Studio runs, the macOS harness run or its exact blocker), then the normal route. Delivery proves the merged result from a clean clone of the finalized `origin/personal` (AC-016) and returns `Delivery Completed` to the Solution Designer.

## Known uncertainty

ASM-001, ASM-002, RISK-001 (accepted residual), RISK-002 (rc.4 is a prerelease). Escalation trigger: spurious change frames or extra reloads from the catch-up, remaining misses in the loops, or any schema change from rc.4 → `Design Impact` back to the Solution Designer.

## Documents (all in the ticket folder)

`requirements-doc.md`, `investigation-notes.md`, `solution-revision-record.md`, `design-spec.md`, `follow-ups.md`, `evidence/`.

## Route applied

`get_handoff_rules` rule 2 (Small/Medium + Low risk, direct implementation) → `/software_engineering_team/implementation_engineer`.
