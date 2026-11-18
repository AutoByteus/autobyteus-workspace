# Requirements Document

## Document Status

- Status: `Approved`
- Current solution revision ID: `SR-002`
- Package identifier: `e06-delegation-wait-margin`
- Request / ticket: the founder's word, 2026-11-18, to the Solution Designer during the beta v1.5.14-beta.1 release (autobyteus-538): "If it's too tight on the time can we make the time a little bit loose … Yeah make the time a little bit loose and then fix it in the tickets directly"
- Requested by: the founder (directly); the release Task autobyteus-538 waits for it
- Requirements owner: Solution Designer
- Date: 2026-11-18
- Approved by and reference: `User` — the words above (SR-001); SR-002: the founder, 2026-11-18, to the Solution Designer, after the implementation's Requirement Gap (E06 and E09 failed on the node's own Antigravity model discovery timing out under load) and the recommendation "(a) also loosen the app's own limits now: 3 → 10 seconds for the check, 15 → 30 seconds for the model list": "Yeah I accept your recommendations"
- Behavior-defining supplements: none

## Problem And Desired Outcome

- Problem: the release smoke's Antigravity step runs `tests/e2e/runtime/agy-linked-skills-transport.e2e.test.ts`. Its case E06 waits 30 s (the `until` helper's default) for the coordinator's `delegate_task` result. Under heavy machine load the delegated child's cold start uses that up. E06 failed 3/3 in delivery's runs of the beta (37–44 s) and blocks the release. Measured, E06 alone takes 1–34 s on v1.5.13 and on the beta alike (`evidence/summary.md`). It is a pre-existing timing margin, not a product regression.
- Desired outcome: E06 waits long enough for a loaded machine, so a slow but correct delegation passes; a delegation that never arrives still fails.

## Requirements

| ID | Requirement |
| --- | --- |
| REQ-001 | E06 waits up to 90 s for the delegation result (was 30 s) and up to 60 s for the child's launch (was 30 s); the test's own limit covers both (180 s, was 90 s). |
| REQ-002 | Nothing else changes in the test: no other case's waits, the same assertions. |
| REQ-003 | (SR-002) The node's Antigravity model discovery allows each step more time on a busy machine: the short CLI checks (`agy --help`, `agy --version`) up to 10 s (was 3 s), `agy models` up to 30 s (was 15 s). A step that a caller's overall deadline cuts shorter (the Settings › Agent Runtimes page's step caps) keeps that deadline. A CLI that does not answer still fails with the same diagnostic, later. |

## Acceptance Criteria

| ID | REQ | Expected | Verification |
| --- | --- | --- | --- |
| AC-001 | REQ-001 | E06 passes in the whole-file run with the release smoke's env (`env -i PATH HOME=<temp> TMPDIR RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=<fixture>`), at the machine's current load, 3/3 | Implementation and API/E2E runs |
| AC-002 | REQ-001 | A delegation that never arrives still fails E06 with "Timed out waiting for delegation result" (the wait is bounded) | Reading the change |
| AC-003 | REQ-002, REQ-003 | `git diff` touches only this test file, `src/runtime-management/antigravity-cli-capability.ts` (the two bounds) and their unit tests (and the ticket) | Review |
| AC-004 | REQ-003 | Unit: the `--help`/`--version` bound is 10 s and the `models` bound 30 s when no deadline is given; with a shorter deadline the deadline wins; a hung CLI still yields `AGY_MODEL_DISCOVERY_TIMEOUT` | Unit tests |
| AC-005 | REQ-001, REQ-003 | The whole file passes 3/3 with the smoke env at the machine's load (AC-001 restated: E06 and E09 no longer fail on discovery timing) | Implementation and API/E2E runs |

## Scope Guardrail

- In scope: UC-001, E06's two waits and its test limit.
- Out of scope: other cases' waits; other runtimes' discovery bounds; the Settings › Agent Runtimes page's step caps; the release smoke script.
- In scope since SR-002: the node's two Antigravity discovery bounds (REQ-003).
- Prerequisites: None.

## Decisions

| ID | Question | Reasoning and recommendation | Owner | Status |
| --- | --- | --- | --- | --- |
| DEC-002 | (SR-002) Loosen the product's discovery bounds too? | The failure under load is the node's own 3 s `--help` check (E06 at 14 s returned `delegated: false`, "Antigravity model discovery timed out"), which real users on a busy computer hit too. 10 s / 30 s: a truly broken CLI reports a few seconds later; nothing else changes. | The founder ("Yeah I accept your recommendations") | Decided |
| DEC-001 | How much looser? | The measured worst case alone is 34 s, and delivery's failures were at 37–44 s at load up to 137. 90 s gives about 2.5× the worst case seen and stays bounded. | Solution Designer, within the founder's direction | Decided |
