# Implementation Revision Record

Current code and `implementation-handoff.md` are authoritative; this record indexes implementation rounds.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Related Revision IDs | Result |
| --- | --- | --- | --- | --- | --- |
| IR-001 | Architecture Reviewer ARCH-REV-002 Pass; initial implementation; user visual feedback 2026-09-24 | User green-completion request; `AGENT_SEGMENT_LIFECYCLE_INVALID` | Requirement Gap | SR-016, SR-019; ARCH-REV-001/002; CRR/API-REV/DR N/A | Partial implementation with local segment fix; product status decision required before downstream handoff. |
| IR-002 | Architecture Reviewer `design-review-report.md` ARCH-REV-003 Pass; rework after SR-021 | REQ-011/AC-010 green AGY DONE; IR-001 lifecycle recheck | Local Fix | SR-021; ARCH-REV-003; CRR/API-REV/DR N/A | Neutral path removed; approved green mapping and local checks complete; independent source review next. |
| IR-003 | Code Reviewer `code-review-report.md` / `code-review-revision-record.md` CRR-001 Fail — Local Fix of IR-002 | CR-001, CR-002 | Local Fix | SR-016/019/021; ARCH-REV-003; CRR-001; API-REV/DR N/A | Org Team/Agent AGY permission draft corrections, focused checks and rendered editor check complete; return for independent source re-review. |

## Revision Entries

### IR-001 — AGY runtime initial implementation and status-semantic gap

- Triggering role/report/round: Architecture Reviewer `design-review-report.md` ARCH-REV-002 initial implementation; user screenshot in implementation round.
- Triggering finding IDs: user request for green command completion; local canonical lifecycle diagnostic.
- Classification: **Requirement Gap**.
- Prior authoritative result: N/A.
- Current authoritative result: current worktree source and `implementation-handoff.md`; not accepted or downstream-review-ready.
- Related solution revisions: SR-016, SR-019.
- Related architecture-review revisions: ARCH-REV-001, ARCH-REV-002.
- Related code/API/delivery revisions: N/A.
- Why recorded: initial implementation baseline and direct user feedback conflict with approved neutral AGY `DONE` semantics.
- Behaviors/requirements affected: BEH-006 / REQ-009/AC-008 and BEH-004 / REQ-008/AC-007; separate local canonical bug in BEH-006.
- Implementation delta: AGY backend/capsule/stream/runtime registration, run binding/restore, MCP/configured skills, canonical neutral trace, UI draft policy and presentation; removed extra `segment_type` from AGY `SEGMENT_CONTENT` and added canonical transformer regression. Split team launch edit code to satisfy source size guardrail.
- Changed areas: server AGY/runtime/manager/MCP/event/memory/stream areas; shared contracts; web launch, stream, hydration and tool components; focused tests. See current handoff.
- Local validation: focused server/web tests and server build typecheck passed; live scoped implementation probes passed; fresh live UI check after segment fix not done. No API/E2E sign-off.
- Next routing: Solution Designer for revised intended status behavior and user approval; then resume implementation as directed.
- Remaining risks: AGY underlying command exit is absent from `DONE`; green could misrepresent a nonzero command. Provider stall and fresh UI lifecycle path require further checks.

### IR-002 — Approved AGY tool completion and canonical replay

- Triggering role/report/round: Architecture Reviewer `design-review-report.md` ARCH-REV-003 Pass on user-approved SR-021; second implementation round.
- Triggering finding IDs: REQ-011/AC-010 green AGY command completion; separate `AGENT_SEGMENT_LIFECYCLE_INVALID` from IR-001.
- Classification: **Local Fix / ready for source review**. Prior result: IR-001 **Requirement Gap**. Current result: code and `implementation-handoff.md` are authoritative; no downstream acceptance claim.
- Related revisions: SR-016/019/021; ARCH-REV-001/002/003; CRR **N/A**; API-REV **N/A**; DR **N/A**.
- Why recorded: approved intended behavior replaces the disputed IR-001 neutral AGY `DONE` mapping while preserving all SR-019 integration gates.
- Affected behavior/requirements: BEH-006 / REQ-009/011 / AC-008/010; BEH-004 denial priority; non-AGY preservation REQ-006.
- Implementation delta: AGY `DONE` without explicit error emits canonical success and retains provider state/output without a fabricated shell exit; ERROR or explicit error wins and retains exposed output in trace. Removed the sole-producer neutral canonical event, DTO, trace, hydration and UI branches. AGY denial raw-trace marker restores denied status without changing other-runtime errors. Existing segment-content contract fix remains and was rechecked live.
- Changed areas: AGY stream converter; server event/stream/memory/replay; presentation and team contracts/dist; web streaming, hydration and tool components; focused tests.
- Local validation: server 57 focused tests passed (5 opt-in live tests skipped), TypeScript/build passed; web 59 focused tests passed; live and reloaded exit0/exit8/not-found cards green with trace output retained and no lifecycle diagnostic. Explicit-off live denial non-green; pre-refinement reload non-green FAILED. New denial replay-label path has passing writer/projection/hydration tests, but a second post-refinement browser run was prevented by browser connection loss. Earlier SR-019 local production probes remain applicable and are referenced in the handoff.
- Local trace audit: one IR-001 development trace, `daily_assistant_b421bebb5fa045c1b737d1565a45a43b` sequence 3, contains neutral `completed_unverified`; no released-data migration added.
- Classification continuity and next routing: **Large / High** confirmed; request independent Code Review under handoff rules.
- Remaining limitations: green is AGY provider-step completion, not shell exit-zero proof; model-directed workspace targeting and provider-version variation remain; final denied label needs independent live/reload verification.

### IR-003 — Org Team/Agent AGY launch permission correction

- Triggering role/report/round: Code Reviewer `code-review-report.md` / `code-review-revision-record.md`, CRR-001 initial full source review of IR-002 at `d0ec1fc07`.
- Triggering findings: CR-001 Org Team AGY selection omitted the default-on policy; CR-002 Org Agent later explicit-off selection used the wrong prior override and was forced on. Classification: **Local Fix**.
- Prior authoritative result: IR-002 source-ready, but CRR-001 **Fail — Local Fix**. Current result: current code and `implementation-handoff.md` are authoritative; bounded correction ready for source re-review, not Code Review or API/E2E acceptance.
- Related revisions: SR-016/019/021; ARCH-REV-001/002/003; CRR-001; API-REV **N/A**; DR **N/A**.
- Why recorded: both supported Org launch paths affect BEH-004 / REQ-007/008/010 / AC-009 and could launch AGY with the wrong auto-execute flag. A direct UI check also showed synchronous runtime/model/config edits could overwrite the policy before store props reconciled; this is the same CR-001 path, fixed locally rather than an architecture change.
- Implementation delta and locations: `autobyteus-web/stores/agentOrgRunConfigStore.ts` now applies the shared new-runtime policy to Team overrides and uses the exact prior Agent override for Agent transitions. `autobyteus-web/components/workspace/config/TeamScopeConfigEditor.vue` applies the same policy to its pending Team/Agent edit before the synchronous reset events. Focused store/effective-form, component emission and mounted Org panel regressions cover new AGY selection and later deliberate off; no new launch model or compatibility branch.
- Focused validation: nine web test files, **79/79 passed**, including adjacent non-AGY Team launch/form checks; `git diff --check` and source-size guardrail passed. Fresh browser preview showed Org Team AGY select-on, explicit-off, and direct Agent AGY select-on, explicit-off retained after collapse/reopen, with root off and clean layout. This is implementation-scoped validation only; the editor check did not launch an Org.
- Classification continuity: **Large / High** confirmed from the completed design; no changed requirement or design decision. Return to independent Code Reviewer under handoff rules.
- Remaining limitations/downstream gate: fresh final-code denied live/reload label and full AGY acceptance still require API/E2E. The user specifically requested Team test parity with Codex/Claude. Current `agy-mcp-team-live.test.ts` uses stub message delivery and is not the real GraphQL/WebSocket inter-agent roundtrip; API/E2E must author and execute the AGY equivalent before claiming that gate.
