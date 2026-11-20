# API/E2E Execution Coverage Report — autobyteus-526 round 2 (`follow-ups-448-final`)

## Round

- Coverage investigation: `api-e2e-coverage-investigation.md`; revision record `api-e2e-revision-record.md` (API-REV-001); progress `api-e2e-test-progress.md`.
- Trigger: implementation IR-002, a direct route (Small / Low). Tested at `03d3ff8e04`, code `c443fa09c1..c65a971c90`. This is the first API/E2E round of this package.
- Evidence: `evidence/api-e2e/`.
- Stale tests: none. This change removes components together with their specs. Every probe that mounted the removed components was updated by the implementer, and all of them pass.

## Routing Classification

- Task size: `Small`. Architectural risk: `Low`. Input route: `Direct`. Successful-output route: `Delivery`.
- Proportional test-code review: `Not required` by policy for this route. I changed no test code.

## Cases

| Case | Criteria | Surface | Command | Result | Evidence | Look For |
| --- | --- | --- | --- | --- | --- | --- |
| V-01 | AC-001 (search) | repository | `rg` for the three components and the 8 keys | Pass | `removed-keys.txt`, progress | no code reference. Only tracked historical logs (`frontend-execution-evidence/`) and an old ticket's notes mention them. `TeamMemberRow` and its keys are kept |
| V-02 | AC-001 | web typecheck and guards | `typecheck`, `guard:web-boundary`, `guard:localization-boundary`, `audit:localization-literals` | Pass | `web-tc.log`, `guard-*.log`, `audit-loc.log`, `static.txt` | `test-file errors: 86 in 36 files (baseline 86 in 36 files)`, `PASS`; all exit 0 |
| V-03 | AC-001 regression | web unit suite (full) | `pnpm -C autobyteus-web test:nuxt run` | Pass for this change | `V-03-web-unit.txt` | `780 passed (781)`, `5877 passed`. The one failure is `ServerSettingsBasicsPanel.spec.ts` ("not to contain 'GitHub'"), identical on base `8f2d209b2c`; this branch does not touch `components/settings`. It is already FU-001 in `follow-ups.md` |
| V-04 | AC-001 | team-activity-presentation probe (changed) | `node tests/e2e/team-activity-presentation-probe.mjs` | Pass | `probes/team-activity/` | SR006-BR-001..004 Pass; no failures or console errors. Screenshots include the zh-CN view |
| V-05 | AC-002 | the FU-008 probes (changed) | `test:e2e:background-contention`, `test:e2e:agent-org-draft-retention` | Pass | `probes/background-contention/`, `probes/agent-org-draft-retention/` | BG-BROWSER-000..007 all Pass, including 004; API-E2E-003-A..E Pass; failures `[]`; console errors 0 |
| V-06 | changed probe | team-status-live (one line removed) | `node tests/e2e/team-status-live-probe.mjs` | Pass | `probes/team-status/` | TS-001..009 Pass |
| V-07 | AC-003 | watcher unit test (changed) | 10 runs back to back at load 64–66 with `fseventsd` ~157% CPU; then `tests/unit/agent-package-definitions`; then a temporary mutation | Pass | `V-07-watcher-unit.txt` | 10/10, `22 passed` in ~150 ms each (vitest defaults); folder `95 passed`. With the fake event delivery turned off (reverted), 16 of 22 fail: the fakes drive the cases. The other 6 cover startup state and the parent watch, which the test calls directly. The implementer's 20/20 and its before/after case lists are in `fu-001-sr002/` |
| V-08 | AC-003 ("real OS events stay covered") | `package-auto-refresh.integration.test.ts`, unchanged, and the unchanged watcher source | vitest, one run | Fail (environment) | `V-08-integration-auto-refresh.txt` | `14 passed`, AC-012 timed out waiting for the "folder restored" event. Right after, plain `fs.watch` with no AutoByteus code: 1.7–4.3 s per event and 3 of 8 lost within 20 s. This is the saturated `fseventsd` (TESTING.md "File watching on a busy Mac"); the file and the source are identical to base |
| V-09 | server typecheck | — | `pnpm -C autobyteus-server-ts typecheck` | Pass | `server-tc.log` | `1006 in 315 files (baseline 1006 in 315 files)`, `PASS` |

## Acceptance-Criteria Proof

| AC | Proven by | Result |
| --- | --- | --- |
| AC-001 | V-01..V-04, V-06 | Proven: no reference left, typechecks and guards pass, the probes pass, the web suite passes apart from the pre-existing base failure |
| AC-002 | V-05 | Proven: both probes pass, with logs |
| AC-003 | V-07 (robust under load; every behavior still asserted; the fakes drive the cases), V-08 (the integration file is unchanged and still exercises real OS delivery; it fails only where the OS drops events) | Proven for the unit file; the real-OS test is environment-bound, as before |

## Validation Confidence Scorecard (Mandatory)

| Category | Final | Supports | Residual |
| --- | --- | --- | --- |
| Requirement and AC proof | 95% | every AC directly | — |
| Changed-boundary directness | 95% | the changed probes and tests run as they are | — |
| Integration realism | 92% | probes on Nuxt with fixtures; team-status-live against a built server | the real-OS watcher test is limited by the machine |
| Environment fidelity | 90% | macOS under heavy load, the worst case for these tests | Linux not run |
| Durable regression coverage | 95% | the probes and the unit test are repaired and pass | — |

- Overall: 93%. Every critical AC is directly proven, and no category is below 90%.
- 95% not met because the real-OS integration test cannot pass while `fseventsd` drops events, which is outside this ticket.

## Broader Validation Decision (Mandatory)

- `Not required`. No product behavior changed: only an unmounted component and test code. The browser probes are the realistic surface for the removed UI's neighbors.

## Persisted Data / Compatibility

- Not Affected. None.

## Durable Coverage Changed In The Codebase

- By the implementer, reviewed by running it:
  - the four probes and their fixtures;
  - `agent-package-folder-watcher.test.ts`.
- I made no test changes.

## Temporary Methods And Cleanup

- Base worktree `api448f-base-8f2d209b2c`: removed.
- The watcher mutation: reverted; the file is identical to HEAD.
- Probe servers: stopped by the probes.

## Latest Authoritative Result

- Result: `Pass`.
- Next: delivery engineer.
- Notes:
  - Pre-existing and recorded: `ServerSettingsBasicsPanel.spec.ts` (FU-001).
  - Environmental: the real-OS `package-auto-refresh` test under `fseventsd` load.
