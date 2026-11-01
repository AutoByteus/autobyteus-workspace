# Architecture Review Revision Record — restart-resume (autobyteus-285)

The latest `design-review-report.md` remains authoritative.

## Revision Index

| Revision ID | Review Round / Trigger | Related Solution Revision IDs | Prior Decision | Current Decision | Affected Finding IDs |
| --- | --- | --- | --- | --- | --- |
| ARCH-REV-001 | Round 1 / initial review of SR-003 | SR-002, SR-003 | N/A | Fail (Design Impact) | AR-001 to AR-006 |
| ARCH-REV-002 | Round 2 / review of SR-004 | SR-002, SR-004 | Fail (Design Impact) | Pass | AR-001 to AR-006 resolved |
| ARCH-REV-003 | Round 3 / review of SR-005 (CRR-002) | SR-002, SR-005 | Pass | Pass | CRR-002 F-API-001, O-1 resolved; reviewer miss recorded |

## Revision Entries

### ARCH-REV-001 — Initial baseline: the right shape; the host wake path, per-slot eligibility, the copies-first order and the record's deleter must be fixed

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/restart-resume/tickets/in-progress/restart-resume/design-review-report.md`
- Review round and trigger: Round 1. `/software_engineering_team/solution_designer` sent SR-003 as `Architecture Design Complete` (Large/High). User approval of the design: `Not required`, with a reason.
- Triggering role, report path, and finding IDs: Solution Designer; `architecture-design-handoff.md`; N/A.
- Relevant solution revision IDs: SR-002 (approval), SR-003 (design).
- Prior authoritative decision: N/A.
- Current authoritative decision: Fail (Design Impact).
- Baseline established (code at `502d3f0df9` / `efd28d5c4a`):
  - The three root kinds register in `ActiveCollaborationRootDirectory` with `hasAgentExecution`. Live eligible standalone runs are always rooted.
  - A standalone root's `executeAgentCommand` rejects its host (`AGENT_ROOT_HOST_COMMAND_REJECTED`). The host's entry is `postHostUserMessage`.
  - `dedupe_key` is a projection and display key, not a delivery guard.
  - The remote composition's resolvers differ in failure semantics.
  - `build` → `build:full` cleans `dist`. The Docker build has the web `package.json` and already writes `server-package.json.version`.
  - A Docker rollback with a data copy restores the pre-trial data folder.

#### Prior Finding Resolution

None (first round).

- New or remaining finding IDs:
  - **AR-001** (High, blocking): wake a standalone host through `postHostUserMessage` (or the manager's `postUserMessage`). Children, Team members and Org members go through `executeAgentCommand`. Name the notice metadata (`message_id`, `dedupe_key`, sender, how the window shows it). Add a test with a busy host and no children.
  - **AR-002** (Medium, blocking): re-check eligibility immediately before each post, when its slot starts. Define "already received new input". Drop the dedupe-key claim. Add tests for a run messaged, Stopped or archived while queued.
  - **AR-003** (Medium, blocking): per root, resume the copies or members first, then tell the host only the accepted ones. Name the Team/Org recipient of the list.
  - **AR-004** (Low): the shared `resolveOrRestoreRoot`: its file, signature, inputs and one failure contract; `RemoteRootDirectory` delegates to it.
  - **AR-005** (Medium, blocking): the recorder never removes a record; the resumer is the only deleter.
  - **AR-006** (Low): correct the Docker rollback residual for the data-copy case.
- Non-blocking notes:
  - N-1: the existing `server-package.json.version`;
  - N-2: check the stamp in the deployed Docker package;
  - N-3: the process `AgentRunManager` only;
  - N-4: the record dropped when there is no update;
  - N-5: FU-001 and FU-002.
- Material classification changes: none (Large/High).
- Recommended recipient: `/software_engineering_team/solution_designer`.
- Remaining risks or uncertainty: the window's presentation of a system-sent wake message is not yet named (part of AR-001).

### ARCH-REV-002 — SR-004: host wake by place, per-post eligibility, waves, record ownership and the shared resolver; Pass

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/restart-resume/tickets/in-progress/restart-resume/design-review-report.md`
- Review round and trigger: Round 2. `/software_engineering_team/solution_designer` sent SR-004, the design revision for ARCH-REV-001.
- Triggering role, report path, and finding IDs: Solution Designer; `design-spec.md` (SR-004); AR-001 to AR-006.
- Relevant solution revision IDs: SR-002 (approval, unchanged), SR-004 (design).
- Prior authoritative decision: Fail (Design Impact).
- Current authoritative decision: Pass.
- What changed:
  - SR-004 is docs only (head `977ad33ac6`).
  - DS-002 was redrawn from D3 steps 1–6.
  - Also verified: a Team restore (`team-root-materializer.ts`) activates no member, so the live check immediately before each post is not fooled by the resume's own restore.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| AR-001 | Open (High, blocking) | Resolved | SR-004 | D3.6 dispatches by place: the host through `standaloneRootManager.postUserMessage({ runId, message, postOptions: { lifecycleObserver } })`; members and delegated runs through `resolveOrRestore` then `executeAgentCommand`. D4 names the metadata (`sender_id system.restart_resume`, recorded; the preface; `message_id`; `dedupe_key` in the web's scheme) and the display per place. The Current-State claim and the Wake example are corrected. The host-only test is listed |
| AR-002 | Open (Medium, blocking) | Resolved | SR-004 | D3.5 re-checks immediately before each post. "Already received new input" means live, with the reasoning. The dedupe claim is withdrawn in D4. The tests for runs messaged, Stopped or archived while queued are listed. (A leftover Risks line is N-6) |
| AR-003 | Open (Medium, blocking) | Resolved | SR-004 | D3.4 runs two waves per root (delegated and members, then the host). `placeOf` uses `isDelegatedRun` on the three roots. D4 lists only accepted delegated runs: the standalone host receives the list; in a Team or Org every resumed member does, with the reason. The one-refused test is listed |
| AR-004 | Open (Low) | Resolved | SR-004 | D5: `src/compositions/collaboration-root-resolver.ts`, `createCollaborationRootResolver({ standaloneRoots, teamRuns, orgRuns })`, built in `build-studio-server.ts`; a tagged `ResolvedRoot`; null = not here, throw = restore failure; `RemoteRootDirectory` delegates to it. (N-8 note) |
| AR-005 | Open (Medium, blocking) | Resolved | SR-004 | D2 step 4: the recorder writes only with entries and merges; it never deletes. D3.1: the resumer is the only deleter. Version is per entry. The quit-before-resumer test is listed |
| AR-006 | Open (Low) | Resolved | SR-004; FU-003 | The Health Assessment residual is corrected for the data-copy rollback and recorded as FU-003 |

- New or remaining finding IDs: none.
- Non-blocking notes:
  - N-6 (cosmetic SR-003 leftovers);
  - **N-7 (the limiter counts posts; a host waits without holding a slot; a deadlock test)**;
  - N-8 (the resolver built on a catch-all team resolve);
  - N-9 (a host messaged by its copy before wave 2 is skipped);
  - N-10 (validation: an Org restore activates no member; the member presentation of a SYSTEM sender);
  - N-3 to N-5 carried.
- Material classification changes: none (Large/High).
- Recommended recipient: `/software_engineering_team/implementation_engineer`, with an informational notification to the Solution Designer.
- Remaining risks or uncertainty: N-10's two validation checks.

### ARCH-REV-003 — SR-005: the eligibility guard moved into the run's admission; member notice persisted; Pass

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/restart-resume/tickets/in-progress/restart-resume/design-review-report.md`
- Review round and trigger: Round 3. `/software_engineering_team/solution_designer` sent SR-005, the design revision for CRR-002 (Design Impact). That was the code reviewer's failure-origin review of API-REV-001: F-API-001, an archived run resumed and a notice turn ahead of the user's message; and O-1, a member's notice not visible after the fact.
- Triggering role, report path, and finding IDs: Code Reviewer, `code-review-report.md` round 2 (F-API-001, CR-C2/O-1), via the Solution Designer.
- Relevant solution revision IDs: SR-002 (approval; REQ-003 clarified in SR-005), SR-005 (design).
- Prior authoritative decision: Pass (ARCH-REV-002).
- Current authoritative decision: Pass.
- What changed in the review result:
  - D3.6 restores without posting, re-checks, then posts with `onlyAsFirstInput`, decided in `AgentRunInputAdmissionState.reserve` inside the run's dispatch queue.
  - D4 publishes the run's own `SYSTEM_TASK_NOTIFICATION` for every place, and the handle skips the duplicate `member_input` for a platform notice.
  - Verified against the admission code, the preface dispatch and the three archive rules.
- **Reviewer's own miss in ARCH-REV-002:**
  - I passed SR-004 D3.5 as "re-checked immediately before each post", although its check (step 5) preceded the restore (step 6), an await of 0.3–0.5 s.
  - I also accepted "live" as REQ-003's "already received new input", although ARCH-REV-001's own P-001 described user messages starting their own activation, during which `getActiveRun` is null.
  - Both premises were taken without opening the restore and activation path (Case 5). CRR-002 found them through API-04/04B/04C.
  - Lesson: a guard checked outside the owner across an await is not "immediately before". Ask which owner decides atomically.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| AR-002 (ARCH-REV-001; passed in ARCH-REV-002) | Resolved (premise wrong, see the miss above) | Resolved at the owner | SR-005 D3.6; CRR-002 F-API-001 | The `onlyAsFirstInput` admission rule (synchronous `reserve` in the dispatch queue, `agent-run.ts:249`). The archive is re-checked after the restore. Team and Org archives refuse an active root (`:220`, `:110`). The host's archive is refused while the host is active. The standalone-delegated case is protected by the root's stop (N-11) |
| CRR-002 O-1 (CR-C2, FU-004) | Open (Design Impact) | Resolved | SR-005 D4; FU-004 absorbed | One observer helper publishes the run's own recorded notice for every place. The handle skips its `member_input` presentation for notice-only platform inputs, the only ones carrying the preface metadata at handle time (`agent-run-input-preface-dispatch.ts`) |

- New or remaining finding IDs: none.
- Non-blocking notes:
  - N-11 (a standalone archive ends the root rather than refusing; correct the wording);
  - N-12 (validation: a restored or woken instance reserves no input before the notice);
  - N-13 (remote children and `postOptions`);
  - N-14 (a test that prefaced member inputs still show);
  - N-6 to N-10 carried.
- Material classification changes: none (Large/High).
- Recommended recipient: `/software_engineering_team/implementation_engineer`, with an informational notification to the Solution Designer.
- Remaining risks or uncertainty: N-12, shown by the SR-005 repeats of API-04/04B/04C and API-05T.
