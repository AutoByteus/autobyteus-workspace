# Design Spec

- SR-002 (SR-001 test waits; SR-002 adds the node's Antigravity discovery bounds); requirements approved by the founder (his words in the requirements); design approval not required. Status `Ready`.
- Authorities read: architecture-design.md, design-principles.md, DESIGN.md (2026-11-18).

## Task Size And Architectural Risk

- `task_size = Small` (one test file, two constants in one product file, their unit tests); `architectural_risk = Low` (two timeouts in an existing owner; no contract, persistence or security surface; the Settings page's step caps still bound it through its deadline).
- Escalation trigger: if E06 still fails at 90 s, it is not a margin problem. Then it is a `Design Impact` back to the Solution Designer, with the run's server log.

## Intended Change

In `autobyteus-server-ts/tests/e2e/runtime/agy-linked-skills-transport.e2e.test.ts`, E06 only:
- `until(frames, "delegation result", …)` gets `90_000`;
- the child-launch deadline becomes `60_000`;
- the test limit becomes `180_000`;
- a one-line comment says why: the delegated child's cold start under a loaded machine; measured 1–34 s alone.

The `until` default and every other case stay as they are.

SR-002, in `autobyteus-server-ts/src/runtime-management/antigravity-cli-capability.ts:7-8`: `SHORT_PROBE_TIMEOUT_MS = 10_000` (was 3_000; used by `--help` at line 108 and `--version` at line 138) and `MODELS_TIMEOUT_MS = 30_000` (was 15_000; line 111). Callers: `runtime-availability-service.ts:108` and `llm-management/services/antigravity-model-catalog.ts:8` pass no deadline on the run-start path, so the new bounds apply there. The Settings › Agent Runtimes page passes its step deadline (`available-agent-runtimes-service.ts:72-73`), which `commandBound` keeps (`read-deadline.ts:43`): that page is unchanged. Update `tests/unit/runtime-management/antigravity-cli-capability.test.ts` where it names the old bounds.

## Change Scope

- In scope: E06's waits; the two Antigravity discovery bounds (SR-002). Left alone: the helper's default, other cases, other runtimes' bounds, the Settings page's step caps, `scripts/release_smoke.py`.
- Follow-ups: None.

## Design Health

`Bug Fix`, a test-timing margin; no design issue; no refactor. No dead code, no persisted data.

## Verification

AC-004 unit tests; AC-005 3/3 whole-file runs with the smoke env.
