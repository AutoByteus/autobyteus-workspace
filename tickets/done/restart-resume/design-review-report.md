# Design Review Report — restart-resume (autobyteus-285)

## Review Round Meta

- Upstream Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/restart-resume/tickets/in-progress/restart-resume/requirements-doc.md` (Approved by the user, SR-002)
- Upstream Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/restart-resume/tickets/in-progress/restart-resume/investigation-notes.md` (G-01–G-07; 283's F-01–F-25 by reference)
- Upstream Solution Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/restart-resume/tickets/in-progress/restart-resume/solution-revision-record.md` (SR-001–SR-005)
- Reviewed Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/restart-resume/tickets/in-progress/restart-resume/design-spec.md` (SR-005; user approval of the design: `Not required`, with a reason)
- Supplemental Task Artifacts Reviewed: `code-review-report.md` round 2 (CRR-002: F-API-001, O-1); the API-REV-001 evidence as cited there; `follow-ups.md` (FU-001–FU-004; FU-004 absorbed); `architecture-design-handoff.md`.
- Relevant Solution Revision IDs: SR-002 (approval; REQ-003 clarified in SR-005), SR-003, SR-004 and SR-005 (design)
- Architecture Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/restart-resume/tickets/in-progress/restart-resume/architecture-review-revision-record.md`
- Current Architecture Review Revision ID: `ARCH-REV-003`
- Current Review Round: 3
- Trigger: SR-005, the design revision for CRR-002 (the code reviewer's failure-origin review of API-REV-001: F-API-001 race; O-1 member notice), from `/software_engineering_team/solution_designer`.
- Prior Review Round Reviewed: ARCH-REV-002 (SR-004, Pass)
- Latest Authoritative Round: 3
- Current-State Evidence Basis (round 3): worktree @ `6488aa0687`. The implementation (IR-001, `ab4ba6e7dc`…`b50e2354ab`) and API-REV-001 are on the branch; SR-005's commits are docs. Opened in round 3:
  - `agent-run-input-admission-state.ts:81-121`: `reserve` is synchronous and draws `nextSequence`, called inside the run's dispatch queue (`agent-run.ts:249`).
  - `agent-run-input-preface-dispatch.ts:1-40`: prefaces are combined inside `AgentRun` at dispatch, so at the member handle only notice-only platform inputs carry `platformInputPrefaceMetadata`. Its builders: the skill-update, tool-list and Model Router notices, and `restart-notice.ts`.
  - Archive refusals: `agent-run-history-catalog-service.ts:364-377` (`releaseForHistory`: refuses an active host; for a registered root with no live host it ends the root, `standalone-run-liveness.ts:48-58`); `team-run-history-catalog-service.ts:220`; `agent-org-run-history-catalog-service.ts:110` (both refuse an active or managed root).
  - `code-review-report.md` CRR-002.
- Round-2 basis: worktree @ `977ad33ac6`. SR-004 is docs only (the design spec, follow-ups, the solution revision record and `docs/design-cases.md`), so the round-1 code basis below still applies. Also read in round 2: `team-root-materializer.ts` and `agent-team-run-manager.ts` `restoreTeamRun`. A restore materializes the root and activates no member, so the per-post live check is not fooled by the resume's own restore. Round-1 basis (`502d3f0df9`, docs only on `origin/personal` @ `efd28d5c4a`), code opened at the cited lines:
  - Roots:
    - `active-collaboration-root-directory.ts:47-120`: `reserve`/`resolve`/`unregister`; `hasAgentExecution` on each boundary; no list accessor.
    - Registrations:
      - `agent-team-run-manager.ts:422-438`;
      - `agent-org-run-manager.ts:432`;
      - `standalone-agent-run-root-manager.ts:146-165, 190-197, 416`: `resolveRoot` loads and registers an eligible root; `resolveRootAndEnsureHost` is used by `AgentRunService.activate`, `agent-run-service.ts:318-322`.
    - `hasAgentExecution`:
      - `standalone-agent-run-root.ts:286-289`;
      - `root-team-run.ts:263-265`;
      - `agent-org-run.ts:228-230`.
  - **Wake paths:**
    - `standalone-agent-run-root.ts:368-375`: `executeAgentCommand` is documented "Commands for children only; the host's commands come through its own Agent stream".
    - `standalone-root-message-delivery.ts:254-259`: a host gets `AGENT_ROOT_HOST_COMMAND_REJECTED`.
    - `standalone-agent-run-root.ts:315-320` (`postHostUserMessage`); `standalone-agent-run-root-manager.ts:182-187` (`postUserMessage`); `standalone-run-ports.ts:35-43` (`StandaloneRunPostInput`).
    - `root-team-run.ts:367-373` and `agent-org-run.ts:394-400` (`executeAgentCommand`).
    - `team-member-execution-command.ts:3-16`: `post_message` carries an `AgentInputUserMessage`.
  - Input metadata:
    - `agent-run-input-admission-state.ts:353-357`: the pending snapshot reads `message_id` and `dedupe_key`.
    - `run-history/projection/run-projection-dedupe.ts:93`: `dedupe_key` is a projection key.
    - `agent-run-command-coordinator.ts:242-326` (the user command path validates both).
    - `model-routing/services/model-router.ts:192-215` (the system-input precedent posts to its own `AgentRun`).
  - Restore: `remote-collaboration-composition.ts:35-55` (`RemoteRootDirectory` with `standalone`, `team` and `org` resolvers); `team-run-service.ts:219-222` (`resolveManagedTeamRun` catches to `null`).
  - Application scopes: `application-execution-scope-kernel-builder.ts:136-180` creates their own `AgentRunManager` and `AgentTeamRunManager`, the latter with the default (process) root directory.
  - Build:
    - `autobyteus-server-ts/package.json:11-12`: `build` → `build:full`, which starts with `clean-build-output`.
    - `autobyteus-web/scripts/prepare-server.mjs:178`.
    - `docker/Dockerfile.monorepo:27, 44, 53-61`: the web `package.json` is present; the server builds; then `pnpm deploy`, then `describe-server-package.mjs` writes `server-package.json` with `--version` from the web package.
  - Docker update: `docker/starter/update-run.mjs:123-175` (trial, rollback, `dataCopy.restore`); `data-copy.mjs:1-57`.

## Routing Classification Review

- Task size: `Large`. Architectural risk: `High`.
- Classification rationale reviewed. Agreed:
  - a new capability area;
  - shutdown and startup sequencing;
  - cross-root delivery for every root kind;
  - new persisted data;
  - unattended paid turns.
- Independent Architecture Review required: `Yes`.
- User approval of the design: `Not required`. The reason is credible: the user's decisions DEC-001, plus 2026-10-30, fix the behavior, and the design adds no product behavior beyond them. Not `Pending`.

## Upstream Behavior And Production-Path Basis Confirmation

- Overall Basis Status: `Confirmed`.
  - SR-004 corrected round 1's false and unsupported code claims (AR-001, AR-002).
  - SR-005 corrects SR-004's premise "live means received new input", which is false while an activation is running (CRR-002). It also moves the guard to the run's admission, the owner.
  - REQ-003's clarification ("the restored run accepted any input before the notice") narrows its wording to what the guard decides. It adds no behavior, so it is within the direction.
- Approved intent:
  - REQ-001: record busy runs before any interrupt.
  - REQ-002: after an **update** restart only (DEC-001 = A), resume eligible runs through their root.
  - REQ-003: skip a run that was stopped on purpose, archived, deleted, Task-closed, already messaged or already live.
  - REQ-004: exactly one system notice per run; a root host is told which copies resumed.
  - REQ-005: handled once; at most 3 at a time.
  - REQ-006: robust.
- Scope guardrail: confirmed.
  - Out of scope: 286, 287, hard kill, cross-node orchestration, the observation reconnect, Application platform runs, re-running tools.
  - Preserved: the fences, idle runs, the restore paths, DESIGN rule 7.
- Every prospective blocking `Design Impact` finding is traceable to an approved ID: `Yes`. None remain open.
- Statements about existing code the design relies on:
  - Round 1 found two problems, both corrected in SR-004's Current-State and D3/D4:
    - **False:** that `executeAgentCommand` wakes a standalone host. It rejects the host (AR-001).
    - **Unsupported:** that the dedupe key prevents a double send. `dedupe_key` is a display and projection key; the guard is the live check (AR-002).
  - One leftover line in Risks still says "the live check and the dedupe key" (N-6).
  - Correct:
    - registrations and `hasAgentExecution` for the three root kinds;
    - eligible standalone runs are always rooted;
    - the restore APIs;
    - 284's cleanup point;
    - `build` → `build:full`;
    - the Docker build has the web `package.json`.

| Behavior ID | Kind | Design Alignment | Trigger / Evidence | Target Path / Spine | Status | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | Operational | Pass | Pass (284; `server-runtime.ts:205`) | Pass: the recorder only writes and merges; version is per entry | Confirmed | — |
| BEH-002 | System | Pass | Pass | Pass: dispatch by place (the host through `postUserMessage`); D5 resolver | Confirmed | — |
| BEH-003 | System | Pass | Pass (283 F-03, F-09) | Pass: re-checked immediately before each post | Confirmed | — |
| BEH-004 | User | Pass | Pass | Pass: two waves per root; the list holds accepted delegated runs only; display named per place | Confirmed | — |

## Supplemental Artifact Coherence Verdict

None. `follow-ups.md` (FU-001 hard kill, FU-002 a missing or signed-out CLI, FU-003 the Docker data-copy rollback) is consistent.

## Task Design Health Assessment Verdict

| Assessment Area | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Assessment is present for the current task posture | Pass | `Feature` | — |
| Root-cause classification is explicit and evidence-backed | Pass | `No Design Issue Found`: the owners exist, with the host wake path now named correctly | — |
| Refactor decision is explicit | Pass | `Yes, small`: the shared root resolver (D5) | — |
| Supported by concrete sections | Pass | — | — |

## Spine Inventory Verdict

| Spine | Readable | Narrative | Facade vs Owner | Naming | One Owner Per Node, In Order | Off-Spine Kept Off | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| DS-001 record at shutdown | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-002 resume after an update | Pass | Pass | Pass | Pass | Pass: per-entry update test, waves, per-post check, dispatch by place | Pass | Pass |

Round-1 analysis, kept for the record. It is resolved by SR-004 D3 steps 4–6. DS-002 as SR-003 designed it:

1. `RestartResumer`: read → delete → update test → eligibility for **all** entries.
2. Then a queue of 3. For each entry:
   - `resolveOrRestoreRoot(entry.root)`;
   - `root.executeAgentCommand(entry.agentRunId, post_message)`. The outcome by kind:
     - standalone host: `executeChildCommand` → `{ accepted: false, code: "AGENT_ROOT_HOST_COMMAND_REJECTED" }`, so the run is **not** resumed (logged as a failure);
     - standalone child, Team member or Org member: accepted (it wakes a shut-down child).

## Boundary Encapsulation Verdict

| Boundary / Owner | Public Entry Clear | Internals Stay Internal | Bypass Controlled | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `src/restart-resume/` (record, recorder, resumer, notice, identity) | Pass | Pass | Pass | Pass | One writer and one reader of the record |
| Roots as the only wake path | Pass | Pass | Pass | Pass | The host goes through `StandaloneAgentRunRootManager.postUserMessage`; members and delegated runs through `executeAgentCommand` |
| `ActiveCollaborationRootDirectory.placeOf` with `isDelegatedRun?` | Pass | Pass | Pass | Pass | Read-only. Return the single match; log when more than one boundary claims a run |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed Clear | Forbidden Explicit | Direction Coherent | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `server-runtime` → recorder/resumer → process `AgentRunManager`, root directory, `CollaborationRootResolver` (built in `build-studio-server.ts`), history catalogs | Pass | Pass | Pass | Pass | — |

## Interface Boundary Verdict

| Interface | Subject | Singular | Identity | Generic Risk | Verdict |
| --- | --- | --- | --- | --- | --- |
| `readReleaseIdentity()` | Pass | Pass | Pass | Low | Pass |
| `BusyRunRecorder.record()` | Pass | Pass | Pass | Low | Pass |
| `RestartResumer.resumeAfterUpdate()` | Pass | Pass | Pass | Low | Pass (see N-7 on the cap) |
| `placeOf(agentRunId)` → `{ root, place }` | Pass | Pass | Pass | Low | Pass |
| `CollaborationRootResolver.resolveOrRestore(root)` → tagged `ResolvedRoot \| null` | Pass | Pass | Pass (null = not here; throw = restore failure) | Low | Pass (N-8) |
| `buildRestartNotice(input)` | Pass | Pass | Pass (`sender_id`, preface, `message_id`, `dedupe_key`; display per place) | Low | Pass |

## Existing Capability / Subsystem Reuse Verdict

| Need | Checked | Decision Sound | New Piece Justified | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Restore by kind | Pass | Pass (share the remote resolver) | Pass | Pass, with AR-004 | — |
| Wake by input | Pass | Pass (by place) | N/A | Pass | — |
| Version | Pass | Pass (one stamp in `dist` for every build; the Docker-only description is explained, N-1) | Pass | Pass | — |
| Atomic transient file | Pass | Pass (`atomicWriteJsonFile`) | N/A | Pass | — |

## Subsystem / Capability-Area Allocation Verdict

| Area | Allocation Clear | Decision Sound | Supports Spine Owners | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `src/restart-resume/` | Pass | Pass (create new; a coherent capability) | Pass | Pass | — |
| `scripts/write-release-identity.mjs` | Pass | Pass | Pass | Pass | — |

## Reusable Owned Structures Verdict

| Structure | Extraction Evaluated | Shared File Sound | Ownership Clear | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| By-kind root resolution | Pass | Pass (`src/compositions/collaboration-root-resolver.ts`) | Pass | Pass | — |

## Shared Structure / Data Model Tightness Verdict

| Structure | One Meaning Per Field | Redundant Removed | Overlap Controlled | Core vs Variant | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `busy-runs.json` `{ recordedAt, version, entries[{ root, agentRunId, status }] }` | Pass | Pass | Pass | N/A | Pass | `status` is informational. Validate the root identity with the existing `root-execution-identity` parser |

- Derived consumers of a changed structure (Principle 11): `Pass`. The memory accumulator's sender set and the remote composition are listed.
- Each domain word keeps one meaning (Principle 15): `Pass`. "Update restart" means a different release-identity version.

## File Responsibility Mapping Verdict

| File | Singular | Matches Owner | Re-Tightened | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `release-identity.ts`, `busy-run-record.ts`, `busy-run-recorder.ts`, `restart-resumer.ts`, `restart-notice.ts`, the stamp script | Pass | Pass | N/A | Pass | — |
| `server-runtime.ts`, `active-collaboration-root-directory.ts`, sender ids, memory accumulator | Pass | Pass | N/A | Pass | — |
| `remote-collaboration-composition.ts`, `collaboration-root-resolver.ts`, `build-studio-server.ts`; the three roots (`isDelegatedRun`); the member presentation if needed | Pass | Pass | Pass | Pass | — |

## Subsystem / Folder / File Placement Verdict

Pass for `src/restart-resume/` and `src/compositions/collaboration-root-resolver.ts`.

## Removal / Decommission Completeness Verdict

| Item | Named | Replacement Clear | Scope Explicit | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| The inline `standalone`, `team` and `org` resolvers in `RemoteRootDirectory` | Pass | Pass (delegate to D5) | Pass | Pass | — |

## Legacy / Backward-Compatibility Verdict

| Area | Wrapper / Dual Path | Clean Cut Explicit | Verdict | Notes |
| --- | --- | --- | --- | --- |
| A launcher-set version variable | No | Pass (rejected) | Pass | — |

## Persisted-Data Transition Verdict (When Applicable)

| Area | Decision | Evidence | Proportionate | Migration Safety | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `<appDataDir>/restart-resume/busy-runs.json` (new, transient) | New data; absence means nothing | Pass | Pass | N/A | Pass | The recorder writes and merges; the resumer is the only deleter; version is per entry |
| Docker data copy on rollback | Accepted residual (FU-003) | Pass | Pass | N/A | Pass | — |

## Change / Refactor Safety Verdict

| Area | Realistic | Seams Explicit | Cleanup Explicit | Verdict |
| --- | --- | --- | --- | --- |
| Steps 1–6 | Pass | Pass | Pass | Pass |
| Step 7 validation (two builds differing only in the stamp; Docker test container; N-2; the AR-001 to AR-005 cases; AC-003 to AC-005) | Pass | Pass | Pass | Pass |

## Example Adequacy Verdict

| Topic | Needed | Present | Avoided Shape | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Once | Yes | Pass | Pass | Pass | — |
| Update test | Yes | Pass | Pass | Pass | — |
| Wake | Yes | Pass | Pass | Pass | By place |
| Eligibility | Yes | Pass | Pass | Pass | Immediately before each post |

## Material Premise Validation (Only When Needed)

### `P-001`: a user's input reaches a recorded run while its resume is still queued (AR-002)

- Related requirement: REQ-003 ("already received new input or is already live"); escalation trigger "resumed while also messaged".
- Initiating basis kind: `User`. After an update the user opens the app and messages a run, or Stops or archives it.
- Forward path:
  1. The resumer checks every entry's eligibility first, then resumes 3 at a time.
  2. Each resume restores a root, which takes seconds for a Team, an Org or a Claude session. So with more than 3 busy runs, later entries wait seconds to tens of seconds.
  3. In that window the user messages run X, which becomes live and starts a turn, or Stops or archives X.
  4. X's slot comes, and the notice is posted anyway: a second, paid turn telling the agent its turn was interrupted. A Stopped or archived X is resumed despite `terminatedAt`.
- Reachability: `Reachable`, with ≥ 4 busy runs (or slow restores) and a user active right after an update.
- Review consequence: duplicate work, or a stopped-on-purpose run resumed. Both are the design's own escalation triggers. Resolved in SR-004 (D3.5, re-checked immediately before each post).

### `P-002`: a shutdown runs before the resumer has consumed an update record (AR-005)

- Related requirement: REQ-002, AC-002.
- Initiating basis kind: `User` / `System`.
  - The user quits within seconds after an update relaunch, before `listen` and `recoverAfterListen` finish.
  - Or the new version's startup fails after the cleanup was transferred: `server-runtime.ts` calls `shutdown.cleanupOnce()` on a startup failure.
- Forward path: the cleanup → `BusyRunRecorder.record()` → no busy runs → "removes any old file" → the old version's record is gone. The next start of the new version finds nothing, so the busy runs are never resumed.
- Reachability: `Reachable` (rare). Resolved in SR-004 (the recorder never deletes; version is per entry).

### `P-003`: a failed Docker in-place update rolls back (AR-006)

- Related requirement: REQ-002; the design's residual.
- Initiating basis kind: `Operational`. `FAILED_AFTER_SWITCH` (`update-run.mjs:146-175`).
- Forward path:
  - With `needsCopy` (the new version brings migrations): `dataCopy.restore()` copies the pre-trial data folder back. That includes the old version's record, if the trial had not yet deleted it, or no record at all. The old version starts with record.version === current, so nothing is resumed. Turns the trial resumed before it failed have done real work, whose history is now reverted.
  - Without a copy: the trial's own shutdown records its busy (resumed) runs with the new version, so the old version resumes them again. This is what the design says.
- Reachability: `Reachable` on a failed update only.
- Consequence: the design's residual statement was right only for the no-copy case. Corrected in SR-004 and recorded as FU-003.

## Unresolved Approved-Behavior Or Current-State Gaps

None in the requirements basis.

## Round 3 Delta: SR-005 (CRR-002)

| Item | Verdict | Evidence / Notes |
| --- | --- | --- |
| F-API-001: the guard at the owner | Pass | D3.6 runs restore without posting, then re-check `terminatedAt` and archived, then post with `onlyAsFirstInput`. The rule is decided in `AgentRunInputAdmissionState.reserve`, which is synchronous inside the run's dispatch queue, so "this instance has reserved or admitted any input" has no window. A message from the user, a coordinating run or a peer that is admitted first refuses the notice (`AGENT_RUN_INPUT_NOT_FIRST`). A notice admitted first queues later input after it, which REQ-003 as clarified allows |
| Archive after the restore | Pass, with N-11 | Host: the activated host makes `releaseForHistory` refuse. Team and Org: an active or managed root is refused (catalogs `:220`, `:110`). **Delegated runs in a standalone root** whose host is not live (wave 1): archiving the host does not refuse; it **ends the root** (`releaseForHistory` → `endRoot`). The protection is then the root's stop: a later post is refused by `assertAdmitting`, and an already admitted delegated turn is fenced and interrupted. So "this check is final, because archiving refuses" is not exact for that case (N-11) |
| `post_message.postOptions` through the three deliveries and the member handle | Pass, with N-13 | One optional field on the shared command type. Remote children (`executeRemoteChildCommand`) cannot carry it (N-13) |
| O-1: member notice persisted | Pass, with N-14 | One `restartNoticeLifecycleObserver(run, text)` publishes the run's own `SYSTEM_TASK_NOTIFICATION`, with a recorded sender, for every place. The handle skips its `member_input` presentation for a platform notice. At handle time only notice-only platform inputs carry the preface metadata, because prefaces are combined later in `AgentRun` |
| D3.4 wave text | Pass | Wave 1 delegated; wave 2 host and members, with the accepted list (matches CR-C1) |
| Cost and boundaries | Pass | One admission option, one optional command field, one shared observer helper. No new subsystem. The pre-filter in step 5 is kept only as a cheap skip, explicitly not the guard |

## Review Decision

`Pass`. The behavior basis is confirmed. SR-005 resolves CRR-002's Design Impact (F-API-001, O-1) at the right owners, and no in-scope machinery depends on an unsupported premise.

## Findings

None open. AR-001 to AR-006 were resolved in ARCH-REV-002. CRR-002's F-API-001 and O-1 are resolved in SR-005 (details in `architecture-review-revision-record.md`, ARCH-REV-003).

## Classification

N/A (Pass).

## Recommended Recipient

`/software_engineering_team/implementation_engineer` (primary). Informational notification to `/software_engineering_team/solution_designer`.

## Residual Risks

- **N-3:** the recorder uses the process `AgentRunManager`, so DEC-005 holds. This is now in D2.
- **N-4:** with no update, the entries are dropped at the next start (DEC-001 = A).
- **N-5:** FU-001, FU-002 and FU-003 are carried.
- **N-6 (cosmetic):** SR-003 wording is left in four places:
  - Risks says "Duplicate work: the live check and the dedupe key", but D4 itself says the dedupe key is not a guard;
  - the Update-test example still reads `record.version`, where the version is now per entry;
  - Task Size says "a small list accessor"; it is now `placeOf`, `isDelegatedRun` on three roots, and D5;
  - Change Scope's follow-ups omit FU-003.
  - None of this changes the design. The Solution Designer may tidy it.
- **N-7 (implementation):** "at most 3 resumes at a time" with two waves. The limiter counts **posts**. A host's post is scheduled only after its wave-1 posts have settled, and **no slot is held while waiting**. Otherwise three hosts each holding a slot while their delegated runs wait for one would deadlock the resumer. Add a test: three standalone roots, each with delegated runs, under the cap of 3.
- **N-8:** D5 maps not-found errors to `null` and throws on other failures. If it is built on `teamRuns.resolveManagedTeamRun`, which already catches every error to `null`, a Team restore failure would read as "not here". Either way the resumer logs it and leaves the run stopped (REQ-006). The remote receiver's tests must stay green (step 2).
- **N-9:** a delegated run's resumed turn can message its host before wave 2 posts to the host. The host is then live, so it is skipped (REQ-003) and never gets the notice or the list. This is acceptable per REQ-003, since the host already continues with new input. Worth one line in the module doc.
- **N-11 (wording; safe as designed):** for a delegated run in a standalone root whose host is not live, archiving the host **ends the root** instead of refusing (`standalone-run-liveness.ts:48-58`). The protection is the root's stop: a later post is refused, and an admitted turn is fenced and interrupted. The residual is the milliseconds between the re-check's history read and the post: at most a turn that is cut at once. Correct D3.6.2's "final, because archiving refuses" for this case.
- **N-12 (validation):** confirm that a restored run instance, host or member (including a woken shut-down delegated child through the root's delivery), reserves **no** input before the notice. A replayed task packet or a framing message would make every notice `AGENT_RUN_INPUT_NOT_FIRST`, and nothing would resume. The SR-005 repeat of API-05T shows it.
- **N-13:** `executeRemoteChildCommand` must not silently drop `postOptions.onlyAsFirstInput`: refuse it, or document that a remote child is never a resume target (busy runs are local).
- **N-14:** add a test that a normal member input that later receives a skill-update or tool-list preface inside `AgentRun` still shows as `member_input`. The handle's skip must apply only to notice-only platform inputs.
- **N-10 (validation):**
  - Confirm that an Org restore, like the Team restore (`team-root-materializer.ts`), activates no member, so the per-post live check is not fooled by the resume's own restore.
  - Confirm that the member presentation shows a SYSTEM-sender `member_input` as a system notice (D4).
- **Review focus answered:**
  1. **The update test from a build stamp is correct** for:
     - the desktop install: `build` → `build:full`, which cleans `dist`, so the stamp is fresh;
     - the Docker in-place update (N-2);
     - an image upgrade (whichever server package runs is compared);
     - dev builds: `pnpm dev` from `src` has no stamp, so never an update; a local `build` stamps the workspace version, so the same version never counts as an update.
     - Rollback: FU-003.
  2. **Recording before `app.close()`** is inside `cleanupOnce`, which 284's 10 s bound races, and before every `preClose` hook. So it runs before the native drain and the fences. That is correct (AR-005 is fixed in SR-004).
  3. **`rootOf` through `hasAgentExecution`** covers:
     - standalone roots: host and collaboration children, Team copies included;
     - Team roots;
     - Org roots, whose index includes nested members.
     - Live eligible standalone runs are always rooted (`resolveRootAndEnsureHost`).
  4. **`post_message` through roots** is right for children and members, and the fences, including Task-closed copies, apply. Standalone hosts go through the manager's `postUserMessage` (SR-004).
  5. **Once:** delete before resume is right, and the cap of 3 is right. The live check's timing and the dedupe claim are fixed in SR-004.
  6. **The shared resolver:** D5.

## Latest Authoritative Result

- Review Decision: `Pass`
- Material-Premise Gate: `Pass`. P-001 (the queued-input and archive race) was under-resolved in ARCH-REV-002, as CRR-002 proved; it is resolved at the owner in SR-005. P-002 is resolved; P-003 is accepted (FU-003).
- Classification: task_size `Large`, architectural_risk `High` (agreed).
- Notes: implement SR-005 (D3.6, D4 "How it shows", sequence step 5) on top of IR-001, with N-7's limiter rule and the N-11 to N-14 notes.
