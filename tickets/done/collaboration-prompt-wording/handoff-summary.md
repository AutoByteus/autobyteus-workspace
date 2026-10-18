# Handoff Summary — collaboration-prompt-wording

- Task size / architectural risk / route: Medium / Low / direct route, plus the user-requested source reviews (CRR-001..CRR-007; implementation CRR-005 9.3/10; test-code CRR-007 pass). No architecture review (N/A).
- Change: all agent-facing collaboration text rewritten for the reading agent. The explicit `collaborationRole` decides which text an agent gets; there is one vocabulary ("task agent", "task agent team", lowercase "run id"); the agent is never told its own address; the sender address is given only where it reaches the sender; there is a no-reply-unless-asked rule (SR-015); one catalogue of results and refusals; earlier stored forms still read.
- Branch `codex/collaboration-prompt-wording`, base `origin/personal` @ `3712cd9bf0` (current), with 8 implementation and pointer commits.
- Validation: API/E2E 93%, with every category at or above 90% (the 95% target is not met; reasons in the report).
  - LE-A1: Sonnet 10/10 and DeepSeek flash 15/15 per side, with 0 unprompted sends and 0 loops.
  - Journeys J1/J3: 5 per runtime per side; J2 run in the UI.
  - Durable e2e 11/11.
- Judging runtimes (DEC-018, the user): Claude Agent SDK with Sonnet and AutoByteus with DeepSeek flash. The Codex clause of AC-008 is deferred because Codex is at its usage limit until 2026-10-22 09:16. The SR-015 fix is not yet confirmed on Codex, where the echo loop was seen. A Codex rerun is a follow-up.
- Docs: 5 corrections in delivery (docs-sync-report.md).
- Credentials: a full scan found none of the user's keys in anything committed or pushed (release-deployment-report.md, "Credential Leak Check").
- Residual: native-runtime live prompt read-back and the role on restore are not live-proven; 26 catalogue entries are unit-only; the M-27 trailing period differs between the views and the product; the duplicate "You" bubble after `delegate_task` is pre-existing.
- Pre-existing web probes PMU-008, PMU-021 and TMV-002 are with the Project Task Manager (Task a1dfb6dc, part 3).
- Environment: ENFILE exhaustion from a macOS system process during the live runs; reported to the user; not caused by this change.
- Release: none requested; release-notes.md is ready.
