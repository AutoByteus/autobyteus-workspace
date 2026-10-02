# Solution handoff — agy-mcp-tool-call-presentation-only — SR-006

## Result and next expected output
**Architecture Design Complete; task_size=Small; architectural_risk=Low.** New ticket, explicitly user-requested, to release only the original Antigravity MCP presentation fix after fresh testing. Implementation is NOT complete on this candidate; no validation/release claimed. Next owner must selectively apply the bounded original changes to this clean branch, verify scope and implementation checks, persist a current handoff, and route through configured executable validation and delivery. Do not merge the expanded branch wholesale or resume its additional refactor.

## User authority, goal and scope
Original goal: display actual MCP tool names/own arguments in AGY Activity instead of `call_mcp_tool`, preserving native handling and stored old runs. User approved original decisions September 30, then approved an expanded test/history/migration effort. On October 1, after further inherited failures, user explicitly reversed that release expansion: “Let's only just release the original anti-gravity ticket.” Subsequently requested a **new ticket**, original changes only, additional tests, release if successful, broader test fixes in a future separate ticket. Exact approval/proposal/clarification: /Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/agy-mcp-tool-call-presentation-only/user-original-scope-approval-20261001.md.

Current requirements are Approved SR-006, original REQ-001..007 / AC-001..008 / BEH-001..006 / SCN-001..004 / DEC-001..005. AutoByteus bare names, third-party qualified names, unwrapped arguments, structured object/array output within existing envelope, failed/denied preservation, unusable-wrapper fallback, native-image guard, old-history unchanged. Related tests/docs remain included. Added REQ-008..011 / AC-009..014 are expressly deferred/excluded, not fulfilled. No Product supplement. User reports built personal product works; preserve baseline, do not infer full-suite green or final verification of this new unbuilt candidate.

## Workspace/base and preservation
- NEW active ticket: /Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/agy-mcp-tool-call-presentation-only
- NEW candidate worktree: /Users/normy/autobyteus_org/autobyteus-worktrees/agy-mcp-tool-call-presentation-only
- Branch: `codex/agy-mcp-tool-call-presentation-only`
- Freshly fetched/bootstrapped base: origin/personal `b0b077b02571098a6bf7993ab46b67a69fdb8f9d`; HEAD still exactly base. Target: origin/personal. Reconcile any later upstream advance before final integration.
- PARENT/expanded worktree preserved: /Users/normy/autobyteus_org/autobyteus-worktrees/agy-mcp-tool-call-presentation, branch codex/agy-mcp-tool-call-presentation, HEAD `a727971dabab141a39404a00ca6f7db46696f0b9`, plus dirty 33-line migration assertion and all dirty/untracked context. Do not reset/clean/delete/push/merge it for this release. Only added a relocation notice; preexisting files unchanged by Solution Designer.
- Full parent ticket copied unchanged before SR-006 owned-document revision; parent owned-document snapshots, tracked dirty binary patch, source/status inventory, original-file SHA-256 manifest and successful preservation verification in /Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/agy-mcp-tool-call-presentation-only/recovery-evidence/scope-reset-sr006/. Original source and generated artifacts stay in parent worktree. Existing other repair worktree is NOT a complete backup.
- Parent SR-001..005 and specialist reports retain parent identity and historical evidence basis. SR-006 is the current new-ticket bootstrap/scope reset; not a claim earlier specialists tested this new ticket. No source/test edits, executions, commits, pushes, releases or cleanup by Solution Designer this round.

## Selective implementation design
Nine exact whole-file candidates are listed in /Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/agy-mcp-tool-call-presentation-only/recovery-evidence/scope-reset-sr006/agy-file-allowlist.json and design file mapping. Only production delta: new `agy-mcp-tool-call.ts` pure helper and existing `agy-stream-event-converter.ts` tool-payload projection in the AGY stream folder. No shared event/schema/host/migration/frontend structural change. Include the two projection/converter unit files, AGY team-roundtrip/native-image/MCP-transport E2E, fake CLI `mcp_calls` case, runtime doc, plus only the two AGY fake/live command rows in TESTING.md.

Original source commit `34b310118bce22555bc777f361387fa84382093f`; original test additions in `ff016088b7517ca9c952dd23baea8a836a2c09fa`; current preserved versions at a727971da include latest-base API alignment. Use exact base-relative paths/hunks, preserve upstream changes. Do not wholesale cherry-pick ff016088b (large historical artifact checkpoint), 9038c218b (broad WIP), merges, or a727971da (migration and test repairs). New transport test must retain removed-skill-free GraphQL inputs from latest-base alignment. Check fixture/helper dependencies against the clean base: do not silently import broad shared helper repairs.

Explicitly excluded: Team service/index preflight, migration retry/frozen classifiers and their tests, broad unit/integration/E2E repairs, root E2E package script, generic TESTING build note, shared live harness and collaborator host-composition recovery. Do not revert upstream work already present in personal. Evidence/ticket docs are not production changes. Save an included/excluded diff inventory against exact base in implementation handoff.

## Known findings, truthful validation and gates
CRR-002 Fail applies to expanded parent SR-005, not overridden or turned into pass. Its CR-F001 migration assertion was resolved there. API-F001 is an inherited collaborator validator-construction conflict (and ambiguous definition getter boundary), source/guards independently byte-identical to refreshed base; no AGY-origin defect or runtime damage was established. Preserve its full evidence as a deferred separate-ticket issue. Do not whitelist guards, delete assertions, or perform an unapproved cross-root refactor to make this ticket green.

Source identity is not baseline suite execution. API/E2E must report actual failures/skips, distinguish inherited failures via appropriate baseline evidence, and resolve AGY regressions or return material acceptance/dependency uncertainty. User excluded the broad repair mandate, not honest regression checks or applicable testing rules. Current narrow candidate must pass relevant implementation/build/AGY transport/live/rendered/reload/reopen/native/old-history checks under latest TESTING.md. Historical successful tests are useful prior evidence only. TC-013 desktop/full-product and old-writer replay remain unproven for the new candidate, not waived. Use isolated test-owned state; no operational user data.

Prior API-REV-002: integration318 pass/64skip, deterministic238pass/133skip, fakeAGY9/9, liveAGY3pass/1skip, rendered journeys Pass, full unit4126pass/2fail/6skip; 47-file repair cohort287pass. These came from expanded source and **must not be relabelled current candidate validation**. No broad-cohort repair obligation carries to this ticket. Delivery must refresh docs/release notes so excluded repairs are not advertised, obtain candidate-appropriate explicit user verification, and perform finalization/release gates. User requested release but no stable channel/version authorization is inferred.

## Classification and review disposition
Small/Low follows completed current-base narrow design: two local production files in an existing adapter, no changed persistence/API/security/concurrency/deployment/host ownership. Historical artifact volume and unrelated base defects do not change this delta's structural risk. Escalate any newly discovered in-scope ownership, shared contract, data transformation, or baseline dependency impact. Independent architecture/source review **N/A — not applicable for current Small/Low route**, subject to returned configured rules and escalation. Applicable durable-test review, implementation checks, executable validation and delivery gates remain. Prior ARCH-REV-001 was expanded-parent review only.

## Canonical package and relevant supplements (absolute)
- /Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/agy-mcp-tool-call-presentation-only/requirements-doc.md
- /Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/agy-mcp-tool-call-presentation-only/investigation-notes.md
- /Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/agy-mcp-tool-call-presentation-only/design-spec.md
- /Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/agy-mcp-tool-call-presentation-only/solution-revision-record.md
- /Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/agy-mcp-tool-call-presentation-only/user-original-scope-approval-20261001.md
- /Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/agy-mcp-tool-call-presentation-only/recovery-evidence/scope-reset-sr006
- /Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/agy-mcp-tool-call-presentation-only/agy-mcp-call-shape-probe.py
- /Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/agy-mcp-tool-call-presentation-only/agy-mcp-call-shape-probe
- /Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/agy-mcp-tool-call-presentation-only/code-review-report.md
- /Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/agy-mcp-tool-call-presentation-only/code-review-revision-record.md
- /Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/agy-mcp-tool-call-presentation-only/code-review-evidence
- /Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/agy-mcp-tool-call-presentation-only/design-review-report.md
- /Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/agy-mcp-tool-call-presentation-only/architecture-review-revision-record.md
- /Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/agy-mcp-tool-call-presentation-only/implementation-handoff.md
- /Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/agy-mcp-tool-call-presentation-only/implementation-revision-record.md
- /Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/agy-mcp-tool-call-presentation-only/implementation-test-repair-ledger.md
- /Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/agy-mcp-tool-call-presentation-only/implementation-evidence
- /Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/agy-mcp-tool-call-presentation-only/api-e2e-coverage-investigation.md
- /Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/agy-mcp-tool-call-presentation-only/api-e2e-execution-coverage-report.md
- /Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/agy-mcp-tool-call-presentation-only/api-e2e-revision-record.md
- /Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/agy-mcp-tool-call-presentation-only/api-e2e-test-case-ledger.md
- /Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/agy-mcp-tool-call-presentation-only/api-e2e-evidence
- /Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/agy-mcp-tool-call-presentation-only/delivery-revision-record.md
- /Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/agy-mcp-tool-call-presentation-only/release-deployment-report.md
- /Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/agy-mcp-tool-call-presentation-only/handoff-summary.md
- /Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/agy-mcp-tool-call-presentation-only/docs-sync-report.md
- /Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/agy-mcp-tool-call-presentation-only/release-notes.md
- /Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/agy-mcp-tool-call-presentation-only/delivery-evidence
- /Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/agy-mcp-tool-call-presentation-only/latest-base-integration-result-20261001.md
- /Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/agy-mcp-tool-call-presentation-only/test-repair-provenance-result-20261001.md
- /Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/agy-mcp-tool-call-presentation-only/test-repair-scope-inventory.md
- /Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/agy-mcp-tool-call-presentation-only/user-finalize-release-request-20261001.md
- /Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/agy-mcp-tool-call-presentation-only/recovery-evidence

The investigation supplement inventory defines scope/status of all copies. Do not modify past reviewer results or manufacture a pass. Specialist owners append current new-ticket rounds, retaining explicit parent provenance. Earlier absolute links to the preserved parent remain valid; current solution authority is the new ticket listed here.

## Handoff routing
get_handoff_rules returned the Small/Medium + Low Architecture Design Complete rule. SR-006 is Small/Low with explicit current approval; selected exact recipient `/implementation_engineer`. Large/High review and returned Delivery Completed receipt-correction rules do not match. Direct route skips independent architecture/source review, not design or executable validation. Send only to Implementation Engineer with this absolute file attached; no duplicate delivery notification. No release claimed.
