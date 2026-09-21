# Requirements — ORG-CATALOG-NAMES-20260916-001
## Status / request
SR-001 Approved, recorded in SR-002. User explicitly confirmed “jaaa. do the same i would say, because it makes it readable right?” after clarification that shared chips use the actual definition name and unavailable means a pending/failed read, not a nameless definition. Further explicit confirmation: “for both agent and agent team inside agent org thanks”. Applies to the scoped baseline below: both shared and Org-owned direct Agents/Teams. No prior-ticket approval reused.

## Supported scenarios and behavior
- SCN-001 Supported Normal Scenario: user opens Agent Orgs list containing Org-owned and shared direct Agents/Teams, scans member chips, optionally searches/reloads. Expected names identify members without visiting detail first. User screenshots and current source establish reachability.
- SCN-002 Supported Explicit Edge Scenario: ordinary read is pending/fails or reference becomes unavailable while list is open. Readable fallback identifies the member; no opaque ID or misleading borrowed name. Network-backed list/reference reads are current supported boundaries, not invented file corruption.
- BEH-001 current: shared catalog entries resolve names; owned entries render opaque IDs. Desired: referenced definition display name for both Agent/Team, shared/owned. Preserved: member identity, type icon, order and list navigation/actions.
- BEH-002 desired: loading/unavailable label remains human-readable; preserved: no activation or data changes for browsing, existing launch admission and error behavior.

## Scope guardrail
Only Agent Org catalog/list member-chip labels and corresponding accessible names, including normal entry/reload/search and missing/pending reference presentation. Preserve existing Agent/Team icons, card layout, avatars, Run/View Details, search semantics, IDs, ownership, shared catalog exclusion and exact-owner isolation. No global rename/rewrite, definition conversion/migration, runtime/startup repair, separate owned-Team Run/Edit change, detail/editor redesign, new global cache, public release or Electron rebuild in this request. Final classification follows completed design; expected small UI correction is not a review exemption claim.

## Requirements / acceptance
- REQ-001 / AC-001 (BEH-001,SCN-001): owned Agent and owned Team chips show referenced human-readable definition names, consistently with shared Agent/Team chips, on direct list entry without visiting details. Do not strip/decode internal IDs to manufacture names.
- REQ-002 / AC-002 (BEH-002,SCN-002): before names load or when unavailable, use readable Org member-name fallback (separators replaced for display only), or localized Agent/Team label if no usable name. No internal reference ID in visible chip or accessible label. A failed read does not establish definition deletion or grant launch eligibility.
- REQ-003 / AC-003 (BEH-001/002,SCN-001/002): reload/revision/removal cannot leave another owner's name on a card; shared controls remain correct; display-only changes preserve order/icons/actions, underlying references and package bytes. Browsing starts no providers/runs and does not insert owned definitions into shared catalogs.

## Verification intent
Durable direct-list real component/store/reference-read-boundary tests for owned/shared Agents/Teams, fallback, late/reload response and owner isolation. Actual isolated browser check of catalog names/accessible labels including no-detail prerequisite, failure fallback and unchanged Run/View Details entry. Synthetic packages only; no user-server restart or external package changes. No test pass claimed during requirements investigation.

## Workspace and continuity
Dedicated worktree /Users/normy/autobyteus_org/autobyteus-worktrees/readable-org-catalog-member-names; branch codex/readable-org-catalog-member-names. Fresh origin/requirements/flat-agent-organization-model755831eb8fe185ee9a32f6a77ebabdf773350cc0; eventual same base, not personal. Previous ticket remains complete. No persisted-data change intended. Evidence: investigation-notes.md and two supplied screenshots under evidence/. No Product prototype requested.
