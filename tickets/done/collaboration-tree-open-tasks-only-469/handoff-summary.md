# Handoff Summary — collaboration-tree-open-tasks-only-469

## What Changed

Project Task `autobyteus-469` (prerequisite PRE-001 of `autobyteus-461`). A coordinating run (standalone Agent, Team or Org) no longer stores a list of its local delegated runs. Its tree is built in memory from the Task records with an open entry naming it plus each run's own file. A loaded root drops a run once its last open Task closed and the run stopped, and adds it back from its own file when its assigner continues it or gives it a follow-up Task. Old tree files need no migration: local entries are ignored and left out at the next save; remote links stay. The Team `TASK_EXECUTIONS_REOPENED` event carries each reopened execution's record so a Team view inserts it live; the Team tab re-fetches participant names when a rebuilt view no longer holds a named agent.

## Classification And Route

- `task_size`: `Large`; `architectural_risk`: `High`; route: `Reviewed`
- Architecture review: pass (through ARCH-REV-006 on SR-009)
- Code review: CRR-001 Pass, CRR-002 failure-origin (→ SR-009, IR-002), CRR-003 Pass, CRR-004 test-code review Pass
- API/E2E: API-REV-002 Pass, final confidence 95% (target 95%)

## Code State

- Branch `codex/collaboration-tree-open-tasks-only-469`, base `origin/personal` `bff4faa6f6`
- Product: `832f0a4572`, `42652879b3`, `fa48d74a3e`; tests: `009f707955`, `431de4c9d1`, `c7eb0d8626`
- Delivery integration: `origin/personal` fetched 2026-11-11, still `bff4faa6f6`; method `Already current`; no rerun needed (no new base commits; RELEASE.md "delivery audits; it does not redo")

## Verification

Verified from evidence by delivery; no user check needed. Every critical AC is proven (see `release-deployment-report.md` Verification). Checked directly: `API-I01-round2-server-integration.txt` (90 files / 524 tests pass), `API-E01-round2-server-e2e.txt` (182 files pass, OT-1…OT-3, EXC-E2E-007 ✓), `API-B01-round2-probe-evidence.json` (BR-001…BR-016 Pass, `storedLocalEntriesAfterA: 0` ×3, `framesDiffering: 0` ×3, cleanup `dataRootRemoved: true`), `API-B01-round2-agent-team-tab-after.png` (message to the closed worker kept and named), `API-F01-round2-fresh-start-build.txt` (fresh clone build pass).

## Docs

See `docs-sync-report.md`: server and web docs updated in the change; delivery corrected the closed-execution list sentence in `agent_communication.md`. `DESIGN.md`, `TESTING.md`, `RELEASE.md`: no change.

## Release

- No release requested; RELEASE.md default is "No release". The change ships with the next release; `release-notes.md` carries the user-facing text and the `What you need to do` rollback warning (an older build cannot be used on the same data afterwards).

## Residual Risk And Follow-ups

- Not tested: Memory Sync imported sources holding delegated runs (code reading only); signing, notarization, Intel and Linux release jobs (runner only).
- CR-001 naming note (`knowsRunId`), non-blocking; probe Team-tab per-frame sample recorded but not asserted, non-blocking.
- Follow-ups FU-001…FU-004 in `follow-ups.md`; the Solution Designer sends them when the ticket leaves the team.
