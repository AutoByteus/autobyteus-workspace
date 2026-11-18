# Implementation Revision Record — autobyteus-355

The current code and `implementation-handoff.md` remain authoritative.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Related Revision IDs | Result |
| --- | --- | --- | --- | --- | --- |
| IR-001 | Solution Designer, `handoff-architecture-design-complete.md`, SR-001 | N/A | `Initial Baseline` | SR-001 | Implemented D-1..D-4; checks IMP-01..IMP-08 pass |

## Revision Entries

### IR-001 — Beta user-action notes; per-runtime live model check with Grok fallback; runner per-runtime reporting

- Triggering role, report path, and round: Solution Designer, `handoff-architecture-design-complete.md`, SR-001 (initial)
- Triggering finding IDs: N/A
- Classification: Initial Baseline
- Prior authoritative result: N/A
- Current authoritative result: implemented, Small / Low confirmed, routed to direct API/E2E
- Related solution revision IDs: SR-001
- Related architecture-review revision IDs: N/A
- Related code-review revision IDs: N/A
- Related API/E2E revision IDs: N/A
- Related delivery revision IDs: N/A
- Why this baseline is recorded: the initial implementation handoff
- Approved behavior or requirement IDs affected: BEH-001..BEH-003, REQ-001..REQ-006, AC-001..AC-005
- Implementation delta:
  - RELEASE.md: the Beta pointer, the "Beta notes with a user action" subsection and the release-notes line. The template gets an optional `## What you need to do` section.
  - Live suite: the model and availability check moved into a per-runtime `beforeAll`; `chooseLiveModel` is in a helper; there is one `SKILL_LINKS_LIVE_MODEL` line per runtime.
  - `release_smoke.py`: `read_models` handles the per-runtime lines; `failed_suite_errors` works per runtime; `evaluate(runtime_errors)`.
  - Tests and fixture: unit tests and `fake-grok-acp.mjs`.
- Changed files or areas:
  - `RELEASE.md`, `.github/release-notes/template.md`;
  - `autobyteus-server-ts/tests/e2e/runtime/workspace-skill-links-live.e2e.test.ts`, `autobyteus-server-ts/tests/e2e/helpers/live-model-choice.ts`, `autobyteus-server-ts/tests/unit/e2e-helpers/live-model-choice.test.ts`;
  - `scripts/release_smoke.py`, `scripts/tests/test_release_smoke.py`, `scripts/tests/fixtures/fake-grok-acp.mjs`.
  - Commits: `6cc367a37e`, `927e343504`.
- Local validation and result:
  - IMP-01: the probe reproduced.
  - IMP-02: 5 unit tests pass.
  - IMP-03: 23 unit tests pass.
  - IMP-04: the fallback line appears.
  - IMP-05: "not offered", Grok only.
  - IMP-06: the runner works on the real logs.
  - IMP-07: no new type errors.
  - IMP-08: no keys, and the gate, hygiene and licensing checks pass.
- Next recipient or routing: API/E2E engineer, per `get_handoff_rules`
- Remaining limitations or risks:
  - The full `release_smoke.py` and a real Grok run were not executed, because both spend tokens.
  - FU-1 is recorded: an unrelated broken test helper.
