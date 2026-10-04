# Docs Sync Report

## Scope
- Ticket: `org-run-config-performance`; delivery **DR-003**.
- Trigger: user **“read the readme, and release a new beta”**; supersedes earlier local repository-authorization hold, adds beta publication authorization, not inferred delivery verification.
- Approved **SR-006 / cumulative SR-010**, **Medium / High**, independent architecture/source → API/E2E → proportional test review route unchanged.
- Bootstrap base: `origin/personal @ 1b976216da0cbd0cc84fef3fe22a2739325b8ad3`.
- Integrated base: **63aac5939f1ebcfb691f796990739a3e94fd5f45**; candidate **ac287c446db7af52956680313f60b9309e151d2b** plus these docs/evidence changes.
- Local safety checkpoint **26ba526c810e48696b0d0ae486f52c09faf9ac49**, clean default Merge; no conflict. A final narrow fetch confirms base still current, no second integration required.
- Post-integration checks: **526 tests + 9 rebuilt packaged desktop journeys Pass**, plus shared builds/server sanitized bootstrap. [Exact commands/logs](evidence/delivery-dr003/check-execution.json), [validation/cleanup](evidence/delivery-dr003/validation-cleanup-summary.json).

## Why Updated
The integrated code replaces historical candidate-ID membership scans, aggregate runtime-readiness gating and whole-history publication work. Canonical docs previously described allocator guards that no longer exist. The new API, shared catalog recovery and full/scoped freshness rules need durable ownership documentation, not only ticket evidence.

## Long-Lived Docs Reviewed / Updated
| Doc | Result | Change / rationale |
| --- | --- | --- |
| `autobyteus-server-ts/docs/modules/agent_execution.md` | Updated | Stateless UUID allocator/caller scope; remove obsolete membership/reservation description; independent inventory/per-kind capability, schema/catalog and qualified Retry contract |
| `autobyteus-server-ts/docs/modules/run_history.md` | Updated | `getAgentOrgRootHistory`, null/error/family projection and generation/snapshot ordering; retained full resync/admission; narrow navigation comparison |
| `autobyteus-server-ts/docs/modules/agent_orgs.md` | Updated | Authoritative single-root publication; distinguish no collision scans from required structural/config checks; current package format unchanged |
| `autobyteus-web/docs/agent_orgs.md` | Updated | Independent verified Codex, inherited same-kind shared Retry without override/reset, existing failed-edit guards, scoped row/navigation and recipient-free/no-inference launch |
| `autobyteus-web/docs/agent_teams.md` | Updated | Shared readiness/Retry contract; preserve exact settings and coordinator semantics |
| `TESTING.md` | Updated | Build prerequisites and durable scoped/public MCP/HTTP/native-cleanup commands; actual actor/mock and cleanup limits; retain incoming native-argument regression |
| Root `AGENTS.md` / `SOLUTION_DESIGN_BEST_PRACTICES.md` | No change | Earlier user-requested durable guidance survives integration; no new design/policy revision |
| `README.md` / web `AGENTS.md` | No change | Current beta helper/tag/workflow/clean-tree policy remains authoritative; release instructions read |
| `autobyteus-web/docs/settings.md` | No change | Credential/local provider catalog settings are a separate owner; no change to their behavior |

## Knowledge Promoted / Components Replaced
- Old allocator active/history/path membership readers and constructor wiring → current-definition + fresh UUID allocator; no compatibility export, no mathematical zero-collision promise, stored IDs retained.
- Aggregate GraphQL availability → `runtimeAvailabilityKinds` inventory + `runtimeAvailability(runtimeKind)`; independent per-kind publication, separate catalog/schema guards, collection still waits all kinds.
- Sticky consumer catalog errors → accepted shared selected-kind evidence and targeted Retry; different-kind outages/explicit failed edits not silently healed.
- Repeated full snapshots/whole-subtree JSON comparison for one Org update → authoritative scoped root query + freshness guards/displayed-field/row-reference comparison. Full resync/global structural admission remain.
- Sources: approved requirements/design, current source and IR-002/CRR-003/API-REV-003/CRR-005. Review/failure reports remain separate; no historical failure scorecard presented as a current blocker.

## Checks / Continuation
- Six changed docs: file links and new headings reviewed; docs whitespace Pass. [Doc checks](evidence/delivery-dr003/docs-checks.json).
- Result: **Updated / Pass**, not No impact.
- Handoff: [handoff-summary.md](handoff-summary.md), now authored against integrated checked state.
- Delivery overall: **Blocked — User Verification Prerequisite**. Existing acceptance question unanswered; no archive/push/final target merge/tag/release yet. No duplicate question or unchanged prerequisite reroute.

## DR-004 Acceptance
Explicit acceptance received through repeated beta publication instruction after displayed hold. Canonical documentation/source behavior unchanged from checked DR-003; no additional docs impact. Prior hold statements are historical and superseded.
