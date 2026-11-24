# API/E2E Coverage Investigation

## Investigation Meta

- Requirements Doc: `requirements-doc.md` (SR-005 baseline; REQ-001…REQ-004, AC-001…AC-006)
- Investigation Notes: `investigation-notes.md`
- Solution Revision Record: `solution-revision-record.md` (SR-001…SR-006)
- Design Spec (required on every route): `design-spec.md` (D-1, D-2, D-3, SR-006)
- Supplemental Task Artifacts: `probes/` (the reproduction), `follow-ups.md` (FU-001 resolved; FU-002, FU-004, FU-005), `handoff-*.md`
- Design Review Report: `design-review-report.md` (ARCH-REV-001…003; untracked, the Architecture Reviewer's)
- Architecture Review Revision Record: `architecture-review-revision-record.md` (untracked)
- Implementation Handoff: `implementation-handoff.md` (IR-002; IMP-01…IMP-17; Downstream Coverage Hints)
- Implementation Revision Record: `implementation-revision-record.md`
- Code Review Report: `code-review-report.md` (CRR-002, round 2, Pass; CR-001 resolved)
- Code Review Revision Record: `code-review-revision-record.md`
- Delivery Revision Record (delivery re-entry only): N/A
- Relevant Delivery Revision IDs: N/A
- API/E2E Revision Record (created after the first completed result): `api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-001`
- Current Investigation Round: 1
- Trigger: `/code_reviewer`, CRR-002 Pass; branch `codex/conversation-order-628` at `a9e22b4ea4` (origin `52d8c1792c`), base `origin/personal` `1f761bc8db`; Large / High
- Prior Investigation Reviewed: None (first round)
- Latest Authoritative Investigation: this file

## Current Requirement And Design Basis

- REQ-001 / AC-001, AC-002: the conversation shows its rows in the conversation's own order, never by comparing times from two clocks (live; phone and desktop; sending and watching).
- REQ-002 / AC-003: a platform notice delivered with a user's message shows right after it, live and after a reload. D-2's read-side rule: (a) external runtimes by time (the user trace at its admission time, SR-006); (b) native by the input processor's source event.
- REQ-003 / AC-004: compaction rows are placed between messages by time and never reorder them.
- REQ-004 / AC-006: every row time the web keeps is the node's: `occurred_at` on timed frames, `accepted_at` on pending input, the stored `ts` after a reload; an own send has no time until the node confirms it.
- AC-005: the preserved specs and MSP-99.

## Supported Scenarios And Real Usage

- Designer scenarios covered: SCN-001…SCN-004.
- Real-use scenarios added from investigating the implemented behavior: the founder's shape on real runtimes: a Team member on Claude whose tools change ("Tools updated" preface); a native AutoByteus run whose skill changes ("Skill updated" preface, the founder's own notice), each with the phone's clock 2 s behind or ahead, sending and watching (Downstream Coverage Hints 1–3).
- Designer scenarios recorded as unsupported/contrived: None.

## Changed Behavior Summary

| Behavior ID / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| BEH-001 window order (D-1) | Changed | REQ-001 | Web specs (IMP-01); MSP-105 scripted; MSP-106/107 live |
| BEH-002 preface after its input on reload (D-2, SR-006) | Changed | REQ-002 | Server unit (IMP-02, IMP-09); MSP-105; MSP-106 (rule a, Claude), MSP-107 (rule b, native) |
| BEH-003 compaction placement | Changed | REQ-003 | Web specs (IMP-01, IMP-07) |
| REQ-004 node-stamped times (D-3) | Changed (contract: `occurred_at`, `accepted_at`) | REQ-004 | Server/web units (IMP-06, IMP-07, IMP-16); the phone's state times on real runtimes (MSP-106/107); whole server suites |
| Preserved: notice rows, usage rows, pending input, recent window | Preserved | AC-005 | Whole web suite (IMP-16), whole phone probe |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised By That Evidence | Candidate Broader Validation Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | Yes | AgentRun's delivery stamp; the replay's preface rule; the external user trace's time | server units, integration, e2e (IMP-12, IMP-17) | real runtime event shapes and timing | Live runtimes (gated probe) |
| API / transport / contract | Yes | `/ws/agent`, `/ws/agent-team`, Org: `occurred_at`; pending input `accepted_at`; contract `dist/` | contract-dist check; e2e | — | Whole server e2e |
| Frontend component / state | Yes | the window's order; every row time from the node | web suite | real frames | Browser |
| Browser integration / user journey | Yes | phone conversation live and reopened | MSP-105 (scripted AGY) | real runtimes; native rule (b) live | Browser + Live API |
| Desktop renderer | Yes (same window builder) | `buildRecentEventMonitorPresentation` | web specs | — | — |
| Desktop shell / packaging | Yes (contracts are build inputs) | the packaged app bundles the web and node of one commit | IMP-14, IMP-15 | the final commit; that the bundle's two halves match | FS-1 with a bundle check |
| Persisted-data transition | No (read side; writer time choice only) | — | IMP-02 reads the founder's old trace | — | — |

## Project Execution Discovery

- Assigned task worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/conversation-order-628`
- Project type: pnpm monorepo; Node 22.23.1; built node (`autobyteus-server-ts/dist`), phone bundle, Nuxt dev desktop; Chrome via Playwright.
- Project testing guideline: `TESTING.md` (root).
- Conflicting, missing, or unclear project instructions: None.
- Changed build-input paths: the contract packages (`autobyteus-*-contracts/**`, their `dist/`) → fresh-start build (FS-1) on the final commit; IMP-14 ran on `3e4c6322a4` (code `6ad8920bd6`), before IR-002's code.
- Required environment variables or secrets available: `Yes`: the test vault (`provider.anthropic.api-key`, `provider.openai.api-key`); values never read or printed.

| Instruction / Configuration Path | Authority / Purpose | Commands, Setup, Or Constraints Learned |
| --- | --- | --- |
| `TESTING.md` "Claude Code (`claude`)" | test-owned Claude | the node's own HOME and CLAUDE_CONFIG_DIR; `CLAUDE_AGENT_SDK_AUTH_MODE=api-key` with the test vault: nothing of `~/.claude` read or written |
| `TESTING.md` "Gates", "Real-provider credentials" | paid runs | gate per case; the cheapest models (haiku, gpt-5.4-mini) |
| `autobyteus-web/tests/e2e/mobile-shell-probe.mjs` | phone probe | `serverAt(name, port, env)` for an own node; `--cases=` |

| Component / Dependency | Working Directory | Start / Setup Command | Runtime / Resource Notes | Readiness Check | Stop / Cleanup Method |
| --- | --- | --- | --- | --- | --- |
| Server dist, phone bundle | worktree | `pnpm -C autobyteus-server-ts build`; `pnpm -C autobyteus-web build:mobile-web` | — | exit 0 | — |
| Node `nu` (live cases) | probe | `serverAt('nu', port, { AUTOBYTEUS_TEST_VAULT, CLAUDE_AGENT_SDK_AUTH_MODE: 'api-key', CLAUDE_CONFIG_DIR })` | reads the test vault read-only | `/rest/health` | `node.stop()` |

| Data / Fixture / Identity Need | Existing Project Mechanism Or Creation Method | Environment / Data-Safety Notes | Cleanup / Retention |
| --- | --- | --- | --- |
| Phones with an offset clock | an init script replacing `Date` (MSP-105's method) | probe-owned contexts | closed |
| Notices | a definition's tool change (Tools updated); `updateSkill` (Skill updated) | probe-owned definitions and skill | probe root |

## Existing Durable Coverage Inventory

| Path / Test | Current Assertion Or Intent | Related Requirement / AC / Design | Validity Decision | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/tests/e2e/mobile-conversation-order-cases.mjs` MSP-105 | order live/reopened, scripted AGY Team member, phone ±2 s | AC-001…003 | Still Valid | IMP-10, IMP-17 | Whole probe |
| `mobile-restored-run-cases.mjs` MSP-99 | restart reminder as a preface | AC-005 | Still Valid | IMP-05 | Whole probe |
| web `recentEventMonitorWindow.clockOrder.spec.ts`, `serverRowTimes.spec.ts`; server `preface-notice-order.test.ts`, `agent-run-event-time.test.ts` | D-1, D-2, D-3 | AC-001…AC-006 | Still Valid | IMP-01…IMP-16 | Reused |

## Planned Cases

| Case ID | Criteria | Boundary / Surface | Kind | Planned Command Or Steps | Why |
| --- | --- | --- | --- | --- | --- |
| MSP-106 | AC-001, AC-002, AC-003, AC-006 | a Claude Team member; phone ±2 s; sends and watches; live, reopened, node order, phone state times | Durable (gated live) | `RUN_MOBILE_SHELL_LIVE_ORDER=1 AUTOBYTEUS_TEST_VAULT=… --cases=MSP-106,MSP-107` | hints 1 and 3; D-2 rule (a) on a real external runtime |
| MSP-107 | AC-001, AC-003, AC-006 | a native standalone run with a real model; a skill update; phone ±2 s sends | Durable (gated live) | same | hints 2 and 3; D-2 rule (b) live; the founder's "Skill updated" notice; a standalone own send's time from the input state |
| SI-1, SE-1 | AC-005; regression | whole server integration and E2E | Existing Test | `test:integration:prepare`, `test:integration`, `pnpm test:e2e` | contract and delivery changes; an independent run of the reviewed code |
| WS-1 | all phone; AC-005 | whole phone probe | Existing Test | `test:e2e:mobile-shell` | MSP-105, MSP-99 and every other case on this tree |
| FS-1 | build inputs; hint 5 | fresh-start build of my final commit; the packaged app's server and renderer from that commit | Existing Test | fresh clone; `pnpm install --frozen-lockfile`; the release job's mac build and verify steps; then search the packaged app for D-3's markers on both sides | IR-002 code came after IMP-14 |
| U-1 | unit | web, server, autobyteus-ts units; typechecks; guards; contract-dist | Reused | IMP-16 | no source change after `eaebb94304` (`git diff --name-only 8fbffd707f HEAD` lists only tickets; `eaebb94304..8fbffd707f` only test fixtures) |

- Test progress log needed: `Yes`

## Durable Coverage To Add

| Case ID | Planned Test Path | Why Durable Coverage Is Needed |
| --- | --- | --- |
| MSP-106, MSP-107 | `autobyteus-web/tests/e2e/mobile-conversation-order-live-cases.mjs` (registered in `mobile-shell-probe.mjs`) | the order and the node's times on real runtimes, which the scripted cases cannot show (event shapes and timing of a real CLI and a real model) |

## Durable Coverage To Update

None

## Durable Coverage To Remove

None

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Only The User Can Check? | Required Follow-Up Or Escalation |
| --- | --- | --- | --- | --- |
| Hint 4 (N-5): a message admitted during one turn and appended into a restart notice's own turn, on a real external runtime, reloaded | not deterministically reachable on a real CLI (a queued message must be appended into a notice-started turn); the replay rule for it is proven on the real writers by IMP-09 (the N-5 case) | Low | No | None |
| Codex | Claude covers the external rule (a); Codex shares the same writer (`RuntimeMemoryEventAccumulator`) | Low | No | None |
| Physical phone | no device | Low | No | None |

## Ambiguities Or Reroute Triggers

None.

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `Yes` (MSP-106, MSP-107)
- Reroute Required Before Validation Execution: `No`
- Notes: Large / High: a Pass goes to the code reviewer for the proportional test-code review.
