# Solution Revision Record — autobyteus-303

## Revision Index

| Revision ID | Phase | Trigger / Report / Round | Finding IDs | Prior Status | Current Status | Affected Behavior / Requirement IDs | Result |
| --- | --- | --- | --- | --- | --- | --- | --- |
| SR-001 | Mixed | Task autobyteus-303 (handoff PRE-001 of autobyteus-32); user direction 2026-10-24/25 | N/A | N/A | Requirements Approved; design Ready | BEH-001..003; REQ-001..010; AC-001..012 | Architecture Design Complete, Large/High |
| SR-002 | Mixed | ARCH-REV-001 (Fail, Design Impact) + user 2026-10-25 "only useful information" | AR-001…AR-005 | Approved / Ready | Approved / Ready | REQ-004, REQ-006 (removed), REQ-007, AC-003..008, AC-011; DEC-007 | Design revised; back to architecture review |
| SR-003 | Mixed | ARCH-REV-002 (Fail: AR-002 narrowed, AR-006) | AR-002, AR-006 | Approved / Ready | Approved / Ready | REQ-004, AC-003, AC-004, UI states | Step deadline; requirement text aligned |

## Revision Entries

### SR-001 — Requirements baseline and design

- Phase and classification: Mixed, Initial Baseline
- Triggering input: Task autobyteus-303 from `/project_task_manager` (2026-10-25), built from PRE-001 (`/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-runtime-model-routing/tickets/in-progress/delegated-runtime-model-routing/handoff-pre-001-agent-runtimes-tool.md`); the user's direction in the Solution Designer conversation 2026-10-24/25.
- Prior status: N/A. Current: requirements Approved (Solution Designer within the direction, user informed 2026-10-25); design Ready.
- IDs: all (baseline).
- Canonical sections: `requirements-doc.md`, `investigation-notes.md`, `design-spec.md`.
- Supplements: `evidence/limit-probes/` (evidence).
- Intended behavior changed: new behavior.
- Approval: within the direction; decisions DEC-001 (user), DEC-004 (user), DEC-005 (page: user; reading: Solution Designer), DEC-002, DEC-003, DEC-006 (Solution Designer).
- Classification: task_size Large, architectural_risk High (design-spec § Task Size).
- Handoff: Architecture Design Complete → `/software_engineering_team/architecture_reviewer` (rule: Large or High). Handoff file `handoff-architecture-review.md`.
- Remaining gaps: UNK-001 (Grok used %), UNK-002 (Docker node parity).
- Next action: independent architecture review.

### SR-002 — Review fixes and the lean answer

- Phase and classification: Mixed (Design Impact from ARCH-REV-001; requirement refinement from the user)
- Trigger: `design-review-report.md` ARCH-REV-001 (AR-001 High, AR-002 High, AR-003 Medium, AR-004 Low, AR-005 Low + non-blocking points); the user on 2026-10-25: "we only care about useful information" (for every runtime).
- Prior: requirements Approved SR-001, design Ready SR-001 (kept as `history/design-spec-sr001.md`). Current: requirements Approved SR-002, design Ready SR-002.
- Requirements: REQ-004 lean answer; REQ-006 removed; REQ-007 failure entries for every step; AC-003…AC-008, AC-011 updated; DEC-007 (Codex credits) added. Approval: Solution Designer within the direction (the user asked for the leaner answer), user informed 2026-10-25.
- Design: idle-input Claude control query (also fixes today's discovery prompt, C-15), `MODEL_DISCOVERY_PROBE_PROMPT` removed; per-runtime fixed caps 4 s / 6 s / 8 s ‖ 8 s passed down to each step; install rule `readVersion`; provider usage types in `llm-management/provider-usage`; one blocked form; cwd, composition, MCP `isAvailable` named.
- Evidence added: C-15…C-18 (verified).
- Classification unchanged: Large / High.
- Next action: architecture review of SR-002.

### SR-003 — Step deadline and text alignment

- Phase and classification: Mixed (Design Impact AR-002 narrowed; Requirement Gap AR-006 = text alignment within the user's direction, no change of intent)
- Trigger: `design-review-report.md` ARCH-REV-002.
- Design: a step's cap is a `ReadDeadline` shared by every command inside it (new option name `deadline`; existing `timeoutMs` keeps its per-command meaning); Codex requests race the deadline and release the lease; test of a slow second command. Previous design kept as `history/design-spec-sr002.md`.
- Requirements: UI states without plan or limit-level blocked badge; one model field `blocked: {until, by}` (REQ-004, AC-003, AC-004); REQ-004 states that runtime credit details are not shown while an AutoByteus provider's money balance is. Approval: Solution Designer within the direction; the user is informed in the conversation.
- Classification unchanged: Large / High.
- Next action: architecture review of SR-003.

### Review note — ARCH-REV-003 Pass (2026-10-25)

- Architecture review Pass on SR-003 (`design-review-report.md`, ARCH-REV-003); AR-001…AR-006 resolved; classification Large / High confirmed. The reviewer routed the package to `/software_engineering_team/implementation_engineer`. Informational; no Solution Designer handoff repeated.

### SR-004 — Optional per-runtime note

- Phase and classification: Mixed (small design addition; requirement refinement within the direction)
- Trigger: the user, 2026-10-25: runtimes "don't have to return the same JSON format … it depends on you … I trust your reasoning", left to the Solution Designer.
- Decision (Solution Designer): keep the common core; add an optional per-runtime `note` (Codex credits case, Grok used % absent). REQ-004, AC-003, AC-006 updated; design § SR-004 Addition; previous design `history/design-spec-sr003.md`.
- Approval: Solution Designer within the direction, user informed in the conversation.
- Classification unchanged: Large / High. Additive optional field; implementation of the rest is unaffected.
- Next action: architecture review of the SR-004 addition.

### SR-005 — Separate sign-in mark and limits note

- Trigger: ARCH-REV-004 AR-007 (one free-text field had two meanings).
- Change: `signIn?: "not checked"` (sign-in step only) and `limitsNote?: string` next to `limits`; UI states, REQ-004, REQ-007, AC-003, AC-006 updated; design `history/design-spec-sr004.md` kept.
- Approval: Solution Designer within the direction (field naming; no change of intent).
- Next action: architecture review of SR-005.

### Review note — ARCH-REV-005 Pass (2026-10-25)

- Architecture review Pass on SR-005 (AR-007 resolved); classification Large / High. The reviewer sent the SR-005 delta to `/software_engineering_team/implementation_engineer`. Informational; no Solution Designer handoff repeated.

### SR-006 — Failure-origin review CRR-003 (API-REV-001)

- Phase and classification: Mixed (Design Impact CR-003, CR-004; confirmed implementation Local Fix CR-002; requirement refinement within the direction)
- Trigger: `code-review-report.md` CRR-003 (API/E2E round 1 failure-origin), evidence API-08b, API-05/05b, API-03b.
- Design: discovered AutoByteus providers reloaded per read (local: listed only when answering; keyed custom: models unknown on failure); one Codex client hold per read via `AgentRuntimeStrategy.holdClient` + single-flight `read()`; `DeadlineExceededError` / `isDeadlineExceeded` as the one time-out rule (Claude `listModels` with a deadline lets it through); O-1 floor rounding; O-2 → FU-004; O-3 no change. Previous design `history/design-spec-sr005.md`.
- Requirements SR-006: REQ-002, REQ-007, AC-007 refined; AC-013 added (concurrent callers). Approval: Solution Designer within the direction (no change of intent: "available", "nothing is guessed", "never fails as a whole"); user informed.
- Evidence: C-20…C-22. Follow-ups: FU-003 (Codex manager refusal while closing), FU-004 (page localization).
- Classification unchanged: Large / High.
- Next action: architecture review of SR-006, then implementation (CR-002, CR-003, CR-004), source review, API/E2E reruns API-03/03b, API-05/05b, API-08b.

### Review note — ARCH-REV-006 Pass (2026-10-25)

- Architecture review Pass on SR-006; the reviewer routed it to `/software_engineering_team/implementation_engineer`. Its three non-blocking notes were adopted into the documents without changing intent: answer returned before the Codex hold release settles (single-flight slot held until then); a keyed custom endpoint with 0 models → models "unknown: the endpoint listed no models"; preserved-behavior clarification of the catalog refresh. No handoff repeated.

### SR-007 — Code reviewer's design feedback (2026-10-25, at the user's request)

- Phase and classification: Design (Design Impact on spec accuracy, ownership and dependency direction; no requirement change)
- Trigger: the code reviewer's five caveats on SR-006 (message of 2026-10-25), sent at the user's request.
- Decisions: (1) spec aligned with the code's `modelFamilies` scope and the word-order family rule; most specific wins over all limits, then exhausted ones block (C-02); (2) strategies return a reading or throw (`UsageLimitsUnreadableError`), the service alone words failures; `readUsageLimitsSafely` and parsers' `unknown` removed; (3) `commandBound {timeoutMs, byDeadline}` named; an ordinary per-command time-out is "could not be read"; (4) repeated work deferred explicitly → FU-005; (5) composer, report and matching moved to `src/available-agent-runtimes/`, removing the type-level subsystem cycle. Previous design `history/design-spec-sr006.md`.
- Requirements: unchanged (SR-006).
- Classification unchanged: Large / High.
- Next action: architecture review of SR-007; the implementation round in progress takes SR-007 with CR-002…CR-004.

- SR-007 factual correction (2026-10-25, code reviewer's note): `appliesTo` keeps three variants (`runtime`, `models` for Codex's `normalModelSlug` ids, `modelFamilies` for Claude/Antigravity); "most specific wins" applies among `modelFamilies` limits. Spec text only; the code already has this shape (`codex-usage-limits.ts:37,49`).

- SR-007 text correction for ARCH-REV-007 AR-008 (2026-10-25): § Read deadline declares `commandBound → {timeoutMs, byDeadline}`; DS-003 limits line uses throw → service wording; provider readers return `read` | `not_reported` or throw `ProviderUsageUnreadableError` (decision: same contract as strategies; `unknown` removed) and the service words provider failures; CR-002 section marked superseded in part; decision 1 opening and the DEC-003 fallback cover every `appliesTo` variant. Previous text `history/design-spec-sr007.md`.

### Review note — ARCH-REV-008 Pass (2026-10-25)

- Architecture review Pass on SR-007 (corrected); AR-008 resolved; no open findings; classification Large / High. The reviewer routed it to `/software_engineering_team/implementation_engineer`. Informational; no handoff repeated.
