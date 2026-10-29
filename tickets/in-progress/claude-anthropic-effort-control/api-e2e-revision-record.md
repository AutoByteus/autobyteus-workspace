# API/E2E Revision Record

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | Implementation Engineer, implementation-handoff.md, round 1 | SR-002, IR-001 | N/A | Fail / 84% |

## Revision Entries

### API-REV-001 — Baseline: effort, display removal and saved runs; old-run edit refused

- Triggering role, report path, and round: Implementation Engineer, `implementation-handoff.md` (IR-001, `574aa0bd7` / `a2a5d0e47`), round 1, direct Medium / Low route.
- Triggering finding or case IDs: N/A (baseline).
- Related revision IDs: SR-001 (superseded), SR-002, IR-001.
- Why recorded: first API/E2E validation result.
- Coverage decisions or durable test paths changed: `autobyteus-server-ts/tests/e2e/runtime/autobyteus-anthropic-stored-config-resume.e2e.test.ts` gained team-run and AgentOrg-run restore cases (API-02, API-03), mutation-sensitive.
- Cases: API-01 (reused IMP checks), API-02..API-08 new.
- Commands, environment, fixture, or broader-validation delta: in-process server e2e (synthetic + live), real backend + Nuxt dev + headless Chromium on an owned data root, gated live suites `autobyteus-claude-5-5-live` and `autobyteus-anthropic-prompt-caching-live`.

#### Prior Failure Resolution

None.

- Canonical artifacts and sections updated: coverage investigation, execution coverage report, test progress log, evidence `API-*`.
- Prior result and confidence: N/A
- Current result and confidence: Fail, 84% overall.
- New or remaining failure IDs: API-04, API-06 (old-run edit part): Run settings Save of a stopped agent/team run whose stored config holds `thinking_display` is refused.
- Recommended owner: Solution Designer (`Design Impact`, preliminary), via code reviewer failure-origin review.
- Remaining risks, blocked evidence, or untested scope: AgentOrg stopped-run edit with a stale key not run (same cause by code); compaction live suite not run (TESTING.md).
