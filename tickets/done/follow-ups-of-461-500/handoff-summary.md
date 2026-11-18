# Handoff Summary — follow-ups-of-461-500

## What Changed

Project Task `autobyteus-500`, the follow-ups of 461 (deliveries 1 and 2):

- FU-036: no command is dropped on any run stream (early commands answered `SESSION_NOT_READY`).
- FU-011 / FU-018: both hosts pass their owners in; no behavior by a missing collaborator.
- FU-013: a team's token total counts team runs only.
- FU-020: the host-scoped attachment owner is removed; `20261119_delegated_run_own_attachment_links` and its follow-up `20261119_…_after_task_agent_own_run` convert stored links once, with a backup per file. They are registered after 491's `20261118_remove_retired_built_in_agents`, which v1.5.14-beta.1 released (SR-017, D-15; 491's classified "none": disjoint data).
- FU-030: refusal texts say what happened, why and what to do.
- FU-021 / 022 / 023: test gates.
- G-1: the release script records the shipped migration order (`released-migration-order.json`).
- G-2: the team-index repair. G-3: the probe's data.
- G-5: a stored model its runtime no longer offers is refused at start; Settings marks each member.
- Hosting-era names removed from code.

Not in this package: FU-035 (Grok), D-14.

## Classification And Route

- `task_size` `Large`, `architectural_risk` `High`, route `Reviewed`.
- Architecture review on SR-017; code review CRR-001 … CRR-020 (failure-origin CRR-003, CRR-011; merge reviews CRR-007/008, CRR-010, CRR-013).
- API/E2E: API-REV-001 … API-REV-008, final 95% (round 3 the full server folder on the merged state; later rounds proportional to each merge; round 7 messaging and migration order; round 8 both upgrade paths with the renamed migrations).

## Code State

- Branch `codex/follow-ups-of-461-500`. Base refreshes:
  - `39325a1e50` (`ff13782f36`);
  - `e93671cce0` (`0570c47fd9`);
  - `eecb228bd6` (`24d438fa31`);
  - `f5a7d789c9` (`f7b4d68711`, by delivery, clean).
- `released-migration-order.json` is v1.5.14-beta.1's 46 IDs (beta.8 … 1.5.13 shipped none; beta.1 added 491's), checked against the tag; caught up by hand once, because beta.1 was cut before G-1's recorder reached personal. Later merges: `5eb8246076` (`53b72018ad`, 491, 492) and IR-010's (`7984543255`, beta.1).

## Verification

From the evidence (see `release-deployment-report.md`), no user check needed for finalization. The user-only part of AC-008 (the migration on his own data) applies only when a release carrying it reaches his machine.

## Release

No release (not requested). `release-notes.md` is ready for the next one.

## Residual Risk And Follow-ups

- Not tested: quiet-macOS watcher runs (Linux 5/5 is the gate); M-6 cold cache; LM Studio and Ollama emulated; RR-07 … 09 live; RR-11 (needs a pre-526 build); BTS-04/05 live.
- The member handle is exactly at 500 lines: its next change needs a split.
- Follow-ups FU-500-01 … FU-500-13, sent by the Solution Designer.
