# Docs Sync Report

## Scope
- Ticket: embedded-browser-open-tab-investigation; DR-001; 2026-10-02.
- Trigger: API-REV-001 Pass, 95%; approved AP-001 / SR-005, IR-001.
- Classification: task_size **Small**, architectural_risk **Low**, Direct Low-Risk.
- Independent architecture/source/test review and revision artifacts: **N/A — not applicable**.
- Bootstrap and fetched integrated base: origin/personal `5e3cb2f720e6fc80173099075daf55594ed58de9`.
- Candidate HEAD: `e10dcab05d2e4c30248645f0fb7576f6c86dc670`; production `e67f6f4f3`.
- Before any delivery edits: `git fetch origin personal` succeeded; `git merge --no-edit origin/personal` returned Already up to date. No checkpoint needed: tracked state clean, generated SDK dist outputs preserved untracked.
- No new base commits or behavior changes: no additional executable product rerun required. Existing API/E2E validation remains applicable. Saved desktop assertions re-evaluated successfully (evidence audit, not a new live run); package/dist converter hashes still equal.
- Evidence: `/Users/normy/autobyteus_org/autobyteus-worktrees/embedded-browser-open-tab-investigation/tickets/done/embedded-browser-open-tab-investigation/evidence/delivery/integrated-state-check.txt`.

## Why Docs Were Updated
The server runtime guide still described the generic wrapper as universal. The integrated converter now has one explicit own-MCP open_tab exception. Promote the contract, persistence decision and sufficient desktop proof into durable docs rather than leaving them only in the ticket.

## Long-Lived Docs Reviewed / Updated
| Doc | Result | Change / rationale |
| --- | --- | --- |
| autobyteus-server-ts/docs/modules/antigravity_cli_runtime.md | Updated | Correct universal wrapper statement; explain exact canonical open_tab exception, event metadata, exclusions, no migration/history replay; link browser contract |
| autobyteus-web/docs/browser_sessions.md | Updated | Retain accurate IR-001 AGY contract note; add AGY transport/history and real isolated desktop validation expectations, including assignment-versus-visibility distinction |
| TESTING.md | No change | Existing isolated worktree/ownership/assertion/cleanup rules remain accurate |
| README.md release workflow and autobyteus-web/AGENTS.md | No change | Existing release helpers remain authoritative; no release requested |

## Durable Knowledge Promoted / Removed Concepts
- Source: design-spec.md, implementation-handoff.md, api-e2e-execution-coverage-report.md and evidence/api-e2e/desktop-validation.md.
- Producer owns canonical browser result, renderer/shell remain unchanged consumers; no UI parser fallback.
- Generic provider_state/output wrapper is replaced only on successful projected own-MCP open_tab. No whole component/file removed; unrelated wrappers are not obsolete.
- Old nested and new canonical history remain opaque and directly readable; no stored-data transform or focus replay.
- Native-session assignment and positive visible presentation are different assertions.
- No-impact decision: not applicable; documentation changes were required.

## Delivery Continuation
Docs sync **Pass / Updated** on current integrated state. No docs blocker or implementation/design reroute. Overall delivery remains **Blocked — awaiting explicit user verification**, not Delivery Completed. Next: user verification, then target refresh and finalization gates. No push, archive, release or production-app change performed.
