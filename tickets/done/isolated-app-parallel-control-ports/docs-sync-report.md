# Docs Sync Report

## Scope

- Ticket: `isolated-app-parallel-control-ports`
- Trigger: API/E2E Validation Pass (API-REV-001, validating IR-001 / SR-003); direct low-risk route (`task_size=Small`, `architectural_risk=Low`).
- Bootstrap base reference: superrepo `origin/personal` @ `f2924a2b0`; `autobyteus_mcps` `origin/main` @ `d0fb10d`.
- Integrated base reference used for docs sync: superrepo `origin/personal` @ `f2924a2b0` (already current; ticket branch @ `affe11bdf`); `autobyteus_mcps` `origin/main` @ `0b210ab` merged into ticket branch (merge `291188d`).
- Post-integration verification reference: see `release-deployment-report.md` → Initial Delivery Integration Refresh.

## Why Docs Were Updated

- Summary: `pnpm isolated-app start` no longer defaults to control port 9333; it picks a free loopback control port unless `--control-port` is given. Docs must tell users/agents to use the reported `controlPort`/`instanceId` and how to run parallel instances.
- Why this should live in long-lived project docs: the isolated-app workflow and the browser-automation attach path are used by every API/E2E engineer; a stale fixed-port instruction causes cross-worktree collisions.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result | Notes |
| --- | --- | --- | --- |
| `README.md` | isolated-app usage summary | Updated (in implementation commit `affe11bdf`) | Verified no 9333; uses reported controlPort |
| `autobyteus-web/docs/electron_packaging.md` | isolated-app launch reference | Updated (`affe11bdf`) | Verified |
| `docs/isolated-app-instances.md` | canonical isolated-app instance doc | Updated (`affe11bdf`) | Free-port default, explicit busy-port failure, "Parallel instances" section |
| `skills/autobyteus-isolated-app/SKILL.md` | agent skill for isolated app | Updated (`affe11bdf`) | Uses `<controlPort>`/`<instanceId>` |
| `autobyteus_mcps/browser-automation/SKILL.md` | external attach-only guidance | Updated (`f400434`) | `CHROME_REMOTE_DEBUGGING_PORT=<controlPort>` |

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| All five docs above | Behavior sync (authored by implementation, verified by API/E2E DOC-001 and delivery) | Replace fixed 9333 with reported `controlPort`; add parallel-use guidance | Match final default free-port behavior |

Delivery made no additional doc edits: re-review on the integrated state found all docs accurate (`grep 9333` over the four superrepo docs and the mcps SKILL.md: no hits).

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| Default control port | Default start picks a free loopback port; explicit `--control-port` busy → `CONTROL_PORT_IN_USE` (exit 3) suggesting to omit `--control-port`; restart keeps the recorded port | design-spec.md, requirements-doc.md | `docs/isolated-app-instances.md` |
| Parallel use | Each start gets its own control + server port; `list` is machine-wide; use your own `instanceId`/`controlPort` | design-spec.md | `docs/isolated-app-instances.md`, skill SKILL.md |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| Fixed default control port 9333 | Free loopback port chosen at start and reported as `controlPort` | `docs/isolated-app-instances.md`, `skills/autobyteus-isolated-app/SKILL.md`, `browser-automation/SKILL.md` |

## Delivery Continuation

- Result: `Pass`
- Next delivery action: handoff summary, user verification, finalization.
- Notes: none.
