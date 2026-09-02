# Requirements Document

## Document Status

- Status: `Ready for Approval`
- Current requirements revision ID: `RER-001`
- Package identifier: `AUT-WEB-COMPACT-TOOL-ERROR-001`
- Request / ticket: `compact-center-tool-error-presentation`
- Requirements owner: Requirements Engineer (`/requirements_engineer`)
- Date: 2026-09-02
- Approval state and reference: Not yet approved. The user supplied the desired behavior and asked that a new ticket be bootstrapped; explicit approval of this complete requirements baseline has not yet been recorded.

## Problem And Desired Outcome

- Problem: A failed tool or command card in the center event-monitor conversation currently renders the complete failure string inline. The same complete failure is already available in the right-side Activity panel. When a failure string contains a command's accumulated normal output, the duplicate center rendering can expand by hundreds or thousands of lines, overwhelm the event stream, and obscure the surrounding agent activity.
- Affected actors or systems: Users monitoring standalone or team-member agent runs in the desktop/web frontend; center event-monitor conversation cards; right-side Activity details; live and replayed tool failures.
- Desired outcome: Keep failed tool cards compact in the center event stream. The center card communicates failure through its existing red failed styling and status icon, retains the tool name and compact context summary, and does not render detailed error content. Complete error detail remains available in the right-side Activity panel through its existing detail/expansion interaction.
- Observable definition of success: A failed card remains one compact center-row treatment even when its failure payload contains a very large multiline string; none of that string is displayed in the center card; activating the card navigates to and highlights the matching Activity item, where the same full error remains available.

## Relevant Current And Desired Behavior

| Behavior ID | Kind (`User`/`System`/`Operational`/`Contract`) | Related Scenario IDs | Evidence-Backed Current Behavior | Desired Behavior | Intentionally Preserved Behavior | Investigation Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| `BEH-001` | User | `SCN-001`, `SCN-003` | A failed tool card in the center event stream displays its tool name/context, red error state, and the complete `error` string in a multiline red body. | The failed center card remains compact and shows failure state, tool name, and compact context only; it does not show any error-detail body or error payload text. | Existing card placement, red border/icon treatment, truncated context summary, chevron, pointer/keyboard navigation, and surrounding event ordering remain unchanged. | `evidence/user-center-error-flood.png`; `ToolCallIndicator.vue`; `ToolCallIndicator.spec.ts` |
| `BEH-002` | User | `SCN-002`, `SCN-003` | Clicking a non-approval center card opens the right-side Activity tab and highlights the matching invocation. The Activity item exposes Arguments, Logs, Result, and Error sections and renders complete multiline error detail. | The right-side Activity item remains the detailed diagnostic surface; the full error stays available through its existing expandable Error section for the exact invocation selected from the center card. | Activity status, ID, arguments/log/result/error content, expansion controls, highlighting, and current default expansion behavior remain unchanged. | `evidence/user-activity-error-detail.png`; `ToolActivityItem.vue`; navigation logic in `ToolCallIndicator.vue` |
| `BEH-003` | System | `SCN-001`, `SCN-003`, `SCN-004` | A `TOOL_EXECUTION_FAILED` event writes the same failure string to the conversation segment and Activity record; presentation passes the segment error into the center card. | Failure status and complete diagnostic data continue to reach conversation/activity state and replay, but center presentation no longer duplicates the detailed string visually. | Backend/provider error enrichment, streaming contract, tool identity, Activity data, local trace persistence, and historical replay remain unchanged. | `toolLifecycleHandler.ts`; `toolCardPresentation.ts`; prior delivered package `REQ-CODEX-COMMAND-FAILURE-DETAIL-20260901` |
| `BEH-004` | Contract | `SCN-001`, `SCN-004` | Center-card height grows with error payload size; the observed 348,978-character `tool_error` produced a center card containing ordinary command output across roughly 1,900 lines. | Center-card visible content and height are independent of error-detail length, including extreme multiline failures. | The application does not truncate, rewrite, or discard the authoritative error solely to achieve the compact center presentation. | `observed-long-failure-analysis.md`; supplied screenshots |

## Stakeholders, Actors, And Outcomes

| Actor / Stakeholder | Goal Or Responsibility | Required Outcome | Important Constraint |
| --- | --- | --- | --- |
| User monitoring an active run | Understand event progression without losing the conversation context to one failed command | Sees a compact failed card and can open the matching detailed Activity item | Failure must remain visually obvious even without inline details |
| User diagnosing a failure | Inspect the full tool arguments and diagnostic output when needed | Uses the right-side Activity Error section for complete detail | Center-card compaction must not destroy, truncate, or replace the diagnostic |
| User reopening run history | Review the same failure later | Gets the same compact-center/detailed-Activity split after replay | Live and replayed presentation must not diverge |
| Engineering / test owners | Preserve event semantics while correcting presentation hierarchy | Focused frontend behavior changes without a backend error-contract regression | Prior detailed-error transport work remains authoritative outside the center display |

## Scope Guardrail (Mandatory)

### In-Scope Use Cases

- `UC-001`: A tool invocation fails during an active standalone or team-member run and appears as a failed card in the center event-monitor conversation.
- `UC-002`: The failed invocation carries a short, multiline, or extremely large error string, including accumulated normal command output followed by an exit code.
- `UC-003`: The user activates the failed center card to open and highlight the exact right-side Activity item, then expands/collapses its Error details.
- `UC-004`: The user reopens a recorded run containing the failed tool invocation and receives the same presentation hierarchy.
- `UC-005`: Existing rendered and component validation is revised so it protects compact center presentation and complete Activity diagnostics rather than requiring duplicated details.

### Out Of Scope

- Changing whether the underlying tool execution is classified as success or failure.
- Changing shell, provider, or agent command construction, including the specific `rg | head` pipeline that produced the supplied example.
- Changing backend/provider error enrichment, raw-trace storage, local replay data, GraphQL/stream payloads, error precedence, stdout/stderr aggregation, or exit-code mapping.
- Truncating, summarizing, redacting, or deleting the error held by Activity or persistent trace state.
- Redesigning the right-side Activity panel, changing its default expansion state, or adding a new modal/toast/error-details surface.
- Changing standalone non-tool `ErrorSegment` rendering, tool approval controls, successful tool result presentation, or unrelated conversation messages.

### Non-Goals

- Do not diagnose every command root cause in the center card.
- Do not replace the center error body with a shortened excerpt, first line, ellipsis, generic error sentence, or exit-code text; the user's requested center treatment is status-only plus existing tool/context metadata.
- Do not treat ordinary stdout inside a failed tool's aggregated error string as a frontend success signal.

### Preserved Behavior Boundary

- Preserve `BEH-002` and `BEH-003` full diagnostic availability, invocation correlation, Activity navigation/highlighting, persistence, and replay.
- Preserve non-error and awaiting-approval center-card behavior, existing tool/context summaries, and supported keyboard/pointer activation.
- Preserve all backend/error-detail outcomes from `REQ-CODEX-COMMAND-FAILURE-DETAIL-20260901` except its now-superseded requirement that the center card visibly duplicate the detailed error.

### Review Authority

- Every blocking `Design Impact` or implementation-correction finding must cite an approved requirement, acceptance criterion, or preserved-behavior ID that it protects.
- A finding that would introduce new product behavior, policy, threat model, migration obligation, compatibility promise, or operational contract is a `Requirement Gap`; it requires explicit user approval before becoming authoritative.
- An adjacent concern outside the approved boundary may be recorded as a non-blocking risk, recommendation, or separate-ticket candidate. It is not a required design correction.
- A downstream reviewer comment does not amend this requirements basis. The Requirements Engineer must update the canonical requirements and obtain renewed user approval before a scope-changing proposal can govern design or implementation.

## Relationship To Prior Approved Requirements

Upon approval, this package intentionally supersedes only the conflicting center-presentation portions of the delivered package `REQ-CODEX-COMMAND-FAILURE-DETAIL-20260901`:

| Prior ID | Prior obligation | New authoritative interpretation after approval |
| --- | --- | --- |
| `BEH-002` | Center and Activity both show the enriched error | Activity retains full detail; center shows compact failed state without detail |
| `REQ-003` | Both center and Activity present the enriched error consistently | Both represent the same failed invocation consistently, but with intentional information hierarchy: status in center, detail in Activity |
| `REQ-006` | Multiline detail remains visible in existing error surfaces | Multiline detail remains visible in Activity only; center renders no diagnostic text |
| `AC-002`, `AC-003` | Both surfaces display the error | Center status and Activity detail are validated separately |
| `AC-009` | Both surfaces preserve readable line breaks | Activity preserves readable line breaks; center remains compact regardless of payload size |

The prior package's backend mapping, explicit-error precedence, output/exit-code construction, persistence, replay, failure classification, and Activity diagnostic requirements remain in force.

## Requirements

| Requirement ID | Requirement | Related Behavior IDs | Priority / Criticality | Rationale | Source / Decision Reference |
| --- | --- | --- | --- | --- | --- |
| `REQ-001` | A failed tool invocation rendered in the center event-monitor conversation shall not display its error string, any excerpt of that string, or a separate error-detail body. | `BEH-001`, `BEH-004` | Must | Prevents one failure from flooding the primary event stream. | User request and screenshots |
| `REQ-002` | The compact failed center card shall retain the existing visually distinct red failure treatment, failure icon, tool name, compact context summary when available, and navigation affordance. | `BEH-001` | Must | Failure must remain immediately recognizable and attributable without inline diagnostic text. | User: “just make it red would be enough”; current card behavior |
| `REQ-003` | Activating a failed center card by supported pointer or keyboard interaction shall continue to open the Activity panel and highlight the Activity item for that exact invocation. | `BEH-001`, `BEH-002` | Must | The compact card must lead directly to its detailed evidence. | Current navigation contract |
| `REQ-004` | The right-side Activity item shall retain the complete authoritative failure string in its existing expandable Error section, including multiline structure, for live and replayed standalone/team-member runs. | `BEH-002`, `BEH-003` | Must | Activity is the designated diagnostic surface. | User request; prior detailed-error package |
| `REQ-005` | Center-card compaction shall not truncate, rewrite, summarize, clear, or otherwise alter the error stored or transported for Activity, raw traces, persistence, or replay. | `BEH-003`, `BEH-004` | Must | Presentation hierarchy must not cause diagnostic data loss. | Prior detailed-error package; current shared event data |
| `REQ-006` | Center-card visible height and content shall remain compact regardless of whether the failure contains a short message or a very large multiline payload. | `BEH-001`, `BEH-004` | Must | The observed issue is severity proportional to payload length. | Raw-trace reproduction |
| `REQ-007` | Successful, running, parsed, approved, denied, interrupted, and awaiting-approval tool-card behavior, as well as standalone non-tool error rendering, shall remain unchanged unless required solely to preserve the compact failed-tool outcome. | `BEH-001`, `BEH-003` | Must | Keeps an urgent UI correction bounded. | Existing component/status contracts |

## Acceptance Criteria

| Acceptance-Criteria ID | Related Requirement IDs | Related Behavior / Scenario IDs | Preconditions / Trigger | Observable Expected Outcome | Important Alternate Or Failure Outcome | Verification Intent |
| --- | --- | --- | --- | --- | --- | --- |
| `AC-001` | `REQ-001`, `REQ-002` | `BEH-001`; `SCN-001` | A failed `run_bash` card has error `Permission denied` | Center card shows its red failed treatment, failure icon, `run_bash`, and command/context summary, but contains neither `Permission denied` nor an inline error-detail region | Rendering even a one-line error in the center fails | Component and rendered-browser assertion |
| `AC-002` | `REQ-001`, `REQ-006` | `BEH-001`, `BEH-004`; `SCN-001` | A failed invocation carries the observed 348,978-character/1,915-line failure shape or a deterministic equivalent exceeding the viewport by many pages | Center card remains a compact single card/header treatment; none of the diagnostic content is visible or present in the center card's accessible text; surrounding events remain reachable without scrolling through the diagnostic | CSS-clipping a still-rendered giant error body, a collapsed inline error control, or a shortened excerpt fails | Large-payload component/browser fixture with DOM, accessibility-text, height, and scroll assertions |
| `AC-003` | `REQ-003`, `REQ-004` | `BEH-001`, `BEH-002`; `SCN-002` | User clicks or keyboard-activates the compact failed card | Right-side Activity becomes active and the matching invocation is highlighted; its Error section can expose the complete original diagnostic | Opening an uncorrelated item, losing keyboard navigation, or showing no detail fails | Store/navigation component test plus rendered interaction |
| `AC-004` | `REQ-004`, `REQ-005` | `BEH-002`, `BEH-003`; `SCN-002`, `SCN-004` | Activity receives a multiline failure containing ordinary output and a final exit code | Activity retains the complete string and readable line breaks through its existing Error expansion control; arguments remain independently available | Truncation, summary substitution, center-only storage, or lost line structure fails | Activity component and stream/replay regression tests |
| `AC-005` | `REQ-004`, `REQ-005` | `BEH-002`, `BEH-003`; `SCN-003` | The same failed tool is shown live and after reopening recorded history, in standalone and team-member contexts | All contexts show a compact center card and detailed Activity record for the same invocation and error | Route-dependent duplication or missing Activity detail fails | Streaming/hydration/replay integration coverage |
| `AC-006` | `REQ-005` | `BEH-003`; `SCN-004` | Inspect the event payload, segment/activity state, and raw/replay path before and after the UI correction | Failure status, invocation ID, tool name, arguments, error string, and persistence/replay semantics are unchanged outside center rendering | Backend/parser/schema/trace mutation without a separately approved requirement fails | Contract/diff review and existing backend/frontend lifecycle tests |
| `AC-007` | `REQ-007` | `BEH-001`, `BEH-003`; `SCN-004` | Existing non-error, approval, denial, interruption, successful result, and standalone non-tool error fixtures execute | Their visible state and supported interaction remain unchanged | Regressing approval actions, Activity navigation, or non-tool errors fails | Focused component regression suite |
| `AC-008` | `REQ-001`–`REQ-007` | `BEH-001`–`BEH-004`; `SCN-001`–`SCN-004` | Revise the existing command-failure browser probe and focused tests | Durable validation requires compact center status and complete Activity detail; it no longer requires identical diagnostic text in both surfaces | Leaving prior assertions that require center duplication fails | Test inventory/diff review and executable browser validation |
| `AC-009` | `REQ-002`, `REQ-006`, `REQ-007` | `BEH-001`; `SCN-001`, `SCN-003` | Render at desktop and narrow event-monitor widths with long command summary and large error data | Center card remains compact, its context truncation/navigation remain usable, and it creates no horizontal document overflow | Error text leaking into the card, clipped controls, or page overflow fails | Desktop and narrow browser screenshots plus geometry assertions |

## Relevant Scenarios And Journeys

| Scenario ID | Kind (`User`/`System`/`Operational`/`Contract`) | Actor / Initiator / Governing Contract | Coherent Goal Or Governing Event | Supported Trigger / Entry Surface | Starting Condition | Product-Level Steps Or Event Sequence | Expected Outcome | Supported Alternate / Error Behavior | Scenario Validity | Independent Evidence / Decision Reference | Related Requirement / AC IDs |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `SCN-001` | User | User monitoring an active agent run | Keep following the run after a tool fails | A supported standalone or team-member tool invocation enters failed state in the center event monitor | The event stream contains events before and after the failure; error may be short or extremely long | Failure event arrives; center renders the tool card; user visually identifies failure and continues reading surrounding events | Card is compact, visibly failed, and contains no diagnostic text regardless of error size | Missing tool/context may use existing fallback summary; failure still must not render detail inline | `Supported Normal Scenario` | User screenshots/request; live raw trace; shared tool card | `REQ-001`, `REQ-002`, `REQ-006`; `AC-001`, `AC-002`, `AC-009` |
| `SCN-002` | User | User diagnosing the failed invocation | Inspect complete arguments and error evidence on demand | User activates the compact failed center card or directly opens its Activity item | Matching Activity record exists for the invocation | Activity tab opens/highlights exact record; user expands/collapses Arguments and Error as needed | Complete diagnostic remains available in Activity without polluting the center stream | If Activity record is absent, the product must not fabricate details; existing correlation/error behavior governs | `Supported Normal Scenario` | Current navigation/highlight and Activity expansion behavior | `REQ-003`, `REQ-004`; `AC-003`, `AC-004` |
| `SCN-003` | User | User reviewing a recorded standalone or team run | Review event progression and inspect an earlier failure | User reopens a supported run-history entry | Failure was persisted with invocation and error data | Hydration reconstructs center and Activity representations; center stays compact; Activity retains detail | Live/replay and standalone/team presentation hierarchy agree | Older data without a retained error continues to show only the available failure state | `Supported Normal Scenario` | Prior detailed-error replay requirements; current hydration contract | `REQ-001`, `REQ-004`, `REQ-005`; `AC-005`, `AC-009` |
| `SCN-004` | Contract | Tool-failure event contract | Preserve authoritative diagnostics while assigning each UI surface a distinct role | `TOOL_EXECUTION_FAILED` with non-empty error for a supported tool-card type | Conversation segment and Activity record share the invocation/error data | Event updates failed segment and Activity; center presents status/context; Activity presents detail; trace/replay retains data | No status, identity, argument, diagnostic, or lifecycle data is lost | Non-failed and standalone non-tool errors retain their existing paths | `Supported Normal Scenario` | `toolLifecycleHandler.ts`; `toolCardPresentation.ts`; prior delivered package | `REQ-004`, `REQ-005`, `REQ-007`; `AC-004`, `AC-006`–`AC-008` |

## UI, Interaction, And Experience Requirements

- Applicable: `Yes` — focused existing-surface correction; no new Product Design & Prototyping work was requested.
- Linked UI/UX or interaction supplement: `observed-long-failure-analysis.md`
- Linked runnable prototype, separate prototype repository/root, UI/UX specification, and applicable support artifacts: `N/A — not requested`
- Product prototype ticket record and folder (externally owned): `N/A — not applicable`
- Prototype revision or commit: `N/A — not applicable`
- UI/UX user-confirmation reference: User message on 2026-09-02: the middle area “does not have to show detailed error content”; existing red failure treatment is sufficient; details belong in right-side Activity.
- Approved visual-reference baseline: Pending formal requirements approval. Current-state evidence is `evidence/user-center-error-flood.png` and `evidence/user-activity-error-detail.png`.
- Normative visual and interaction details, including the approved final references: Center failed card retains its current red border/exclamation icon, tool name, compact context, chevron, and navigation behavior; the entire inline error body is absent. Right Activity retains the complete Error section and existing expand/collapse behavior.
- Explicitly illustrative fixture content or permitted implementation variation: The captured command, worktree paths, document text, 348,978-character count, and exit code are evidence fixtures. Any failure payload length/content must produce the same compact-center outcome.
- Required screens, states, transitions, feedback, responsive behavior, or accessibility outcomes: Active and replayed standalone/team center event monitors; right Activity panel; desktop and narrow widths; pointer and Enter/Space navigation. Error text must not remain in the center card's accessible text when visually removed.
- Explicitly unresolved product decisions: None identified in the requested interaction. Formal package approval remains pending.

## Quality And Non-Functional Requirements

| Quality ID | Area (`Performance`/`Reliability`/`Security`/`Privacy`/`Accessibility`/`Compliance`/`Operability`/`Compatibility`/`Other`) | Measurable Requirement Or Constraint | Conditions / Scope | Verification Intent |
| --- | --- | --- | --- | --- |
| `QR-001` | Operability | Error payload length must not increase center-card visible height or force the user to traverse diagnostic content in the event stream. | Short through very large tool errors | Compare compact card geometry across payload sizes |
| `QR-002` | Accessibility | Removing visible detail must also remove it from center-card accessible text; supported keyboard navigation to Activity remains operable. | Failed center tool cards | Accessibility-text and Enter/Space interaction assertions |
| `QR-003` | Reliability | Complete Activity/raw/replay diagnostics must remain byte-for-byte equivalent at the frontend contract boundary unless an existing normalization already applies. | Center presentation correction | Contract and replay tests with a distinctive multiline marker |
| `QR-004` | Compatibility | Active/replayed and standalone/team contexts must apply the same center/detail split without changing provider-specific error semantics. | Supported tool failure routes | Route matrix validation |

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
| Activity diagnostic contract | Remains the complete expandable diagnostic surface | User request; `ToolActivityItem.vue` | Very large Activity details may still be large when explicitly expanded; accepted in this ticket |
| Prior package `REQ-CODEX-COMMAND-FAILURE-DETAIL-20260901` | Backend enrichment/persistence remains; only center duplication is superseded | `tickets/done/codex-command-failure-detail/requirements-doc.md` | Tests from that package currently assert the superseded behavior and must be updated coherently |

## Supplemental Artifacts

| Artifact Path | Purpose | Related Requirement / AC IDs | Status | Approval Applicability / State |
| --- | --- | --- | --- | --- |
| `tickets/in-progress/compact-center-tool-error-presentation/observed-long-failure-analysis.md` | Records the exact raw-trace event, size, command failure mechanism, current data/rendering path, and evidence-backed root cause without copying the giant payload | `REQ-001`, `REQ-004`–`REQ-006`; `AC-002`, `AC-004`, `AC-006` | Complete evidence supplement | Included in approval basis |
| `tickets/in-progress/compact-center-tool-error-presentation/evidence/user-center-error-flood.png` | Current-state full-layout screenshot showing center-stream flooding | `REQ-001`, `REQ-002`, `REQ-006`; `AC-001`, `AC-002`, `AC-009` | User-supplied evidence copied durably | Included in approval basis as current-state evidence |
| `tickets/in-progress/compact-center-tool-error-presentation/evidence/user-activity-error-detail.png` | Current-state screenshot showing arguments/error detail already available in Activity | `REQ-003`, `REQ-004`; `AC-003`, `AC-004` | User-supplied evidence copied durably | Included in approval basis as current-state evidence |

## Assumptions

| Assumption ID | Assumption | Why It Is Necessary | Validation Plan / Owner | Status |
| --- | --- | --- | --- | --- |
| `ASM-001` | The user's “middle area” is the center event-monitor conversation rendering `ToolCallIndicator`, and “right side” is the Activity panel rendering `ToolActivityItem`. | Maps the supplied language/screenshots to verified product surfaces. | Confirm through screenshots and current component hierarchy; user may correct during approval. | High confidence |
| `ASM-002` | The requested no-detail rule applies to failed cards using the shared center tool-card presentation, not only Codex `run_bash`. | A shared surface should not behave inconsistently based on tool family when the stated issue is placement of detail. | Included explicitly in this approval baseline. | Proposed for approval |

## Open Decisions And Questions

| Decision / Question ID | Question | Why It Matters | Options / Evidence | Decision Owner | Status |
| --- | --- | --- | --- | --- | --- |
| `DEC-001` | Is any center error excerpt desired? | Determines whether card height can still grow and whether detail remains duplicated. | User already stated the middle does not need detailed content. Proposed decision: **no excerpt, no generic body, and no expandable center detail**; use existing red failed treatment and Activity navigation. | User | Proposed for approval |

## Traceability

| Requirement ID | Behavior IDs | Acceptance-Criteria IDs | Scenario IDs | Supplemental / Prototype Evidence |
| --- | --- | --- | --- | --- |
| `REQ-001` | `BEH-001`, `BEH-004` | `AC-001`, `AC-002`, `AC-008` | `SCN-001`, `SCN-003` | Both screenshots; observed-failure analysis |
| `REQ-002` | `BEH-001` | `AC-001`, `AC-009` | `SCN-001` | Center screenshot |
| `REQ-003` | `BEH-001`, `BEH-002` | `AC-003` | `SCN-002` | Both screenshots; source navigation evidence |
| `REQ-004` | `BEH-002`, `BEH-003` | `AC-003`–`AC-005` | `SCN-002`–`SCN-004` | Activity screenshot; prior package |
| `REQ-005` | `BEH-003`, `BEH-004` | `AC-004`–`AC-006`, `AC-008` | `SCN-003`, `SCN-004` | Observed-failure analysis; prior package |
| `REQ-006` | `BEH-001`, `BEH-004` | `AC-002`, `AC-009` | `SCN-001` | Center screenshot; observed-failure analysis |
| `REQ-007` | `BEH-001`, `BEH-003` | `AC-006`–`AC-009` | `SCN-004` | Current focused tests/source |

## Downstream Architecture Input

- Approved scenario IDs and product-level behavior paths architecture must map: Pending approval; candidate scenario basis is `SCN-001` through `SCN-004`.
- Product and system constraints architecture must preserve: Full Activity/raw/replay diagnostic, exact invocation navigation/highlighting, existing failed styling/tool context, live/replay and standalone/team equivalence, approval/non-error behavior, and no backend contract change.
- Decisions intentionally deferred to architecture design: None at product level. Downstream owns the exact production-path change that prevents center rendering while keeping Activity data intact.
- Technical facts architecture should verify: `handleToolExecutionFailed` writes one error to both segment and Activity; `buildToolCardPresentation` exposes the segment error as `errorMessage`; `ToolCallIndicator.vue` renders that property inline; `ToolActivityItem.vue` independently renders `activity.error`; existing unit/browser tests intentionally require both surfaces to show the detail.
- Known feasibility or integration risks: Removing the visible template body alone may leave obsolete presentation/test contracts; removing error earlier in the data path could unintentionally erase Activity or replay detail; prior delivered requirements/tests conflict and need explicit supersession.

## Readiness Check

- Relevant current behavior is evidence-backed: `Yes`
- Desired and preserved behavior are explicit: `Yes`
- Scope and non-goals are clear: `Yes`
- Requirements and acceptance criteria are testable and traceable: `Yes`
- Applicable scenarios are covered with validity and evidence: `Yes`
- Prototype and supplemental evidence is integrated consistently: `Yes`
- Applicable UI/UX approval and final visual-reference basis are recorded: `No — current-state screenshots are recorded; explicit approval of the described target is pending`
- Material assumptions and open decisions are visible: `Yes`
- User approval received: `No`
- Requirements package ready for downstream route: `No`
- Remaining blocker: Explicit user approval of this baseline, including the no-excerpt/shared-failed-card decisions in `DEC-001` and `ASM-002`.

## Architecture Design Routing Assessment

Complete this section only after `Status` is `Approved` and the Readiness Check passes.

- Assessment status: `N/A — not started; approval not yet received`
- Assessment owner and date: `N/A — pending approval`
- Preliminary task size: `N/A — pending approval`
- Preliminary architectural risk: `N/A — pending approval`
- Structural surfaces reviewed: `N/A in formal assessment`; investigation covers frontend event presentation, shared state projection, Activity correlation, and durable tests.
- Payload/content surfaces reviewed: `N/A in formal assessment`; investigation includes short and 348,978-character failure payloads.
- Structural-impact triggers: `N/A — formal assessment deferred`
- Evidence paths: `investigation-notes.md`; `observed-long-failure-analysis.md`
- Decision rationale: The package is not yet approved, so no downstream route may be selected.
- Selected route: `N/A — pending approval and assessment`
- Outcome classification: `N/A — requirements remain Ready for Approval`
- Direct-route conditions all satisfied: `N/A — pending assessment`
- Architecture design, review, and design-revision artifacts: `N/A — not yet created`
- Downstream re-entry trigger: Explicit user approval, followed by the Requirements Engineer readiness and routing assessment.
