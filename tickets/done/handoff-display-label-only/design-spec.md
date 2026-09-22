# Design Spec

## Solution And Approval Basis

- Package identifier: `handoff-display-label-only`
- Current solution revision ID: `SR-004`
- Approved requirements baseline / revision and user-approval reference: `SR-002`, explicitly approved in `SR-003` by the user's 2026-09-22 message, “cool. approve”.
- Behavior-defining supplements and their approval references: None. The two user-supplied screenshots are current-state evidence only.
- Design status: `Ready`
- Canonical investigation-notes path: `/Users/normy/autobyteus_org/autobyteus-worktrees/handoff-display-label-only/tickets/in-progress/handoff-display-label-only/investigation-notes.md`

## Current-State Read

`HandoffManager.vue` is already the shared presentation and authoring owner for Agent Team and Agent Org handoffs. Four parent callsites supply `HandoffEndpointOption` catalogs; the manager groups options, resolves exact addresses, renders endpoint identities, validates drafts, and emits unchanged `EditableHandoff` values. Its local `EndpointIdentity` currently renders a readable label plus a second address paragraph, native selector options concatenate `label · address`, and the stale-endpoint message interpolates the raw address.

The parent projections and shared address-bearing types are healthy for their current responsibilities. The target design must preserve them because canonical addresses remain the exact lookup, validation, persistence, coordinator-resolution, and runtime-routing identities. The only verified presentation gap is that readable labels can collide and the existing `truncate` class can conceal long labels once the address row is removed. Architecture evidence is recorded in the investigation source log for `BEH-001`–`BEH-004`.

## Task Size And Architectural Risk (Mandatory)

- Task size (`Small`/`Medium`/`Large`): `Small`
- Size rationale and supporting evidence: The production delta is confined to one existing shared Vue component and two existing locale catalogs, with focused coverage in one existing component test. The four Team/Org callsites, shared types, stores, APIs, persistence, and runtime routing do not change.
- Architectural risk (`Low`/`High`): `Low`
- Risk rationale and supporting evidence: The current shared owner already has the complete option sets and owns all affected rendering. A local derived-label projection can change visible text without changing the authoritative address values or component interface. Existing tests already cover validation, emission, ordering, and localization.
- Escalation trigger if implementation or validation discovers new impact: Stop the direct route and return to Solution Designer if address-free uniqueness requires changing a parent option projection, shared endpoint type, persisted definition shape, backend catalog, runtime routing, or any behavior outside `REQ-001`–`REQ-004`; also escalate if exact endpoint addresses are not unique within an option catalog.

## Architecture Investigation Evidence

| Source / Command / Probe | Exact Path / Reference | Observation | Design Decision Supported | Remaining Uncertainty |
| --- | --- | --- | --- | --- |
| Shared component read | `autobyteus-web/components/collaboration/handoffs/HandoffManager.vue:19-43,91-144,167-200` | One component owns grouped option display, selected previews, read-only cards, stale feedback, exact lookup, and validation. | Keep the change inside `HandoffManager`; do not fork Team/Org behavior. | None for the approved scope. |
| Contract/type read | `autobyteus-web/types/collaboration/handoffs.ts:1-36` | Exact addresses are option values and serialized endpoint identities. | Preserve all public props, emits, types, and address semantics. | None. |
| Parent projection read | `AgentOrgExperience.vue:294-371`; Team detail/form endpoint projections | Parents already supply readable labels and complete option sets, but referenced definition names can collide. | Prefer supplied labels and disambiguate locally from existing placement identity only when needed. | Rendered browser behavior still requires downstream verification. |
| Address/label utility and validator read | `types/agent/AgentTeamAddress.ts`; `utils/collaboration/memberRoleLabel.ts`; Team/Org member-name validators | Address segments can yield readable placement context; humanization can collapse `_` and `-`, while sibling placement identifiers remain unique. | Use the shortest readable unique suffix; retain literal segment spelling only for a post-humanization collision. | Duplicate exact addresses would violate the assumed catalog contract and trigger escalation. |
| Locale inventory | `localization/messages/en/handoffs.ts`; `localization/messages/zh-CN/handoffs.ts`; `rg handoffs.manager.endpoint.unavailable` | One component consumer and two catalog definitions own stale feedback. | Replace `address` interpolation with readable `label` in both locales. | None. |
| Test inventory | `components/collaboration/handoffs/__tests__/HandoffManager.spec.ts`; existing Org label tests/probe | Focused tests already cover view/edit, validation, exact emissions, stale behavior, order, and locale, but not address-free identity presentation. | Extend the existing focused suite and leave higher-level role-label coverage intact. | Final visual wrapping at desktop/narrow widths belongs to rendered validation. |

## Intended Change

Replace every normal user-facing handoff endpoint address with one complete, readable identity label while retaining the address exclusively as the internal key/value. `HandoffManager` will derive a display-label map independently for the current `fromOptions` and `toOptions`, reuse it in native selector options, selected previews, and read-only cards, and derive readable stale text when an address no longer resolves.

For each choice set:

1. Use the supplied `option.label` unchanged when its normalized form is unique.
2. For a colliding label group, append the shortest suffix of placement segments that makes the label unique after humanizing `_` and `-`; render the qualifier without a leading slash, for example `Researcher (marketing team / researcher)`.
3. If humanization still collapses distinct placements, use the shortest unique literal segment suffix as the qualifier. This rare fallback may preserve `_` or `-`, but it never renders a rooted or full canonical address.
4. Keep `option.address` as the native option value, lookup key, validation identity, emitted value, and persisted value.

`EndpointIdentity` remains local to the component. It accepts the resolved display label, renders only the type icon and label, removes the address paragraph, and wraps words instead of using ellipsis truncation. Native select option text contains the complete projected label; platform clipping of the closed control does not change its accessible option text.

For a stale endpoint, the component converts its non-rooted path segments to a readable `segment / segment` description and interpolates that as `label`. A localized generic endpoint label is used if no safe segment can be obtained; the raw value remains available to internal validation and technical diagnostics but is not rendered.

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior ID | Kind | Approved Requirement / Intent And Acceptance-Criteria IDs | Approved Trigger Or Governing Contract | Relevant Existing Behavior And Evidence Reference | Approved Change Or Preserved Outcome | Target Production Path / Lifecycle And Spine ID(s) |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User | `REQ-001`, `REQ-002`, `REQ-004`; `AC-001`, `AC-002` | Open Team or Org detail with handoffs | Investigation source log; screenshots; four production callsites | One semantic icon-and-label row, no address row; From/To/When/order remain. | Team/Org detail -> option catalogs -> HandoffManager label projection -> read-only identity card (`DS-001`). |
| BEH-002 | User | `REQ-001`–`REQ-004`; `AC-003` | Add or edit a Team/Org handoff | `HandoffManager.vue` selector, preview, validation, emit path | Address-free readable choices/previews; exact selected and emitted address values remain. | Parent form -> HandoffManager option projection -> native select/draft -> validation -> unchanged emit (`DS-002`, `DS-003`). |
| BEH-003 | User | `REQ-002`; `AC-001`–`AC-003` | Encounter long or duplicate-looking endpoint names | Org option construction, role-label formatter, validators | Wrap complete tile labels and add minimal non-rooted placement context only on collision. | Option set -> deterministic display-label map -> all visible endpoint identities (`DS-004`). |
| BEH-004 | Contract | `REQ-003`, `REQ-004`; `AC-004` | Lookup, validate, serialize, or route a handoff | Shared handoff types and existing validation | Exact addresses, coordinator resolution, serialization, and runtime routing are preserved; stale feedback becomes readable. | Address lookup/validation/emit remains unchanged; stale-only presentation derives a label (`DS-002`, `DS-003`, `DS-004`). |

## Relevant Supplemental Task Artifacts

| Artifact Path | Purpose | Related Requirement / Acceptance-Criteria IDs | Relationship To This Design | Status / Approval Applicability |
| --- | --- | --- | --- | --- |
| `/Users/normy/.autobyteus/server-data/memory/agent_orgs/autobyteus_org_4aeae4517a7143308f0c1a79ac3ea040/software_engineering_team_bc51fed012964ba0bcfff2b55c2f03cb/solution_designer_c19f79c911fa40649aee31ffc36386f9/context_files/ctx_9dd6ff35f572__image.png` | Agent Team current-state evidence | `REQ-001`; `AC-001` | Demonstrates the redundant second address row to remove. | Evidence only; no separate approval needed. |
| `/Users/normy/.autobyteus/server-data/memory/agent_orgs/autobyteus_org_4aeae4517a7143308f0c1a79ac3ea040/software_engineering_team_bc51fed012964ba0bcfff2b55c2f03cb/solution_designer_c19f79c911fa40649aee31ffc36386f9/context_files/ctx_d96241d3fbde__image.png` | Agent Org current-state evidence | `REQ-001`, `REQ-002`; `AC-002` | Demonstrates rooted address noise and long hierarchical labels. | Evidence only; no separate approval needed. |

## Task Design Health Assessment (Mandatory)

- Change posture: `Behavior Change`
- Current design issue found: `No`
- Root cause classification: `No Design Issue Found`
- Refactor needed now: `No`
- Evidence: All affected Team/Org view/edit surfaces already converge on one shared owner with the complete data needed for the change. Public option and draft shapes have singular meanings and do not need loosening or duplication.
- Design response: Extend the existing component's presentation projection, keep `EndpointIdentity` local, and update its focused tests/locales.
- Refactor rationale: Extracting a global formatter, changing parent projections, or changing shared types would broaden ownership without reuse evidence. The local projection is policy for this one UI owner.
- Intentional deferrals and residual risk: None inside the approved scope. Browser-specific native-select clipping and responsive wrapping must be visually validated downstream.

## Terminology

- **Canonical address:** Slash-prefixed internal endpoint identity such as `/software_engineering_team/solution_designer`.
- **Display label:** The complete user-facing endpoint name rendered by HandoffManager.
- **Placement qualifier:** The smallest non-rooted readable segment suffix appended only when otherwise identical display labels collide.

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Required action: Remove visible `label · address` option composition, the `EndpointIdentity` address paragraph, the label `truncate` behavior, and stale-message `address` interpolation. There is no UI flag, tooltip, alternate mode, or fallback that keeps the old rooted-address presentation.
- Internal address identity is not legacy and remains unchanged.

## Persisted Data / State Transition Decision (Mandatory When Persisted Data May Be Affected)

- Stored subject, location, representative shape, and approximate volume: Definition handoffs stored as ordered `{from,to,rules[]}` records; volume is irrelevant because no stored value changes.
- Relevant code-model, serialization, semantic, or physical-store change: None.
- Normal reader/writer behavior and representative evidence: `toEditableHandoffs` and `toDefinitionHandoffs` continue mapping exact address strings without transformation.
- Required semantics and invariants under direct use: From/To identity, rule order, coordinator semantics, validation, and routing remain exact.
- Physical-store, privacy/security, disposal/rebuild, and operational constraints: None introduced.
- Decision: `Not Affected`
- Decision rationale: This is a derived presentation-only change. Rewriting data would be unnecessary and would violate `REQ-003`/`REQ-004`.
- Acceptance criteria or design constraints supported by this decision: `AC-003`, `AC-004`.

### Migration Plan

N/A — persisted data and serialization are unchanged.

## Data-Flow Spine Inventory

| Spine ID | Scope | Related Behavior ID(s) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | `BEH-001`, `BEH-003` | Team/Org detail option catalogs and saved handoff | Address-free read-only card | `HandoffManager` presentation boundary | Covers both requested display surfaces through the actual shared path. |
| DS-002 | Primary End-to-End | `BEH-002`–`BEH-004` | Team/Org author opens a handoff draft | Validated parent-definition draft | `HandoffManager` editor boundary | Proves readable UI and exact machine identity remain separated. |
| DS-003 | Return-Event | `BEH-002`, `BEH-004` | Apply/delete/reorder action | `update:modelValue` with exact addresses | `HandoffManager` editor boundary | Protects existing save and routing contracts. |
| DS-004 | Bounded Local | `BEH-003`, `BEH-004` | Current endpoint option set or stale address | Readable display label | `HandoffManager` presentation projection | Centralizes collision and stale-label policy without changing parents or shared data. |

## Primary Execution Spine(s)

- `DS-001`: Team/Org detail -> parent endpoint catalog -> HandoffManager exact lookup -> local display-label map -> EndpointIdentity -> user reads From/To/When.
- `DS-002`: Team/Org definition form -> exact endpoint catalog -> HandoffManager display-label map -> native selector writes exact address -> existing validation -> local editable handoff draft.

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | A detail parent supplies the same address-bearing catalog it uses today. HandoffManager resolves each saved address, obtains its projected label, and renders one icon-and-label identity row; conditions and order are untouched. | Definition detail, endpoint catalog, handoff card | HandoffManager for presentation; parent for subject data | Locale text, responsive wrapping, stale feedback |
| DS-002 | The author sees projected labels, but the native option value remains `option.address`. The existing draft and validation path therefore continue to operate on exact identities. | Definition form, option catalog, handoff draft | HandoffManager editor | Collision projection, accessibility, validation |
| DS-003 | Apply, delete, and reorder continue emitting cloned `EditableHandoff` records to the parent; no label enters the payload. | Handoff draft, parent definition draft | HandoffManager emit contract | Existing status/validation messages |
| DS-004 | The component derives a map from exact address to display label. It adds the shortest qualifier only within a collision group; unresolved addresses are humanized separately and never rendered raw. | Option set, display-label map, stale endpoint description | HandoffManager presentation projection | Locale fallback, deterministic normalization |

## Spine Actors / Main-Line Nodes

- Team/Org detail or definition-form parent: owns the subject and endpoint catalog.
- HandoffManager: owns visible handoff presentation, draft editing, local validation, and the display-label projection.
- EndpointIdentity: local renderer for one resolved endpoint identity.
- Parent definition draft: owns subsequent definition save behavior, unchanged.

## Ownership Map

- Parents continue to own authoritative endpoint membership and supply `HandoffEndpointOption` values.
- HandoffManager owns how those values are rendered within handoff display/edit contexts and keeps display derivation separate from address identity.
- EndpointIdentity owns only icon-and-label layout; it does not derive identity or mutate endpoint data.
- Existing converters/runtime boundaries continue to own serialization and routing.

## Thin Entry Facades / Public Wrappers (If Applicable)

N/A — no new facade or wrapper is introduced. Existing component props/emits remain the public boundary.

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope | Notes |
| --- | --- | --- | --- | --- |
| `{{ option.label }} · {{ option.address }}` selector text | Rooted address is no longer user-facing disambiguation. | HandoffManager projected `displayLabel` | In This Change | Keep `:value="option.address"`. |
| EndpointIdentity address paragraph | Duplicates the readable identity and adds height/noise. | Single wrapping icon-and-label row | In This Change | No empty second-row spacing. |
| EndpointIdentity `truncate` class | Can hide the only visible identity. | Wrapping/breakable label styling | In This Change | Complete label remains in the DOM. |
| `Unavailable · {{address}}` catalog shape | Exposes an internal identifier. | Local readable stale description plus `{{label}}` interpolation | In This Change | Update English and Simplified Chinese together. |

## Return Or Event Spine(s) (If Applicable)

`DS-003`: User action -> existing HandoffManager mutation/validation -> `update:modelValue` -> parent definition draft -> existing save path. The event payload remains `EditableHandoff[]`; projected labels never cross this boundary.

## Bounded Local / Internal Spines (If Applicable)

- Parent owner: `HandoffManager`.
- `DS-004` option flow: option set -> normalize supplied labels -> detect collision groups -> choose shortest unique humanized suffix -> literal suffix only if needed -> map exact address to display label.
- `DS-004` stale flow: unresolved address -> safe non-rooted segments -> humanized hierarchy or localized unknown fallback -> localized unavailable message.
- Why it matters: This is the one policy-bearing part of the change and must be shared by selector options, previews, and read-only cards to prevent presentation drift.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| Localization | `DS-001`, `DS-004` | HandoffManager | Translate unavailable chrome/fallback, not user names. | Preserve locale parity. | Parent-specific translation branches or leaked identifiers. |
| Responsive/accessibility styling | `DS-001`, `DS-002` | EndpointIdentity/native select | Keep complete labels readable and keyboard/screen-reader semantics intact. | Address is no longer a second identification channel. | Reintroducing truncation or bespoke inaccessible controls. |
| Focused regression coverage | All | Shared component boundary | Assert visible labels and exact internal emissions. | Prevent presentation change from altering contracts. | Duplicated parent-level tests with weaker boundary coverage. |

## Ownership Boundaries

The authoritative frontend boundary remains HandoffManager's existing props/emits contract. Parents may provide endpoint facts but must not precompute handoff-specific collision labels. HandoffManager may derive visible labels but must not rewrite an option address or definition record. The local EndpointIdentity renderer must remain presentation-only. Serialization and runtime consumers remain beyond this change.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `HandoffManager` props/emits | Option grouping, display-label map, address lookup, identity rendering, draft validation | Four Team/Org detail/edit callsites | Parent-specific address hiding or collision formatting | Improve the local projection without widening shared types unless escalated. |
| Existing handoff converters | Editable/definition address mapping | Parent definition save path | Substituting display labels for `from`/`to` | Preserve exact converter contract; no change planned. |

## Dependency Rules

- HandoffManager may depend on the existing endpoint options, localization runtime, and local label formatter logic.
- EndpointIdentity may receive a display label and endpoint kind; it must not inspect parent state or perform lookup.
- Parent Team/Org components continue to pass the same endpoint option shapes and must not depend on HandoffManager internals.
- Display labels must never be written into `EditableHandoff`, `DefinitionHandoff`, coordinator addresses, validation comparisons, or runtime routing.
- No new global utility is permitted unless implementation finds a second production owner with the same exact policy; that finding triggers design review rather than opportunistic extraction.

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `HandoffManager` props | One Team/Org handoff collection and endpoint catalogs | Render/edit handoffs | Exact rooted address in options/drafts | Unchanged public interface. |
| `update:modelValue` | Editable handoff collection | Return validated draft changes | Exact `fromAddress`/`toAddress` | Display label excluded. |
| Local label projection | Current `fromOptions` or `toOptions` set | Map exact identity to visible label | Existing option object/address | Internal only; independent per choice set. |
| EndpointIdentity props | One resolved endpoint | Render type icon and complete label | Kind plus derived display label | Local component only. |

## Interface Boundary Check

| Interface | Responsibility Is Singular? | Identity Shape Is Explicit? | Ambiguous Selector Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| HandoffManager props/emits | Yes | Yes | Low | Preserve unchanged. |
| Local label projection | Yes | Yes | Low | Normalize collision comparisons and key output by exact address. |
| EndpointIdentity props | Yes | Yes | Low | Pass the derived label explicitly; do not rederive it. |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Name Is Natural And Self-Descriptive? | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Shared handoff UI owner | `HandoffManager` | Yes | Low | No rename. |
| Local resolved identity renderer | `EndpointIdentity` | Yes | Low | No rename. |
| Visible text | `displayLabel` | Yes | Low | Keep distinct from `address` and upstream `label`. |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Shared Team/Org handoff presentation | HandoffManager | Extend | Already owns every affected surface and full option sets. | N/A |
| Identifier humanization | Existing `formatMemberRoleLabel` behavior | Reuse locally/import existing utility as appropriate | Matches current role-label vocabulary. | N/A |
| Stale-message localization | Existing handoff catalogs | Extend | Existing key and two locales already own this chrome. | N/A |
| Cross-application display-label service | None needed | Do not create | Policy has one owner and no cross-feature reuse evidence. | N/A |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision | Notes |
| --- | --- | --- | --- | --- | --- |
| Collaboration handoff UI | Display-label projection, tiles, selector text, draft validation | `DS-001`–`DS-004` | HandoffManager | Extend | No new subsystem or folder. |
| Localization catalogs | Unavailable/unknown endpoint chrome | `DS-001`, `DS-004` | HandoffManager | Extend | English and Simplified Chinese stay aligned. |
| Component tests | Presentation and payload regression coverage | All | HandoffManager boundary | Extend | Focused suite is sufficient for implementation checks. |

## Draft File Responsibility Mapping

| Candidate File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `HandoffManager.vue` | Collaboration handoff UI | HandoffManager | Derive/reuse display labels and render a one-row identity | All affected modes already meet here. | Existing option/draft types |
| `HandoffManager.spec.ts` | Component tests | HandoffManager boundary | Prove visible text and exact emitted values | Existing fixture/test owner. | Existing test harness |
| `en/handoffs.ts`, `zh-CN/handoffs.ts` | Localization | Catalog boundary | Readable stale/fallback wording | Existing catalog ownership. | Translation key parity |

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? | Overlapping Representations Removed? | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| Address-to-display-label projection | N/A; keep local in `HandoffManager.vue` | Collaboration handoff UI | No repetition exists outside the owner. | Yes — use a map keyed by existing address, not a second shared endpoint type. | Yes — do not persist or emit display labels. | A global identity formatter or alternate source of endpoint truth. |

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? | Redundant Attributes Removed? | Parallel / Overlapping Representation Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| `HandoffEndpointOption` | Yes | N/A | Low | Keep unchanged; derive display text locally. |
| `EditableHandoff` / `DefinitionHandoff` | Yes | N/A | Low | Keep labels out of payloads. |
| Local address-to-label map | Yes | Yes | Low | Recompute from props; never persist it. |

## Final File Responsibility Mapping

| File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/components/collaboration/handoffs/HandoffManager.vue` | Collaboration handoff UI | HandoffManager | Local deterministic display-label maps, selector/card/preview use, wrapping EndpointIdentity, stale readable description | Single shared runtime owner for all requested surfaces. | Existing `HandoffEndpointOption` and member-label formatting |
| `autobyteus-web/components/collaboration/handoffs/__tests__/HandoffManager.spec.ts` | Component tests | HandoffManager boundary | Address-free view/edit assertions, collision/long/stale cases, exact emitted address regression, locale parity | Existing focused behavior suite. | Existing fixtures/harness |
| `autobyteus-web/localization/messages/en/handoffs.ts` | Localization | English handoff catalog | Replace address interpolation and add generic fallback only if implementation needs it | Existing locale owner. | Existing key namespace |
| `autobyteus-web/localization/messages/zh-CN/handoffs.ts` | Localization | Simplified Chinese handoff catalog | Mirror English key-shape change | Required catalog parity. | Existing key namespace |

## Applied Patterns (If Any)

- **Derived presentation projection:** A computed address-to-display-label map is derived from the authoritative option set. It solves view consistency without making display text authoritative or expanding the shared DTO.
- No strategy, registry, service, store, or new component abstraction is warranted.

## Target Subsystem / Folder / File Mapping

| Path | Kind | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/components/collaboration/handoffs/HandoffManager.vue` | File | Shared handoff UI | All target runtime behavior | Existing common owner; compact local change is clearer than new folders. | Persistence or runtime-routing changes |
| `autobyteus-web/components/collaboration/handoffs/__tests__/HandoffManager.spec.ts` | File | Component boundary verification | Durable focused coverage | Co-located existing suite. | Parent-specific duplicated scenarios |
| `autobyteus-web/localization/messages/{en,zh-CN}/handoffs.ts` | File | Locale catalogs | Stale/fallback user-facing text | Existing localization boundary. | Raw address formatting policy |

Change inventory: `Modify` the four files above. `Add`: none. `Move/Rename`: none. `Delete`: none. Remove only obsolete render branches/text inside the component/catalogs.

## Folder Boundary Check

| Path / Folder | Intended Structural Depth | Ownership Boundary Is Clear? | Mixed-Layer Or Over-Split Risk | Justification / Corrective Action |
| --- | --- | --- | --- | --- |
| `components/collaboration/handoffs` | Main-Line Domain-Control / presentation | Yes | Low | Existing shared component boundary covers all target UI. |
| `localization/messages/*` | Off-Spine Concern | Yes | Low | Locale-only text remains outside component logic. |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Bad / Avoided Shape | Why The Example Matters |
| --- | --- | --- | --- |
| Ordinary identity | `article writer` | `article writer` plus `/article_writer` on another row | The supplied label is sufficient when unique. |
| Collision | `Researcher (marketing team)` and `Researcher (product team)` | Two `Researcher` options or full rooted paths | Minimal placement context preserves usability without internal syntax. |
| Humanization collision | `Reviewer (review_agent)` and `Reviewer (review-agent)` only when needed | A leading-slash full address | Literal spelling is a last-resort non-rooted qualifier. |
| Data boundary | `<option :value="option.address">{{ displayLabel }}</option>` | Writing `displayLabel` into `fromAddress` | Visible vocabulary and exact identity must remain separate. |
| Long label | One icon-and-label row whose label wraps | Ellipsis plus hidden address dependency | The only visible identity remains complete. |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| Keep addresses in edit mode only | Earlier baseline assumed edit users might need them. | Rejected | User approved readable address-free editing; exact value remains internal. |
| Show addresses in a tooltip/secondary disclosure | Could preserve the old visibility contract. | Rejected | No address-copy/inspection workflow is in scope; use unambiguous readable labels. |
| Feature flag or dual one-row/two-row renderer | Could reduce rollout risk. | Rejected | One shared local change has no schema/runtime transition; remove the old presentation directly. |
| Put both old and new locale placeholders on the message | Could preserve callers using `address`. | Rejected | The key has one runtime consumer; change it atomically to `label`. |

## Derived Layering (If Useful)

N/A — a new layer would be empty indirection. The existing parent -> HandoffManager -> local renderer shape is sufficient.

## Change / Refactor Sequence

1. Add local, pure display-label derivation inside HandoffManager and computed maps for the current From and To option sets.
2. Switch selector text, selected previews, and read-only cards to the same derived labels while keeping native values/lookups exact.
3. Simplify EndpointIdentity to one wrapping icon-and-label row and remove the address paragraph/truncation.
4. Add readable stale-address derivation and update both locale catalogs from `address` to `label`, with a localized empty/malformed fallback if needed.
5. Extend the focused suite for view/edit invisibility, collisions, long labels, stale feedback, exact emissions, validation, and locale behavior.
6. Run focused component/localization checks and render Team/Org detail/edit at desktop and narrow widths. Confirm no old visible-address branch remains.

No temporary compatibility seam or migration step is needed.

## Key Tradeoffs

- Keeping projection local avoids changing healthy parent/type boundaries, at the cost of a small pure helper inside an already substantial component. This is acceptable because the policy has one production owner.
- Minimal collision qualifiers are slightly more logic than simply deleting address text, but they protect exact choice usability required by `REQ-002`.
- Wrapping may make exceptional long tiles taller, but it preserves complete identity and is preferable to a permanent technical second row or ellipsis.

## Risks

- A native closed select can visually clip long option text on some platforms. Mitigation: retain the complete text node/value label, keep selected preview wrapping, and verify browser behavior downstream.
- Humanized placement qualifiers can collide. Mitigation: deterministic literal-segment fallback and focused tests.
- A malformed stale address could yield no readable segments. Mitigation: localized generic endpoint fallback; never render the raw malformed value.
- Accidental use of display text as identity could alter persistence/routing. Mitigation: keep the public types unchanged and assert exact emitted addresses.

## Guidance For Implementation

- Keep the projection pure and deterministic; normalize only for collision comparison, not for the supplied base label shown to the user.
- Build separate maps for From and To because ambiguity is defined within the active choice set.
- Select the shortest unique suffix within each colliding base-label group; do not append placement context to unique labels.
- Do not mutate `HandoffEndpointOption`, add `displayLabel` to shared types, or modify Team/Org option construction.
- Do not assert that address strings disappear from HTML attributes: they intentionally remain native option values and internal identities. Assert that visible text and user-facing messages contain no rooted addresses while emitted payloads remain exact.
- Preserve all existing validation, reordering, condition, status, localization, and mode/scope tests. Add targeted cases for `SCN-001`–`SCN-003` and `AC-001`–`AC-004`.
- Follow `autobyteus-web/AGENTS.md`; run the focused Nuxt/Vitest command and applicable localization checks. Rendered desktop/narrow browser validation remains required downstream.
