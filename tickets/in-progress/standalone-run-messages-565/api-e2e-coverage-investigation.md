# API/E2E Coverage Investigation — standalone-run-messages-565 (autobyteus-565)

## Investigation Meta

- Requirements Doc: `tickets/in-progress/standalone-run-messages-565/requirements-doc.md` (Approved, SR-002; DEC-002 correction SR-004)
- Investigation Notes: `investigation-notes.md`
- Solution Revision Record: `solution-revision-record.md`
- Design Spec: `design-spec.md` (SR-004)
- Supplemental Task Artifacts: None
- Design Review Report: `design-review-report.md` (ARCH-REV-002 Pass; the reviewer's uncommitted worktree edits, left untouched)
- Architecture Review Revision Record: `architecture-review-revision-record.md` (same)
- Implementation Handoff: `implementation-handoff.md` (IR-001)
- Implementation Revision Record: `implementation-revision-record.md`
- Code Review Report: `code-review-report.md` (CRR-001 Pass, no findings)
- Code Review Revision Record: `code-review-revision-record.md`
- Delivery Revision Record: N/A
- API/E2E Revision Record: `api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-001`
- Current Investigation Round: 1
- Trigger: code reviewer's CRR-001 Pass (code `56e39312b0`, `ffec4d785d`, `143edb93f8`)
- Prior Investigation Reviewed: None
- Latest Authoritative Investigation: this document

## Current Requirement And Design Basis

Every standalone agent run that collaborates (not application-owned) offers Messages: a desktop right-panel tab labelled "Messages" (default tab stays Activity) and the phone ⋮ menu (DEC-001, DEC-003). Its list holds every message its own agent sent or received (forms 1–6 of the design's entry-form table: own run, Task-related open and closed, unrelated local run, linked and unlinked remote run), newest first, 50 per page with "Load more" (cursor `{createdAt, messageId}`, `hasMore`), live without reload and never doubled (REQ-002 … REQ-005). One server rule (`MessageViewScope`) decides live and stored: an unrelated or remote message enters only an Agent root's view whose own agent is a party; Team/Org views keep their rows (form 7, REQ-006), now paged. Each unrelated or cross-node line records `counterpart {address, nodeId}`; cross-node `messages` and `run-messages` requests carry `sender.address` and their answers `receiverAddress` (read strictly). The stored read returns `{messages, counterparts, hasMore}` (`pastParticipants` folded into `counterparts` kind `past`); identities: `run` (local, address or null), `remote` (address, `nodeName` = this node's name for the peer: the chip), older unlinked cross-node lines by run ID without a chip (AC-006). Persisted data: `Directly Usable — No Migration`.

## Supported Scenarios And Real Usage

- Designer scenarios covered: UC-001 … UC-004; entry forms 1–7.
- Real-use scenarios added:
  - RU-1 (the founder's case): two Project Task Managers on two nodes message each other; each one's Messages shows both rows live and after a reload, named with the other node's chip.
  - RU-2: a PM's task agent reports to it while the PM's Messages is open; the PM pages back through more than 50 messages with "Load more" while a new message arrives.
  - RU-3: a Team member with more than 50 messages in its Team's Messages (paging of an unchanged Team list).
  - RU-4: a run of an earlier release left an unlinked cross-node line (no `counterpart`): it shows by run ID without a chip (synthesized in a test-owned, stopped run's log, as TESTING.md asks for released data shapes).
  - RU-5: an application-owned run has no Messages; a standalone run that never delegated has Messages (empty).
- Not tested (contrived): none recorded by the designer.

## Changed Behavior Summary

| Behavior / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| BEH-001 phone ⋮ Messages for standalone runs | Added | REQ-001, DEC-001 | Phone-bundle case (mobile-shell MSP-08 rewritten) |
| BEH-002 desktop "Messages" tab, default Activity | Added / Changed | REQ-001, DEC-003 | Browser journey (new probe) |
| BEH-003 stored read includes forms 4–6 for the own agent | Changed | REQ-002 | Two-server E2E (stored reads, identities) |
| BEH-004 live: forms 4–6 reach the own view | Changed (492 DEC-014 narrowed to Team/Org and non-own) | REQ-004 | Two-server E2E (view sockets, parties); RC-47 G-1 rewritten |
| BEH-005 `counterpart` on lines; `sender.address`, `receiverAddress` on the wire | Added | REQ-007, DEC-002 | Two-server E2E (both logs, RC-20 audit); all forged bodies updated |
| BEH-006 paging | Added | REQ-005, DEC-004 | E2E (>50 own, >50 Team member), browser (Load more, live during Load more) |
| REQ-006 Team/Org rows unchanged | Preserved | — | Existing suites (RC-06/07/22 Team/Org views), Team member paging case |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised By That Evidence | Candidate Broader Validation Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | Yes | scope, reader, identities, engine relation | unit suites (IMP-03/05/08) | built-server composition | built-server E2E |
| API / transport / contract | Yes | GraphQL page shape, `before`; event `parties`; peer wire fields | unit, in-process peer test | real HTTP between nodes | two-server E2E |
| Frontend component / state | Yes | store paging, panel, phone view | web unit (IMP-04/06), render check | real stack data, live socket | browser probes |
| Browser integration / user journey | Yes | desktop tab, phone ⋮ Messages | none on a real stack | live rows, Load more, chip with real data | new desktop probe; mobile-shell case |
| Authentication / session / permissions | No (same routes) | — | — | — | — |
| Desktop shell / Electron | No | — | — | — | — |
| Process / lifecycle | Yes (reload brings newest page) | — | unit | — | browser (reload) |
| Persisted-data transition | Yes (`counterpart` key) | new optional key | unit (`message-log.test`) | a released-shape line read by the new reader on a real server | E2E with a synthesized old-shape line |
| Distributed coordination | Yes | peer wire | in process | real HTTP | two-server E2E |

## Project Execution Discovery

- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/standalone-run-messages-565`, branch `codex/standalone-run-messages-565`.
- Testing guideline: `TESTING.md` (root). Applicable rows: backend + API (server tests + server E2E), renderer (web unit + a browser probe; the phone's behaviour as a `test:e2e:mobile-shell` case), contracts package (fresh-start build), both typechecks.
- Changed build inputs: `autobyteus-collaboration-stream-contracts/**` (src and dist), `autobyteus-web/generated/**`, `autobyteus-server-ts/typecheck-baseline.json` → the fresh-start build case applies (API-12).
- Secrets: N/A (scripted AGY).
- Machine note (handoff): `fs.watch` delivered no events during implementation; FSEvents-dependent suites are measured before any failure is diagnosed (TESTING.md § File watching).

## Existing Durable Coverage Inventory

| Path / Test | Current Assertion | Related | Decision | Action |
| --- | --- | --- | --- | --- |
| two-server `inboundMessage` (:855), RC-08 forged bodies (:1219), RC-48 QR-003 body (:1642), malformed (:1660) | bodies without `sender.address` | BEH-005 | Needs Update | add `sender.address`; the malformed body stays malformed only by its missing `messageId` |
| two-server RC-06 mate body (:1141) | expected request body | BEH-005 | Needs Update | expects `sender: {agentRunId, address}` |
| two-server `assertBothLogs` | exact seven keys per line | BEH-005 | Needs Update | cross-node lines also carry `counterpart {address, nodeId}` |
| two-server RC-20 audit | `run-messages` accepted answer `[accepted, nodeId]` | BEH-005 | Needs Update | `receiverAddress` on accepted `messages`/`run-messages` answers; `sender` keys `{agentRunId, address}` |
| two-server RC-47 G-1 (live, stored) | unrelated in no run view | BEH-003, BEH-004 | Needs Update | own Agent-root views and own stored reads now show forms 4; Team view and ancestor (`g1`) still not |
| two-server `teamTab` type | `pastParticipants` | DTO | Needs Update | `{messages, counterparts, hasMore}` |
| two-server RC-05 (solo's view open during a linked remote exchange) | no assertion on events | form 5 | Extend | live rows with parties, stored rows with the remote counterpart |
| `node-access-model.e2e.test.ts:182` | `messages` body without `sender.address` | BEH-005 | Needs Update | — |
| `open-task-tree-upgrade-startup.e2e.test.ts:203, :286` | `tab.pastParticipants` | DTO | Needs Update | `counterparts` with `kind: "past"` |
| `tests/e2e/helpers/built-studio-roots.ts:171` | read type | DTO | Needs Update | — |
| web `mobile-shell-probe.mjs` MSP-08 (:1454-1483) | a standalone agent's ⋮ has no Messages | BEH-001 | Replace | Messages present; it opens the list |
| web `delegated-copies-large-hub-probe.mjs` L-012 (:796-825), `hubMessageCount` (:221, :445) | hub's "Team" tab; rows = whole log | BEH-002, BEH-006 | Needs Update | "Messages" tab; first page = newest 50 |
| web `large-runs-load-less-cases.mjs:60, :396` | whole list | BEH-006 | Needs Update | page-aware |
| web `cross-scope-agent-mentions-live-probe.mjs:268` | whole list | BEH-006 | Needs Update | page-aware |
| Team/Org E2E (RC-06, RC-07, RC-22 views) | Team/Org view rows | REQ-006 | Still Valid | run |
| two-server RC-20 (accepted answers), RC-05 (solo's view), both log helpers — found by reading | old answer/line shapes, no events expected in solo's view | BEH-004, BEH-005 | Needs Update | done (see execution report) |
| web `delegated-copies-large-hub` seed (found by running) | reads `view.execution_tree.taskExecutions`, gone since 461 | — | Out Of Scope (stale before this ticket) | FU-003; L-012 updated but not run |
| web `cross-scope-agent-mentions` | whole host list | BEH-006 | Needs Update | updated; not run (needs a signed-in Claude/Codex runtime) |
| `agent-initiated-collaborators.e2e.test.ts` | reads participant lists (short) | — | Still Valid (not edited) | not run (gated on real runtimes) |

## Planned Cases

| Case ID | Criteria | Boundary | Kind | Planned Command Or Steps | Why |
| --- | --- | --- | --- | --- | --- |
| API-01 | all (unit) | server, web, contracts unit | Reused | IMP-03, IMP-04, IMP-05, IMP-06, IMP-07, IMP-08, IMP-10 | code unchanged since; failures there explained |
| API-02 | — | both typechecks after my test edits | Existing Test | `pnpm -C autobyteus-server-ts typecheck`, `pnpm -C autobyteus-web typecheck` | E2E files are type-checked |
| API-04 | REQ-006, shared read | whole server integration suite | Existing Test | `pnpm -C autobyteus-server-ts test:integration` | IMP ran one file only |
| API-05 | all | whole ungated server E2E | Existing Test | `pnpm test:e2e` (clean env) | wire and read shapes changed |
| API-06 | AC-002, AC-003, AC-004, AC-005, AC-006, REQ-007, RU-1 … RU-4 | two built servers, scripted AGY | Durable | gated `remote-delegation-two-server.e2e.test.ts` (updated + new cases) | UNK-001 |
| API-07 | AC-001, AC-002, AC-003, AC-004 (desktop) | browser + probe-owned two-node stack | Durable (new probe) | `pnpm -C autobyteus-web test:e2e:standalone-messages` | rendered tab, chip, live, Load more, reload |
| API-08 | AC-001 (phone), AC-002 | phone bundle | Durable (updated) | `pnpm -C autobyteus-web test:e2e:mobile-shell` (MSP-08) | TESTING.md phone rule |
| API-09 | BEH-006 in seeded probes | web probes | Durable (updated) | the three seeded probes' changed cases, as far as their seeds can run here | stale page/tab assumptions |
| API-11 | REQ-006, the changed helper | gated suites reading the Manager's list (`open-task-tree-upgrade-startup`, `closed-run-attachments`) | Existing Test (updated) | `RUN_AGY_FAILURE_E2E=1 … vitest run <the two files>` | skipped by `pnpm test:e2e`; I changed their assertion and helper |
| API-10 | — | tracked imports | Existing Test | checker | new files |
| API-12 | build | fresh clone, desktop job | Existing Test | frozen install, web typecheck, `prepare-server` (+ contracts build) | contracts and generated types changed |

- Test progress log: `Yes`.

## Durable Coverage To Add / Update / Remove

- Add: new two-server cases (forms 5/6 stored and live with identities, counterpart on both lines, paging over 50 with a live message, Team member over 50, an old-shape unlinked line, application-owned run without a view, a task agent's own Messages); new browser probe `autobyteus-web/tests/e2e/standalone-messages-probe.mjs` with its `package.json` script.
- Update: the paths in the inventory.
- Remove: the "no Messages for a standalone agent" assertion (MSP-08): replaced by the presence and content check (DEC-001).

## Not Tested / Deferred (planned)

| Behavior | Reason | Risk | User-only? | Follow-up |
| --- | --- | --- | --- | --- |
| The founder's real PM (2,506 messages, `ryan-ai-linux`) | TESTING.md: never the user's data or nodes | Low (the 2,500-message page was measured in IMP-10) | Yes (the look on his own data) | delivery asks him to look |

## Ambiguities Or Reroute Triggers

None at planning time.

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Durable Coverage Will Be Added / Updated / Removed: `Yes`
- Reroute Required: `No`
