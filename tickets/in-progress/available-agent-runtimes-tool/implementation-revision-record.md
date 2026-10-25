# Implementation Revision Record — autobyteus-303

The current code and `implementation-handoff.md` remain authoritative.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Related Revision IDs | Result |
| --- | --- | --- | --- | --- | --- |
| IR-004 | Code reviewer, `code-review-report.md` CRR-004 (round 4, Fail) | CR-005 | `Local Fix` | SR-007; ARCH-REV-008; CRR-004 | "could not be read: <reason>" worded by one helper; commit `7ece4e2069`; back to code review (Targeted Delta Review) |
| IR-003 | Architecture reviewer: ARCH-REV-006 Pass (SR-006, answering CRR-003's failure-origin review of API-REV-001), then ARCH-REV-008 Pass (SR-007) mid-round | CR-002, CR-003, CR-004, O-1; SR-007 decisions 1–5 | `Local Fix` (CR-002) + `Design Impact` (CR-003, CR-004, SR-007) | SR-006, SR-007; ARCH-REV-006, ARCH-REV-008; CRR-003; API-REV-001 | Implemented; commits `07c07cfc27` (SR-006), `c4fff3eb00` (SR-007); back to code review |
| IR-002 | Code reviewer, `code-review-report.md` CRR-001 (round 1, Fail) | CR-001 | `Local Fix` | SR-005; ARCH-REV-005; CRR-001 | Unused `modelList` removed; commit `683b036be9`; back to code review (Targeted Delta Review) |
| IR-001 | Architecture reviewer, `design-review-report.md` ARCH-REV-003 Pass (SR-003), updated by ARCH-REV-005 Pass (SR-005) during implementation | N/A | `Initial Baseline` | SR-003, SR-005; ARCH-REV-003, ARCH-REV-005; CRR N/A; API-REV N/A; DR N/A | Implemented; code commit `5135bb73dc`; routed to code review (Large / High) |

## Revision Entries

### IR-001 — Initial implementation: tool, service, readers, page

- Triggering role, report path, and round: Architecture reviewer, `tickets/in-progress/available-agent-runtimes-tool/design-review-report.md`, ARCH-REV-003 (Pass on SR-003); during implementation ARCH-REV-005 (Pass on SR-005: `signIn?: "not checked"`, `limitsNote`).
- Triggering finding IDs: N/A
- Classification: Initial Baseline
- Prior authoritative result: N/A
- Current authoritative result: implemented at `5135bb73dc` on `codex/available-agent-runtimes-tool`; implementation-scoped checks pass (IMP-01…IMP-08).
- Related solution revision IDs: SR-003, SR-005
- Related architecture-review revision IDs: ARCH-REV-003, ARCH-REV-005
- Related code-review revision IDs: N/A
- Related API/E2E revision IDs: N/A
- Related delivery revision IDs: N/A
- Why this baseline is recorded: first implementation handoff.
- Approved behavior or requirement IDs affected: BEH-001…003; REQ-001…005, REQ-007…010; AC-001…012.
- Implementation delta: change sequence 1–8 of the design spec (parsers and fixtures; Claude idle-input control query with `listModels` on it and `MODEL_DISCOVERY_PROBE_PROMPT` removed; `runAcpExtensionRequest`; `ReadDeadline` and the optional `{deadline}` options; `readUsageLimits` on four strategies; provider usage readers; `AvailableAgentRuntimesService`; tool, MCP adapter, loader unit, GraphQL query, composition binding; Settings → Model Routing; docs and glossary). SR-005 delta applied in the same round.
- Changed files or areas: see `implementation-handoff.md` § Key Files Or Areas.
- Local validation and result: server typecheck Pass; server unit suite 826 files / 6869 tests Pass; focused server suites 240 tests Pass; web tests 72 Pass; web guards Pass; live dev-stack read 4.79 s; rendered page inspected (IMP-07, IMP-08).
- Next recipient or routing: code review (handoff rule for Large / High).
- Remaining limitations or risks: `implementation-handoff.md` § Known Risks.

### IR-002 — CR-001: remove the unused `modelList` helper

- Triggering role, report path, and round: Code reviewer, `tickets/in-progress/available-agent-runtimes-tool/code-review-report.md`, CRR-001 (round 1, Fail).
- Triggering finding IDs: CR-001 (Low, Principle 7 No Dead Code)
- Classification: Local Fix
- Prior authoritative result: IR-001 at `5135bb73dc`, CRR-001 Fail
- Current authoritative result: `683b036be9`; the finding is resolved
- Related solution revision IDs: SR-005
- Related architecture-review revision IDs: ARCH-REV-005
- Related code-review revision IDs: CRR-001
- Related API/E2E revision IDs: N/A
- Related delivery revision IDs: N/A
- Why this implementation revision is recorded: a code-review Local Fix.
- Approved behavior or requirement IDs affected: none (nothing called it)
- Implementation delta: deleted `modelList` and its doc comment from `autobyteus-web/components/settings/model-routing/availableAgentRuntimesPresentation.ts`. `UnknownText` and `AvailableModel` stay imported: `unknownReason` and `blockedCount` use them. `grep -rn "modelList\b"` over the web sources now finds nothing.
- Changed files or areas: that one file.
- Local validation and result: IMP-09. `pnpm -C autobyteus-web test:nuxt components/settings/model-routing --run` passes 8/8, and `guard:web-boundary` passes.
- Next recipient or routing: code review (Targeted Delta Review of CR-001).
- Remaining limitations or risks: unchanged from IR-001. The reviewer's optional point (resolve family coverage over all limits, not only exhausted ones) is not taken in this round: it is outside CR-001, and today's Antigravity families do not overlap.

### IR-003 — SR-006 (discovered providers, Codex hold, single-flight, one time-out rule) and SR-007 (one failure owner, coverage over all limits, composer folder)

- Triggering role, report path, and round:
  - Architecture reviewer ARCH-REV-006 (Pass on SR-006). SR-006 answers `code-review-report.md` § API/E2E Failure-Origin Review (CRR-003, round 3), which was raised on `api-e2e-execution-coverage-report.md` (API-REV-001, round 1, Fail).
  - Mid-round, ARCH-REV-008 (Pass on SR-007, text-corrected), which answers the code reviewer's design feedback.
- Triggering finding IDs: CR-002 (F-1, Local Fix), CR-003 (F-2), CR-004 (F-3), O-1; SR-007 decisions 1, 2, 3, 5 (4 deferred as FU-005)
- Classification: Local Fix (CR-002) and Design Impact (CR-003, CR-004, SR-007), all decided upstream
- Prior authoritative result: IR-002 at `683b036be9`; API/E2E round 1 Fail
- Current authoritative result: `c4fff3eb00`; implementation-scoped checks pass (IMP-10…IMP-17)
- Related solution revision IDs: SR-006, SR-007
- Related architecture-review revision IDs: ARCH-REV-006, ARCH-REV-008
- Related code-review revision IDs: CRR-003
- Related API/E2E revision IDs: API-REV-001
- Related delivery revision IDs: N/A
- Why this implementation revision is recorded: rework for the failure-origin review and the SR-007 design revision.
- Approved behavior or requirement IDs affected: REQ-002, REQ-004, REQ-007, REQ-010; AC-003, AC-004, AC-006, AC-007, AC-008, AC-011, AC-013.
- Implementation delta:
  - **CR-002:**
    - `DeadlineExceededError`, `isDeadlineExceeded` (with `cause`), `commandBound`/`byDeadline` and `deadlineCause` in `read-deadline.ts`. All deadline-bound helpers surface the error only when the deadline set the bound.
    - `runStep` classifies by error, not by the clock; Claude `listModels` lets the deadline error through when it has a deadline.
    - A 1 ms-left reproduction test: failed first, then passed.
  - **CR-003:** discovered providers are reloaded per read (8 s, parallel with usage). Local ones are listed only with models now; keyed custom endpoints are listed with models or "unknown"; a provider's `models` may be `"unknown: …"` (report + web).
  - **CR-004:** `AgentRuntimeStrategy.holdClient` (Codex: lease without acquire), taken after install and released after the answer. `read()` is single-flight and holds its slot until the releases settle.
  - **O-1:** round-down remaining %, exhaustion on raw values.
  - **SR-007:**
    - Composer, report and matching moved to `src/available-agent-runtimes/`, with a dependency-direction test.
    - Strategies and provider readers return or throw (`UsageLimitsUnreadableError`, `ProviderUsageUnreadableError`); the `unknown` states and `readUsageLimitsSafely` are removed.
    - The service's `failureText` is the one wording.
    - Coverage is resolved over all limits before blocking.
  - API/E2E-owned tests updated to approved values: AAR-01's two O-1 percentages, and the web probe's DeepSeek text.
- Changed files or areas: `implementation-handoff.md` § Key Files Or Areas.
- Local validation and result:
  - IMP-10…14 on `07c07cfc27`, including the live dev-stack run (LM Studio listed, 3 × 4 concurrent reads all with Codex, 4.3–5.2 s).
  - IMP-15…17 on `c4fff3eb00`: unit suite 829 files / 6887 tests; focused tests 273; E2E file 5/5.
- Next recipient or routing: code review (Large / High), then API/E2E reruns API-03/03b, API-05/05b, API-08b.
- Remaining limitations or risks: FU-003 residual (another Codex user closing the home-folder generation); the hold-release window after the answer; the web probe not run here; no live run on `c4fff3eb00` itself (its paths are covered by IMP-17 on the real composition).

### IR-004 — CR-005: one helper for "could not be read: <reason>"

- Triggering role, report path, and round: Code reviewer, `code-review-report.md`, CRR-004 (round 4, Fail).
- Triggering finding IDs: CR-005 (Low; SR-007 decision 2, one wording helper)
- Classification: Local Fix
- Prior authoritative result: IR-003 at `c4fff3eb00`, CRR-004 Fail
- Current authoritative result: `7ece4e2069`; the finding is resolved
- Related solution revision IDs: SR-007
- Related architecture-review revision IDs: ARCH-REV-008
- Related code-review revision IDs: CRR-004
- Related API/E2E revision IDs: N/A
- Related delivery revision IDs: N/A
- Why this implementation revision is recorded: a code-review Local Fix.
- Approved behavior or requirement IDs affected: none (output text unchanged)
- Implementation delta: `unreadableText(subject, reason)` in `src/available-agent-runtimes/available-agent-runtimes-service.ts` builds "unknown: <subject> could not be read: <reason>". `failureText` and `readDiscoveredModels` both call it, and no inline copy remains.
- Changed files or areas: that one file.
- Local validation and result (IMP-18): typecheck clean. `tests/unit/available-agent-runtimes` and `tests/unit/agent-tools/agent-runtimes` pass 38/38, with the tests unchanged (they assert the same texts).
- Next recipient or routing: code review (Targeted Delta Review of CR-005), then API/E2E.
- Remaining limitations or risks: unchanged from IR-003.
