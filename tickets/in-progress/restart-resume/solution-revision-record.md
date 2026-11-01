# Solution Revision Record — restart-resume (autobyteus-285)

## SR-001 — 2026-11-01 — Requirements baseline (Ready for Approval)
- Trigger: Task autobyteus-285 (the user's decision of 2026-10-30: automatic resume after an update restart).
- Basis carried from autobyteus-283; changed facts G-01..G-07 (284/339/349/305 merged; the server does not know its release version).
- DEC-001 (which non-update restarts resume) needs the user; DEC-002..004 decided by the Solution Designer.
- Design: not started.

## SR-002 — 2026-11-01 — Requirements approved by the user
- The user described the purpose (automatic beta update at night; busy runs continue; idle runs untouched) = DEC-001 = A. REQ-001..006 approved; AC-004 made concrete.

## SR-003 — 2026-11-01 — Architecture design complete
- D1: a release-identity stamp written by the server build; D2: busy runs recorded in the cleanup, before
  `app.close()`; D3: the resume after listen (consume first, update test, eligibility, at most 3 at a time, through
  the shared `resolveOrRestoreRoot` and the root's `post_message`); D4: a system notice with its own recorded sender id.
- DEC-005 (application-owned and system-owned runs not resumed) decided by the Solution Designer.
- Classification: Large / High. Routing: architecture review. Follow-ups FU-001, FU-002.

## SR-004 — 2026-11-01 — Design revision for ARCH-REV-001 (Fail, Design Impact)
- AR-001 (High): a standalone host is woken through `standaloneRootManager.postUserMessage`; children and members
  through `executeAgentCommand(post_message)`. The notice metadata is named (sender_id, preface, message_id,
  dedupe_key), and so is its display (host via `SYSTEM_TASK_NOTIFICATION`; members via `member_input` with a SYSTEM
  sender). The Current-State claim and the Wake example are corrected; test: a busy host with no children.
- AR-002: eligibility is re-checked immediately before each post. "Already received new input" = the run is live.
  The false dedupe claim is dropped; tests cover runs changed while queued.
- AR-003: per root, delegated and member entries go first, then the host, whose notice lists only the accepted
  delegated runs. In a Team or Org every resumed member gets the list. Test: one delegated run refused.
- AR-005: the recorder only writes, only with entries, merging; the resumer is the only deleter; `version` is per
  entry.
- AR-004: `CollaborationRootResolver` (file, signature, construction, failure contract); `RemoteRootDirectory`
  delegates to it.
- AR-006: the Docker data-copy rollback residual is corrected, FU-003.
- Design case: `docs/design-cases.md` Case 5 (AR-001).
- N-1 (why a dist stamp) and N-2 (check that `pnpm deploy` carries the stamp) folded in.
- Requirements unchanged (SR-002). Classification Large / High. Routing: ARCH-REV-002.
- 2026-11-01, review result recorded: **ARCH-REV-002 Pass** on SR-004. Cosmetic N-6 folded in (Risks, the update-test example, Task Size, Change Scope follow-ups) and N-7 noted in D3. The reviewer routed to `/software_engineering_team/implementation_engineer`.

## SR-005 — 2026-11-01 — Design revision for CRR-002 (Fail, Design Impact)
- Trigger: CRR-002, the failure-origin review of API-REV-001.
  - F-API-001: the eligibility check raced the restore and post. An archived run got a notice turn, and a user
    message 0.02–0.3 s before the post led to an extra turn ahead of it.
  - O-1: a member's or delegated run's notice was never persisted or seen (BEH-004).
- Design:
  - restore without posting; re-check `terminatedAt` and archived after the restore (final: archive refuses an active
    run or root);
  - post with the new admission rule `onlyAsFirstInput` (refused with `AGENT_RUN_INPUT_NOT_FIRST` when the run
    instance already reserved or admitted input), passed through `post_message`'s new optional `postOptions` for
    members and delegated runs;
  - every place publishes the run's own `SYSTEM_TASK_NOTIFICATION` through one observer helper, and the member handle
    does not present a platform notice as `member_input`;
  - D3.4's wave text corrected to the accepted order (delegated, then host and members).
- Requirements: REQ-003's "already received new input" clarified (any input the restored run accepted before the
  notice). No change in intended behavior; BEH-003 and BEH-004 are now met without a residual.
- FU-004 (code reviewer) absorbed. Design case: `docs/design-cases.md` Case 10.
- Classification Large / High (unchanged). Routing: `/architecture_reviewer` (a revised High package).
