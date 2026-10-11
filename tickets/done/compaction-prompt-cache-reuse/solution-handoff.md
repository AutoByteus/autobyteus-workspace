# Solution Handoff — compaction-prompt-cache-reuse

- Result: `Architecture Design Complete`
- Package identifier: `compaction-prompt-cache-reuse`
- Project Task: `project_task_1c0ac46f-8157-4a26-9085-9726326ea1a5` (delegated by `/project_task_manager`, run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`)
- Current solution revision: `SR-012` (revised after CRR-010; SR-011 after CRR-008; SR-010 after CRR-006; SR-009 after ARCH-REV-004)
- Approval state: requirements Approved (SR-002, user 2026-10-09)
- Classification: `task_size = Large`, `architectural_risk = High` (see `design-spec.md`)

## Workspace

- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/compaction-prompt-cache-reuse`
- Branch: `codex/compaction-prompt-cache-reuse`
- Base: `origin/personal` @ `46e94fdea86ad9af7d8884e690721b373d754cea`. It includes the delivered `anthropic-prompt-caching` (v1.4.99-beta.9), which this Task depends on.
- Finalization target: `origin/personal`
- Dependencies installed.

## Request (summary)

Let native-runtime compaction reuse the conversation's prompt cache. Today a compaction re-reads the whole history at full price (about $3.20 per Opus 5.5 compaction); reusing the cache brings that to about $0.17.

User decisions (2026-10-09):
- always use the agent's own model, and remove the compaction-model setting;
- keep a same-model fallback for failed attempts;
- apply to all native providers;
- the summary covers the whole conversation, and the recent tail is still kept word for word;
- report compaction cost in the Token Meter.

## Artifacts (absolute paths)

- Requirements: `/Users/normy/autobyteus_org/autobyteus-worktrees/compaction-prompt-cache-reuse/tickets/in-progress/compaction-prompt-cache-reuse/requirements-doc.md`
- Investigation notes: `…/investigation-notes.md`
- Design spec: `…/design-spec.md`
- Solution revision record: `…/solution-revision-record.md`
- Evidence (not behavior-defining): `…/probes/fork-summary-probe.mjs`, `…/probes/fork-summary-probe-result.json`, `…/probes/compaction-prompt.txt`
- Architecture review: ARCH-REV-001 Fail → resolved in SR-004 (see `solution-revision-record.md` § SR-004). Report: `…/design-review-report.md`; record: `…/architecture-review-revision-record.md`.

## Evidence Summary

Live Opus 5.5 probe:

| Summary request | Cache read | Full-price input | Result |
| --- | --- | --- | --- |
| Cached summary request (fork) | 9,423 | 4 | Valid summary, 0 tool calls, strict preserved-thinking check passed |
| Today's separate summarizer | 0 | 8,279 | Valid summary |

Summary quality was comparable. Compaction usage is currently unmetered.

## Open Risks

- Large-context forks near the window limit → budget check plus fallback.
- Non-Anthropic instruction following → parser plus fallback; validate one provider.
- Token-usage projection of the new ingestion kind with a null latest prompt → server tests.

## Expected Next Action

Architecture review (Large/High), then implementation per `design-spec.md` § Change / Refactor Sequence. Live validation through the test vault, then user verification in the desktop app.

## Routing

`get_handoff_rules` (2026-10-09) → `/software_engineering_team/architecture_reviewer`.

## SR-007 Review Request (after CRR-003)

- Inputs:
  - CRR-003 (`code-review-report.md` § Round 3);
  - AC-003 report (`ac003-summary-quality-report.md`);
  - user decisions of 2026-10-11 (requirements Document Status).
- Changes:
  - REQ-008 / Intended Change 9: Gemini takes `systemInstruction` from the request's leading SYSTEM messages (F-1);
  - REQ-003 / Intended Change 8: one nine-heading contract for both paths; normative texts in `supplements/cached-summary-instruction.md` (F-2);
  - AC-003 pass conditions extended; AC-010 added;
  - cost premise corrected;
  - OBS-1 accepted as a risk;
  - CR-002 fixed.
- Implementation state: paused at 8d0a98eb5 (IR-002). After review, implementation applies SR-007, then code review → API/E2E reruns AC-003 (histories A and B) and AC-010 → user reviews the report.
- Routing per `get_handoff_rules` (High): `/software_engineering_team/architecture_reviewer`.

## SR-008 Review Request (after CRR-005)

- Scope confirmed by the user: the goal of this Task is a correct architecture with the cache used correctly during compaction, plus the DeepSeek problems fixed. Gemini summary quality and model-specific compression strategies go to a follow-up Task.
- Changes:
  - per-model `compactionSummaryMode` (REQ-002, AC-008);
  - summary output-limit floor via `LLMInvocationOptions.maxOutputTokens` (REQ-009, AC-011);
  - instruction v5 (REQ-003; normative text in `supplements/cached-summary-instruction.md`);
  - AC-003 rerun scope.
- Implementation state: paused at 1153984ee (IR-003). Routing per `get_handoff_rules` (High): `/software_engineering_team/architecture_reviewer`.

## SR-009 Re-review Request (ARCH-REV-004)

- ARCH-005: a precise output-limit rule that only raises a known small limit, bounded by the model maximum and by context ÷ 4; an unknown or high limit is unchanged. Worked examples are in design Intended Change 11; AC-011 is updated.
- ARCH-006: v5 is the single normative instruction; the history sections are labelled.
- The non-blocking items are adopted.
- Routing per `get_handoff_rules` (High): `/software_engineering_team/architecture_reviewer`.

## SR-010 Re-review Request (CRR-006 CR-004)

- Result: `Architecture Design Complete`. Package classification unchanged: `Large`/`High`. The SR-010 delta is local to `LlmPhaseSummaryPort`.
- Finding:
  - CR-004 (code review round 6, IR-004 `13648b147`): the transcript summary request reserved R in its input check but sent L, which overflows the context near the limit on small local models (Ollama / LM Studio with `maxTokens` < 16,384). That contradicts REQ-009.
- Decision:
  - L stays the ceiling;
  - each summary request sends `L_eff = max(R, min(L, context − E − margin))`;
  - both paths accept inputs with the agent's own input budget, as today;
  - the SR-009 "reserve L" budget is removed.

  Never worse than before the ticket on any model; the cached path no longer falls back just because of the raised limit.
- Changed artifacts:
  - `requirements-doc.md` (REQ-009, AC-011, Document Status);
  - `design-spec.md` § Intended Change 11 (rule, budget, owner, rationale, boundary examples) and § Guidance (SR-010);
  - `investigation-notes.md` § CR-004 Evidence;
  - `solution-revision-record.md` § SR-010.
- Approval: requirements Approved. The SR-010 wording restores the approved REQ-009 intent under the user's 2026-10-11 delegation, with no change of intended behavior.
- Prior reviews: ARCH-REV-005 Pass covered SR-009. CRR-006 is the trigger. API/E2E items still open: CR-001 / C-020 (OLR-E2E-010), CR-003, the DeepSeek AC-003 rerun, AC-010 and AC-011 live.
- Implementation state: IR-004 at `13648b147`. After review, implementation applies SR-010, then code review, then API/E2E.
- Routing: `get_handoff_rules` (2026-10-11), Large/High → `/software_engineering_team/architecture_reviewer`.

## SR-011 Re-review Request (CRR-008: F-6, F-7, F-8)

- Result: `Architecture Design Complete`. Package classification unchanged: `Large`/`High`. The SR-011 delta is small: the parser, one catalog comment and tests.
- User direction (2026-10-11): keep this version simple; per-provider and per-model compaction strategies and configuration come later; Gemini uses the fallback; the Solution Designer makes the reasonable design decision.
- Decisions:
  - **F-6:** `parseCompactionSummary` also accepts a marker-free reply that passes the unchanged `validateCompactionSummaryBody` (first heading at the start, nine headings in order, bullets or `(none)`). Prompts are unchanged. Evidence: 5 of the 6 rejected round-3 replies are valid bodies (`investigation-notes.md` § Round 3 Findings).
  - **F-7 / F-8:** DeepSeek and the Anthropic models stay cached; Gemini and the rest stay on the transcript summary. Gap A goes to the follow-up Task.
  - **AC-003 bar:** Opus quality (met); other cached models: parse plus cache; transcript acceptance rerun on Sonnet 5 and DeepSeek (A, B).
- Changed artifacts:
  - `requirements-doc.md` (Document Status, REQ-002, REQ-003, AC-003);
  - `design-spec.md` (Intended Change 8 and 10, Guidance § SR-011);
  - `investigation-notes.md`;
  - `solution-revision-record.md` § SR-011;
  - supplement note.
- Approval: the user delegated the decisions (quote in Document Status).
- Implementation state: IR-005 at `97fd9a814`. Next: implementation of SR-011 → code review → API/E2E (transcript reruns, plus the post-API/E2E test review items CR-001 and CR-003).
- Routing: `get_handoff_rules` (2026-10-11), Large/High → `/software_engineering_team/architecture_reviewer`.

## SR-012 Re-review Request (CRR-010: F-9)

- Result: `Architecture Design Complete`. Package `Large`/`High`; the delta is one validator rule.
- **F-9:** on read-only history B, Sonnet 5 writes the empty "Files created or changed" section as `(none) — …` or `(none — …)` (6 of 6). The bare-`(none)` rule rejects it and compaction blocks.
- **Decision:** `validateCompactionSummaryBody` treats a section whose first line starts with `(none` as empty. Bullets are still required otherwise, all other checks are unchanged, and the prompts are unchanged.
- **Changed artifacts:**
  - `requirements-doc.md` (REQ-003, Document Status);
  - `design-spec.md` (Intended Change 8, Guidance § SR-012);
  - `investigation-notes.md` § Round 4 Finding F-9;
  - `solution-revision-record.md` § SR-012.
- **Approval:** under the user's SR-011 delegation.
- **Separately pending, not part of this review:** SR-013, the proposed comparison of summary output approaches (`supplements/summary-output-approach-comparison.md`). It waits for the user's approval.
- **Next:** implementation → code review → API/E2E reruns Sonnet 5 transcript-only on B, and A as a regression check.
- **Routing:** `get_handoff_rules` (2026-10-11), Large/High → `/software_engineering_team/architecture_reviewer`.

