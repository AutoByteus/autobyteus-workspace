# Docs Sync Report

## Scope
- Ticket: `org-run-config-performance`; delivery **DR-005** (DR-003 six-doc delta retained).
- Trigger: resolved owner custody plus bounded cleanup/final receipt only. Explicit user acceptance/publication already complete in DR004; no source/doc behavior change or release replay.
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

## Checks / Current DR-005 Outcome
- Six changed docs/file links/headings/whitespace previously **Pass**; unchanged since integrated validation and published beta. [Doc checks](evidence/delivery-dr003/docs-checks.json).
- Result **Updated / Pass**, no additional canonical docs delta for housekeeping. Current handoff/release records now **Delivery Completed**; user acceptance, finalization, all four pipelines/publication and bounded safe cleanup completed.
- Later runtime-lifecycle guide addition is separately preserved with confirmed owner custody/14 hash aliases, **unmerged/not in this beta**. Released root guide baseline remains **ff6d2e1e…**; no inaccurate promotion into the published source.
- [Cleanup/source-artifact verification](evidence/delivery-dr005/final-artifact-verification.json), [current release report](release-deployment-report.md), [handoff](handoff-summary.md). Prior DR004 hold report preserved in evidence/delivery-dr005/prior-dr004-docs-sync-report.md. No new solution/requirement/architecture revision.
