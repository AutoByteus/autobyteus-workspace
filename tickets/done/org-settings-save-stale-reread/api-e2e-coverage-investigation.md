# API/E2E Coverage Investigation

The plan: what must be proven, how, the decisions about existing tests, and the planned cases. Results, confidence scores and the broader-validation decision go in the execution coverage report (`api-e2e-execution-coverage-report.md`).

## Investigation Meta

- Requirements Doc: `requirements-doc.md` (SR-001, Approved)
- Investigation Notes: `investigation-notes.md`
- Solution Revision Record: `solution-revision-record.md`
- Design Spec (required on every route): `design-spec.md` (SR-001, Ready; `Small` + `Low`)
- Supplemental Task Artifacts: `evidence/repro-org-reread-race.spec.ts`, `evidence/SD-01-repro-org-reread-race.log`
- Design Review Report: `N/A — not applicable` (architecture review not selected)
- Architecture Review Revision Record: `N/A — not applicable`
- Implementation Handoff: `implementation-handoff.md` (IR-001)
- Implementation Revision Record: `implementation-revision-record.md`
- Code Review Report: `N/A — not applicable` (direct low-risk route)
- Code Review Revision Record: `N/A — not applicable`
- Delivery Revision Record (delivery re-entry only): N/A
- Relevant Delivery Revision IDs: N/A
- API/E2E Revision Record (created after the first completed result): `api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-001`
- Current Investigation Round: 1
- Trigger: implementation complete (IR-001), direct API/E2E route
- Prior Investigation Reviewed: none (first round)
- Latest Authoritative Investigation: this file

Paths are relative to `/Users/normy/autobyteus_org/autobyteus-worktrees/org-settings-save-stale-reread/tickets/in-progress/org-settings-save-stale-reread/` unless absolute.

## Current Requirement And Design Basis

- REQ-001 / AC-001 / AC-002: when the running Org's own stream reloads its view (checkpointed reconnect after a live Save) while Settings re-reads the Org's canonical settings, the re-read completes with the canonical settings. On the real stack: ≥ 12 Saves of a stopped copy's model in a running Org, every one ends `Saved.` with the saved model, 0 "could not be refreshed" messages (QR-001; base 4 of 12, API-18).
- REQ-002 / AC-003: a target change (context released, binding changed, Org operation or inspection pending) still refuses with "Org configuration read is stale; refresh required."; a view that keeps being replaced gives up after 3 reads.
- REQ-003: the regression test reproduces the race.
- AC-004: existing Org stream / publication / Settings store suites pass; DCP-001…005 and DCR-001…003 pass. BEH-002 (the reload itself) is preserved.
- AC-005: the user's own check (not ours).
- Implementation: `autobyteus-web/stores/agentOrgContextsStore.ts` `readRunConfig` only (bounded loop, `MAX_CONFIG_READ_ATTEMPTS = 3`); new spec `autobyteus-web/stores/__tests__/agentOrgRunConfigRead.spec.ts`; one docs sentence. Code commit `29b51ebcef`; validated head `a4e1a89993` (ticket docs/evidence only after the code commit).
- Implementation handoff's Legacy / Compatibility Removal Check: clean (none introduced, old `current()` closure removed). Persisted Data Transition Check: `Not Affected`. Both match the diff (`git diff 1138e8fbef 29b51ebcef`): no compatibility branch, no data path.

## Supported Scenarios And Real Usage

- Designer scenarios covered: SCN-001 (Run Settings → stopped copy row → model → Save in a running Org).
- Real-use scenarios added from investigating the implemented behavior:
  - SCN-001b: the same Save for a **Team copy** placed in an Org (Team-level model of a stopped configured-place Team copy, Org root). It goes through the same `loadAgentOrgCanonical` → `readRunConfig` path and the same live-Org event/reload. Trigger: DCR-003 (Org launch page → Grok Team mounted → copy → stop → Team model → Save). It is the second case of the base 4/12 measurement.
  - SCN-001c: a Save on a stopped Org root's copy settings after the run stopped (DCR-002 Org root path, stopped-Org branch with `prepareConfigWorkspaces`/`applyRunConfig`). Covered by AC-004's DCR-002 and by IMP-01 case 2.
- Designer scenarios recorded as `Technically Possible but Unsupported/Contrived`: none recorded.

## Changed Behavior Summary

| Behavior ID / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| BEH-001: view refresh mid-read → read again (≤ 3) | Changed | design DS-003; handoff trace | Unit (IMP-01) + real-stack loop (AC-001) |
| BEH-001: target change mid-read → stale error | Preserved (+ inspection now also after the read) | handoff Known Risks | Unit (IMP-01 refusal cases) |
| BEH-002: Org stream checkpointed reload after a live Save | Preserved | E-02/E-03/E-07 | Observe CONNECTED + snapshot after each Save in the loop; IMP-02 stream specs |
| Stopped-Org read + `applyRunConfig` | Preserved | handoff self-review | IMP-01 case 2; DCR-002 / DCP-004 journeys |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised By That Evidence | Candidate Broader Validation Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | No | — | — | — | — |
| API / transport / contract | No (consumed, not changed) | GraphQL `AgentOrgRunConfig` read; Org WebSocket | Mocked in unit tests | Real timing between the HTTP read and the WebSocket reload | Browser probe on a real backend |
| Frontend component / state | Yes | `agentOrgContextsStore.readRunConfig` | IMP-01, IMP-02 | Real stream replacing the context (vs. a test-made republish) | Browser probe |
| Browser integration / user journey | Yes (visible outcome) | Save bar after Save | None in unit layer | The message on the real page | Browser probe DCP-003/DCR-003 loop |
| Authentication / session / permissions | No | — | — | — | — |
| Desktop renderer / web-equivalent UI | Yes (web-equivalent) | same renderer store | as above | — | Browser probe (web-equivalent) |
| Desktop shell / Electron-specific integration | No | — | — | — | — |
| Process / lifecycle | No | — | — | — | — |
| Persisted-data transition | No | — | — | — | — |
| Worker / queue / distributed coordination | Yes (client-side race) | HTTP read vs. WebSocket reload | Deterministic unit race | Real ordering/timing | Browser probe loop with frame/request observation |
| External integration | No | Scripted AGY/Grok CLIs only | — | — | — |

## Project Execution Discovery

- Assigned task worktree / workspace: `/Users/normy/autobyteus_org/autobyteus-worktrees/org-settings-save-stale-reread`, branch `fix/org-settings-save-stale-reread` @ `a4e1a89993`
- Project type and runtime stack: pnpm monorepo; Nuxt 3 web (`autobyteus-web`), Node/TS server (`autobyteus-server-ts`), Electron shell
- Project testing guideline path(s): `/Users/normy/autobyteus_org/autobyteus-worktrees/org-settings-save-stale-reread/TESTING.md` (no closer `TESTING*.md` under `autobyteus-web/`)
- Conflicting, missing, or unclear project instructions: none. Note: `autobyteus-web` has no typecheck script (recorded by implementation, IMP-03).
- Required environment variables or secrets available: `N/A` (scripted runtimes, no credentials)

| Instruction / Configuration Path | Authority / Purpose | Commands, Setup, Or Constraints Learned |
| --- | --- | --- |
| `TESTING.md` | Global test strategy | Renderer store change → web unit tests + a browser probe; probe owns its stack; fresh `--output-dir`; `--ledger-file`; one heavy run at a time; never touch the user's running app; build `autobyteus-server-ts` first (`prebuild`, `build`) |
| `AGENTS.md` (root) | Repo rules | Read TESTING.md before validation |
| `autobyteus-web/package.json` | Scripts | `test:e2e:delegated-copy-model-change` (DCP-001…005), `test:e2e:delegated-copy-own-file` (DCR-001…003), both `node tests/e2e/delegated-launch-defaults-probe.mjs --cases …` |
| `autobyteus-web/tests/e2e/delegated-launch-defaults-probe.mjs` header | Probe contract | Real Chrome → Nuxt dev → `dist/app.js`, scripted AGY/Grok, owned temp data root/HOME/ports, `--cases` (repeats allowed), `--output-dir`, `--ledger-file`; DCP-003/DCR-003 each do one Org-root Save and wait for `Saved.` (60 s) then assert the saved model |
| `tickets/done/remove-skill-improvement/evidence/API-18-fu005-base-vs-ticket.txt` | Prior base measurement | Loop method: `--cases DCP-003,DCR-003,DCP-003,DCR-003,DCP-003,DCR-003`, 1 Save per case; base 4/12 stale re-reads, each one a probe `Fail` |

| Component / Dependency | Working Directory | Start / Setup Command | Runtime / Resource Notes | Readiness Check | Stop / Cleanup Method |
| --- | --- | --- | --- | --- | --- |
| Server build | worktree root | `pnpm -C autobyteus-server-ts prebuild && pnpm -C autobyteus-server-ts build` | Serialized; nothing else heavy running | `dist/app.js` exists, exit 0 | Untracked build output, left in the worktree |
| Backend, Nuxt dev, headless Chrome, scripted CLIs | `autobyteus-web` | Started by the probe | Probe-owned free ports and temp data root | Probe's own readiness waits | Probe stops them; check `cleanup` in its evidence JSON |
| Temporary observer copy of the probe | `autobyteus-web/tests/.e2e-ab265-observer/` (untracked copy of `tests/e2e/`) | `cp -R tests/e2e tests/.e2e-ab265-observer` + observer patch | Same probe code; only adds page listeners | Probe output | `rm -rf` after the runs; `git status` clean |

| Data / Fixture / Identity Need | Existing Project Mechanism Or Creation Method | Environment / Data-Safety Notes | Cleanup / Retention |
| --- | --- | --- | --- |
| Agents, Teams, Orgs, runs | The probe's own setup through public APIs/UI | Owned temp data root; `~/.autobyteus` and the running AutoByteus app (port 29695) untouched | Probe removes its root |

## Existing Durable Coverage Inventory

| Path / Test | Current Assertion Or Intent | Related Requirement / AC / Design | Validity Decision | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/stores/__tests__/agentOrgRunConfigRead.spec.ts` (new) | Race → resolves (live and stopped); target change ×4 → stale, 1 read; endless republish → stale after 3 reads | AC-002, AC-003, REQ-003 | Still Valid | IMP-00 (4/7 fail on base), IMP-01 (7/7 pass); assertions read against REQ-001/002 and design Terminology | Keep |
| `autobyteus-web/stores/__tests__/agentOrgRunConfigPublication.spec.ts` and other `agentOrg*` / `existingRunConfig*` store specs | Org config publication, Settings store load/save/reconcile | AC-004 | Still Valid | IMP-02 | Keep |
| `autobyteus-web/services/agentOrgExecution/__tests__/*` | Org stream/context, checkpoint reload | BEH-002 | Still Valid | IMP-02 | Keep |
| `tests/e2e/delegated-launch-defaults-probe.mjs` DCP-001…005 | Copy model change journeys (Agent/Team/Org roots) | AC-004; DCP-003 = AC-001 | Still Valid (asserts `Saved.` and saved model after Save, which the defect broke) | API-18 base failures were these assertions | Keep; run |
| `tests/e2e/delegated-copy-own-file-cases.mjs` DCR-001…003 | Own-file restore; DCR-003 Org-root Team copy Save | AC-004; DCR-003 = AC-001 | Still Valid | same | Keep; run |

## Planned Cases

| Case ID | Criteria | Boundary / Surface | Kind | Planned Command Or Steps | Why |
| --- | --- | --- | --- | --- | --- |
| API-01 | AC-002, AC-003, REQ-001…003 | `readRunConfig` (unit) | Reused | IMP-01 | Ran on `29b51ebcef`; `git diff --name-only 29b51ebcef a4e1a89993` touches only ticket files; log header and `Tests  7 passed (7)` present |
| API-02 | REQ-003 (test discriminates) | `readRunConfig` base vs fix | Reused | IMP-00 | Same reason; `Tests  4 failed \| 3 passed (7)` on the base store |
| API-03 | AC-004 (unit layer), BEH-002 | Org/Settings stores, Org stream services, editor components | Reused | IMP-02 | Same reason; `33 passed (33)`, `359 passed (359)` |
| API-04 | — (hygiene) | Changed files typecheck | Reused | IMP-03 | Same reason |
| API-05 | AC-004 | Real stack: DCP-001…005, DCR-001…003 | Existing Test (+ temporary observer) | `node tests/.e2e-ab265-observer/delegated-launch-defaults-probe.mjs --output-dir <fresh> --ledger-file <ledger> --cases DCP-001,DCP-002,DCP-003,DCP-004,DCP-005,DCR-001,DCR-002,DCR-003` (cwd `autobyteus-web`) | AC-004's named cases |
| API-06 | AC-001, QR-001, REQ-001; BEH-002 | Real stack: 12 Org-root Saves of a stopped copy's model | Journey (existing cases repeated + temporary observer) | same probe, `--cases DCP-003,DCR-003` ×6 (12 cases, 1 Save each) | AC-001's loop as the requirements define it (the cases that reproduced 4/12 on base) |

| API-07 | AC-001 (detection power of the loop) | same loop with the base `readRunConfig` | Temporary Probe (calibration) | `git show 1138e8fbef:autobyteus-web/stores/agentOrgContextsStore.ts > autobyteus-web/stores/agentOrgContextsStore.ts` (Nuxt dev serves the store from source; server unchanged), the API-06 command into `/tmp/ab265e2e/API-07`, then `git checkout -- autobyteus-web/stores/agentOrgContextsStore.ts` and an empty `git diff` | Added after API-06: in API-06 no Save met the race (the new context was published after the read every time), so 0/12 alone does not show the loop can see the defect today; base measured 4/12 on 2026-10-20 under different load. Calibration, not cause-finding |

- Observer (API-05, API-06, API-07), temporary, not committed (its log and summarizer are in evidence): page listeners on the probe's page that record, with timestamps, (a) every GraphQL request/response operation name and status, (b) Org WebSocket frame types (`CONNECTED`, `ROOT_EXECUTION_VIEW_SNAPSHOT`), (c) every change of the Save bar text, via an init script polling `[data-test="existing-run-save-bar"]` every 100 ms (catches a transient "could not be refreshed"). It lets the report count Saves, reloads after each Save, `AgentOrgRunConfig` reads per Save (a second read = the race met and handled by the new re-read), and every "could not be refreshed" text. Why temporary: the durable assertion already exists in the probe (`Saved.` within 60 s plus the saved model); the counting is evidence for this ticket only, and a 12-Save loop is too costly as a standing suite.
- Test progress log needed: `Yes` (`api-e2e-test-progress.md`)

## Durable Coverage To Add

None beyond the implementation's `agentOrgRunConfigRead.spec.ts` (reviewed above, kept).

## Durable Coverage To Update

None.

## Durable Coverage To Remove

None.

## Desktop Application Validation Plan

- Desktop framework / shell: Electron
- Testing guideline used: `TESTING.md` "Choosing the path" (renderer store → web unit tests + a browser probe)
- Web-equivalent behavior: all of it (a renderer store read rule)
- Shell-specific or lifecycle behavior: none
- Chosen validation approach: browser probe on a probe-owned real stack (worktree `dist/app.js` + Nuxt dev), not `--desktop`: no shell boundary is touched
- How the run avoids disturbing the running desktop application: the probe uses free ports and its own data root/HOME; the user's AutoByteus (`/Applications/AutoByteus.app`, port 29695, `~/.autobyteus/server-data`) is not touched

## Live Environment And Fixture Plan

- Startup order: server prebuild + build → copy probe and add observer → API-05 → API-06 (serially, nothing else heavy)
- Environment choices: headless Chrome at 1512×952 (probe default); scripted AGY/Grok, no inference
- Readiness: the probe's own waits (backend, Nuxt dev, warm-up of five routes)
- Seed data: the probe's setup
- Identities: none
- Journeys: as Planned Cases
- Evidence: probe stdout log, evidence JSON, ledger, failure screenshots, observer log and its per-Save summary
- Cleanup: probe stops its processes and removes its root; remove `tests/.e2e-ab265-observer/`; check no leftover probe processes

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Only The User Can Check? | Required Follow-Up Or Escalation |
| --- | --- | --- | --- | --- |
| A real target change (node switch, Org Stop) landing inside the ~20 ms re-read window on the real stack | Real use cannot place it there on purpose; forcing it would be contrived timing. The rule is proven deterministically by IMP-01 refusal cases | Low | No | None |
| AC-005 | The user's own check in their app | — | Yes | Delivery takes it to the user |

## Ambiguities Or Reroute Triggers

| Issue | Classification | Evidence | Recommended Owner |
| --- | --- | --- | --- |
| None | — | — | — |

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `No` (the implementation's new spec is kept as is)
- Reroute Required Before Validation Execution: `No`
- Recommended Owner If Reroute Required: N/A
- Notes: design Escalation trigger — if the loop still shows the message, return a `Design Impact`.
