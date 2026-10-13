# Design Spec — Members directly after Description

## Solution And Approval Basis
- Package: agent-team-members-after-description; current solution revision: SR-004 (preservation/separation receipt; R1 and technical design unchanged).
- Requirements: R1 Approved by Solution Designer within user-decided direction; exact informing-message reference in requirements-doc.md. Scope REQ-001–003, AC-001–004; no behavior-defining supplement.
- Design status: Ready / Architecture Design Complete, 2026-10-13.
- Investigation: /Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-members-after-description/tickets/in-progress/agent-team-members-after-description/investigation-notes.md.
- Authorities read: skill references/architecture-design.md, references/design-principles.md, templates/design-spec-template.md; task-worktree DESIGN.md, AGENTS.md, TESTING.md, RELEASE.md, autobyteus-web/AGENTS.md. All 2026-10-13; no project design-principle conflict. Primary/remote instructions differ; remote documents now also require RELEASE.md, read and recorded E006.

## Current-State Read And Architecture Investigation Evidence
E002/E007/E008 establish one Team-detail composition owner reached by catalog and Org-context routes. Loaded branch renders header → Description → Instructions → Handoffs → Members. E009 establishes independent child owners; E010 existing scoped Team regression. E011 identifies unused router binding/import. No store or route change needed.

## Intended Change
Move the complete existing Members `<section>` immediately after the Description section, before ExpandableInstructionCard and HandoffManager. Keep header, controls, member bindings/keys/card markup/responsive classes and both child invocations intact. DOM order implements visible reading order. No CSS `order`, team-name conditional, duplicated roster, new component/state or framework.

## Relevant Behavior And Production-Path Map (Mandatory)
| Behavior / scenarios | Approved basis | Trigger and existing evidence | Target path / spine |
| --- | --- | --- | --- |
| BEH-001 / SCN-001,003 | REQ-001/003, AC-001/004 | Open Team from catalog or Org; E001/E002/E007 | Existing selected Team read → loaded detail → Description/Members/Instructions/Handoffs; DS-001 |
| BEH-002 / SCN-002 | REQ-002, AC-002 | Member View, E002/E003 | Same node lookup/identity → navigate emit → parent route → Agent detail with return context; DS-002 |
| BEH-003 / SCN-002 | REQ-003, AC-003 | Header/Back action, E002/E003 | Same header controls → navigate/runStart/delete confirmation owners → existing outcome; DS-003 |

## Relevant Supplemental Task Artifacts
Three user screenshots at original absolute Task-context paths inventoried in investigation E001. Current-state evidence only; new visual redesign/Product repository/spec N/A — not applicable. Independent architecture review N/A — not applicable if direct rule matches completed Small/Low design.

## Task Design Health Assessment (Mandatory)
- Change posture: Behavior Change, presentation only. Root cause classification: Local Implementation Defect (composition order relative to requested UX).
- Current architecture issue: No. Refactor needed now: No.
- Evidence: one common component renders every loaded Team variant; child components already own instructions/handoffs; handlers independently own navigation; no duplicated ordering policy.
- Structural triggers ruled out: repeated coordination (single template), mixed ownership/boundary bypass (route uses detail and stores' existing public reads), shared-structure looseness (no data shape change), file-placement drift (Team presentation remains its existing component), legacy pressure (one clean replacement order).
- Response: local template relocation, regression coverage; remove proven unused router acquisition as bounded dead-binding cleanup. No subsystem extraction or risk-bearing deferral.

## Task Size And Architectural Risk (classified after target design)
- `task_size=Small`: one production Vue file, its colocated component test, relevant existing child/scoped tests and proportionate browser coverage/evidence.
- `architectural_risk=Low`: same owners, props, IDs, data/route/action contracts, responsive CSS and dependencies; no material persistence/security/concurrency/deployment/ownership change. Unknowns resolved E007–E011.
- Payload vs structural: existing description/instructions/rules/nodes all untouched; changed structural surface is local template sibling order only, plus removal of unused router import/binding. Content length does not increase architecture risk.
- Escalation trigger: if satisfying this change requires new data/route/API/owner/lifecycle/deployment contract or material uncertainty, return Design Impact/Requirement Gap for reclassification instead of broadening direct-route work.

## Terminology
Members section = existing direct Agent roster including count, cards, coordinator badge and View controls, not runtime member statuses.

## Legacy Removal Policy / Removal Plan (Mandatory)
| Item | Why unnecessary | Replacement / scope |
| --- | --- | --- |
| Old bottom position of Members block | Replaced approved composition order | Same intact block after Description; In This Change; no duplicate legacy path |
| Unused `useRouter` import and `const router = useRouter()` | E011 proves no reads; page router already owns emitted navigation | Existing emits/runStart remain; In This Change, no handler rewrite |
No compatibility wrappers, feature flags or alternate old/new behavior retained. No proven unreachable branch/function removal beyond this bounded unused-hook cleanup. Wider unrelated cleanup/refactor is out of scope.

## Persisted Data / State Transition Decision (Mandatory)
Not Affected. No storage/model/serialization/semantics/read-write contract change. Existing node/content/ID data consumed unchanged; no migration, startup admission, rollback data transform or acceptable data loss. Migration plan N/A.

## Data-Flow Spine Inventory / Primary Execution Spines
| ID | Scope / owner | Start → end / why |
| --- | --- | --- |
| DS-001 | Primary End-to-End; route selects, stores read, detail composes | Catalog/Org Team selection → /agent-teams query → AgentTeamDetail props/watch → authoritative catalog/exact scoped readers → computed teamDef → loaded section rendering; users see roster before rules |
| DS-002 | Return-Event; detail emits, parent route navigates | Member View → same agentId → navigate payload → page handleNavigation → /agents detail with returnToTeam/returnToOrg; preservation |
| DS-003 | Return-Event; existing action owners | Run → runStart.runTeam → New chat Team start intent; Edit/Back → existing navigate → owning route; Delete → existing dialog/store delete → team-list; preservation |

## Spine Narratives And Main-Line Nodes (Mandatory)
Selected query identifies the Team; existing watch reads definitions or exact Org references; the computed Team feeds one loaded detail layout. Only placement of its roster changes. Member selection still computes canonical shared/team-local identity and emits to the page router. Existing Run/Back/Edit/Delete dispatch remains unchanged. No worker/event loop/state machine is introduced; bounded-local spine N/A for this template-only delta.

## Ownership Map / Thin Entry Facades
Route owns view/query/return context and router dispatch. Team/Agent stores and existing Org reference service own retrieval. AgentTeamDetail owns visible section composition and action emits. ExpandableInstructionCard owns overflow/disclosure; HandoffManager owns view-only ordered rule display. runStart owns start intent; delete dialog/store own confirmation/mutation. No new facade or API.

## Off-Spine Concerns / Ownership Boundaries / Boundary Encapsulation
Localization supplies existing headings/counts; existing child renderers keep their concerns. Route/detail must continue using existing store/scoped-reader boundaries; no direct server/filesystem access, no read bypass and no new runtime state owner. Layout ownership remains in detail; do not move ordering into definitions or handoff storage.

## Dependency Rules And Interface Boundary Mapping/Check
Reuse `teamDefinitionId` and optional `returnToOrgId` props, `navigate` payloads, `runStart.runTeam`, existing store readers, child content/model/options/variant props. Identities are already explicit shared/team-local and scoped return IDs; responsibility/selector ambiguity is unchanged and low. No interface modification, shared structure tightening or new dependency. Naming remains natural and existing.

## Existing Capability Reuse / Subsystem Allocation
Reuse Team detail presentation, existing instruction/handoff children, navigation and stores. No new subsystem, service, generic section-order abstraction or shared DTO. Single-file composition is clearer than creating artificial structural depth.

## Draft And Final File Responsibility / Target Folder Mapping
| Change | Path | Concrete responsibility |
| --- | --- | --- |
| Modify | autobyteus-web/components/agentTeams/AgentTeamDetail.vue | Existing Team-detail composition: relocate Members block; remove unused router hook/binding only; retain handler behavior |
| Modify | autobyteus-web/components/agentTeams/__tests__/AgentTeamDetail.spec.ts | Add observable section-order regression and preservation assertions; current instruction stub needs heading or use real child |
| Add/Modify if coverage gap requires | autobyteus-web/tests/e2e/ under established probe/fixture patterns | Durable source-current renderer proof with owned boundaries/resources; API/E2E owns executable coverage |
| Optional docs sync | autobyteus-web/docs/agent_teams.md | Delivery adds concise detail-order description if useful; no global TESTING suite-specific entry |
No source file move/rename, shared structure extraction, folder change or new architectural pattern.

## Concrete Shape Guidance
Loaded detail: Header (unchanged), Description section, existing Members section, existing ExpandableInstructionCard, existing HandoffManager. Avoid CSS-only order and named Software Engineering exceptions.

## Backward-Compatibility Rejection Log (Mandatory)
Old/new layout toggle or duplicate roster: Rejected; user requests one universal new order. Compatibility adapters/schema version branches: N/A — no data/interface transition. Derived layering: N/A — unchanged renderer ownership.

## Change Sequence And Guidance For Implementation
1. Reconfirm task worktree/base and current R1 approval; read applicable worktree authorities.
2. Relocate intact Members section; remove unused router import/binding identified E011 without changing any handler.
3. Add focused order/count/card/navigation/action regression. Preserve existing shared/team-local and Org-context assertions; add realistic long handoff fixture where useful.
4. Run once-mode focused tests and inspect changed diff; self-review Small/Low. Verify rendered production component at desktop and narrow widths with actual section order/geometry, long rules below roster, responsive card columns, content preservation and member/action behavior. API/E2E maintains executable coverage and validation.
5. Delivery syncs docs, integrated checks, explicit user app verification and release decision; finalizes origin/personal with fresh refs and --no-ff merge per RELEASE.md, records cleanup, returns cumulative delivery receipt.

## Verification Intent / Commands
Suggested relevant layer: `pnpm -C autobyteus-web test:nuxt components/agentTeams/__tests__/AgentTeamDetail.spec.ts components/agentOrgs/__tests__/AgentOrgOwnedAuthoring.spec.ts components/common/__tests__/ExpandableInstructionCard.spec.ts --run`; extend only to applicable gap/child coverage. No tests executed by Solution Designer. Browser probe must use task source, owned setup/data/ports, DOM/state assertions, warmup, fresh evidence, screenshots inspected and cleanup receipt; don't certify Electron shell from browser evidence. For a full user-app journey use current worktree isolated desktop; explicit human app verification remains separate.

## Key Tradeoffs And Risks
Whole-block movement is smallest correct change and preserves document/visual order. Existing styles retain responsive behavior without new CSS. Source-current render/tests remain unexecuted until downstream work. Do not test user's running app/data or pre-change installed binary. Main checkout is dirty and diverges; RELEASE.md explicitly avoids it for finalization. Release defaults to none unless user requests otherwise at verification, but record decision; urgency does not authorize tags/publication. No other design blocker.

## SR-003 — Scope recovery and source-package sequencing
The approved local template design/classification remains Small/Low. Existing baseline Agent/Org fragment fixes and standalone failing mutation-cache reproducer are not part of this UI implementation. Implementation owner must preserve the existing work under the already observed `preserve/agent-definition-cache-fix-d8bac59860` (pin d8bac598606001b702e300eeaeefe06c3caf0d3d) and durable follow-up handover before excluding baseline source/test changes from active UI delta. Revert 09731dcd140a08e5bdab6e0889d54aaaf2812f22 restores the two mutation files, but at observation HEAD de450f82ba35561f08905486414a32a22dbc7cf0 the initial definitionMutationCache.spec.ts still remains an added active test. Separation therefore is not yet complete. Preserve Delivery edits and raw histories; do not rewrite/delete API-REV-002 Fail or create a new baseline fix. The API owner then issues a new source-pinned scoped UI validation disposition, with broader baseline app-health findings linked and unresolved; Delivery retains human/release/finalization gates. Follow-up implementation remains TODO/not dispatched. No new architecture/review or requirements approval is needed for unchanged UI intent; an out-of-scope defect is not a scoped UI failure merely because it was encountered in setup.

## SR-004 — Preservation / separation completion observed
Implementation IR-004 and baseline-follow-up-handover.md now supersede earlier incomplete SR-003 observation without rewriting it. At HEAD52a5a1ee4ca88f35d2ee21b472018bb32d481360, retained d8 branch remains exact; source-separation commitcf18b16f46230d20bc2c1d8c1c19f7fc81bb8b71 excludes standalone baseline regression from active UI root. Read-only diff of both mutation docs/cache spec against integratedf13bdd0eb79aacc63dffa5995b9c86f359001468 is empty; cache spec no longer tracked there. Prepared patch/full test hashes match manifest. Baseline defects remain unresolved/unreviewed and historical API-REV-002 Fail retained. New scoped API disposition and Delivery gates remain outstanding. No new design work/re-review/implementation route is triggered by this preservation receipt.
