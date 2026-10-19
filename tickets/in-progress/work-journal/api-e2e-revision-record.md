# API/E2E Revision Record — Work Journal

## Revision Index

| ID | Trigger / round | Related revisions | Prior result / confidence | Current result / confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | code_reviewer CRR-002 Pass / round 1 | SR-014; ARCH-REV-001–003; IR-001, IR-002; CRR-001, CRR-002 | N/A | Pass / 93.5% |

## API-REV-001 — first API/E2E round

- **Plan and report:** api-e2e-coverage-investigation.md (with its round 1 amendments), api-e2e-execution-coverage-report.md and api-e2e-test-progress.md.
- **Scope:**
  - live runs on AutoByteus (DeepSeek and LM Studio), Claude (with `/compact`), Codex and AGY;
  - a scripted AGY run for rotation, restore and regeneration;
  - Skill Improvement with a real improver;
  - the built startup migration;
  - the server E2E suite.
- **User decisions during the round:**
  - Grok was left out of live testing after its free account returned 429;
  - DeepSeek V4 Flash was added for AutoByteus, with the key imported into the test vault from the user's `.env`.
- **Durable coverage:** four E2E files added and one existing E2E test updated (AOML-1, stale because of this ticket's new migration). No product code changed.
- **Failures:**
  - two test defects in the new tests, fixed;
  - one stale existing test, updated;
  - one unrelated suite-order flake (AE-006, passes alone).
  - No upstream finding.
- **Residual:**
  - no live Grok proof;
  - N2 not measured on slower hardware;
  - full suite not rerun after the AOML-1 fix (that file was rerun alone).
- **Handoff:** test-code review by `/code_reviewer` (Large/High reviewed route).
