# API/E2E Execution Coverage Report

## Execution Round Meta

All paths are under `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-built-in-project-task-manager/tickets/in-progress/remove-built-in-project-task-manager/`.

- Requirements Doc: `requirements-doc.md` (Approved, SR-001)
- Investigation Notes: `investigation-notes.md`
- Solution Revision Record: `solution-revision-record.md`
- Design Spec (required on every route): `design-spec.md` (SR-002)
- Supplemental Task Artifacts: None
- Design Review Report: `design-review-report.md`
- Architecture Review Revision Record: `architecture-review-revision-record.md` (ARCH-REV-001)
- Implementation Handoff: `implementation-handoff.md`
- Implementation Revision Record: `implementation-revision-record.md` (IR-001)
- Code Review Report: `code-review-report.md` (CRR-001)
- Code Review Revision Record: `code-review-revision-record.md`
- Delivery Revision Record (delivery re-entry only): N/A
- Relevant Delivery Revision IDs: N/A
- Coverage Investigation: `api-e2e-coverage-investigation.md`
- API/E2E Test-Case Ledger (when used): `api-e2e-test-case-ledger.md`
- API/E2E Revision Record: `api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-001`
- Current Execution Round: 1
- Trigger: CRR-001 Pass (commit `62af418df`)
- Prior Round Reviewed: N/A
- Latest Authoritative Round: 1

## Routing Classification

- Task size: `Medium`
- Architectural risk: `High`
- Input route: `Reviewed`
- Successful-output route: `Code Review`
- Proportional test-code review decision: `Required`

## Investigation And Execution Basis

- Coverage investigation artifact: `api-e2e-coverage-investigation.md`
- Investigation completed before durable coverage changes or final execution: `Yes`
- Investigation plan followed: `Yes`. Temporary probes TMP-001 and TMP-002 ran as planned, and were combined into one probe script.
- Existing coverage decisions revised during execution, with evidence: None. Every existing test stayed `Still Valid` and passed.
- Reroute required before or during execution: `No`
- Notes: The dist was rebuilt from `62af418df` before every built-process run. No user app/data was used.

## Test-Case Ledger Reconciliation

- Ledger path: `api-e2e-test-case-ledger.md`
- Ledger initialized before execution: `Yes`
- Every completed case recorded immediately: `Yes`
- Long-running case checkpoints recorded when needed: `Yes` (E-002 payload capture, negative control, probe iterations)
- Ledger reconciled into this report: `Yes`
- Last durably recorded event: 12 (TMP-001/TMP-002 run 7 Pass; cleanup)
- Cases still running, interrupted, or not started: None
- Interruption, context-compression, or rerun note: None. Probe attempts 1–6 failed only on probe mechanics (path realpath, collapsed history rows, composer locator). Each is retained under `api-e2e-evidence/tmp-001-002-attempt*`. None was a product failure.

| Case ID | Final Result | Last Event | Evidence / Artifact Path | Reconciled Result / Follow-Up |
| --- | --- | --- | --- | --- |
| R-001 | Pass | 1 | `api-e2e-evidence/r-001-build.log` | — |
| E-001 | Pass | 5 | `api-e2e-evidence/e-001-004-final.log` | — |
| E-002 | Pass | 5 | `e-001-004-final.log`, `e-002-continue-events.json`, `e-002-history-and-projection.json` | — |
| E-003 | Pass | 5 | `e-001-004-final.log` | — |
| E-004 | Pass | 5 | `e-001-004-final.log` | — |
| R-002 | Pass | 6 | `r-002-server-focused.log` | — |
| R-003 | Pass | 7 | `r-003-projects-e2e.log` | — |
| R-004 | Pass | 8 | `r-004-projects-unit.log` | — |
| R-005 | Pass | 9 | `r-005-web.log` | — |
| TMP-001 | Pass | 12 | `api-e2e-evidence/tmp-001-002-run7/result.json`, `backend-base.log`, `backend-new.log` | — |
| TMP-002 | Pass | 12 | `tmp-001-002-run7/result.json`, `TMP-002*.png` | — |

## Compatibility / Legacy Scope Check

- Reviewed requirements/design introduce, tolerate, or ambiguously describe backward compatibility in scope: `No`
- Compatibility-only or legacy-retention behavior observed in implementation: `No`. There is no alias, catalog filter or retired-ID list. The literal appears only in the migration subsystem and in retirement tests.
- Approved persisted-data transition followed without unnecessary migration or version-specific runtime fallback: `Yes`
- Durable coverage added or retained only for compatibility-only behavior: `No`. The new E2E proves the approved migration and the approved deleted-agent consequence.
- If compatibility-related invalid scope was observed, reroute classification used: N/A
- Upstream recipient notified: N/A

## Changed Boundary And Evidence Matrix

| Case ID | Behavior / Requirement / AC IDs | Changed Boundary | Execution Surface / Mode | Evidence Type | Result | Evidence / Artifact |
| --- | --- | --- | --- | --- | --- | --- |
| R-001 | AC-001 | Build output | `build:full` + sanitized built-in smoke | Durable | Pass | `r-001-build.log` |
| E-001 | AC-002, AC-003, AC-006 (agents) | Startup migration → bootstrap → catalog | Built Studio `dist/app.js`, GraphQL, SQLite record | Durable | Pass | `e-001-004-final.log` |
| E-002 | AC-004, AC-006, AC-008, AC-009, QR-001 | FAILED window → restart retry; history; WS continue; `@` | Built Studio, GraphQL + WS, emulated LM Studio | Durable | Pass | `e-001-004-final.log`, `e-002-*.json` |
| E-003 | AC-001, AC-005 | Fresh install | Built Studio | Durable | Pass | `e-001-004-final.log` |
| E-004 | AC-002, AC-004, QR-001 | Standalone entrypoint, shared record | Built `dist/index.js` host + Studio | Durable | Pass | `e-001-004-final.log` |
| R-002 | AC-001..006, AC-009 | In-process unit + integration | Vitest | Durable | Pass | `r-002-server-focused.log` |
| R-003, R-004 | AC-007 | Projects/Tasks/tools | Built-dist HTTP/MCP E2E + unit | Durable | Pass | `r-003-*.log`, `r-004-*.log` |
| R-005 | AC-009, REQ-006 | Web mirror contract, mention eligibility, history store | Nuxt unit | Durable | Pass | `r-005-web.log` |
| TMP-001 | AC-002, AC-006, AC-008; SCN-002/004 | Real beta-written data upgraded by the new version | Base dist `1aa918298` → new dist on one owned data dir | Temporary / Live | Pass | `tmp-001-002-run7/` |
| TMP-002 | AC-008 (UNK-001) | History panel, old-run reading, continue failure rendering, app continuity | Nuxt dev + headless Chrome against the upgraded backend | Browser | Pass | `tmp-001-002-run7/TMP-002*.png`, `result.json` |

## Additional Repository Coverage Execution

| Order | Command | Working Directory / Configuration | Boundary Or Scenario Proven | Result | Evidence / Output Path |
| --- | --- | --- | --- | --- | --- |
| NC-1 | Negative control: the dist registration of the new migration was commented out and E-001..E-004 rerun; the dist was then restored (`cmp` identical) | worktree root | The E2E discriminates (it fails when the migration is not registered) | Pass (4/4 failed as expected) | `api-e2e-evidence/negative-control-unregistered.log` |

## Validation Confidence Scorecard (Mandatory)

| Confidence Category | Post-Repository Score | Final Score | Change | New / Final Supporting Evidence | Residual Uncertainty |
| --- | --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 95% | 97% | +2 | AC-001..AC-009 proven directly through both built entrypoints. AC-008 also proven on real beta-written history and in the browser. | AC-010 (docs) belongs to Delivery |
| Changed-boundary execution directness | 95% | 97% | +2 | Real process start/stop, real record store, GraphQL/WS; the real beta build wrote the source data | — |
| Cross-boundary integration realism and mock gap | 88% | 96% | +8 | TMP-001: the base server wrote the installed copy (byte-equal to FX-001) and the old run; the new server upgraded it. TMP-002: the real web frontend rendered it. | Inference is emulated (not relevant to the change) |
| Environment, configuration, identity, and fixture fidelity | 92% | 96% | +4 | The fixture is proven byte-identical to beta output. Owned HOME/DB/package root. The failure is a real EACCES (read-only folder). | The failure trigger is permission-based; other OS errors share the same code path (unit-tested) |
| Failure, edge-case, lifecycle, and recovery evidence | 95% | 95% | 0 | FAILED → RESTART_TO_RETRY, `canRetry=false`, manual run rejected, startup and new work continue, next start retries. This holds on both entrypoints. Restart no-op is proven. | Packaged Electron restart not exercised (same server entry) |
| User-surface, browser, and desktop-shell confidence | 80% | 94% | +14 | Browser: old run listed under "Project Task Manager (1)", messages rendered, continue shows inline "An Error Occurred — AgentDefinition with ID autobyteus-project-task-manager not found.", status "Error", run stays listed, other run continues; 0 page/console errors | Not run in the packaged Electron shell (no shell code changed) |
| Durable regression coverage quality and relevance | 95% | 95% | 0 | New 4-case built-entrypoint E2E with frozen beta fixture + provenance; negative control proves it discriminates | Browser/cross-version proof is temporary by design |

- Overall post-repository confidence: 91.4%
- Overall final confidence: 95.7%
- Calculation method: simple average of the seven categories.
- Confidence change produced by broader validation: +4.3 points. It closed the two sub-90 gaps: cross-version realism and the UNK-001 user surface.
- Every critical acceptance criterion directly proven: `Yes`
- Any final applicable category below `90%`: `No`
- Default final confidence target of `95%` met: `Yes`
- Confidence-limiting residual risks:
  - The packaged desktop shell was not exercised. Its embedded server uses the same `dist/app.js` startup path, and no shell code changed.
  - AC-010 docs review belongs to Delivery.

## Broader Validation Decision And Execution

- Decision and selected execution mode from the coverage investigation: `Required`. Two modes ran:
  - Lifecycle/Live API: a cross-version upgrade (TMP-001).
  - Browser: a web-equivalent renderer against the upgraded backend (TMP-002).
- Material deviation from the planned mode or rationale: None. Both probes ran in one script against one owned data root.
- Confidence gap or residual risk actually addressed:
  - Category 3 (seeded data vs real beta-written data).
  - Category 6 (UNK-001 UI presentation; design escalation trigger "breaking the history list or crashing the app").
- If `Not Required`, direct evidence that made broader validation unnecessary: N/A
- If `Blocked`, exact unavailable dependency or access and attempted alternatives: N/A
- Startup order, commands, and readiness results:
  1. `git worktree add --detach /tmp/ptm-base-api-e2e 1aa918298`, then `pnpm install --frozen-lockfile --prefer-offline`, `prebuild` and `build` there (exit 0; base dist templates include `project-task-manager`).
  2. `node tickets/.../api-e2e-evidence/tmp-001-002-upgrade-browser-probe.mjs /tmp/ptm-base-api-e2e <out>` from the worktree root runs these steps, each gated on `/rest/health` or `/workspace` readiness:
     - base `dist/app.js` on a free port;
     - stop;
     - new `dist/app.js` on the same port and data;
     - `nuxt dev` on a free port with `BACKEND_NODE_BASE_URL`;
     - headless Chrome 154.
- Environment choices that materially affected the run:
  - One `mkdtemp` root holds `data`, `HOME`, the package root and the workspace.
  - `DATABASE_URL` points at the owned SQLite file.
  - `AUTOBYTEUS_AGENT_PACKAGE_ROOTS` is an owned package root with `agents/project-task-manager`.
  - `LMSTUDIO_HOSTS` points at the in-probe emulated provider.
  - The real base path is used via `realpath`, because the app entry only starts when argv[1] equals its module URL.
- Seed data, fixtures, identities, authentication, permissions, or session state: everything was created through the base server's public GraphQL/WS: the installed copy (by its own bootstrap), the old PTM run, a user agent "Field Notes Writer" with its run, and a Project "Launch". There is no auth.

| Scenario / Journey Step | Expected Observable Result | Actual Observable Result | DOM / Screenshot / Log / API / Process Evidence | Result |
| --- | --- | --- | --- | --- |
| Base (beta-equivalent) start | Installed copy written; catalog has the duplicate; no new migration | `agents/autobyteus-project-task-manager/{agent.md,agent-config.json}` byte-equal to FX-001; PTMs `[autobyteus-project-task-manager, project-task-manager]`; migration record absent | `result.json` TMP-001a | Pass |
| Old PTM conversation on base | Real run with a reply | Run `project_task_manager_779d…` answered "Reply to: launch plan" | `result.json`, `backend-base.log` | Pass |
| New version start on the same data | Removed once; one PTM; everything else byte-identical | SUCCEEDED, attempts 1, "Scanned 1; migrated 1; skipped 0; failed 0."; folder absent; PTMs `[project-task-manager]`; package root, user agent, projects and both run folders identical | `result.json` TMP-001b | Pass |
| History API | Old run listed under its stored name | Group `autobyteus-project-task-manager` / "Project Task Manager", run offline | `result.json` TMP-001b | Pass |
| Browser history panel | Old run visible | Rows "Field Notes Writer (1)" and "Project Task Manager (1)"; runs "Write field notes." and "Plan my launch Project." | `TMP-002a-history.png` | Pass |
| Open old run | Messages readable | Header "Plan my launch Project. · Offline"; user message plus "Reply to: launch plan" | `TMP-002b-old-run-open.png` | Pass |
| Continue old run | Existing not-found failure; nothing worse | Inline red card "An Error Occurred — AgentDefinition with ID autobyteus-project-task-manager not found."; header and history dot "Error"; no reply; no page/console errors | `TMP-002c-continue-old-run.png` | Pass |
| App keeps working | Other conversation continues; old run still listed | "Write more field notes." answered (2 replies); status Idle; old run still listed; health 200 | `TMP-002d-other-run-continued.png` | Pass |

## Platform / Runtime Targets

- Operating system / platform: macOS 26.5.2 (Darwin 25.5.0)
- Runtime and relevant framework versions: Node v22.23.1, Vitest 4.0.18, Nuxt 3.21.1, server dist from `62af418df`, base dist from `1aa918298`
- Browser / engine and version: Google Chrome 154.0.8037.98, headless (playwright-core)
- Device, viewport, locale, timezone, or accessibility settings: 1440×1000, `en-US`, English UI preference

## Lifecycle / Upgrade / Restart / Persisted-Data Checks

- Approved persisted-data decision: `Migration Required` (an approved feature-removal deletion, DEC-001 = A)
- Representative existing data exercised:
  - E-001..E-004: the installed copy from FX-001 (beta bytes), a package-root PTM and a user agent. E-002 adds a real Project, an old PTM run and another run created during the FAILED window.
  - TMP-001: the same kinds of data, all written by the real base build.
- Migration completion/recovery evidence:
  - present ⇒ MIGRATED/SUCCEEDED (E-001, E-004, TMP-001)
  - absent ⇒ SKIPPED "Not present." (E-003)
  - EACCES ⇒ FAILED, "Could not remove …", `RESTART_TO_RETRY`, `canRetry=false`, `runAppDataMigration` → `success:false, migration:null`. Startup and new work continue (E-002, E-004).
  - next start ⇒ SUCCEEDED, attempts 2 (E-002; E-004 across the standalone host and then Studio)
  - terminal success never reruns (E-001, E-003; attempts stay 1)
- Version-specific runtime branch, dual read/write, or compatibility fallback observed: `No`
- Residual untested persisted-data risk:
  - SCN-007 (downgrade) is unsupported.
  - A partially removed folder is covered by the unit retry test only. Its rerun is the same idempotent `rm`.

## Durable Coverage Changed In The Codebase

- Repository-resident durable coverage added, updated, or removed this round: `Yes`

| Path / Test | Change | Requirement / Boundary | Execution Result |
| --- | --- | --- | --- |
| `autobyteus-server-ts/tests/e2e/app-data-migrations/remove-built-in-project-task-manager-startup.e2e.test.ts` | Added | E-001..E-004: AC-001..AC-006, AC-008, AC-009, QR-001 through both built entrypoints | 4/4 Pass; negative control 4/4 Fail as expected |
| `autobyteus-server-ts/tests/fixtures/app-data-migrations/retired-built-in-project-task-manager/{agent.md,agent-config.json,README.md}` | Added | Frozen beta installed copy (sha256 recorded); TMP-001 proved byte equality with a real base-build install | Used by E-001, E-002, E-004 |

- Added or updated paths attached for proportional test-code review: `Yes`
- Diff or repository evidence supplied for removed paths: N/A (none removed)
- Prerequisite: `pnpm -C autobyteus-server-ts build` (current dist). This is stated in the file header, as in the sibling startup-migration E2E.

## Other Execution Artifacts

| Artifact Path | Type / Purpose | Retained Or Temporary | Notes |
| --- | --- | --- | --- |
| `api-e2e-evidence/*.log` | Command outputs (R-001..R-005, E-001..E-004, negative control) | Retained | — |
| `api-e2e-evidence/e-002-continue-events.json`, `e-002-history-and-projection.json` | AC-008 WS events and history/projection payloads | Retained | Captured with temporary instrumentation that was reverted (`cmp` identical) |
| `api-e2e-evidence/tmp-001-002-run7/` | Probe result JSON, backend/frontend logs, screenshots | Retained | Authoritative probe run |
| `api-e2e-evidence/tmp-001-002-attempt1..6-*/` | Earlier probe attempts that failed on probe mechanics | Retained | No product failure |

## Temporary Execution Methods / Scaffolding

| Path / Method | Why Needed | Result / Evidence | Cleanup Result |
| --- | --- | --- | --- |
| `api-e2e-evidence/tmp-001-002-upgrade-browser-probe.mjs` | Cross-version upgrade + browser journey (a durable test cannot depend on a historical build) | Pass (run 7) | Script retained as evidence; owned root removed by the script |
| `/tmp/ptm-base-api-e2e` detached git worktree at `1aa918298` + build | Base (beta-equivalent) server | Built and used | `git worktree remove --force` + `prune`; directory gone; not in `git worktree list` |
| Temporary E-002 instrumentation | Capture the exact continue payload | `e-002-*.json` | Reverted; `cmp` identical to the final file |
| Dist negative control (one line commented in `dist/.../app-data-migration-registry.js`) | Prove the E2E discriminates | 4/4 fail | Restored from backup; `cmp` identical |

## Dependencies Mocked Or Emulated

| Dependency | Method | Why Real Dependency Was Not Used | Confidence Limitation |
| --- | --- | --- | --- |
| LLM inference (LM Studio) | In-test/in-probe OpenAI-compatible streaming server | Only needed to create real run history; no paid or nondeterministic provider | None for this change |
| "Folder cannot be removed" | `chmod 0555` on the installed copy (real EACCES from `rm`) | Deterministic real OS failure | Other error codes share the same branch (unit-tested) |

## Result Summary

| Result | Case IDs | Summary / Reason |
| --- | --- | --- |
| Pass | R-001..R-005, E-001..E-004, TMP-001, TMP-002 | All acceptance criteria in scope proven. AC-008/UNK-001 shows the existing not-found failure, which is not worse; the design escalation trigger is not met. |
| Out Of Scope | AC-010 | Docs review at Delivery (grep sanity found no stale "shipped manager" claim) |
| Not Tested | SCN-007, PREM-001 | Unsupported/Contrived |

## Cleanup Performed

| Resource / Process / Data | Ownership | Cleanup Action | Result |
| --- | --- | --- | --- |
| E2E temp roots (`retired-ptm-startup-e2e-*`) and Studio/standalone children | Test-owned | `afterEach`: stop children, close provider, restore permissions, `rm` root | None left in `$TMPDIR` |
| Probe root (`ptm-upgrade-probe-*`), backends, Nuxt, Chrome, provider | Probe-owned | `finally`: browser close, SIGTERM process groups, provider close, `rm` root | `cleanup` receipts in `result.json`: all SIGTERM / closed / `ownedRootRemoved: true`; no leftover processes (`ps`) |
| Base worktree `/tmp/ptm-base-api-e2e` | API/E2E-owned | `git worktree remove --force` + `prune` | Removed |
| User's running AutoByteus and its data | Not owned | Not touched | — |

## Preliminary Classification

N/A (Pass).

## Latest Authoritative Result

- Result: `Pass`
- Final validation confidence: 95.7%
- Default `95%` confidence target met: `Yes`
- Any final applicable confidence category below `90%`: `No`
- Broader validation decision: `Required`, executed: cross-version lifecycle probe (TMP-001) and browser journey (TMP-002), both Pass
- Critical acceptance criteria lacking direct proof: None (AC-010 belongs to Delivery)
- Preliminary classification and recommended owner (on `Fail`): N/A
- Next recipient from `get_handoff_rules`: per rules (proportional test-code review of the added E2E and fixture)
- Notes:
  - UNK-001 is closed. Continuing an old built-in conversation fails visibly with "AgentDefinition with ID autobyteus-project-task-manager not found." (ACK `RUN_NOT_FOUND`, status `error`). The run stays listed and readable, and other conversations and new work are unaffected.
  - The design escalation trigger is not met.
