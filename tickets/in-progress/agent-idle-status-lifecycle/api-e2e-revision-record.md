# API/E2E Revision Record

## Canonical Artifacts

- Coverage investigation: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-idle-status-lifecycle/tickets/in-progress/agent-idle-status-lifecycle/api-e2e-coverage-investigation.md`
- Execution coverage report: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-idle-status-lifecycle/tickets/in-progress/agent-idle-status-lifecycle/api-e2e-execution-coverage-report.md`
- Evidence directory: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-idle-status-lifecycle/tickets/in-progress/agent-idle-status-lifecycle/execution-evidence`

This record is a chronological navigation and routing index. The canonical artifacts above remain the authoritative detailed result.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| `API-REV-001` | Code review round 4 / API-E2E round 6 | `IR-004`; `CRR-008` | `N/A` | `Blocked / 93.6%` |
| `API-REV-002` | Code review round 5 / API-E2E round 7 | `IR-005`; `CRR-010` | `Blocked / 93.6%` | `Pass / 97.9%` |

## Revision History

### API-REV-001 — Initial Baseline

- Recorded: `2026-07-29`
- Canonical execution round: `6`
- Integrated head evaluated: `ac8712b828b3221962ddb68e82aa4d54ecacb240`
- Recorded base evaluated: `origin/personal@965f97685c08569a98186b2a894243c0b3f602d3`
- Result: `Blocked`
- Final confidence: `93.6%`
- Affected scenario IDs:
  - `APIE2E-LC-001-R6`
  - `APIE2E-LC-EM-R6`
  - `APIE2E-LC-CODEX-R6`
  - `APIE2E-LC-CLAUDE-R6`
  - `APIE2E-LC-BROWSER-R6`
  - `APIE2E-LC-AUTOBYTEUS-STANDALONE-R6`
  - `APIE2E-LC-AUTOBYTEUS-TEAM-R6`
- Durable test delta in round 6: `None`
- Prior revision record: `N/A` — no earlier API/E2E revision record existed.
- Authoritative result summary: current-base repository, Codex, Claude, and Chrome validation passed; successful AutoByteus standalone/team validation was blocked because the supplied DeepSeek credential returned HTTP 401.
- Routing at completion: returned to the user with the exact missing credential dependency; no successful-test handoff was made.
- Subsequent routing note: on `2026-07-29`, the user requested an implementation-owned refresh/rebase onto the substantially changed latest `origin/personal`. API/E2E round 6 therefore remains historical evidence for the pre-refresh head and must be rerun after implementation and renewed source review.

### API-REV-002 — v1.4.28 Current-Head Revalidation Pass

- Recorded: `2026-07-29`
- Triggering role, report path, and round: `code_reviewer`; `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-idle-status-lifecycle/tickets/in-progress/agent-idle-status-lifecycle/code-review-report.md`; implementation-source review round 5 / API-E2E round 7.
- Integrated head evaluated: `740bec4cd4f03a198e0cc7cd8e575351e607991f`
- Recorded base and merge base evaluated: `origin/personal@6caf809303294252c109420b238588f0c68aca6a`
- Triggering finding or scenario IDs: renewed current-base coverage gate; recheck prior `APIE2E-LC-AUTOBYTEUS-STANDALONE-R6` and `APIE2E-LC-AUTOBYTEUS-TEAM-R6`; validate v1.4.28 token-pipeline and Event Monitor coexistence.
- Related revision IDs: `IR-005`; `CRR-010`.
- Why recorded: historical `API-REV-001` was blocked on a pre-rebase head and could not sign off the v1.4.28-integrated source.
- Coverage/durable-test delta:
  - Added `autobyteus-server-ts/tests/e2e/helpers/live-runtime-secret-vault-helpers.ts`.
  - Updated `autobyteus-server-ts/tests/e2e/runtime/agent-runtime-graphql.e2e.test.ts`.
  - Updated `autobyteus-server-ts/tests/e2e/runtime/autobyteus-team-runtime-graphql.e2e.test.ts`.
  - No production source and no durable scenario were removed.
- Scenarios rechecked or added:
  - `APIE2E-LC-REPO-R7`
  - `APIE2E-LC-CODEX-R7`
  - `APIE2E-LC-CLAUDE-R7`
  - `APIE2E-LC-AUTOBYTEUS-R7`
  - `APIE2E-LC-BROWSER-R7`
  - `APIE2E-LC-TOKEN-R7`
  - `APIE2E-LC-DEEPSEEK-R7`
- Execution delta: current 29-file server lifecycle/Codex/token matrix, current web/SDK/build checks, live standalone/team execution for Codex/Claude/AutoByteus, focused token idempotency recheck, and isolated backend/Nuxt/Chrome execution.

#### Prior Failure Resolution

| Prior Scenario / Failure Reference | Previous Classification | Current Resolution | Evidence |
| --- | --- | --- | --- |
| `APIE2E-LC-AUTOBYTEUS-STANDALONE-R6` | External DeepSeek credential blocker | AutoByteus standalone create/run/idle/terminate/restore/continue passed on current head through the configured authorized AutoByteus remote model after repairing the stale v1.4.28 vault fixture. | `execution-evidence/105`–`109`; authoritative success `109-round7-live-autobyteus-remote-standalone.log` |
| `APIE2E-LC-AUTOBYTEUS-TEAM-R6` | External DeepSeek credential blocker | Real two-member `send_message_to`, reference projection, and every-member terminate/restore/continue passed through the same authorized AutoByteus route. | `execution-evidence/110-round7-live-autobyteus-remote-team.log` |
| Direct DeepSeek readiness | External provider identity | Still HTTP 401 at both model-list endpoints and direct live attempt; retained as a provider-specific residual, not the successful AutoByteus runtime route. | `execution-evidence/99-round7-deepseek-credential-recheck.log`; `108-round7-live-autobyteus-standalone-vault-fixture-rerun.log` |

- Canonical artifacts updated:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-idle-status-lifecycle/tickets/in-progress/agent-idle-status-lifecycle/api-e2e-coverage-investigation.md` — authoritative Round 7 checkpoint, broader-validation result, scorecards and decision.
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-idle-status-lifecycle/tickets/in-progress/agent-idle-status-lifecycle/api-e2e-execution-coverage-report.md` — authoritative Round 7 Pass.
  - This revision record.
- Prior result and confidence: `Blocked / 93.6%` (`API-REV-001`, historical head).
- Current result and confidence: `Pass / 97.9%`.
- New or remaining failure IDs: no ticket failure. `APIE2E-LC-DEEPSEEK-R7` remains a provider-specific blocked residual.
- Recommended recipient: `code_reviewer` for proportional review of the three changed durable test paths.
- Remaining risks/untested scope: direct DeepSeek credential rejection; production-duration retired-ID retention; expected duplicate-idempotency log noise; near-limit source files; Electron package/rebuild is delivery-owned.
