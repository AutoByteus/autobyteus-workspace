# API/E2E Coverage Investigation — autobyteus-434

The plan: what must be proven, how, the decisions about existing tests, and the planned cases. Results, confidence scores and the broader-validation decision are in `api-e2e-execution-coverage-report.md`.

## Investigation Meta

- Requirements Doc: `requirements-doc.md` (Approved, SR-001)
- Investigation Notes: `investigation-notes.md`
- Solution Revision Record: `solution-revision-record.md`
- Design Spec (required on every route): `design-spec.md` (SR-004, `Ready`)
- Supplemental Task Artifacts: `evidence/repro/phone-live-repro.mjs` (reproduction R1–R7, evidence only); `follow-ups.md` (FU-001…FU-003)
- Design Review Report: `design-review-report.md` (ARCH-REV-003, Pass)
- Architecture Review Revision Record: `architecture-review-revision-record.md`
- Implementation Handoff: `implementation-handoff.md` (IR-001)
- Implementation Revision Record: `implementation-revision-record.md`
- Code Review Report: `code-review-report.md` (CRR-001, Pass, no findings)
- Code Review Revision Record: `code-review-revision-record.md`
- Delivery Revision Record (delivery re-entry only): N/A
- Relevant Delivery Revision IDs: N/A
- API/E2E Revision Record (created after the first completed result): `api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-001`
- Current Investigation Round: 1
- Trigger: code review pass CRR-001 (Medium / High, reviewed route)
- Prior Investigation Reviewed: N/A (first round)
- Latest Authoritative Investigation: this file, round 1

Worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/phone-live-updates-434`, branch `codex/phone-live-updates-434`, base `eebbc2b8ee`, validated source `feb69495a5` (HEAD `d5f0735904` adds ticket documents only).

## Current Requirement And Design Basis

- REQ-001 / AC-001, AC-002: while visible, a run stream never stops retrying after an unintended close (waits 1, 2, 4, 8, 16, then 30 s); it catches up without user action once the node answers. All four streams (agent, Team, Org, collaboration).
- REQ-002 / AC-003, AC-004: on page visible or `online`, a stream that is not connected attempts at once; a stream whose page was hidden ≥ 30 s re-synchronizes even if its socket looks open; nothing retries while hidden.
- REQ-004 / AC-005: external-runtime user records are stored with `message_id`/`dedupe_key`, so a client loading during the message's turn shows it once, in place.
- REQ-005 / AC-006: live delay, short-outage catch-up, sending view single copy, 403/416 and `/ws/terminal` refusal, no list poll while hidden, non-retryable close (4004) not retried.
- Design: one `LiveStreamReconnectScheduler` per stream; agent catch-up = load stored state, commit, then open (accepted read-to-open window); Team/Org/collaboration catch-up = node snapshot. Risks named for validation: the agent read-to-open window, ASM-001 (WebView visibility), FU-003 (a hanging catch-up read keeps the agent scheduler `attempting`; code review C-5), DEC-003 cost.

## Supported Scenarios And Real Usage

- Designer scenarios covered (`SCN-*`): SCN-001 (live watch), SCN-002 (path drops > 30 s while visible), SCN-003 (come back after background/sleep), SCN-004 (load during the message's turn).
- Real-use scenarios added from investigating the implemented behavior, each with its real trigger:
  - SCN-002 on a **top-level agent run** with events produced right after the node returns (the agent catch-up path, its read-to-open window): the agent keeps answering a desktop client's messages while the phone reconnects.
  - SCN-002 on an **Org member** (Org stream): same trigger.
  - SCN-003 with the node **unreachable while hidden** (AC-004): the phone in the background while the path is gone, then visible.
  - SCN-003 **short glance** (hidden < 30 s, healthy socket): no reconnect (AC-003 alternate).
  - SCN-003 on the **real Android app**: app to background, screen off ≥ 2 min, then back (ASM-001; FU-003's realistic case).
  - SCN-004 on a **top-level agent run** (run open path, `loadRunContextHydrationCandidate`) besides the Team member (member loader).
- Designer scenarios recorded as `Technically Possible but Unsupported/Contrived` (not tested): a node that accepts an agent stream and closes it at once with a retryable code (code review C-7).

## Changed Behavior Summary

| Behavior ID / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| BEH-001 live delay | Preserved | R1 IMP-12 | Next-marker delay in MSP-20/MSP-21 (≤ 1 s) |
| BEH-002 short outage | Preserved (agent now also catches up) | R2 IMP-12 | Reuse IMP-12 R2; agent catch-up proven by MSP-20 (long outage, same attempt path) |
| BEH-003 long outage | Changed | design DS-002/DS-003 | MSP-20 on Team member, agent run, Org member |
| BEH-004 resume / re-sync / hold | Changed | design DS-002 resume branch | MSP-21 (emulated visibility); API-09 emulator |
| BEH-005 one copy on load | Changed | design DS-004 | MSP-22 on Team member and agent run; stored raw record read |
| BEH-006 sending view | Preserved | R6 | MSP-22 sending phones |
| BEH-007 403/416, `/ws/terminal` | Preserved | route-policy tests | API-02 (reused), API-06 server E2E |
| `WebSocketClient` reduced to a socket; `RECONNECTING` removed | Removed | design removal plan | Unit specs (reused); probes see no give-up |
| Collaboration stream (delegated copy) reconnect | Changed | per-owner table | Unit specs; and MSP-20 asserts the collaboration stream the phone keeps for a top-level agent run reconnects after the outage (found during execution) |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised By That Evidence | Candidate Broader Validation Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | Yes | external-runtime memory recorder writes identity | IMP-02 (real recorder, writer, projection provider) | Real AGY run through the node's admission path | MSP-22 reads the stored raw record of a real run |
| API / transport / contract | Yes (client transport) | `WebSocketClient` plain socket; four stream owners' reconnect | Unit specs with fake sockets (IMP-06/07/08) | Real sockets, real node close/refuse/blackhole | Browser probe through a TCP proxy |
| Frontend component / state | Yes | stores (`agentRunStore` connect rule), hydration loader | Unit specs | Real hydration against the node | Browser probe |
| Browser integration / user journey | Yes | phone run screen live updates | IMP-12 repro (Team member only) | Agent run, Org member; durable coverage | `test:e2e:mobile-shell` cases |
| Authentication / session / permissions | No (preserved) | — | route-policy unit tests | — | API-06 server E2E |
| Desktop renderer / web-equivalent UI | Yes (shared code) | same services in the desktop renderer | Unit specs | Desktop window re-sync cost (DEC-003) | Not an AC; residual |
| Desktop shell / Electron-specific integration | No | — | — | — | None |
| Process / lifecycle | Yes | page visibility / `online` lifecycle | Unit specs (fake visibility) | Real Android WebView visibility (ASM-001) | Android emulator journey |
| Persisted-data transition | Yes | new optional keys on raw trace user records | IMP-02 old + new record | Real run's file | MSP-22 |
| Worker / queue / distributed coordination | No | — | — | — | None |
| External integration | No | — | — | — | None |

## Project Execution Discovery

- Assigned task worktree / workspace: `/Users/normy/autobyteus_org/autobyteus-worktrees/phone-live-updates-434`
- Project type and runtime stack: pnpm monorepo; Nuxt web app (`autobyteus-web`, phone bundle `/mobile` via `build:mobile-web`), Node server (`autobyteus-server-ts`, Fastify, GraphQL, WebSockets), Android WebView shell (`autobyteus-android`, unchanged).
- Project testing guideline path(s): `TESTING.md` (repository root). No closer `TESTING*.md` on the changed paths.
- Conflicting, missing, or unclear project instructions: None. TESTING.md requires phone-offered renderer behavior to be proven by a case in `pnpm -C autobyteus-web test:e2e:mobile-shell`.
- Changed build-input paths: `None` (`git diff --name-only eebbc2b8ee...HEAD` touches no manifest, lockfile, tsconfig, script, contract package, workflow or Android build file, and no new workspace import). No fresh-start build case.
- Required environment variables or secrets available: `N/A` (scripted AGY runtime; no provider keys).

| Instruction / Configuration Path | Authority / Purpose | Commands, Setup, Or Constraints Learned |
| --- | --- | --- |
| `TESTING.md` | Global testing rules | Layers and commands; one heavy run at a time; probes own their stack; fresh `--output-dir`; phone behavior proven by a `test:e2e:mobile-shell` case; never test against the user's app or data |
| `AGENTS.md` | Repository instructions | Test vault only for real keys (not needed) |
| `autobyteus-web/tests/e2e/mobile-shell-probe.mjs` header | The phone probe | Prerequisites `pnpm -C autobyteus-server-ts build`, `pnpm -C autobyteus-web build:mobile-web`; `--output-dir`, `--cases`; `--hold` prints an emulator pairing link |
| `autobyteus-server-ts/tests/fixtures/agy-failure-cli.mjs` | Scripted AGY CLI | `AGY_FAKE_CASE=interrupt_resend`: a message is answered `REPLY:<content>`; `HOLD_MS:<n>` keeps a `run_command` step open n ms, then replies |
| `autobyteus-android/README.md` | Android shell | Debug APK `./gradlew :app:assembleDebug`; the app loads `/mobile` from the node; `adb install`, `am start` |
| `evidence/repro/phone-live-repro.mjs` | Reproduction | TCP proxy modes `refuse` / `blackhole`; Chrome `--host-resolver-rules` maps a private host to the proxy so the phone keeps its Host/Origin |

| Component / Dependency | Working Directory | Start / Setup Command | Runtime / Resource Notes | Readiness Check | Stop / Cleanup Method |
| --- | --- | --- | --- | --- | --- |
| Server build | worktree | `pnpm -C autobyteus-server-ts build` (IMP-13; built 09:29 after the last source commit) | — | `dist/app.js` present; no `Max reconnection attempts` in the phone bundle | — |
| Phone bundle | worktree | `pnpm -C autobyteus-web build:mobile-web` (IMP-13) | — | `dist/public/index.html`; node serves `/mobile` | — |
| Probe nodes alpha, beta, and the new cases' node gamma | `autobyteus-server-ts` | spawned by the probe (`dist/app.js`, temp data root and HOME, free ports) | gamma: `AGY_FAKE_CASE=interrupt_resend` | `/rest/health` | probe `finally` (SIGTERM, temp root removed) |
| TCP proxy (the phone's network path to gamma) | probe process | `net.createServer` on a free port | modes pass / refuse / blackhole WebSockets | listening | closed in the cases' cleanup |
| Phone browser for the new cases | probe process | headless Chrome with `--host-resolver-rules=MAP 192.168.77.20 127.0.0.1` | separate from the probe's routed phone browser | pairing succeeds | closed in the cases' cleanup |
| Android emulator (own instance) | — | `emulator -avd autobyteus277_api35 -read-only -port 5584 -no-window -no-snapshot -no-audio -no-boot-anim` | The running `emulator-5570` (`codex_api35_arm64`) is not ours and is left alone | `adb -s emulator-5584 wait-for-device`, `sys.boot_completed` | `adb -s emulator-5584 emu kill` |
| Debug APK | `autobyteus-android` | `./gradlew :app:assembleDebug` | Android source unchanged in this ticket | APK file | build output untracked |

| Data / Fixture / Identity Need | Existing Project Mechanism Or Creation Method | Environment / Data-Safety Notes | Cleanup / Retention |
| --- | --- | --- | --- |
| Team run (lead + mate), top-level agent run, Org run (agent member) on gamma | public GraphQL (`createAgentDefinition`, `createAgentTeamRun`, `createAgentRun`, `createAgentOrgRun`) | test-owned data root | removed with the probe root |
| Phone credential | Phone Access pairing session (public REST) with a private-network base URL | test-owned node | removed with the node |
| Markers / a 30 s turn | another client of the node's run stream sends `MK-…` / `… HOLD_MS:30000`; the scripted AGY replies | no provider | — |
| Emulator node and runs | temporary harness, own temp data root, port reachable as `10.0.2.2` | never the user's node or data | harness `finally`; emulator killed |

## Persisted Data Transition Coverage Basis

- Approved decision: `Directly Usable — No Migration`.
- Design-spec and implementation-handoff references: design § Persisted Data / State Transition Decision; handoff § Persisted Data Transition Check.
- Representative existing-data setup and required behavior: an identity-less user record next to a new one loads through the normal projection reader (IMP-02 builds the user's real record shape).
- Evidence planned: reuse IMP-02 (old + new records through the real reader); MSP-22 reads the raw trace file a real AGY run wrote through the node's admission path and checks `message_id`/`dedupe_key`.
- Migration-specific scenarios: N/A.
- Upstream ambiguity or reroute required: None.

## Existing Durable Coverage Inventory

| Path / Test | Current Assertion Or Intent | Related Requirement / AC / Design | Validity Decision | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/services/liveStreamLifecycle/__tests__/liveStreamReconnectScheduler.spec.ts` | every scheduler transition, hold while hidden, resume, re-sync ≥ 30 s, fifth-failure report | REQ-001/002, AC-001…004 | Still Valid | IMP-06 | Reuse |
| `agentStreaming/__tests__/TeamStreamingService.reconnect.spec.ts`, `agentRunStreamReconnection.spec.ts`, `agentCollaboration/__tests__/agentRunCollaborationStreamingService.reconnect.spec.ts`, `agentOrgExecution/__tests__/agentOrgStreamingService.spec.ts` | per-owner adoption, success points, 4004/4005 not retried, catch-up then open, Connect Rule | AC-001…004, AC-006 (4004) | Still Valid | IMP-06, code review | Reuse |
| `transport/__tests__/WebSocketClient.spec.ts` | plain socket; 4004/4005 non-retryable | AC-006 | Still Valid | IMP-06 | Reuse |
| `autobyteus-server-ts/tests/unit/agent-memory/external-runtime-user-message-identity.test.ts` | identity written; old record loads | AC-005 | Still Valid | IMP-02 | Reuse |
| `autobyteus-server-ts/tests/unit/remote-access/route-policy.test.ts` | phone credential route policy | AC-006 / BEH-007 | Still Valid (untouched) | IMP-03 | Reuse |
| `autobyteus-server-ts/tests/e2e/remote-access/request-origin-and-phone-routes.e2e.test.ts` | 416 Host/Origin; phone routes; `/ws/terminal` refused for a phone credential | AC-006 / BEH-007 | Still Valid | not run upstream | Run (API-06) |
| `autobyteus-web/tests/e2e/mobile-shell-probe.mjs` MSP-01…MSP-19 | phone shell journeys; MSP-12: no poll while hidden, one read when shown | AC-006 (no list poll while hidden; phone routes work) | Still Valid | not run upstream on this change | Run all (API-08) |
| `autobyteus-web/tests/e2e/task-agent-monitor-visibility-probe.mjs` + fixture `task-agent-monitor-visibility.page.vue` (fixture changed: no disconnect emitted on an intentional close) | monitor visibility with a fake stream | regression of a changed fixture | Still Valid (fixture updated by implementation to the real client's behavior) | not run upstream | Run (API-07) |
| `evidence/repro/phone-live-repro.mjs` (IMP-12) | R1, R2, R3, R6, R7 on the phone bundle | AC-001 (Team), AC-003, AC-005, AC-006 | Evidence only, not durable | IMP-12 | Reuse IMP-12 for R1/R2 (BEH-001/002); durable cases replace the rest |

## Planned Cases

| Case ID | Criteria | Boundary / Surface | Kind | Planned Command Or Steps | Why |
| --- | --- | --- | --- | --- | --- |
| API-01 | AC-005, persisted data | server recorder/writer/projection | Reused | IMP-02 | Ran on `feb69495a5`; no source change since (`d5f0735904` is ticket documents) |
| API-02 | AC-006 (route policy), REQ-004/005 | whole server unit suite | Reused | IMP-03 | Same commit and source |
| API-03 | — | server and web typechecks | Reused | IMP-04, IMP-05 | Same commit and source |
| API-04 | AC-001…004 (unit), AC-006 (4004) | web specs: scheduler, owners, transport, store | Reused | IMP-06; IMP-07 + IMP-08 | Production source unchanged since `108fcd0587` (`git diff --name-only 108fcd0587 feb69495a5` = five spec files, each green in IMP-06/IMP-08) |
| API-05 | — | web guards | Reused | IMP-09 | Production source unchanged since `9e0a09dc81` |
| API-06 | AC-006 / BEH-007 | server E2E: Host/Origin, phone routes, `/ws/terminal` | Existing Test | `pnpm -C autobyteus-server-ts exec vitest run tests/e2e/remote-access/request-origin-and-phone-routes.e2e.test.ts --no-watch` (clean env) | Real HTTP/WS boundary of the preserved guard |
| API-07 | regression | browser probe with the changed fixture page | Existing Test | `pnpm -C autobyteus-web test:e2e:task-agent-monitor-visibility --output-dir=<fresh>` | Its fixture changed in this ticket |
| API-08 | AC-006 (+ the new cases) | phone bundle, existing MSP cases | Existing Test | `pnpm -C autobyteus-web test:e2e:mobile-shell --output-dir=<fresh>` (all cases) | The phone shell regression net on the changed client |
| MSP-20 | AC-001, AC-002, AC-006 (live delay) | phone bundle through a TCP proxy: Team member, top-level agent run, Org member | Durable | new case in `test:e2e:mobile-shell` | Durable proof of REQ-001 on three stream owners; watches the agent read-to-open window |
| MSP-21 | AC-003, AC-004 | phone bundle, emulated visibility, WebSocket blackhole and refuse | Durable | new case in `test:e2e:mobile-shell` | Durable proof of REQ-002 |
| MSP-22 | AC-005, AC-006 (sending view) | phone bundle composer → node → second client; raw trace file | Durable | new case in `test:e2e:mobile-shell` | Durable proof of REQ-004 on Team member and agent run |
| API-09 | AC-003 (ASM-001), FU-003 watch | real Android app in an emulator | Journey (temporary harness) | node + runs, pairing link `http://10.0.2.2:<port>`, app to background, screen off ≥ 2 min while the agent answers, then back; the WebView's DOM via its accessibility tree and the node's access log | Emulator journeys need a device; not a package probe (TESTING.md: temporary ticket-owned automation is fine) |
| API-10 | AC-006 (BEH-001, BEH-002) | phone bundle, Team member | Reused | IMP-12 (R1, R2) | Same commit; the durable cases cover the long-outage path and live delay |

- Test progress log needed: `Yes`

## Durable Coverage To Add

| Case ID | Planned Test Path | Why Durable Coverage Is Needed |
| --- | --- | --- |
| MSP-20, MSP-21, MSP-22 | `autobyteus-web/tests/e2e/mobile-live-reconnect-cases.mjs` (new; its own node gamma, TCP proxy and phone browser), registered from `autobyteus-web/tests/e2e/mobile-shell-probe.mjs` | TESTING.md: phone behavior is proven by a `test:e2e:mobile-shell` case; the design names these cases. A separate cases file keeps the 1,911-line probe from growing (the repo's `*-cases.mjs` pattern) and its node keeps the cases' outages and runs away from the shared alpha stack. |

## Durable Coverage To Update

| Case ID | Existing Path / Test | Required Update | Notes |
| --- | --- | --- | --- |
| MSP-20…22 | `autobyteus-web/tests/e2e/mobile-shell-probe.mjs` | Header lists the new cases; `runCases` calls the cases module last | No change to existing cases |

## Durable Coverage To Remove

None.

## Live Environment And Fixture Plan

- Startup order and commands: builds (IMP-13, verified current), then the probe (alpha, beta, nuxt dev, Chrome; the new cases start gamma, the proxy and their own Chrome). Emulator journey after the probe (one heavy run at a time).
- Environment choices that materially affect the run: gamma `AGY_FAKE_CASE=interrupt_resend`; the phone host `192.168.77.20` mapped to the proxy, so Host and Origin are a private address as on a LAN/tailnet path; outages are produced at TCP level (refuse = connections destroyed and new ones dropped; blackhole = open WebSocket connections stop forwarding without closing), not in the page.
- Health / readiness checks: `/rest/health`; the phone's run screen `data-state="open"`; warm-up reply shown.
- Seed data / fixtures: public GraphQL only.
- Test identities: Phone Access pairing on gamma.
- Requirement-linked journeys: MSP-20…22 and API-09 as above.
- Evidence to capture: probe JSON (per-case details: timings, sockets, copies, stored record keys), screenshots, server logs; emulator screenshots, UI-hierarchy dumps, node access log.
- Owned processes and temporary state to clean up: probe stack (its `finally`), gamma, proxy, the cases' browser; the emulator instance and its harness node.

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Only The User Can Check? | Required Follow-Up Or Escalation |
| --- | --- | --- | --- | --- |
| A delegated copy's *conversation* on the phone after a long outage | The scripted runtime mode that answers `REPLY:<content>` cannot delegate; the collaboration *stream* is probed (MSP-20) and its adoption unit-tested; AC-002's verification intent asks a probe for at least the agent run and Team member | Low: the collaboration catch-up is its existing snapshot path, unchanged | No | None |
| Screen-on silent dead path (R4) | Out of scope (FU-001) | — | No | FU-001 |
| Desktop window re-sync cost (DEC-003) | Not an acceptance criterion; same code as the phone | Low | No | None |
| A real phone on a real network | The emulator and proxy emulate it | Low | No | None |

## Ambiguities Or Reroute Triggers

| Issue | Classification | Evidence | Recommended Owner |
| --- | --- | --- | --- |
| A visible missing event right after an agent reconnect | Would be `Design Impact` (design § Risks) | to be observed in MSP-20 | Solution Designer via failure-origin review |
| Agent catch-up read hanging on the emulator (scheduler stays `attempting`, FU-003/C-5) | Send back for failure-origin review if seen (code reviewer's request) | to be observed in API-09 | Code reviewer |
| A tap on an active Team fails while the phone's first history read mounts it (`became mounted while it was loading`) | Not this change (files untouched); follow-up FU-004 | MSP-22 first evidence run | Solution Designer (sends follow-ups) |

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `Yes` (added MSP-20…22; probe header and runner updated)
- Reroute Required Before Validation Execution: `No`
- Recommended Owner If Reroute Required: N/A
- Notes: no fresh-start build (no build input changed). Updated during execution: MSP-20 also covers the collaboration stream; MSP-22 taps a second time only after the FU-004 failure; API-09's harness was corrected before its evidence run (see the report's API-09 Notes).
