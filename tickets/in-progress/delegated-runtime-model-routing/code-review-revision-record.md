# Code Review Revision Record — autobyteus-32

The latest `code-review-report.md` or `api-e2e-test-review-report.md` remains authoritative for its current result.

## Revision Index

| Revision ID | Canonical Review Report | Entry Point / Trigger | Prior Result | Current Result | Affected Finding IDs |
| --- | --- | --- | --- | --- | --- |
| CRR-001 | `code-review-report.md` | Implementation Review, round 1 / IR-001 | N/A | Fail (Local Fix) | CR-001, CR-002 |
| CRR-002 | `code-review-report.md` | Implementation Review, round 2 (Targeted Delta) / IR-002 | Fail (Local Fix) | Pass | CR-001, CR-002 (resolved) |
| CRR-003 | `code-review-report.md` | API/E2E Failure-Origin Review, round 3 / API-REV-001 | Pass | Fail (Design Impact + Local Fix) | CR-003, CR-004, CR-005 |
| CRR-004 | `code-review-report.md` | Implementation Review, round 4 (Full Re-Audit) / IR-003 | Fail (Design Impact + Local Fix) | Pass | CR-003, CR-004 (by SR-018), CR-005 (resolved) |
| CRR-005 | `api-e2e-test-review-report.md` | Proportional API/E2E Test-Code Review, round 1 / API-REV-002 Pass | Pass (implementation review CRR-004) | Pass | None |
| CRR-006 | `code-review-report.md` | Implementation Review, round 5 (Targeted Delta, delivery re-entry) / IR-004 | Pass | Pass | None (DEL-F1, DEL-F2 verified) |
| CRR-007 | `api-e2e-test-review-report.md` | Proportional API/E2E Test-Code Review, round 2 / API-REV-003 Pass | Pass (implementation review CRR-006) | Pass | None |

## Revision Entries

### CRR-001 — Initial implementation review of IR-001

- Canonical review report updated: `tickets/in-progress/delegated-runtime-model-routing/code-review-report.md`
- Review entry point and round: Implementation Review, round 1
- Review scope: `Full Review`
- Triggering role, report path, and finding or scenario IDs: Implementation Engineer, `implementation-handoff.md` (IR-001; code `d384968700`, `930597c730`, `4979559f7f`, `0cdaa0d480`); SCN-001…SCN-008
- Relevant solution revision IDs: `SR-015`, `SR-016`
- Relevant architecture-review revision IDs: `ARCH-REV-002`, `ARCH-REV-003`
- Relevant implementation revision IDs: `IR-001`
- Relevant API/E2E revision IDs: `N/A`
- Relevant delivery revision IDs: `N/A`
- Prior authoritative result: N/A
- Current authoritative result: Fail. Two Low implementation-owned Local Fixes (CR-001, CR-002); score 9.3/10 against the 9.2 bar.
- What changed in the review result and why: initial baseline.
- Supported product scenario / material-premise basis changes: none. C-03 (record shape overlap) was sent to the Solution Designer as design feedback. C-04…C-09 were rejected or confirmed with evidence.

#### Prior Finding Resolution

None

- New or remaining finding IDs: CR-001, CR-002
- Material score or classification changes: N/A (baseline)
- Recommended recipient: `/software_engineering_team/implementation_engineer`
- Remaining risks or uncertainty: report § Residual Risks (C-05 dead router backend, tool-call time-outs, Claude hook precedence, desktop check).

### CRR-002 — Targeted delta review of IR-002 (CR-001, CR-002, SR-017)

- Canonical review report updated: `tickets/in-progress/delegated-runtime-model-routing/code-review-report.md`
- Review entry point and round: Implementation Review, round 2
- Review scope: `Targeted Delta Review`. `git diff 0cdaa0d480 03d9860e82` changes 17 files, all in the two findings' files or in the decision record they and C-03 concern.
- Triggering role, report path, and finding or scenario IDs: Implementation Engineer, `implementation-handoff.md` (IR-002, `161d136c1b`, `03d9860e82`); CR-001, CR-002
- Relevant solution revision IDs: `SR-017`
- Relevant architecture-review revision IDs: `ARCH-REV-003`
- Relevant implementation revision IDs: `IR-002`
- Relevant API/E2E revision IDs: `N/A`
- Relevant delivery revision IDs: `N/A`
- Prior authoritative result: CRR-001 Fail (CR-001, CR-002)
- Current authoritative result: Pass; score 9.4/10, every category ≥ 9.3 (bar 9.2).
- What changed in the review result and why: both Local Fixes are resolved, and SR-017 (from C-03) removes the duplicated `notes`.
- Supported product scenario / material-premise basis changes: none. FU-006 (from implementation) is confirmed pre-existing and out of scope.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| CR-001 | Open (Local Fix) | Resolved | IR-002, SR-017 addendum, `161d136c1b` | `delegatingAgentName: string \| null` in server, parser and web types; B writes null with `fromNode`; local basename only (every identity has one, `root-execution-identity.ts:110-112`); receiver and log tests |
| CR-002 | Open (Local Fix) | Resolved | IR-002, `161d136c1b`, `03d9860e82` | `SIGNED_OUT` → `problem.signedOut` (en, zh-CN); `RUNTIME_UNAVAILABLE` unchanged; `modelRoutingPresentation.spec.ts` covers every code |

- New or remaining finding IDs: None
- Material score or classification changes: categories 5, 6 and 8 rise to 9.4; decision Fail → Pass.
- Recommended recipient: `/software_engineering_team/api_e2e_engineer`; informational notice to `/software_engineering_team/implementation_engineer`.
- Remaining risks or uncertainty: report § Residual Risks (C-05, tool-call time-outs, Claude hook precedence, the desktop check, the new `SIGNED_OUT` string for Product).

### CRR-003 — API/E2E failure-origin review of API-REV-001 (F-1, F-2, F-3)

- Canonical review report updated: `tickets/in-progress/delegated-runtime-model-routing/code-review-report.md`
- Review entry point and round: API/E2E Failure-Origin Review, round 3
- Review scope: `N/A` (failure-origin)
- Triggering role, report path, and finding or scenario IDs: API/E2E Engineer, `api-e2e-execution-coverage-report.md` (API-REV-001, Fail); F-1 (L-02), F-2 (L-01), F-3 (MR-09, API-13)
- Relevant solution revision IDs: `SR-017`
- Relevant architecture-review revision IDs: `ARCH-REV-003`
- Relevant implementation revision IDs: `IR-002`
- Relevant API/E2E revision IDs: `API-REV-001`
- Relevant delivery revision IDs: `N/A`
- Prior authoritative result: CRR-002 Pass (implementation review)
- Current authoritative result: Fail. CR-003 and CR-004 are `Design Impact` (Solution Designer); CR-005 is a `Local Fix` (implementation), carried with the revision.
- What changed in the review result and why:
  - Live evidence shows Codex merges `writable_roots` from config files despite the pinned mode.
  - The confined Claude session still loads claude.ai and user connectors and `Skill`.
  - A failed router turn leaves an inactive run that `ModelRouterAgent` keeps reusing.
- Supported product scenario / material-premise basis changes: C-05 was reclassified from rejected to Supported Explicit Edge Scenario (SR-012 point 4, SCN-002). C-10 and C-11 were added and promoted.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| CR-001 | Resolved (CRR-002) | Resolved | IR-002 | RC-40: B's record has `fromNode` and a null run and name |
| CR-002 | Resolved (CRR-002) | Resolved | IR-002 | unchanged |

- New or remaining finding IDs: CR-003, CR-004, CR-005
- Material score or classification changes: category 8 revised below 9.2; decision Pass → Fail.
- Recommended recipient: `/software_engineering_team/solution_designer`
- Remaining risks or uncertainty: whether Codex accepts a full sandbox policy or config overrides at thread start; whether strict MCP settings remove claude.ai connectors (both need live checks).

### CRR-004 — Full re-audit of IR-003 (SR-018, CR-005)

- Canonical review report updated: `tickets/in-progress/delegated-runtime-model-routing/code-review-report.md`
- Review entry point and round: Implementation Review, round 4
- Review scope: `Full Re-Audit`. Shared interfaces lost this ticket's own `toolConfinement` additions. Those files are byte-identical to base, so round-1 evidence carries forward for the areas the delta does not touch.
- Triggering role, report path, and finding or scenario IDs: Implementation Engineer, `implementation-handoff.md` (IR-003, `424e9bdd62`); CR-003, CR-004, CR-005
- Relevant solution revision IDs: `SR-018`
- Relevant architecture-review revision IDs: `ARCH-REV-004`
- Relevant implementation revision IDs: `IR-003`
- Relevant API/E2E revision IDs: `API-REV-001`
- Relevant delivery revision IDs: `N/A`
- Prior authoritative result: CRR-003 Fail (CR-003, CR-004 Design Impact; CR-005 Local Fix)
- Current authoritative result: Pass; score 9.4/10, every category ≥ 9.3 (bar 9.2).
- What changed in the review result and why:
  - The user withdrew router confinement (SR-018), so CR-003 and CR-004 no longer apply, and the code is removed as a clean cut.
  - CR-005 is fixed by restoring through the command-ready path, with a queue that does not stall on a stopped run.
- Supported product scenario / material-premise basis changes: SCN-008 (confined router) is withdrawn by SR-018. AC-011 is reworded (template tools, no collaboration tools, normal tests only).

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| CR-003 | Open (Design Impact) | Resolved by requirement change | SR-018, ARCH-REV-004, `424e9bdd62` | Requirements SR-018 REQ-003/AC-011/QR-004; Codex bootstrapper byte-identical to base; no `toolConfinement` left |
| CR-004 | Open (Design Impact) | Resolved by requirement change | SR-018, ARCH-REV-004, `424e9bdd62` | Claude session options and client byte-identical to base; `claude-workspace-confinement.ts` deleted |
| CR-005 | Open (Local Fix) | Resolved | IR-003, `424e9bdd62` | `resolveCommandReadyAgentRun` in `ensureOnce`; `isIdle` free for a stopped or errored run; `send` re-ensures; unit tests with the real `ModelRouterAgent` (the next routing answered in under 2 s); MR-09 live pending |
| CR-001, CR-002 | Resolved (CRR-002) | Resolved | IR-002 | unchanged |

- New or remaining finding IDs: None
- Material score or classification changes: category 8 back to 9.4; decision Fail → Pass.
- Recommended recipient: `/software_engineering_team/api_e2e_engineer`; informational notice to `/software_engineering_team/implementation_engineer`.
- Remaining risks or uncertainty: MR-09 live; RSK-006 (the router unconfined, accepted); the desktop check.

### CRR-005 — Proportional test-code review after API/E2E round 2 (API-REV-002 Pass)

- Canonical review report updated: `tickets/in-progress/delegated-runtime-model-routing/api-e2e-test-review-report.md` (new)
- Review entry point and round: Successful API/E2E Test-Code Review, round 1
- Review scope: `N/A` (test review)
- Triggering role, report path, and finding or scenario IDs: API/E2E Engineer, `api-e2e-execution-coverage-report.md` (API-REV-002 Pass, `bf4dabf99c`; round 1 `64e5b57932`)
- Relevant solution revision IDs: `SR-018`
- Relevant architecture-review revision IDs: `ARCH-REV-004`
- Relevant implementation revision IDs: `IR-003`
- Relevant API/E2E revision IDs: `API-REV-001`, `API-REV-002`
- Relevant delivery revision IDs: `N/A`
- Prior authoritative result: CRR-004 Pass (implementation review)
- Current authoritative result: Pass. Six durable test paths and the package script reviewed: no findings, two non-blocking notes.
- What changed in the review result and why: the first test review, because API/E2E round 1 failed and round 2 passed.
- Supported product scenario / material-premise basis changes: none.

#### Prior Finding Resolution

None

- New or remaining finding IDs: None
- Material score or classification changes: N/A
- Recommended recipient: `/software_engineering_team/delivery_engineer`
- Remaining risks or uncertainty: the user's desktop check (Done-when); the new `SIGNED_OUT` string and the presentation observations for Product; FU-001…FU-004 and FU-006…FU-009 (FU-005 withdrawn).

### CRR-006 — Delivery re-entry: targeted delta review of IR-004 (DEL-F1, DEL-F2)

- Canonical review report updated: `tickets/in-progress/delegated-runtime-model-routing/code-review-report.md`
- Review entry point and round: Implementation Review, round 5
- Review scope: `Targeted Delta Review`. `git diff e2e4f1a1ab f48af0176a` changes 4 web files, all inside DEL-F1 and DEL-F2.
- Triggering role, report path, and finding or scenario IDs: Implementation Engineer, `implementation-handoff.md` (IR-004); delivery `release-deployment-report.md` DEL-F1, DEL-F2
- Relevant solution revision IDs: `SR-018`
- Relevant architecture-review revision IDs: `ARCH-REV-004`
- Relevant implementation revision IDs: `IR-004`
- Relevant API/E2E revision IDs: `API-REV-002`
- Relevant delivery revision IDs: delivery's blocked post-integration verification (`e2e4f1a1ab`)
- Prior authoritative result: CRR-005 Pass (test review); CRR-004 Pass (implementation review)
- Current authoritative result: Pass; score unchanged at 9.4/10.
- What changed in the review result and why:
  - The built-in ID mirror includes the router. Its only effect is that the router is never offered in the New chat `@` list, and the server agrees.
  - "Configuration" wording in the hints and the panel label.
- Supported product scenario / material-premise basis changes: none.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| DEL-F1 (delivery) | Open (blocking) | Resolved | IR-004, `f48af0176a` | Mirror lists `autobyteus-model-router`; contract spec and mention-eligibility spec pass (IMP-12) |
| DEL-F2 (delivery) | Open (minor) | Resolved | IR-004, `f48af0176a` | en and zh-CN hints and the panel label say Configuration / 配置 |

- New or remaining finding IDs: None
- Material score or classification changes: none.
- Recommended recipient: `/software_engineering_team/api_e2e_engineer`; informational notice to `/software_engineering_team/implementation_engineer`.
- Remaining risks or uncertainty: `memory.spec.ts`'s cause under load (TESTING.md Rule 9, delivery's triage); the optional internal-identifier rename; the user's desktop check.

### CRR-007 — Proportional test-code review after API/E2E round 3 (API-REV-003 Pass)

- Canonical review report updated: `tickets/in-progress/delegated-runtime-model-routing/api-e2e-test-review-report.md`
- Review entry point and round: Successful API/E2E Test-Code Review, round 2
- Review scope: `N/A` (test review). The only durable change is MRD-08 in `autobyteus-web/tests/e2e/model-routing-decisions-probe.mjs` (`9e8ac5e423`).
- Triggering role, report path, and finding or scenario IDs: API/E2E Engineer, `api-e2e-execution-coverage-report.md` (API-REV-003 Pass, § Round 3 Cases); DEL-F1
- Relevant solution revision IDs: `SR-018`
- Relevant architecture-review revision IDs: `ARCH-REV-004`
- Relevant implementation revision IDs: `IR-004`
- Relevant API/E2E revision IDs: `API-REV-003`
- Relevant delivery revision IDs: delivery's post-integration verification (`e2e4f1a1ab`, DEL-F1/DEL-F2)
- Prior authoritative result: CRR-006 Pass (implementation review)
- Current authoritative result: Pass. MRD-08 uses the real user steps, a positive control and a reset setting; no findings.
- What changed in the review result and why: the post-merge rerun added one probe case.
- Supported product scenario / material-premise basis changes: none.

#### Prior Finding Resolution

None

- New or remaining finding IDs: None
- Material score or classification changes: N/A
- Recommended recipient: `/software_engineering_team/delivery_engineer`
- Remaining risks or uncertainty: the user's desktop check; Grok live on the merged base (account usage); the status reads active while the router's model is out of usage (observation).
