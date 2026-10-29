# Code Review Report

## Review Round Meta

- Review Entry Point: `API/E2E Failure-Origin Review`
- Requirements Doc Reviewed As Context: `tickets/in-progress/claude-anthropic-effort-control/requirements-doc.md` (REQ-011, AC-011, BEH-007, SCN-005, DEC-009, persisted-data section)
- Investigation Notes Reviewed As Context: `investigation-notes.md` (SRC-011, SRC-019, SRC-020)
- Solution Revision Record Reviewed As Context: `solution-revision-record.md` (SR-002 basis)
- Design Spec Reviewed As Context: `design-spec.md` (Risk escalation trigger (a), Derived consumers, Persisted Data / State Transition Decision, "Stale stored keys: web sanitize + residuals — Reuse")
- Supplemental Task Artifacts Reviewed As Context: `autobyteus-web/docs/settings.md` L1652-1660
- Relevant Solution Revision IDs: SR-002
- Design Review Report Reviewed As Context: N/A (direct Medium / Low route)
- Architecture Review Revision Record Reviewed As Context: N/A
- Relevant Architecture Review Revision IDs: N/A
- Implementation Handoff Reviewed As Context: `implementation-handoff.md`
- Implementation Revision Record Reviewed As Context: `implementation-revision-record.md`
- Relevant Implementation Revision IDs: IR-001
- Code Review Revision Record: `code-review-revision-record.md`
- Current Code Review Revision ID: CRR-001
- Current Review Round: 1
- Review Scope: N/A (failure-origin round)
- Trigger: API/E2E Fail, API-REV-001
- Prior Review Round Reviewed: None
- Latest Authoritative Round: 1
- Coverage Investigation Reviewed: `api-e2e-coverage-investigation.md` (testing guideline: root `TESTING.md`; not material to this classification)
- Execution Coverage Report Reviewed: `api-e2e-execution-coverage-report.md`
- API/E2E Revision Record Reviewed: `api-e2e-revision-record.md`
- Relevant API/E2E Revision IDs: API-REV-001
- Delivery Revision Record Reviewed: N/A
- Failing Scenario IDs: API-04, API-06 (old-run edit part); criterion REQ-011 / AC-011
- Exact Failing Commands / Execution Mode: temporary GraphQL probe in `autobyteus-anthropic-stored-config-resume.e2e.test.ts` (`-t TMP-EDIT-PROBE`, removed); ENV-3 real backend + browser journey
- Failure Evidence Paths: `evidence/API-04-stopped-edit-stale-key-server.txt`, `evidence/API-05-06-browser-journeys.txt`, `evidence/API-06-old-run-edit-save-refused.png`, `evidence/API-06-old-team-run-edit-save-refused.png`

## Routing Classification Review

- Task size: `Medium`
- Architectural risk: `Low`
- Selected route: `API/E2E Failure-Origin Review`
- Independent source review required by the classification: `Failure-origin exception`
- Classification evidence or correction required: none from this failure; the fix choice may touch a shared edit/validation rule, which the Solution Designer should weigh when re-classifying the revision.

## Review Scope

- Changed implementation and behavior reviewed: stopped-run model-setting Save for a saved AutoByteus run (agent, team; Org by code) whose stored `llmConfig` holds `thinking_display`.
- Files / areas reviewed:
  - `autobyteus-web/components/launch-config/RuntimeModelConfigFields.vue` L82 (`:preserve-invalid-draft="!historicalModelConfig"`)
  - `autobyteus-web/components/workspace/config/ModelConfigSection.vue` L272-293 (`sanitizeConfigIfNeeded` returns early when `preserveInvalidDraft`)
  - `autobyteus-server-ts/src/llm-management/services/run-model-selection-service.ts` L71 → `model-config-schema-validation.ts` L131-134 (unknown key → "Setting is not supported…")
  - `autobyteus-web/docs/settings.md` L1652-1660 (documented rule)
  - `git diff 4db2efa01 574aa0bd7 --stat`: none of the four files above is changed by the implementation.
- Explicit exclusions: the passing cases (API-01/02/03/05/07/07b/08), the definition-surface part of API-06, and general test-suite review.

## Upstream Behavior And Production-Path Basis Confirmation

- Approved requirements basis understood: REQ-011 — saved runs whose `llmConfig` holds `thinking_display` "keep loading, resuming and running"; "No stored data is rewritten." BEH-007: "Saved runs whose config still holds `thinking_display` keep working."
- Design-spec behavior map verified against the implementation: the design names the stopped-run edit as a strict-validation reader (Persisted Data "Readers", SRC-020) and states that "edit surfaces drop them on save" / "stale `thinking_display` dropped by existing `sanitizeModelConfigAgainstSchema`". The code contradicts that premise on the stopped-run edit surface: that surface deliberately preserves the draft (`preserveInvalidDraft`), matching the documented rule that unsupported stored values "remain visible as historical residuals instead of being … silently written back".
- Behavior-basis status: `Contradicted` (design premise), requirement itself `Confirmed`.

| Behavior ID | Current Status | Current Implementation Path And Lifecycle Evidence | Contradicting Evidence |
| --- | --- | --- | --- |
| BEH-007 / REQ-011 (edit a saved run) | Contradicted | Stopped run → Edit Config → change Thinking → Save → draft still holds `thinking_display` (sanitize skipped, `ModelConfigSection.vue` L274) → `updateStoppedAgentRunModelConfig` / `updateStoppedTeamRunModelConfigs` → `validateModelConfigSchema` rejects the unknown key → `VALIDATION_FAILED`. The key is not rendered on the editable card, so the user cannot remove it. | API-04 evidence: with key → `VALIDATION_FAILED` `llmConfig.thinking_display`; without key → `UPDATED`. API-06 screenshots. Before this change `thinking_display` was a schema key, so the same Save passed: the regression is caused by this ticket. |
| BEH-007 / REQ-011 (resume, send) | Confirmed | API-02/03 pass (agent, team, Org; synthetic and live). | — |

## Supported Product Scenario And Reachability Gate (Mandatory)

| Scenario ID | Related IDs | Kind | Actor | Goal | Entry Surface | Shape | Forward Path / Lifecycle | Expected Outcome | Independent Evidence | Validity | Use |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-005 (edit leg) | REQ-011, BEH-007 | User | User | Change the Thinking level of an existing stopped run created before this change | Run history → stopped run → Edit Config → Save (agent / team; Org same validator) | Normal | as table above | Save succeeds; stale key not sent to Anthropic; REQ-011 "keep working" | SRC-019 real user data (an Opus 5.5 run and a team run hold the key); stopped-run edit is a shipped surface (`settings.md`); design itself lists it as a reader | Supported Normal Scenario | Use |

### Candidate Finding And Mechanism Gate

| Candidate | Scenario / Contract | Trigger → Path → Consequence | Evidence | Disposition |
| --- | --- | --- | --- | --- |
| CR-FO-001: stopped-run edit of a saved run holding `thinking_display` is refused and cannot be repaired by the user | SCN-005 edit leg, REQ-011 | Real stored data → Edit Save → strict validation refuses hidden key → run settings cannot be changed | API-04 server probe, API-06 browser journeys + screenshots, code at the cited lines | Promote |
| Implementation defect (implementation diverged from design) | — | Implementation did not touch the sanitize/preserve or validator code; design marked these "Reuse / no change" | `git diff --stat` | Reject |
| Stale/invalid test | — | Probe enters through the real GraphQL mutations and the real UI; the payload is what the UI sends | API-04, API-06 | Reject |
| AgentOrg stopped-run edit | same | `agent-org-run-manager.ts` revalidates with the same validator | code (not executed) | Promote as part of CR-FO-001 scope (same cause); rerun to confirm |

## Findings

### CR-FO-001 — Design premise "edit surfaces drop stale keys on save" does not hold for stopped-run edit (Design Impact)

- Ticket scope: this ticket (regression caused by removing `thinking_display` from the schemas; blocks REQ-011 / AC-011's "keep working").
- Origin: design. The design identified the stopped-run edit as a strict-validation reader (SRC-020) but relied on the web sanitize step, which the stopped-run edit surface intentionally bypasses (`preserveInvalidDraft`), in line with the documented no-silent-write-back residual rule. The editable card renders no residual for the key, so the user has no way out.
- Not an implementation defect: the implementation matches the design's "no change" for these consumers.
- Not a review gap: direct route, no source review. The issue was a design-level premise. It also falls under the design's own escalation trigger (a) ("blocked by a server validation path"), applied to the edit leg rather than to resume.
- Decision needed from the Solution Designer (options from API/E2E, not prescribed here): (1) drop undeclared keys from the stopped-run edit draft (this conflicts with the documented `settings.md` rule and needs that rule to be revised); (2) let the server validation tolerate unchanged stored keys that the schema no longer declares (this touches the shared validator used by model replacement and Org launch); (3) show a removable residual on the editable card. Whichever you choose, also cover the AgentOrg stopped-run edit, and add a durable test for the edit path.

## Follow-ups

None.

## Classification

`Design Impact` — owner: Solution Designer. This confirms the API/E2E preliminary classification.

## Recommended Recipient

Solution Designer. After the design revision and implementation: rerun API-04 and API-06 (old-run edit) and add the Org edit path. The other API cases stay valid unless the fix touches autobyteus-ts or the catalog.

## Residual Risks

- Org stopped-run edit has been confirmed by reading the code only, not by running it.
- Option (2) changes a validator shared by model replacement and Org launch. If it is chosen, its blast radius needs a decision.

## Latest Authoritative Result

- Result: Fail. Classification `Design Impact`. Owner: Solution Designer. CRR-001.
