# Requirements Document

## Document Status

- Status: `Approved Direct-Implementation`
- Current requirements revision ID: `RER-003`
- Package identifier: `AUT-WEB-COMPACT-TOOL-ERROR-001`
- Request / ticket: `compact-center-tool-error-presentation`
- Requirements owner: Requirements Engineer (`/requirements_engineer`)
- Date: 2026-09-02
- Approval state and reference: Approved by the user on 2026-09-02 in direct response to the `RER-002` review summary: “Yes, approved.” `RER-003` records approval and routing without changing intended behavior.

## Problem And Desired Outcome

- Problem: A failed tool or command card in the center event-monitor conversation currently renders the complete failure string inline, even though successful center cards do not inline their Result content. The right-side Activity panel also opens its Error subsection by default even though its Result subsection starts collapsed. When a failure string contains accumulated normal command output, both defaults can expand by hundreds or thousands of lines, overwhelm the event stream or Activity list, and obscure surrounding run activity.
- Affected actors or systems: Users monitoring standalone or team-member agent runs in the desktop/web frontend; center event-monitor conversation cards; right-side Activity details; live and replayed tool failures.
- Desired outcome: Apply the same progressive-disclosure hierarchy used for successful tools. The failed center card is a simple row like the normal/successful row, communicates failure through its existing red styling and status icon, retains the tool name and compact context summary, and renders no detailed error content. In the right-side Activity item, the Error subsection starts collapsed just like Result and reveals the complete error only after the user explicitly opens it.
- Observable definition of success: A failed card remains one compact center-row treatment even when its failure payload contains a very large multiline string; none of that string is displayed in the center card. Activating the row navigates to and highlights the matching Activity item without auto-opening Error. The collapsed Error heading remains available, and only the user's explicit expansion reveals the same complete failure string.

## Relevant Current And Desired Behavior

| Behavior ID | Kind (`User`/`System`/`Operational`/`Contract`) | Related Scenario IDs | Evidence-Backed Current Behavior | Desired Behavior | Intentionally Preserved Behavior | Investigation Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| `BEH-001` | User | `SCN-001`, `SCN-003` | A failed tool card in the center event stream displays its tool name/context, red error state, and the complete `error` string in a multiline red body. | The failed center card uses the same simple-row information hierarchy as a normal/successful tool card, remains compact, and shows failure state, tool name, and compact context only; it does not show any error-detail body or error payload text. | Existing card placement, red border/icon treatment, truncated context summary, chevron, pointer/keyboard navigation, and surrounding event ordering remain unchanged. | `evidence/user-center-error-flood.png`; `ToolCallIndicator.vue`; `ToolCallIndicator.spec.ts` |
| `BEH-002` | User | `SCN-002`, `SCN-003` | Clicking a non-approval center card opens the right-side Activity tab and highlights the matching invocation. The Activity item's outer card starts expanded; Arguments, Logs, and Result subsections start collapsed, but Error starts expanded and immediately renders the complete multiline diagnostic. | The right-side Activity item remains the detailed diagnostic surface, but Error starts collapsed like Result. Selecting/highlighting the item does not auto-open Error; the user explicitly expands Error to reveal the complete diagnostic for that invocation. | Activity status, ID, full arguments/log/result/error content, outer-card default expansion, section controls, highlighting, and current Arguments/Logs/Result default states remain unchanged. | `evidence/user-activity-error-detail.png`; `evidence/user-activity-error-expanded-default.png`; `ToolActivityItem.vue`; navigation logic in `ToolCallIndicator.vue` |
| `BEH-003` | System | `SCN-001`, `SCN-003`, `SCN-004` | A `TOOL_EXECUTION_FAILED` event writes the same failure string to the conversation segment and Activity record; presentation passes the segment error into the center card. | Failure status and complete diagnostic data continue to reach conversation/activity state and replay, but center presentation no longer duplicates the detailed string visually. | Backend/provider error enrichment, streaming contract, tool identity, Activity data, local trace persistence, and historical replay remain unchanged. | `toolLifecycleHandler.ts`; `toolCardPresentation.ts`; prior delivered package `REQ-CODEX-COMMAND-FAILURE-DETAIL-20260901` |
| `BEH-004` | Contract | `SCN-001`, `SCN-004` | Center-card height grows with error payload size; the observed 348,978-character `tool_error` produced a center card containing ordinary command output across roughly 1,900 lines. | Center-card visible content and height are independent of error-detail length, including extreme multiline failures. | The application does not truncate, rewrite, or discard the authoritative error solely to achieve the compact center presentation. | `observed-long-failure-analysis.md`; supplied screenshots |

## Stakeholders, Actors, And Outcomes

| Actor / Stakeholder | Goal Or Responsibility | Required Outcome | Important Constraint |
| --- | --- | --- | --- |
| User monitoring an active run | Understand event progression without losing the conversation context to one failed command | Sees a compact failed card and can open the matching detailed Activity item | Failure must remain visually obvious even without inline details |
| User diagnosing a failure | Inspect the full tool arguments and diagnostic output when needed | Sees a collapsed Error heading in Activity and explicitly opens it for complete detail | Center-card compaction or Activity's collapsed default must not destroy, truncate, or replace the diagnostic |
| User reopening run history | Review the same failure later | Gets the same compact-center/detailed-Activity split after replay | Live and replayed presentation must not diverge |
| Engineering / test owners | Preserve event semantics while correcting presentation hierarchy | Focused frontend behavior changes without a backend error-contract regression | Prior detailed-error transport work remains authoritative outside the center display |

## Scope Guardrail (Mandatory)

### In-Scope Use Cases

- `UC-001`: A tool invocation fails during an active standalone or team-member run and appears as a failed card in the center event-monitor conversation.
- `UC-002`: The failed invocation carries a short, multiline, or extremely large error string, including accumulated normal command output followed by an exit code.
- `UC-003`: The user activates the failed center card to open and highlight the exact right-side Activity item; Error remains collapsed until the user explicitly expands it and may be collapsed again.
- `UC-004`: The user reopens a recorded run containing the failed tool invocation and receives the same presentation hierarchy.
- `UC-005`: Existing rendered and component validation is revised so it protects compact center presentation, default-collapsed Activity Error, and complete diagnostics after explicit expansion rather than requiring simultaneously visible duplicated details.

### Out Of Scope

- Changing whether the underlying tool execution is classified as success or failure.
- Changing shell, provider, or agent command construction, including the specific `rg | head` pipeline that produced the supplied example.
- Changing backend/provider error enrichment, raw-trace storage, local replay data, GraphQL/stream payloads, error precedence, stdout/stderr aggregation, or exit-code mapping.
- Truncating, summarizing, redacting, or deleting the error held by Activity or persistent trace state.
- Redesigning the right-side Activity panel, changing the outer Activity-card default expansion, changing the existing Arguments/Logs/Result subsection defaults, or adding a new modal/toast/error-details surface.
- Changing standalone non-tool `ErrorSegment` rendering, tool approval controls, successful tool result presentation, or unrelated conversation messages.

### Non-Goals

- Do not diagnose every command root cause in the center card.
- Do not replace the center error body with a shortened excerpt, first line, ellipsis, generic error sentence, or exit-code text; the user's requested center treatment is status-only plus existing tool/context metadata.
- Do not treat ordinary stdout inside a failed tool's aggregated error string as a frontend success signal.
- Do not auto-expand the Activity Error subsection merely because a failure arrives, the Activity item is highlighted, or navigation originated from the center row; opening details is an explicit user choice.

### Preserved Behavior Boundary

- Preserve `BEH-002` and `BEH-003` full diagnostic availability, invocation correlation, Activity navigation/highlighting, outer-card default expansion, persistence, and replay; only the Error subsection's initial state changes from open to closed.
- Preserve non-error and awaiting-approval center-card behavior, existing tool/context summaries, and supported keyboard/pointer activation.
- Preserve all backend/error-detail outcomes from `REQ-CODEX-COMMAND-FAILURE-DETAIL-20260901` except its now-superseded requirement that the center card visibly duplicate the detailed error.

### Review Authority

- Every blocking `Design Impact` or implementation-correction finding must cite an approved requirement, acceptance criterion, or preserved-behavior ID that it protects.
- A finding that would introduce new product behavior, policy, threat model, migration obligation, compatibility promise, or operational contract is a `Requirement Gap`; it requires explicit user approval before becoming authoritative.
- An adjacent concern outside the approved boundary may be recorded as a non-blocking risk, recommendation, or separate-ticket candidate. It is not a required design correction.
- A downstream reviewer comment does not amend this requirements basis. The Requirements Engineer must update the canonical requirements and obtain renewed user approval before a scope-changing proposal can govern design or implementation.

## Relationship To Prior Approved Requirements

Upon approval, this package intentionally supersedes only the conflicting UI-presentation portions of the delivered package `REQ-CODEX-COMMAND-FAILURE-DETAIL-20260901`:

| Prior ID | Prior obligation | New authoritative interpretation after approval |
| --- | --- | --- |
| `BEH-002` | Center and Activity both show the enriched error | Activity retains full detail behind a user-opened Error subsection; center shows compact failed state without detail |
| `REQ-003` | Both center and Activity present the enriched error consistently | Both represent the same failed invocation consistently, but with intentional progressive disclosure: status in center, a collapsed Error affordance in Activity, and detail only after explicit expansion |
| `REQ-006` | Multiline detail remains visible in existing error surfaces | Multiline detail remains available in Activity only after the user expands Error; center renders no diagnostic text |
| `AC-002`, `AC-003` | Both surfaces display the error | Center status, Activity's collapsed default, and Activity detail after explicit expansion are validated separately |
| `AC-009` | Both surfaces preserve readable line breaks | Activity preserves readable line breaks after explicit expansion; center remains compact regardless of payload size |

The prior package's backend mapping, explicit-error precedence, output/exit-code construction, persistence, replay, failure classification, and Activity diagnostic requirements remain in force.

## Requirements

| Requirement ID | Requirement | Related Behavior IDs | Priority / Criticality | Rationale | Source / Decision Reference |
| --- | --- | --- | --- | --- | --- |
| `REQ-001` | A failed tool invocation rendered in the center event-monitor conversation shall not display its error string, any excerpt of that string, or a separate error-detail body. | `BEH-001`, `BEH-004` | Must | Prevents one failure from flooding the primary event stream. | User request and screenshots |
| `REQ-002` | The compact failed center card shall retain the existing visually distinct red failure treatment, failure icon, tool name, compact context summary when available, and navigation affordance. | `BEH-001` | Must | Failure must remain immediately recognizable and attributable without inline diagnostic text. | User: “just make it red would be enough”; current card behavior |
| `REQ-003` | Activating a failed center card by supported pointer or keyboard interaction shall continue to open the Activity panel and highlight the Activity item for that exact invocation. | `BEH-001`, `BEH-002` | Must | The compact card must lead directly to its detailed evidence. | Current navigation contract |
| `REQ-004` | The right-side Activity item shall retain the complete authoritative failure string in its existing expandable Error section, including multiline structure, for live and replayed standalone/team-member runs, and shall display it after the user explicitly expands Error. | `BEH-002`, `BEH-003` | Must | Activity is the designated on-demand diagnostic surface. | User request; prior detailed-error package |
| `REQ-005` | Center-card compaction and Activity Error's default-collapsed disclosure shall not truncate, rewrite, summarize, clear, or otherwise alter the error stored or transported for Activity, raw traces, persistence, or replay. | `BEH-003`, `BEH-004` | Must | Presentation hierarchy must not cause diagnostic data loss. | Prior detailed-error package; current shared event data |
| `REQ-006` | Center-card visible height and content shall remain compact regardless of whether the failure contains a short message or a very large multiline payload. | `BEH-001`, `BEH-004` | Must | The observed issue is severity proportional to payload length. | Raw-trace reproduction |
| `REQ-007` | Successful, running, parsed, approved, denied, interrupted, and awaiting-approval tool-card behavior, successful Activity Result disclosure, and standalone non-tool error rendering shall remain unchanged unless required solely to preserve the compact failed-tool outcome. | `BEH-001`, `BEH-002`, `BEH-003` | Must | Keeps an urgent UI correction bounded and aligns Error with the existing Result pattern rather than changing Result. | Existing component/status contracts |
| `REQ-008` | Each failed right-side Activity item's Error subsection shall be collapsed by default, matching Result, and shall remain collapsed when the item is created, replayed, directly viewed, highlighted, or selected from the center card until the user explicitly activates the Error expansion control. | `BEH-002` | Must | Prevents long diagnostics from flooding the Activity list while preserving on-demand access. | User clarification; `evidence/user-activity-error-expanded-default.png`; `DEC-002` |

## Acceptance Criteria

| Acceptance-Criteria ID | Related Requirement IDs | Related Behavior / Scenario IDs | Preconditions / Trigger | Observable Expected Outcome | Important Alternate Or Failure Outcome | Verification Intent |
| --- | --- | --- | --- | --- | --- | --- |
| `AC-001` | `REQ-001`, `REQ-002` | `BEH-001`; `SCN-001` | A failed `run_bash` card has error `Permission denied` | Center card shows its red failed treatment, failure icon, `run_bash`, and command/context summary, but contains neither `Permission denied` nor an inline error-detail region | Rendering even a one-line error in the center fails | Component and rendered-browser assertion |
| `AC-002` | `REQ-001`, `REQ-006`, `REQ-008` | `BEH-001`, `BEH-002`, `BEH-004`; `SCN-001`, `SCN-002` | A failed invocation carries the observed 348,978-character/1,915-line failure shape or a deterministic equivalent exceeding the viewport by many pages | Center remains a compact row with none of the diagnostic in visible or accessible center text; Activity shows the Error heading but not its body by default, so surrounding events and Activity items remain reachable without traversing the diagnostic | CSS-clipping a still-rendered center body, a collapsed inline center control, a shortened center excerpt, or a default-visible Activity error body fails | Large-payload component/browser fixture with DOM, accessibility-text, state, geometry, and scroll assertions |
| `AC-003` | `REQ-003`, `REQ-004`, `REQ-008` | `BEH-001`, `BEH-002`; `SCN-002` | User clicks or keyboard-activates the compact failed card | Right-side Activity becomes active and the matching invocation is highlighted; Error is present but remains collapsed until the user activates its expansion control, after which it exposes the complete original diagnostic | Opening an uncorrelated item, losing keyboard navigation, auto-opening Error, or showing no detail after explicit expansion fails | Store/navigation component test plus rendered interaction |
| `AC-004` | `REQ-004`, `REQ-005`, `REQ-008` | `BEH-002`, `BEH-003`; `SCN-002`, `SCN-004` | Activity receives a multiline failure containing ordinary output and a final exit code, and the user explicitly expands Error | Activity reveals the complete string with readable line breaks; arguments remain independently available; collapsing and reopening Error reveals the same content | Truncation, summary substitution, center-only storage, lost line structure, or content loss across toggle fails | Activity component and stream/replay regression tests |
| `AC-005` | `REQ-004`, `REQ-005`, `REQ-008` | `BEH-002`, `BEH-003`; `SCN-003` | The same failed tool is shown live and after reopening recorded history, in standalone and team-member contexts | All contexts show a compact center row and a matching Activity record whose Error starts collapsed and reveals the same full error after explicit expansion | Route-dependent center duplication, default-open replay state, or missing Activity detail fails | Streaming/hydration/replay integration coverage |
| `AC-006` | `REQ-005` | `BEH-003`; `SCN-004` | Inspect the event payload, segment/activity data, and raw/replay path before and after the UI correction | Failure status, invocation ID, tool name, arguments, error string, and persistence/replay semantics are unchanged; only the prescribed UI disclosure states differ | Backend/parser/schema/trace mutation without a separately approved requirement fails | Contract/diff review and existing backend/frontend lifecycle tests |
| `AC-007` | `REQ-007` | `BEH-001`–`BEH-003`; `SCN-004` | Existing non-error, approval, denial, interruption, successful result, and standalone non-tool error fixtures execute | Their visible state and supported interaction remain unchanged; successful Activity Result remains collapsed by default | Regressing approval actions, Activity navigation, Result disclosure, or non-tool errors fails | Focused component regression suite |
| `AC-008` | `REQ-001`–`REQ-008` | `BEH-001`–`BEH-004`; `SCN-001`–`SCN-004` | Revise the existing command-failure browser probe and focused tests | Durable validation requires compact center status, default-collapsed Activity Error, and complete Activity detail after explicit expansion; it no longer requires identical diagnostic text to be simultaneously visible in both surfaces | Leaving prior assertions that require center duplication or default-visible Activity Error fails | Test inventory/diff review and executable browser validation |
| `AC-009` | `REQ-002`, `REQ-006`, `REQ-007` | `BEH-001`; `SCN-001`, `SCN-003` | Render at desktop and narrow event-monitor widths with long command summary and large error data | Center row remains compact, its context truncation/navigation remain usable, and it creates no horizontal document overflow | Error text leaking into the row, clipped controls, or page overflow fails | Desktop and narrow browser screenshots plus geometry assertions |
| `AC-010` | `REQ-004`, `REQ-008` | `BEH-002`; `SCN-002`, `SCN-003` | Render a failed Activity item with either a short or very large error, including after center-card navigation and replay | The outer Activity card retains its existing default, the Error heading/chevron is visible in its collapsed state, the error body is absent from visible content until the user opens Error, and one explicit activation reveals the complete body | Auto-expansion on failure, render, replay, selection, or highlight; hidden/missing expansion affordance; or failure to reveal the body fails | Focused `ToolActivityItem` test and desktop/narrow rendered-browser interaction |

## Relevant Scenarios And Journeys

| Scenario ID | Kind (`User`/`System`/`Operational`/`Contract`) | Actor / Initiator / Governing Contract | Coherent Goal Or Governing Event | Supported Trigger / Entry Surface | Starting Condition | Product-Level Steps Or Event Sequence | Expected Outcome | Supported Alternate / Error Behavior | Scenario Validity | Independent Evidence / Decision Reference | Related Requirement / AC IDs |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `SCN-001` | User | User monitoring an active agent run | Keep following the run after a tool fails | A supported standalone or team-member tool invocation enters failed state in the center event monitor | The event stream contains events before and after the failure; error may be short or extremely long | Failure event arrives; center renders the tool card; user visually identifies failure and continues reading surrounding events | Card is compact, visibly failed, and contains no diagnostic text regardless of error size | Missing tool/context may use existing fallback summary; failure still must not render detail inline | `Supported Normal Scenario` | User screenshots/request; live raw trace; shared tool card | `REQ-001`, `REQ-002`, `REQ-006`; `AC-001`, `AC-002`, `AC-009` |
| `SCN-002` | User | User diagnosing the failed invocation | Inspect complete arguments and error evidence on demand | User activates the compact failed center row or directly opens its Activity item | Matching Activity record exists for the invocation | Activity tab opens/highlights the exact record while Error stays collapsed; user explicitly opens Error, reads the complete diagnostic, and may collapse it again | Complete diagnostic is available on demand without polluting the center stream or Activity list by default | If Activity record is absent, the product must not fabricate details; existing correlation/error behavior governs | `Supported Normal Scenario` | Current navigation/highlight; user default-collapse clarification | `REQ-003`, `REQ-004`, `REQ-008`; `AC-003`, `AC-004`, `AC-010` |
| `SCN-003` | User | User reviewing a recorded standalone or team run | Review event progression and inspect an earlier failure | User reopens a supported run-history entry | Failure was persisted with invocation and error data | Hydration reconstructs center and Activity representations; center stays compact; Activity Error starts collapsed and reveals retained detail only after explicit expansion | Live/replay and standalone/team presentation hierarchy agree | Older data without a retained error continues to show only the available failure state | `Supported Normal Scenario` | Prior detailed-error replay requirements; current hydration contract; user clarification | `REQ-001`, `REQ-004`, `REQ-005`, `REQ-008`; `AC-005`, `AC-009`, `AC-010` |
| `SCN-004` | Contract | Tool-failure event contract | Preserve authoritative diagnostics while assigning each UI surface a distinct role | `TOOL_EXECUTION_FAILED` with non-empty error for a supported tool-card type | Conversation segment and Activity record share the invocation/error data | Event updates failed segment and Activity; center presents status/context; Activity presents a collapsed Error affordance and exposes detail on user expansion; trace/replay retains data | No status, identity, argument, diagnostic, or lifecycle data is lost | Non-failed and standalone non-tool errors retain their existing paths | `Supported Normal Scenario` | `toolLifecycleHandler.ts`; `toolCardPresentation.ts`; prior delivered package | `REQ-004`, `REQ-005`, `REQ-007`, `REQ-008`; `AC-004`, `AC-006`–`AC-008`, `AC-010` |

## UI, Interaction, And Experience Requirements

- Applicable: `Yes` — focused existing-surface correction; no new Product Design & Prototyping work was requested.
- Linked UI/UX or interaction supplement: `observed-long-failure-analysis.md`
- Linked runnable prototype, separate prototype repository/root, UI/UX specification, and applicable support artifacts: `N/A — not requested`
- Product prototype ticket record and folder (externally owned): `N/A — not applicable`
- Prototype revision or commit: `N/A — not applicable`
- UI/UX user-confirmation reference: User messages on 2026-09-02: the middle failed state should be a simple row like successful tool activity but red and without error content; the right-side Activity Error must start closed like Result so the user chooses whether to open it.
- Approved visual-reference baseline: The user explicitly approved the normative target described in this document on 2026-09-02. Current-state evidence is `evidence/user-center-error-flood.png`, `evidence/user-activity-error-detail.png`, and `evidence/user-activity-error-expanded-default.png`; no separate future-state prototype was requested.
- Normative visual and interaction details, including the approved final references: The center failed state is the same compact row pattern as normal/successful tool activity, with existing red border/exclamation icon, tool name, compact context, chevron, and navigation; the entire inline error body is absent. The right Activity outer card retains its current default and shows a collapsed Error heading/chevron like Result; the full body appears only after explicit Error activation.
- Explicitly illustrative fixture content or permitted implementation variation: The captured command, worktree paths, document text, 348,978-character count, and exit code are evidence fixtures. Any failure payload length/content must produce the same compact-center outcome.
- Required screens, states, transitions, feedback, responsive behavior, or accessibility outcomes: Active and replayed standalone/team center event monitors; right Activity panel; desktop and narrow widths; pointer and Enter/Space navigation. Error text must not remain in the center card's accessible text when visually removed.
- Explicitly unresolved product decisions: None. The user's 2026-09-02 approval covers `DEC-001`, `DEC-002`, `ASM-002`, and the complete `RER-002` intended behavior.

## Quality And Non-Functional Requirements

| Quality ID | Area (`Performance`/`Reliability`/`Security`/`Privacy`/`Accessibility`/`Compliance`/`Operability`/`Compatibility`/`Other`) | Measurable Requirement Or Constraint | Conditions / Scope | Verification Intent |
| --- | --- | --- | --- | --- |
| `QR-001` | Operability | Error payload length must not increase center-card visible height or force the user to traverse diagnostic content in the event stream. | Short through very large tool errors | Compare compact card geometry across payload sizes |
| `QR-002` | Accessibility | Removing visible detail must also remove it from center-card accessible text; supported keyboard navigation to Activity remains operable. | Failed center tool cards | Accessibility-text and Enter/Space interaction assertions |
| `QR-003` | Reliability | Complete Activity/raw/replay diagnostics must remain byte-for-byte equivalent at the frontend contract boundary unless an existing normalization already applies. | Center presentation correction | Contract and replay tests with a distinctive multiline marker |
| `QR-004` | Compatibility | Active/replayed and standalone/team contexts must apply the same center/detail split and default-collapsed Activity Error without changing provider-specific error semantics. | Supported tool failure routes | Route matrix validation |
| `QR-005` | Operability | A large failure must not consume Activity-list space until the user explicitly opens Error; navigation/highlighting must not override this progressive-disclosure choice. | Failed Activity items with short through very large errors | Default-state, navigation, replay, toggle, and geometry assertions |

## Data Continuity And Acceptable Loss

- Persisted or external data affected: `No` intended.
- Data or state that must be preserved: Existing tool invocation ID, status, name, arguments, logs, result/error fields, Activity history, raw trace data, and replayed error content.
- Loss, reset, rebuild, or regeneration that is acceptable: Disposable frontend test fixtures and screenshots may be regenerated. No diagnostic or run-history loss is acceptable.
- Retention, privacy, compliance, volume, downtime, or operational constraints: Existing error retention policy remains unchanged. This ticket must not copy the full observed 348,978-character trace payload into new repository artifacts.
- Unknowns requiring downstream investigation: None material at requirements level; downstream must verify no hidden center DOM/accessibility duplication remains.

## External Contracts And Dependencies

| Contract / Dependency | Required Behavior Or Constraint | Evidence / Authority | Uncertainty Or Risk |
| --- | --- | --- | --- |
| Failed-tool streaming contract | Continues to deliver non-empty `error` plus invocation/tool/argument identity to conversation and Activity state | `toolLifecycleHandler.ts`; prior delivered package | None intended; contract changes are out of scope |
| Activity diagnostic contract | Remains the complete on-demand diagnostic surface; Error starts collapsed like Result and opens only on user activation | User clarification; `ToolActivityItem.vue` | Very large Activity details may still be large when explicitly expanded; accepted in this ticket |
| Prior package `REQ-CODEX-COMMAND-FAILURE-DETAIL-20260901` | Backend enrichment/persistence remains; only center duplication is superseded | `tickets/done/codex-command-failure-detail/requirements-doc.md` | Tests from that package currently assert the superseded behavior and must be updated coherently |

## Supplemental Artifacts

| Artifact Path | Purpose | Related Requirement / AC IDs | Status | Approval Applicability / State |
| --- | --- | --- | --- | --- |
| `tickets/in-progress/compact-center-tool-error-presentation/observed-long-failure-analysis.md` | Records the exact raw-trace event, size, command failure mechanism, current data/rendering path, and evidence-backed root cause without copying the giant payload | `REQ-001`, `REQ-004`–`REQ-006`, `REQ-008`; `AC-002`, `AC-004`, `AC-006`, `AC-010` | Complete evidence supplement | Included in approval basis |
| `tickets/in-progress/compact-center-tool-error-presentation/evidence/user-center-error-flood.png` | Current-state full-layout screenshot showing center-stream flooding | `REQ-001`, `REQ-002`, `REQ-006`; `AC-001`, `AC-002`, `AC-009` | User-supplied evidence copied durably | Included in approval basis as current-state evidence |
| `tickets/in-progress/compact-center-tool-error-presentation/evidence/user-activity-error-detail.png` | Current-state screenshot showing arguments/error detail already available in Activity | `REQ-003`, `REQ-004`; `AC-003`, `AC-004` | User-supplied evidence copied durably | Included in approval basis as current-state evidence |
| `tickets/in-progress/compact-center-tool-error-presentation/evidence/user-activity-error-expanded-default.png` | Current-state close-up proving a failed Activity item's Error body is open by default while Arguments is closed | `REQ-008`; `AC-002`, `AC-003`, `AC-010` | User-supplied evidence copied durably; SHA-256 `ca408a56ceadaa3520259c2c83c5aa92cc3bbfa0278966901a8f645a2121edc6` | Included in approval basis as current-state evidence |

## Assumptions

| Assumption ID | Assumption | Why It Is Necessary | Validation Plan / Owner | Status |
| --- | --- | --- | --- | --- |
| `ASM-001` | The user's “middle area” is the center event-monitor conversation rendering `ToolCallIndicator`, and “right side” is the Activity panel rendering `ToolActivityItem`. | Maps the supplied language/screenshots to verified product surfaces. | Confirmed through screenshots, current component hierarchy, clarification, and package approval. | Confirmed |
| `ASM-002` | The requested no-detail rule applies to failed cards using the shared center tool-card presentation, not only Codex `run_bash`. | A shared surface should not behave inconsistently based on tool family when the stated issue is placement of detail. | Included explicitly in `RER-002` and accepted by the user's 2026-09-02 package approval. | Approved |

## Open Decisions And Questions

| Decision / Question ID | Question | Why It Matters | Options / Evidence | Decision Owner | Status |
| --- | --- | --- | --- | --- | --- |
| `DEC-001` | Is any center error excerpt desired? | Determines whether card height can still grow and whether detail remains duplicated. | **Approved decision: no excerpt, no generic body, and no expandable center detail**; use existing red failed treatment and Activity navigation. | User | Approved 2026-09-02 |
| `DEC-002` | May Activity Error auto-open on failure, initial render, replay, selection, or center-card navigation? | Auto-opening would reproduce Activity flooding and contradict the user's choice to inspect details on demand. | **Approved decision: no.** Error starts collapsed like Result and opens only after the user activates Error; highlighting/opening the outer item is not consent to reveal the body. | User | Approved 2026-09-02 |

## Traceability

| Requirement ID | Behavior IDs | Acceptance-Criteria IDs | Scenario IDs | Supplemental / Prototype Evidence |
| --- | --- | --- | --- | --- |
| `REQ-001` | `BEH-001`, `BEH-004` | `AC-001`, `AC-002`, `AC-008` | `SCN-001`, `SCN-003` | Both screenshots; observed-failure analysis |
| `REQ-002` | `BEH-001` | `AC-001`, `AC-009` | `SCN-001` | Center screenshot |
| `REQ-003` | `BEH-001`, `BEH-002` | `AC-003` | `SCN-002` | Both screenshots; source navigation evidence |
| `REQ-004` | `BEH-002`, `BEH-003` | `AC-003`–`AC-005`, `AC-010` | `SCN-002`–`SCN-004` | Activity screenshots; prior package |
| `REQ-005` | `BEH-003`, `BEH-004` | `AC-004`–`AC-006`, `AC-008` | `SCN-003`, `SCN-004` | Observed-failure analysis; prior package |
| `REQ-006` | `BEH-001`, `BEH-004` | `AC-002`, `AC-009` | `SCN-001` | Center screenshot; observed-failure analysis |
| `REQ-007` | `BEH-001`–`BEH-003` | `AC-006`–`AC-009` | `SCN-004` | Current focused tests/source |
| `REQ-008` | `BEH-002` | `AC-002`–`AC-005`, `AC-008`, `AC-010` | `SCN-002`–`SCN-004` | Default-open Activity screenshot; `ToolActivityItem.vue`; user clarification |

## Downstream Architecture Input

- Approved scenario IDs and product-level behavior paths downstream must preserve: `SCN-001` through `SCN-004`, approved on 2026-09-02.
- Product and system constraints architecture must preserve: Full Activity/raw/replay diagnostic; default-collapsed Error even after navigation/highlighting; explicit user expansion; existing outer-card and Result defaults; exact invocation correlation; existing failed styling/tool context; live/replay and standalone/team equivalence; approval/non-error behavior; and no backend contract change.
- Decisions intentionally deferred to architecture design: None at product level. Downstream owns the exact production-path change that prevents center rendering while keeping Activity data intact.
- Technical facts architecture should verify: `handleToolExecutionFailed` writes one error to both segment and Activity; `buildToolCardPresentation` exposes the segment error as `errorMessage`; `ToolCallIndicator.vue` renders that property inline; `ToolActivityItem.vue` independently renders `activity.error` and currently initializes `sectionStates.error` to `true` while `result` is `false`; existing unit/browser tests intentionally require visible duplicate detail and lack the new default-collapse contract.
- Known feasibility or integration risks: Removing the center template body alone may leave obsolete presentation/test contracts; removing error earlier in the data path could erase Activity or replay detail; changing the wrong expansion state could collapse the outer Activity card or Result behavior; navigation/highlight code could re-open Error; prior delivered requirements/tests conflict and need explicit supersession.

## Readiness Check

- Relevant current behavior is evidence-backed: `Yes`
- Desired and preserved behavior are explicit: `Yes`
- Scope and non-goals are clear: `Yes`
- Requirements and acceptance criteria are testable and traceable: `Yes`
- Applicable scenarios are covered with validity and evidence: `Yes`
- Prototype and supplemental evidence is integrated consistently: `Yes`
- Applicable UI/UX approval and final visual-reference basis are recorded: `Yes — the user approved the normative target on 2026-09-02; current-state screenshots are linked and no separate prototype was requested`
- Material assumptions and open decisions are visible: `Yes`
- User approval received: `Yes — 2026-09-02: “Yes, approved.”`
- Requirements package ready for downstream route: `Yes`
- Remaining blocker: `None`

## Architecture Design Routing Assessment

This assessment follows the user's explicit approval and the passed Readiness Check.

- Assessment status: `Complete`
- Assessment owner and date: Requirements Engineer (`/requirements_engineer`), 2026-09-02
- Preliminary task size: `Medium`
- Preliminary architectural risk: `Low`
- Structural surfaces reviewed: Existing frontend tool-card presentation, center conversation component, Activity item with independent outer-card and per-section disclosure state, navigation/highlight behavior, and focused unit/browser validation. Current ownership and components already support the approved behavior.
- Payload/content surfaces reviewed: Short, multiline, and observed 348,978-character/1,915-line error strings; live and replayed segment/Activity projections; no payload shape change.
- Structural-impact triggers: `Absent` — no API/external contract, persistence schema/invariant, security/privacy boundary, concurrency/lifecycle, deployment topology, ownership boundary, migration, new architectural pattern, or structural refactoring change is required by the approved behavior.
- Evidence paths: `investigation-notes.md`; `observed-long-failure-analysis.md`; current source and test paths recorded in the Source Log.
- Decision rationale: The approved change uses existing presentation and disclosure controls, preserves transport/persistence/replay contracts, and requires no architecture-owned product or technical decision. Scope spans two related UI surfaces plus durable live/replay and responsive validation, supporting a preliminary Medium size, but remains bounded and Low risk.
- Selected route: `Implementation Engineer`
- Outcome classification: `Approved Direct-Implementation`
- Direct-route conditions all satisfied: `Yes` — Medium, Low risk, no present or unknown structural-impact trigger, existing ownership/surfaces are sufficient, and no architecture-owned decision is deferred.
- Architecture design, review, and design-revision artifacts: `N/A — not applicable for the direct route`
- Downstream re-entry trigger: Implementation Engineer must recheck the route and return `Design Impact` if implementation evidence reveals a structural trigger, or `Requirement Gap` if a new product decision is required.
