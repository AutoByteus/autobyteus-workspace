# Docs Sync Report

## Scope

- Ticket: `agent-isolated-app-recording`
- Trigger: code_reviewer delivery handoff after CRR-002 Pass (API/E2E API-REV-001 Pass, 94.9%; source review CRR-001 Pass). Route: reviewed, `task_size=Large`, `architectural_risk=High`. Delivery does not change this classification.
- Bootstrap base reference: `origin/personal@e6c16d80148ba3a9674c0bd847eb1df0e6ca5bbb` (workspace); `origin/main@f11098c87955914c18657198e91c3c3c635ac7b0` (autobyteus-mcps)
- Integrated base reference used for docs sync:
  - Workspace: `origin/personal@5d617979712deff5b10d137bb39ded88b90c5db4` (1.4.91-beta.5), merged into the ticket branch as `c474cb9fc`.
  - mcps: `origin/main@f11098c` (already current); candidate `c37b2b9`.
- Post-integration verification reference: `release-deployment-report.md` § Initial Delivery Integration Refresh; logs in `delivery-evidence/`.

## Why Docs Were Updated

- Summary: this ticket adds user- and agent-facing features in both repositories:
  - the `pnpm isolated-app` lifecycle CLI and its isolated-launch capability gate;
  - the isolated server-environment policy;
  - disabled updates in isolated instances;
  - browser-automation attach-only mode, the presentation helper and `start_recording`/`stop_recording`.
  The implementation wrote the long-lived docs in-branch. API/E2E reviewed them against CLI help and source (L-17, Pass). Delivery re-checked them against the integrated state and made no further edits.
- Why this should live in long-lived project docs: agents operate the feature from the docs and skills alone (REQ-010/REQ-011, AC-009/AC-010). Error codes, exit categories, the build-support gate and the key-import procedure are durable contracts.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result (`Updated`/`No change`/`Needs follow-up`) | Notes |
| --- | --- | --- | --- |
| `docs/isolated-app-instances.md` (new) | Root guide (REQ-010) | Updated (in-branch) | Error codes and exit categories match `isolatedAppErrors.mjs`. The gate note "1.4.91-beta.5 and earlier are refused" is still true after the beta.5 merge. |
| `skills/autobyteus-isolated-app/SKILL.md` (new) | Agent skill (REQ-011) | Updated (in-branch) | Proven by the agent run in L-16 |
| `README.md` | Root links to the guide | Updated (in-branch) | — |
| `autobyteus-web/README.md` | Lifecycle and harness commands | Updated (in-branch) | The new `test:e2e:isolated-app` probe script comes from the checkpoint commit |
| `autobyteus-web/docs/electron_packaging.md` | Isolated-launch marker, env policy, disabled updater | Updated (in-branch) | — |
| `autobyteus-server-ts/docs/modules/secret_management.md` | `secrets:import` into an isolated DB | Updated (in-branch) | The importer itself is unchanged |
| `autobyteus-server-ts/docs/modules/antigravity_cli_runtime.md` | Changed by the integrated base (beta.5 AGY ticket) | No change | Does not touch this feature |
| mcps `browser-automation/SKILL.md`, `browser-automation/README.md`, `README.md`, `docs/mcp-to-cli-mapping.md` | Attach-only, helper, recording tools | Updated (in-branch, commit `99cc81e`) | Tool inventory is 9 + 2 |
| OBS-2 (pnpm-launched instance PATH) | Known behavior outside the approved ACs | Needs follow-up | Not documented. No verified workaround exists, and a fix is pending a Solution Designer or user decision. Documenting it now would guess at behavior that may change. |

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| (listed above, in-branch) | New guide, new skill, sections | Lifecycle CLI, gate, env policy, disabled updates, key import, attach-only/helper/recording | Final implemented behavior |
| — | Delivery-stage edits | None | The in-branch docs already match the integrated state |

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| Isolated-launch capability gate | Only builds with `isolated-launch.json` launch isolated. Other builds get `APP_ISOLATION_UNSUPPORTED` (exit 3). Packed AppImages get `APPIMAGE_EXTRACTION_REQUIRED` (exit 2). | design-spec (SR-011/SR-012) | `docs/isolated-app-instances.md`, `electron_packaging.md` |
| Isolated server env policy | Isolated server env = baseline allowlist + Electron-owned values. Production composition is unchanged. | design-spec, investigation-notes | `electron_packaging.md` |
| Recording ownership | Recording belongs to the browser MCP (detached worker, ArtifactPolicy paths). The lifecycle does not record. | solution-revision-record SR-009 | mcps `SKILL.md`/`README.md` |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| E2E server inherits the full caller env (earlier ticket's AC-014) | `isolated-baseline` env policy | `electron_packaging.md`; implementation-handoff "Important Assumptions" |
| Updater null-branches for e2e | `DisabledAppUpdater` with a `disabled` state | `electron_packaging.md` |

## No-Impact Decision (Use Only If Truly No Docs Changes Are Needed)

- Docs impact: N/A. The docs were updated in-branch.
- Rationale: N/A

## Delivery Continuation

- Result: `Pass`
- Next delivery action: handoff summary, then the user-verification hold.
- Notes: OBS-2, OBS-1 and CR-C-07 are surfaced as follow-up candidates in `handoff-summary.md`.
