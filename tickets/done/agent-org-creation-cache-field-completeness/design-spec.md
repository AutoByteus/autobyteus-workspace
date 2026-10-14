# Design Spec — Agent/Org current-query completeness

## Solution And Approval Basis
Package agent-org-creation-cache-field-completeness / Task6b9ce371; SR-002; R1 Approved by Solution Designer within assigned user direction, exact informing-message reference in requirements-doc.md; REQ001–004/AC001–005/SCN001–004. No behavior-defining Product supplement. Design Ready / Architecture Design Complete,2026-10-13.
Investigation canonical /Users/normy/autobyteus_org/autobyteus-worktrees/agent-org-creation-cache-field-completeness/tickets/in-progress/agent-org-creation-cache-field-completeness/investigation-notes.md.
Authorities read: skill references/architecture-design.md, references/design-principles.md and design-spec template (full/current conversation), task DESIGN.md/root/web/server AGENTS.md/TESTING.md, unchanged RELEASE.md. No design-principle conflict; no applicable closer DESIGN. Historical in-UI repair routing/stale states are not new-task current authority.

## Current-State / Architecture Evidence / Intended Change
E003–E008/E010–E012 establish loaded catalogs whose current query diagnostic selections exceed existing create/update fragments; successful server returns known healthy diagnostics, but frontend never requests them. Existing stores publish mutation results using full catalog query. E002/E009 confirm retained candidate exactly matches current mutation parent and full regression is preserved.

Change ONLY existing response selections:
- AgentDefinitionMutationFields: `loadIssue { code reason definitionPath packageRoot }`.
- AgentOrgDefinitionFields: `loadIssues { kind definitionId name code reason definitionPath packageRoot usingLastGood }`.
Both create/update use the same owned fragments. Preserve query documents, schema/types, stores/cache policies, mutation inputs and UI handlers. No client default values or suppression; GraphQL-selected authoritative value reaches existing cache directly. Restore full retained selected-response regression as current colocated test, adapting solely to current fixture/contract reality. Do not blind-cherry-pick preserved branch/old UI Task history.

## Behavior / Production-Path Map (Mandatory)
| Behavior / scenarios | Approved requirements / ACs | Trigger/evidence | Target path/spine |
| --- | --- | --- | --- |
| BEH001 / SCN001 | REQ001/003/004, AC001/005 | Loaded Agents catalog → normal shared Agent form Save; E001/E005 | Existing UI/store → complete Agent mutation selection → existing server converter → cache write/catalog/store/detail; DS001/DS003 |
| BEH002 / SCN002 | REQ001/003/004, AC002/005 | Loaded Orgs catalog → valid Org Save; E001/E005 | UI/store → complete Org mutation selection → existing server projection → publish/current catalog → existing edit view; DS002/DS003 |
| BEH003 / SCN003 | REQ002/003, AC003/005 | Existing normal edit; E011/shared fragment | Same respective spine with current IDs/expectedRevision, full selected diagnostic response/readback; DS001/002/003 |
| BEH004 / SCN004 | REQ002, AC004 | Existing diagnostic catalog contract; E006/E010 | No warning-policy change; current query/card badges consume selected values, new response selections preserve exact values; DS003 |

## Relevant Supplemental Artifacts
context-source-inventory.json indexes ALL saved Task-context attachments with absolute paths, hashes, ownership and provenance. Relevant historical causal/reproducer/review reports, prepared patch/full spec/lossless encoded gzip, manager retention receipt, immutable prior UI Terminal context carried. Historical API-F001/F002 remain unresolved until new validation; d8 candidate unreviewed, not current implementation approval/Pass. Prior UI artifacts read-only. Product UI/design repository/spec N/A — not applicable.

## Task Design Health Assessment (Mandatory)
Posture Bug Fix; root cause Local Implementation Defect: operation-response selection omits existing list-required field. Existing owner/boundary/API shape/file placement healthy; no refactor needed. E003–E005 show current route/store/publication ownership, E010 existing server fields/defaults and E012 test projection gap.
Structural triggers: no repeated coordination (single fragment per entity, shared by create/edit), boundary bypass (existing stores remain sole frontend mutation/publication entry), responsibility overload/new shared DTO/cache owner (none), schema/legacy pressure (none). Local fragment addition, no extraction/guard/refetch/cache framework. No speculative concurrent/corrupt-state handling.

## Persisted Data / State Transition (Mandatory)
**Not Affected**: no persisted format/schema/meaning/write policy change; unchanged forms/server operations save existing definitions. Selecting already-exposed diagnostic fields changes only current response/cache completeness. Existing healthy null/[] and server-returned populated values preserved, no migration/startup gate/data reset/rebuild. Detailed migration plan N/A. Replica/cache reset/clearing is not the fix.

## Legacy Removal / Decommission Plan (Mandatory)
Clean replacement of incomplete selection by complete current selection; no old/new compatibility mode retained. No source layer/branch/import becomes obsolete; all affected fragment/mutation exports used by public stores (E013), so no demonstrated dead-code removal. Retained old test/export is provenance, not active legacy production path. Keep existing tests; add missing direct selected-response coverage without disabling failures.

## Data-Flow Spine Inventory / Primary Spines
| ID | Scope / owner | Start/end / why |
| --- | --- | --- |
| DS001 | Primary End-to-End Agent authoring; Agent store/GraphQL owners | Loaded Agents page → Create/Edit form → agentDefinitionStore.create/update → current selected mutation HTTP → existing resolver/service/converter → response/cache/publication → catalog/detail success; needs complete row |
| DS002 | Primary End-to-End Org authoring; Org store/GraphQL owners | Loaded Org experience → create/edit Save → orgStore.create/update → current selected mutation HTTP → existing resolver/service/project → validated response/publish → cache/catalog/edit success; needs complete row |
| DS003 | Return-Event; existing Apollo/store/UI owners | Server selected response → complete result → existing cache.writeQuery/updateQuery or normalized update → query/cache-first reread/store → readable catalog/card/navigation; preserves current diagnostic semantics |

## Spine Narratives / Main-Line Ownership
Forms own drafts/feedback/navigation; stores own public commands/input projection/state/publication. Mutation documents own selected response fields. Existing server resolver/service owns validation/persistence/current projection; Apollo owns existing normalization/query result. Catalog/cards consume current values, never fabricate them. New work only aligns mutation result shape to existing query requirement; no background/worker/local-state spine introduced. Primary paths span product trigger through server/save/publication and observable outcome, not only the two edited lines.

## Off-Spine Concerns / Thin Facades / Boundary Encapsulation
Current backend binding/auth endpoint and Apollo client/plugin remain unchanged dependencies; issue warning converters/card badges remain existing concrete concerns. Store facade owns commands/publication; no additional facade. Test AST-selected transport is a test boundary, not a new production reader. Server's issue policies stay server-owned. New frontend module must not directly read definition files/server internals, echo response metadata into inputs, or bypass store publication to forge cache rows.

## Interfaces / Dependency Rules / Checks
Reuse Create/UpdateAgentDefinition and Create/UpdateAgentOrgDefinition operations/fragments, corresponding list queries and explicit IDs/Org expectedRevision. No external API/schema/input/name/type change; existing selected field semantics now included. Server fields already support current values. No owner/new dependency or mixed-level bypass; no shared-model expansion. Interface singular/explicit identity check passes; natural Agent/Org naming retained. Do not merge subjects into generic union mutation/cache updater or add query fragment hierarchy merely for two lines.

## Capability Reuse / Subsystem / Files / Folder Boundaries
| Change | Exact path | Owner / responsibility |
| --- | --- | --- |
| Modify | autobyteus-web/graphql/mutations/agentDefinitionMutations.ts | Existing Agent response projection;4 issue subfields; create+update same fragment |
| Modify | autobyteus-web/graphql/mutations/agentOrgDefinitionMutations.ts | Existing Org response projection;8 issue subfields; create+update same fragment |
| Add by reuse | autobyteus-web/stores/__tests__/definitionMutationCache.spec.ts | Current selected-response/real store/cache create/edit completeness; full retained4-case export available; extend nonempty-value contract proof without fake whole-row replies |
| Add/extend only if needed | Existing autobyteus-web/tests/e2e probe/owned fixtures | API owner durable real-backend/source-current app create/edit/cache-diagnostics proof; no production test route retained |
| Optional documentation | Existing Agent/Org/frontend docs as appropriate | Delivery sync concise true contract if useful; no process/testing-policy change |

Draft/final mappings same bounded owners; reused capabilities, no shared structure extraction/new subsystem/folder/file move. Existing GraphQL projection vs store-test colocation expresses concerns clearly, no artificial structural depth. Queries/stores/types/server/UI remain inspect-only unless escalation approved.

## Concrete Shape / Backward Compatibility Rejection (Mandatory)
Correct response includes `loadIssue: null` or full selected existing object, `loadIssues: []` or full returned list. Avoid missing property patched by client `??null`/`??[]`, catalog field deletion, logging suppression, blindly refetching/clearing cache, whole fixture mutation responses ignoring selections, or compatibility branch. All rejected; clean current-schema selection. No migration/legacy adapter needed.

## Change / Reuse Sequence
1. Verify approved current R1, new isolated task/base dc2695cf968d15939b4b945a015fe465eb249605 and unchanged preserved candidate applicability. Keep d8 ref/exports intact; old UI worktree remains cleaned.
2. Reuse the retained complete four-case test into NEW current colocated file (not blindly apply patch to absent file). Establish fresh original-fragment failure witness before correction; tests must obey actual selections and preserve errors/metadata.
3. Integrate ONLY two retained current field selections into corresponding current fragments. Check create and update results, raw selected response completeness/cache-first readback, healthy and representative nonempty contract payload values; existing ownership/input/revision/failure/scoped consumers stay valid.
4. Implementation self-check/self-review/artifacts with exact new source pin and provenance; normal configured downstream route determines independent review/validation. No Pass inferred from prior d8 local checks or failure-origin reports. If actual new evidence establishes larger schema/policy changes, return Design Impact/Requirement Gap rather than silently broaden.
5. API/E2E durable regressions and NEW source-current app/real ordinary Agent+Org create/edit with catalog loaded, persistence/readback/no demonstrated code13 errors, visible normal outcomes and owned cleanup. Preserve historical API-REV-002 Fail separately; current Task owns resolution only after new evidence.
6. Delivery current-task docs/integrated checks, explicit human verification and user-agreed release decision; finalization origin/personal per RELEASE.md with safe refresh/isolation/--no-ff/push and cleanup. Prior UI acceptance/no-release is not this Task's authorization.

## Verification Guidance / Tradeoffs / Risks
Suggested focused layer: `pnpm -C autobyteus-web test:nuxt stores/__tests__/definitionMutationCache.spec.ts stores/__tests__/agentDefinitionStore.spec.ts stores/__tests__/agentOrgDefinitionStore.spec.ts stores/__tests__/agentOrgDefinitionCache.spec.ts --run`; add relevant badge/scoped-authoring/input checks proportionately. Prepared existing real-cache tests' pass/fail history is not current proof. Extend AC004 with actual selected nonempty-value contract checks; do not manufacture malformed-save scenario. Agent edit normalized cache can mask omitted response field, so assert selected response directly.

Task specifically calls for source-current app validation: a fresh worktree-built isolated desktop/real backend UI flows, not old UI asar/installed binary or mock-only probe. Capture UI/GraphQL/readback/cache/browser error proof; distinguish relevant warnings from broader app-health unknowns and route unrelated material findings by approved scope. Source-current browser may complement but not replace required actual app. No model sends/provider credits needed. Clean env/owned roots/ports/fixtures, stop only exact owned resources; source-current build/cleanup proofs retained under ticket.

Small fragment completion avoids changing store/cache lifecycle or server semantics and preserves readable warnings. Current schema fields already exist; no persisted-data or external contract surprise. Risk of copied stale fixture/normalization masking addressed above; unrelated findings must not reproduce open-ended baseline expansion. Implementation/API own executable tests, Solution Designer has run none. No blocker for design.

## Completed Task Size / Architectural Risk (Mandatory)
`task_size=Small`:2 existing production fragment lines plus reused focused regression/necessary validation; bounded same existing web definition owners, no broad refactor. `architectural_risk=Low`: existing schema/query/cache ownership, field meanings, IDs/auth/input/revision/save/nav/persistence/security/concurrency/deployment intact. Actual GraphQL operation selection expands to already-governing current query fields, no material new external schema contract. Payload volume is small; scope classification not inferred from historical artifact size.
Escalate if current base requires different server warning-generation contract, cache lifecycle/store/API/schema/ownership/persistence/security/concurrency/deployment change or materially uncertain caller. Preserve user scope then revise/reclassify through Solution Designer. Independent review artifacts for this completed new design N/A — not yet selected; handoff rules choose route, not historic in-UI correction instruction.
