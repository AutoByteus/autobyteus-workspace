# Solution handoff — ORG-HISTORY-LATENCY-20260917-001

## Result

Architecture Design Complete — reopened recovery `SR-004 / DS-REV-002`, **Small / Low**. Requirements SR-001 remain explicitly approved through SR-002; intended behavior is unchanged. The previous DR-002/DR-003 terminal effectiveness is superseded for this latency outcome by the user's real failure report. This is the same ticket/package, not a new feature and not a replay of finalization.

## Original request and current recovery authority

Original approved outcome: each history family should display as soon as its own response is ready, without unrelated family/enrichment work, while preserving errors, selection, reconnection and data. User quote is in `requirements-doc.md`.

Current trigger: the user reports that the latest-base Electron still shows AgentOrg history more than ten seconds after Team history for `Software Development Department`, asks to move this archived ticket back to `in-progress`, use a fresh base worktree, and actually reproduce through a browser frontend backed by the Electron-started server. The user explicitly corrected the investigation method toward that browser path. No new behavior choice was introduced; renewed approval is not required.

## Workspace / base / target

- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/org-history-startup-latency-reopen`
- Branch: `codex/org-history-startup-latency-reopen`
- Fresh bootstrap base/current HEAD before implementation: `d7343ea0dfe9ed0ea9fccb1d426c10bb1fa09ebd`
- Tracked/finalization target: `origin/requirements/flat-agent-organization-model`, **not** `personal`
- Canonical package: `/Users/normy/autobyteus_org/autobyteus-worktrees/org-history-startup-latency-reopen/tickets/in-progress/org-history-startup-latency`
- Historical remote ticket branch remains preserved; use the reopened branch, do not overwrite history silently.
- User's Electron/backend/profile was not stopped, reset, repaired or mutated. No commit/push/build/finalization/release authorization or claim.

## Reproduction and root cause

1. **Requested actual browser path:** reopened-worktree Nuxt frontend was run against the already-running latest-base Electron embedded backend. Fresh Chromium auto-expanded the exact real workspace. On this warm backend, Team appeared at899.5ms and AgentOrg at934.9ms (35.4ms later); `ListCollaborationRootHistory` completed in69.8ms. Therefore current frontend publication is effective once the server catalog is initialized; warm/browser-only rechecks cannot reproduce the cold defect.
2. **Exact cold owner:** startup already calls `RootRunPackageReadinessIndex.rebuild()` before listen. First `AgentOrgRunHistoryCatalogService` initialization calls `packages.rebuild()` again. A fresh-process, exact packaged, read-only rebuild against the same package population took26,657.10125ms (307Team/17Org packages;219diagnostics). Team history instead calls `awaitReady()` and reuses the established generation.
3. **Failure mechanism:** Team history responds through the ready Team catalog while the AgentOrg mixed-history response is blocked on a duplicate full readiness scan. IR-001 cannot render a response that has not arrived. This explains why small isolated fixtures and a warm server passed while the user's cold-start symptom remained.

Sanitized evidence:
- `/Users/normy/autobyteus_org/autobyteus-worktrees/org-history-startup-latency-reopen/tickets/in-progress/org-history-startup-latency/validation/reopen-r1/warm-browser-observation.json`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/org-history-startup-latency-reopen/tickets/in-progress/org-history-startup-latency/validation/reopen-r1/cold-readiness-probe.json`

## Selected design

Preserve the integrated frontend independent-family publication. In `AgentOrgRunHistoryCatalogService.ensureInitialized()`, replace the forced `AgentOrgRunPackageCatalog.rebuild()` with the already-existing `awaitReady()` contract.

This is safe because:
- normal server startup has already completed strict shared readiness before listen;
- if no generation exists, `awaitReady()` lazily creates/awaits one, so strict admission is not skipped;
- Team history already uses this contract;
- the AgentOrg queue, admitted Org tree reads, index projection/write, active snapshot selection, errors and identities remain unchanged.

Expected production delta is one backend owner file plus focused tests. Do not add timeouts, extra refreshes, prewarming requests, unvalidated fallbacks, index/schema redesign or frontend changes. Do not remove explicit `rebuild()` from the family facade globally.

## Required implementation and validation

Implementation:
- add a failing durable test with distinguishable `awaitReady`/`rebuild` spies;
- first AgentOrg initialization must call `awaitReady` once and `rebuild` zero times;
- preserve summary/restore/index sequencing and concurrent initialization;
- retain/prove lazy strict readiness when no startup generation exists;
- run focused server tests/build and existing frontend history publication preservation tests.

API/E2E:
- validate a **cold first read** with a fresh isolated process or reset process-global readiness/catalog state; a warm browser is insufficient;
- record listen, first workspace-history response, first mixed AgentOrg response and first visible Team/AgentOrg rows through the normal browser UI;
- prove no second readiness generation begins on first AgentOrg history read using a deterministic counter/test seam, not only wall-clock timing;
- preserve prior failure/generation/selection/inactive/no-inference checks;
- do not use or mutate the user's live profile as a public fixture.

No universal millisecond SLA is claimed. The acceptance boundary is removal of the duplicate readiness generation plus existing immediate response publication. If implementation requires changing readiness ownership, startup order, strict admission, persistence, GraphQL or frontend/runtime contracts, return `Design Impact` rather than broaden locally.

## Classification

- `task_size`: Small
- `architectural_risk`: Low
- Reason: one incorrect existing method choice inside an existing catalog owner; exact reusable comparator contract already exists; no interface/schema/storage/migration/lifecycle change.
- Architecture review: not required under the direct Small/Low route unless an escalation trigger occurs.

## Cumulative canonical artifacts

- `/Users/normy/autobyteus_org/autobyteus-worktrees/org-history-startup-latency-reopen/tickets/in-progress/org-history-startup-latency/requirements-doc.md`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/org-history-startup-latency-reopen/tickets/in-progress/org-history-startup-latency/investigation-notes.md`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/org-history-startup-latency-reopen/tickets/in-progress/org-history-startup-latency/design-spec.md`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/org-history-startup-latency-reopen/tickets/in-progress/org-history-startup-latency/solution-revision-record.md`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/org-history-startup-latency-reopen/tickets/in-progress/org-history-startup-latency/bootstrap-handoff.md`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/org-history-startup-latency-reopen/tickets/in-progress/org-history-startup-latency/validation/reopen-r1/README.md`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/org-history-startup-latency-reopen/tickets/in-progress/org-history-startup-latency/validation/reopen-r1/warm-browser-observation.json`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/org-history-startup-latency-reopen/tickets/in-progress/org-history-startup-latency/validation/reopen-r1/cold-readiness-probe.json`

Historical IR/API/Delivery artifacts remain in the same cumulative ticket directory as prior-basis evidence. They do not claim coverage of SR-004/DS-REV-002.

## Routing

Fresh `get_handoff_rules` selected the sole matching rule for `Architecture Design Complete` with `task_size=Small` and `architectural_risk=Low`: `/software_engineering_team/implementation_engineer`. The Product Design, Large/High architecture-review and Delivery receipt-gap rules do not match. Direct implementation is the selected route; no duplicate delegation or additional recipient. Actual `send_message_to` confirmation is the transport authority.
