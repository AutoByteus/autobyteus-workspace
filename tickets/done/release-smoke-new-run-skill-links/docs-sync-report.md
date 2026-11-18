# Docs Sync Report

## Scope

- Ticket: `release-smoke-new-run-skill-links` (Project Task `autobyteus-149`)
- Classification (unchanged by delivery): `task_size` `Medium`, `architectural_risk` `Low`, route `Direct Low-Risk`; independent architecture, code and test-code reviews `Not Applicable — direct low-risk route`
- Trigger: API/E2E `Pass` with a user-accepted gap (API-REV-002, 2026-10-29)
- Bootstrap base reference: `origin/personal` @ `cba6b85122`
- Integrated base reference used for docs sync: `origin/personal` @ `9f7c9c10a6`, merged into the ticket branch as `32eac02929`
- Post-integration verification reference: `evidence/DEL-01-unit-release-smoke-integrated.log`, `evidence/DEL-02-typecheck-server-integrated.log`, `evidence/DEL-03-smoke-integrated.txt`

## Why Docs Were Updated

- Summary: the ticket adds a pre-tag check. Its long-lived docs are the release guide's "Checks Before Tagging" section and the TESTING.md test-layer table. The implementation already updated both (`RELEASE.md` "Release smoke check" subsection with the IR-002 Cost wording; the `Release smoke` row in TESTING.md). Delivery's work was to merge them with the base's newer text in the same places, during the integration refresh, so the release guide now holds both teams' rules.
- Why this should live in long-lived project docs: the release owner reads RELEASE.md before every tag (REQ-007, AC-007). A check that is only in the ticket would not run.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result (`Updated`/`No change`/`Needs follow-up`) | Notes |
| --- | --- | --- | --- |
| `RELEASE.md` | Owner of the pre-tag checks; changed by the ticket and by the base (Secret Gate, Build-only release run, Case Studies) | Updated | Merge conflict resolved by keeping both sides: the command block is licensing, hygiene, `check_secrets.sh`, `release_smoke.py`. The intro keeps the base's "the first two" (licensing and hygiene are what the workflows run) and adds this ticket's "They do not run the release smoke check." "### Release smoke check" comes before the base's "### Build-only release run". The `#release-smoke-check` anchor that TESTING.md uses is unchanged. Reread the whole merged file: no contradiction; the smoke runs on "the merged state you will tag", which matches the base's build-only run "on the merge you pushed to `personal`" |
| `TESTING.md` | Test-layer table row for the command | Updated | Conflict resolved by keeping the `Release smoke` row and the base's rewritten `Core library tests` row plus its new `Core library MCP integration` row |
| `autobyteus-server-ts/docs/modules/antigravity_cli_runtime.md`, `agent_packages.md`, `agent_execution.md` | Describe skill linking that the smoke observes | No change | No product behavior changed (BEH-003); these docs do not list the touched suites' cases |
| `autobyteus-server-ts/docs/modules/mcp_server_management.md`, `agent_definition.md`, `model_routing.md` | Mention `RUN_AGY_FAILURE_E2E` | No change | They describe other suites; the gate's meaning is unchanged |
| `.github/workflows/release-desktop.yml` | Runs the hygiene check | No change | The smoke is not a workflow step, by design (DEC-001; CI is autobyteus-65) |

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| `RELEASE.md` | New subsection and command (ticket commits); merge resolution (delivery, `32eac02929`) | "Checks Before Tagging" lists `python3 scripts/release_smoke.py`; "### Release smoke check" gives When, Prerequisites, Cost (quotas), Pass, Failure and waiver | REQ-007 / AC-007; merged with the base's Secret Gate and Build-only release run |
| `TESTING.md` | New table row (ticket); merge resolution (delivery) | `Release smoke` row pointing to RELEASE.md | REQ-007 / AC-007 |

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| Pre-tag run-start check | Every beta and stable tag needs a passing `release_smoke.py` on the commit to be tagged; a skipped or unavailable runtime fails; the only exception is a named runtime the user waives at the release decision | `requirements-doc.md` DEC-003/DEC-004; `design-spec.md` | `RELEASE.md` "Release smoke check" |
| Live quotas | Grok's free tier (about 240k tokens per run of 600k per 24 h) and Codex's ChatGPT account limit can block the check; a quota refusal is a runtime that cannot run | FU-002 (resolved in IR-002) | `RELEASE.md` Cost bullet |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| The live suite's stale model candidates and its `available[0]` fallback | One pinned cheapest model per runtime, override by env var, failure with the available list | The live suite's header and `RELEASE.md` "Release smoke check" |

## Delivery Continuation

- Result: `Pass`
- Next delivery action: handoff summary, archive, repository finalization (no release)
- Notes: delivery found one more case for FU-001 (`DEL-03` run 1): a signed-in Grok whose sign-in was being refreshed during the handshake also reported "grok-4.7 is not offered". Added to FU-001's evidence. No new follow-up.
