# API/E2E Execution Coverage Report

## Execution Round Meta

(`<ticket>` = `/Users/normy/autobyteus_org/autobyteus-worktrees/agy-linked-skills-always-auto-approve/tickets/in-progress/agy-linked-skills-always-auto-approve`)

- Requirements Doc: `<ticket>/requirements-doc.md` (Approved, SR-001)
- Investigation Notes: `<ticket>/investigation-notes.md`
- Solution Revision Record: `<ticket>/solution-revision-record.md`
- Design Spec (required on every route): `<ticket>/design-spec.md` (SR-002)
- Supplemental Task Artifacts: `<ticket>/probes/` (`agy-symlink-skill-probe.py`, `agy-skill-scan.mjs`, `app-log-excerpt-2026-10-01.txt`, `agy-linked-skills-implementation-probe.mjs`, new `agy-api-e2e-browser-probe.mjs`), `<ticket>/implementation-evidence/`, `<ticket>/handoff-architecture-design-complete.md`
- Design Review Report: `<ticket>/design-review-report.md` (ARCH-REV-001 Pass)
- Architecture Review Revision Record: `<ticket>/architecture-review-revision-record.md`
- Implementation Handoff: `<ticket>/implementation-handoff.md` (IR-001)
- Implementation Revision Record: `<ticket>/implementation-revision-record.md`
- Code Review Report: `<ticket>/code-review-report.md` (CRR-001 Pass)
- Code Review Revision Record: `<ticket>/code-review-revision-record.md`
- Delivery Revision Record: N/A
- Relevant Delivery Revision IDs: N/A
- Coverage Investigation: `<ticket>/api-e2e-coverage-investigation.md`
- API/E2E Test-Case Ledger: `<ticket>/api-e2e-test-case-ledger.md`
- API/E2E Revision Record: `<ticket>/api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-001`
- Current Execution Round: 1
- Trigger: `code_reviewer` pass handoff (CRR-001)
- Prior Round Reviewed: N/A
- Latest Authoritative Round: 1
- Validated source: `codex/agy-linked-skills-always-auto-approve` @ `e5edfafdf` (server `dist` rebuilt from it before browser runs)

## Routing Classification

- Task size: `Medium`
- Architectural risk: `High`
- Input route: `Reviewed`
- Successful-output route: `Code Review`
- Proportional test-code review decision: `Required` (new durable E2E suite + updated shared fake-CLI fixture)

## Investigation And Execution Basis

- Coverage investigation artifact: `<ticket>/api-e2e-coverage-investigation.md`
- Investigation completed before durable coverage changes or final execution: `Yes`
- Investigation plan followed: `Yes`. Deviations:
  - (a) The standalone E2E entry uses `prepareAgentRun` + WebSocket send, the desktop/Chat path, plus a `createAgentRun` assertion for the mobile entry, after the first run showed that `createAgentRun` activates eagerly.
  - (b) E05 became an Org case; the Team stored-off check is folded into E04.
  - (c) B04 pairs a phone through a dot-less private host name (`probe-node` mapped to 127.0.0.1 in headless Chrome), because pairing rightly rejects loopback.
- Existing coverage decisions revised during execution: `agy-failure-cli.mjs` changed from "Still Valid" to "Needs Update". Its constant `always-proceed` would have hidden a flag regression; the mutation run proves the new fixture detects it.
- Reroute required before or during execution: `No`

## Test-Case Ledger Reconciliation

- Ledger path: `<ticket>/api-e2e-test-case-ledger.md`
- Ledger initialized before execution: `Yes`
- Every completed case recorded immediately: `Yes`
- Long-running case checkpoints recorded when needed: `Yes` (R6 summary file written per suite)
- Ledger reconciled into this report: `Yes`
- Last durably recorded event: B01–B04 consolidated run (Pass)
- Cases still running, interrupted, or not started: None

| Case ID | Final Result | Last Event | Evidence / Artifact Path | Reconciled Result / Follow-Up |
| --- | --- | --- | --- | --- |
| R1 | Pass | Completed | console | — |
| R2 | Pass | Completed | console (21 files / 277 tests) | — |
| E01–E08 | Pass | Completed | `<ticket>/api-e2e-evidence/R3-R4-fake-cli-suites.log` | Mutation check proved regression detection |
| R4 | Pass | Completed | same log (5 files / 17 tests) | — |
| R5 | Pass | Completed | `<ticket>/api-e2e-evidence/R5-web-specs.log` (33 files / 290 tests) | — |
| R6 | Pass | Completed | `<ticket>/api-e2e-evidence/R6-*.log`, `R6-summary.txt` | `agy-mcp-team-live` first failed on a pre-existing hard-coded evidence path. It passed 2/2 when rerun with that folder created temporarily (removed afterwards) |
| B01–B04 | Pass | Completed (consolidated run) | `<ticket>/api-e2e-evidence/browser-probe/` | — |

## Compatibility / Legacy Scope Check

- Reviewed requirements/design introduce, tolerate, or ambiguously describe backward compatibility in scope: `No`
- Compatibility-only or legacy-retention behavior observed in implementation: `No`. A copied capsule restores through the same `stat(<entry>/SKILL.md)` reader as a linked one (E08), with no version branch.
- Approved persisted-data transition followed without unnecessary migration or version-specific runtime fallback: `Yes`
- Durable coverage added or retained only for compatibility-only behavior: `No`. E08 proves the approved `Directly Usable — No Migration` outcome (AC-009) through the normal reader.
- Reroute classification used: N/A
- Upstream recipient notified: N/A

## Changed Boundary And Evidence Matrix

| Case ID | Behavior / Requirement / AC IDs | Changed Boundary | Execution Surface / Mode | Evidence Type | Result | Evidence / Artifact |
| --- | --- | --- | --- | --- | --- | --- |
| E01 | BEH-001, AC-001, AC-002, AC-006, QR-001 | Chat (Daily Assistant, ALL_INSTALLED) → factory → capsule link → CLI cwd | Real server (GraphQL `prepareAgentRun` + WS) + argv-faithful scripted CLI | Durable | Pass | CLI read `SKILL.md` + sibling through the link; `readlink` = skill realpath; argv has `--dangerously-skip-permissions` with stored `false`; workspace empty; `.venv` 40 MiB file + outside/dangling links intact after terminate |
| E02 | BEH-003, AC-004 | ALL_INSTALLED unusable skill | same | Durable | Pass | Workspace-owned skill absent from capsule; other skill linked; `disposition=skipped-workspace-owned` warning |
| E03 | BEH-002/006, AC-005, REQ-006, SCN-006 | CONFIGURED failure surfacing (desktop WS + mobile `createAgentRun`) | same | Durable | Pass | Both entries carry `Antigravity could not use skill 'env-skill': the selected workspace already has a skill with this name.`; no generic text; no CLI launch; capsule removed |
| E04 | REQ-006 (ARCH-REV-001 trigger), AC-006 | Team member readiness failure; team member launch | Real server team WS | Durable | Pass | Team WS frames carry the skill + reason; no generic text. The other member, stored `false`, launched with skip-permissions |
| E05 | AC-006 | Org member launch | Real server org WS | Durable | Pass | Director launched with skip-permissions from org root stored `false` |
| E06 | AC-006 (SCN-A2) | Agent-initiated `delegate_task` over the run's real MCP config | Real server + real agent-tools MCP host | Durable | Pass | Delegated child (fresh run ID) launched with skip-permissions; member configured `false` |
| E07 | BEH-005, AC-008, AC-006 | Restore after source deletion | Real server terminate → WS send | Durable | Pass | Resumed (`--conversation` + skip-permissions); link removed; `skipped-missing-source` warning |
| E08 | BEH-005, AC-009, AC-006 | Restore of pre-change copied capsule | same | Durable | Pass | Resumed; copied folder read (`symlink:false`), no skip warning; source untouched |
| Mutation | AC-006 | `AgyStreamProcess` argv | E01–E08 with the flag removed | Temporary | Pass (detected) | 7/8 fail `AGY_PERMISSION_MODE_MISMATCH`; source restored (`git checkout`, verified clean) |
| R4 | Regression | AGY stream/transport | Fake-CLI suites | Durable | Pass | 17/17 |
| R6 | Regression, ASM-001, AC-002, AC-004, AC-006 | Real `agy` 1.2.14 | Live suites | Live | Pass | production-live 2/2 (linked capsule skill), restore-live 1/1, mcp-team-live 2/2, capability 3/3 (incl. "warns/omits unresolved and unusable all-installed skills but completes a real AGY first turn"), team/org 2/2, background 8/8, recovery 5/5 |
| B01 | BEH-001, AC-001, AC-002, ASM-001 | Real Chat → real backend → real `agy` with the user's real 15-skill set | Browser + live | Live/Browser | Pass | Daily Assistant run on `gemini-3.8-flash-low`. All 15 skills are capsule links, `browser-automation` → its real folder (real `.venv`). The agent's `view_file` succeeded and the reply quotes the real SKILL.md sentence. No skip/failure log lines. Skills checkout `git status` unchanged |
| B02 | AC-007 | New Team run form + member override | Browser (real backend) | Browser | Pass | AGY root: switch `aria-checked=true`, disabled, help = locked text; members locked with note; click ignored. Codex root: editable. Codex root + member override AGY: only that member locked |
| B03 | AC-007 | New Org run panel (root + nested team + director) | Browser | Browser | Pass | AGY root: all 5 switches locked on, org and team help = locked text. Codex root + AGY nested team: only team and its members locked, director editable |
| B04 | AC-007, AC-006 | Paired phone mobile launch card + mobile launch | Browser 390×844, `isMobile`, paired via pairing API | Browser/Live | Pass | AGY: switch on, disabled, help = locked text; click ignored. Codex: off, editable, normal help. The AGY run launched from the phone became active (activation requires `always-proceed`) |

## Additional Repository Coverage Execution

| Order | Command | Working Directory / Configuration | Boundary Or Scenario Proven | Result | Evidence / Output Path |
| --- | --- | --- | --- | --- | --- |
| A1 | `AGY_LIVE=1 pnpm exec vitest run tests/unit/agent-execution/backends/antigravity/agy-mcp-team-live.test.ts --no-watch`, with the test's hard-coded evidence folder `tickets/in-progress/antigravity-cli-runtime-redesign-20260924/` created temporarily | `autobyteus-server-ts` | Live AGY team/org MCP `send_message_to` | Pass (2/2) | `<ticket>/api-e2e-evidence/R6-mcp-team-live-rerun.log`, `agy-mcp-team-live/` |

## Validation Confidence Scorecard (Mandatory)

| Confidence Category | Post-Repository Score | Final Score | Change | New / Final Supporting Evidence | Residual Uncertainty |
| --- | --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 92% | 97% | +5 | B01 proves AC-001 on the real skill set. B02–B04 prove AC-007's remaining surfaces; earlier evidence covers chat and the existing-run editor (impl L01/L04 + specs) | AC-003 is proven by the linker unit test through real filesystem links. The optional live AC-003 check was not run |
| Changed-boundary execution directness | 94% | 96% | +2 | Real server + real CLI process (cwd = capsule) + real `agy` | — |
| Cross-boundary integration realism and mock gap | 90% | 95% | +5 | Live `agy` reads linked folders with skip-permissions (B01, production-live). The E-suite emulates only the CLI, faithfully for argv and permission mode, and was mutation-checked | The fake CLI does not emulate AGY's own skill discovery; this is covered live |
| Environment, configuration, identity, and fixture fidelity | 88% | 94% | +6 | User's real skills, including the incident `.venv`, in an isolated backend; real pairing flow | AC-009 uses a legacy-shaped capsule (the same manifest and copied layout), not a run created by the pre-change binary |
| Failure, edge-case, lifecycle, and recovery evidence | 93% | 95% | +2 | E03/E04/E07/E08; live restore and recovery suites | Unreadable-folder (EACCES) wording not exercised (CF-05, unsupported trigger) |
| User-surface, browser, and desktop-shell confidence | 82% | 95% | +13 | B02–B04 rendered with real data; phone viewport via the real pairing; impl L01/L04 | Chat footer explanation is tooltip + aria (CF-02, accepted design). Desktop shell unchanged, so no shell run |
| Durable regression coverage quality and relevance | 90% | 95% | +5 | New 8-case server E2E; argv-faithful fixture; mutation-proven | Suite gated behind `RUN_AGY_FAILURE_E2E` like the other fake-CLI suites |

- Overall post-repository confidence: 90%
- Overall final confidence: 95.3%
- Calculation method: simple average of the seven applicable categories.
- Confidence change produced by broader validation: +5.3 points (user-surface and fixture-fidelity gaps closed).
- Every critical acceptance criterion directly proven: `Yes` (AC-001 and AC-002, the critical REQ-001/002 criteria, are proven durably and live)
- Any final applicable category below `90%`: `No`
- Default final confidence target of `95%` met: `Yes`
- Confidence-limiting residual risks: ASM-001 is verified on `agy` 1.2.14 only; AC-009 uses a legacy-shaped capsule.

## Broader Validation Decision And Execution

- Decision and selected execution mode: `Required`; `Browser` (real backend `dist/app.js` + Nuxt dev + headless Chrome) with `Live API` (installed `agy` 1.2.14).
- Material deviation from the planned mode or rationale: None. B04 reaches the mobile surface through the real pairing API, with a mapped private host name.
- Confidence gap or residual risk actually addressed: AC-001 on real data / ASM-001; AC-007 rendered team, member-override, org and mobile surfaces.
- Startup order, commands, and readiness results: `pnpm -C autobyteus-server-ts build` (pass, bootstrap smoke pass) → `prisma migrate deploy` (owned SQLite) → `node dist/app.js --data-dir <owned>` (health 200) → `pnpm dev` (Nuxt 200) → Chrome. Driver: `node <ticket>/probes/agy-api-e2e-browser-probe.mjs --output-dir <ticket>/api-e2e-evidence/browser-probe` from `autobyteus-web`.
- Environment choices that materially affected the run: `AUTOBYTEUS_SKILLS_PATHS=/Users/normy/autobyteus_org/autobyteus-skills` (read-only); real `agy` (no `ANTIGRAVITY_CLI_COMMAND`); Chrome `--host-resolver-rules=MAP probe-node 127.0.0.1` for B04.
- Seed data: agents `probe-lead`, `probe-member`, `probe-director`; team `probe-agy-team`; org `probe-agy-org` (nested team), all via GraphQL in the owned DB.

| Scenario / Journey Step | Expected Observable Result | Actual Observable Result | Evidence | Result |
| --- | --- | --- | --- | --- |
| B01 Chat → AGY model → send "read browser-automation SKILL.md, quote first sentence; run nothing" | Run starts; agent reads the real skill through the link | Reply: "Use only the bundled launcher referenced here as `scripts/browser`."; `view_file` SUCCESS; 15 links | `browser-probe/B01-chat-agy-real-skills-reply.png`, `probe-evidence.json` | Pass |
| B02 Team detail → Run → runtime AGY | Root + members locked on with explanation | As expected; click ignored | `B02-team-agy-locked.png` | Pass |
| B02 runtime Codex, member override AGY | Root editable; only that member locked | As expected | `B02-team-codex-member-agy-locked.png` | Pass |
| B03 Org config → runtime AGY; then Codex + nested team AGY | All locked; then only team scope locked | As expected | `B03-org-agy-locked.png`, `B03-org-codex-root-agy-team.png` | Pass |
| B04 Pair phone → Choose work → Agents → Probe Lead → runtime AGY | Card on, disabled, explanation | As expected; Codex editable, off | `B04-mobile-agy-locked.png` | Pass |
| B04 Load workspace path → AGY model → Create run → first message | AGY run activates | Run published and active (`runtimeKind antigravity_cli`) | `backend.log`, `probe-evidence.json` | Pass |

## Desktop Application Validation

- Validation approach executed: web-equivalent renderer via browser dev path (per TESTING.md), as planned.
- Web-equivalent behavior, surface used, and evidence: all AC-007 surfaces and Chat, as above.
- Shell-specific or lifecycle behavior and evidence: none changed by the diff.
- Effect on any already-running desktop application: None. The user's running app (its `agy` processes on `~/.autobyteus/server-data/temp_workspace`) and another worktree's probe backend were left untouched.
- Behavior not directly proven and confidence consequence: none material.

## Platform / Runtime Targets

- Operating system / platform: macOS (Darwin 25.5.0), arm64
- Runtime and relevant framework versions: Node (repo toolchain), Vitest, Nuxt dev, `agy` 1.2.14, model `gemini-3.8-flash-low`
- Browser / engine: Google Chrome (headless, playwright-core)
- Device / viewport / locale: 1440×900 desktop, en-US; B04 390×844 `isMobile`/touch

## Lifecycle / Upgrade / Restart / Persisted-Data Checks

- Approved persisted-data decision: `Directly Usable — No Migration`
- Representative existing data exercised: a copied-folder capsule with the unchanged manifest and stored `autoExecuteTools:false` (E08); a linked capsule whose source was deleted (E07).
- Direct-use result and evidence: both resume through the normal restore path; CLI started with `--conversation` and skip-permissions.
- Version-specific runtime branch, dual read/write, or compatibility fallback observed: `No`
- Residual untested persisted-data risk: no capsule produced by the pre-change binary was used (shape-equivalent fixture); low.

## Durable Coverage Changed In The Codebase

- Repository-resident durable coverage added, updated, or removed this round: `Yes`

| Path / Test | Change | Requirement / Boundary | Execution Result |
| --- | --- | --- | --- |
| `autobyteus-server-ts/tests/e2e/runtime/agy-linked-skills-transport.e2e.test.ts` | Added | E01–E08: AC-001, AC-002, AC-004, AC-005, AC-006 (standalone, team, org, delegation, resume), AC-008, AC-009, REQ-006 | 8/8 Pass; mutation-proven |
| `autobyteus-server-ts/tests/fixtures/agy-failure-cli.mjs` | Updated | `permission_mode` follows `--dangerously-skip-permissions` (`request-review` otherwise, as real AGY reports); optional `AGY_FAKE_ARGV_LOG`; `linked_skills` case (capsule skill read report, real MCP `delegate_task` call, `--conversation` id echo) | All 5 fake-CLI suites pass (17/17) |

- Added or updated paths attached for proportional test-code review: `Yes`
- Diff or repository evidence supplied for removed paths: N/A (none removed)

## Other Execution Artifacts

| Artifact Path | Type / Purpose | Retained Or Temporary | Notes |
| --- | --- | --- | --- |
| `<ticket>/probes/agy-api-e2e-browser-probe.mjs` | B01–B04 browser/live probe | Retained (ticket) | Needs logged-in `agy`, Chrome, the local skills checkout |
| `<ticket>/api-e2e-evidence/` | Logs, live evidence, screenshots, `probe-evidence.json`, `real-skills-baseline.txt`, `run-live-suites.sh` | Retained (ticket) | — |

## Temporary Execution Methods / Scaffolding

| Path / Method | Why Needed | Result / Evidence | Cleanup Result |
| --- | --- | --- | --- |
| Flag-removal mutation in `agy-stream-process.ts` | Prove E-suite detects a skip-permissions regression | 7/8 fail as expected | Restored with `git checkout`; `git status` clean for the file |
| Temporary `tickets/in-progress/antigravity-cli-runtime-redesign-20260924/` | Pre-existing live test writes evidence there | Test 2/2 pass | Folder removed; evidence copied to `api-e2e-evidence/agy-mcp-team-live/` |
| `--explore` stack + in-app browser tab | Discover real selectors | — | Stack stopped (owned root removed); tab closed |
| `/tmp/mobile-try*.mjs` | Pairing exploration | — | Outside the repository; no repo effect |

## Dependencies Mocked Or Emulated

| Dependency | Method | Why Real Dependency Was Not Used | Confidence Limitation |
| --- | --- | --- | --- |
| `agy` CLI in E01–E08 | Scripted CLI `linked_skills` case; argv-faithful permission mode; reads skills from the capsule cwd; real MCP calls | Deterministic, model-free durable coverage | AGY's own skill discovery is not emulated; covered live by R6 and B01 |
| Phone network name | Chrome host mapping `probe-node → 127.0.0.1` | Pairing rejects loopback | Only DNS is emulated; pairing and transport are real |

## Result Summary

| Result | Case IDs | Summary / Reason |
| --- | --- | --- |
| Pass | R1, R2, E01–E08, R4, R5, R6 (+A1), B01–B04 | All AC-001..AC-009 and REQ-006 proven. AC-006 proven across standalone, team, org, delegation, mobile and resume entries |
| Not Tested | AC-003 live variant | Optional per the requirements. Durable unit coverage through real filesystem links exists |
| Out Of Scope | Mobile chat placeholder (see notes) | Unchanged code (`MobileChat.vue`) |

## Cleanup Performed

| Resource / Process / Data | Ownership | Cleanup Action | Result |
| --- | --- | --- | --- |
| E2E temp app-data dirs and in-process servers | API/E2E | Suite `afterAll` (terminate runs, delete definitions, close server, rm dir) | Done |
| Probe backend/Nuxt process groups and owned roots (explore + 4 runs) | API/E2E | SIGTERM process groups; rm owned roots | Done (`cleanup` in each `probe-evidence.json`) |
| Live-suite resources | API/E2E (suites) | Suites' own teardown | No owned `agy` or `dist/app.js` processes remain |
| User's skills checkout | User (read-only use) | None needed | `git status` identical to baseline (`real-skills-baseline.txt`) |
| Mutation edit, temp evidence folder | API/E2E | Reverted / removed | Done |

## Preliminary Classification

N/A — Pass.

## Latest Authoritative Result

- Result: `Pass`
- Final validation confidence: 95.3%
- Default `95%` confidence target met: `Yes`
- Any final applicable confidence category below `90%`: `No`
- Broader validation decision: `Required` → executed (Browser + Live) → Pass
- Critical acceptance criteria lacking direct proof: None
- Preliminary classification and recommended owner (on `Fail`): N/A
- Next recipient from `get_handoff_rules`: per rules (test-code review requested)
- Notes (residual, non-blocking):
  - ASM-001 (accepted RSK) is verified on `agy` 1.2.14 only.
  - CF-02: the chat footer explanation is a tooltip plus aria-label (accepted; for user verification).
  - CF-03: forms seeded from a pre-change run can store `autoExecuteTools:false` for AGY. E01–E08 deliberately submit `false`, and the server launches with skip-permissions every time.
  - Observation (pre-existing default behavior, not a defect): selecting AGY sets the draft's auto-approve to on. Switching back to another runtime leaves it on but editable.
  - Out-of-scope observation (not investigated, not attributed): after the first message from the phone's new-run setup, the mobile Chat view stayed on "Opening conversation… when hydration finishes" for about 3 minutes, while the AGY run was published and active server-side. This is unchanged code (`components/mobile/MobileChat.vue`) and may be a probe-timing artifact. A separate check is suggested.
  - Pre-existing test defect (unrelated): `tests/unit/agent-execution/backends/antigravity/agy-mcp-team-live.test.ts:66` writes evidence to the archived path `tickets/in-progress/antigravity-cli-runtime-redesign-20260924/`. Under `AGY_LIVE=1` it fails with `ENOENT` unless that folder exists. A separate small fix is suggested.
