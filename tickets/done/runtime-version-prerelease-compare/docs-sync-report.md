# Docs Sync Report

## Scope

- Ticket: `runtime-version-prerelease-compare` (autobyteus-393 item 1, FU-002 of autobyteus-387): full runtime versions with SemVer precedence. `task_size` `Small`, `architectural_risk` `Low`, direct route.
- Trigger: API/E2E handoff after API-REV-001 (Pass, 95%).
- Bootstrap base reference: `origin/personal` `b78fd86fe4`.
- Integrated base reference used for docs sync: `origin/personal` `b78fd86fe4`; the branch is already current.
- Post-integration verification reference: no new base commits, so no rerun (see `release-deployment-report.md`).

## Why Docs Were Updated

- Summary: implementation updated `agent_runtimes.md` (the version reader). The change also makes the Grok availability probe's and the Antigravity compaction detection's minimum-version gates compare by SemVer precedence, so a prerelease of the minimum (`1.0.41-rc.1`, `1.2.16-rc.1`) no longer passes. Those two runtime docs said only "or later" / "at least"; they now say how the comparison works.
- Why this should live in long-lived project docs: the gates decide whether a runtime is available or a feature is on. A user on a prerelease CLI needs the rule to understand the outcome.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result | Notes |
| --- | --- | --- | --- |
| `DESIGN.md` | Project design rules | No change | No rule affected |
| `TESTING.md` | Testing guideline | No change | API/E2E's baseline fix (five runtimes in AR-01/AR-13) is test content, not a rule |
| `RELEASE.md` | Release guide | No change | No release |
| `autobyteus-server-ts/docs/modules/agent_runtimes.md` | Version reader | No change by delivery | Implementation's update checked against `runtime-version.ts` |
| `autobyteus-server-ts/docs/modules/grok_build_runtime.md` | Minimum version 1.0.41 | Updated | |
| `autobyteus-server-ts/docs/modules/antigravity_cli_runtime.md` | Minimum version 1.2.16 | Updated | |
| `autobyteus-web/docs/settings.md` | Agent Runtimes page text | No change | Describes the states, not how versions are read |

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| `grok_build_runtime.md` | Availability probe | "1.0.41 or later by SemVer precedence (a prerelease such as `1.0.41-rc.1` is below it)" | `grok-build-capability.ts:86`; unit case `FAKE_GROK_VERSION = "1.0.41-rc.1"` |
| `antigravity_cli_runtime.md` | Compaction detection gate | "compared by SemVer precedence (`1.2.16-rc.1` is below it)" | `antigravity-cli-capability.ts`; unit cases `["1.2.16-rc.1", false], ["1.2.17-rc.1", true]` |

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| Runtime version reading | Full version incl. prerelease, no build metadata, SemVer 2.0.0 precedence, one rule for the page and the gates | `design-spec.md` | `agent_runtimes.md` (implementation), runtime docs (delivery) |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| Local `parseVersion` (Antigravity) and `compareVersions` (Grok), comparing `x.y.z` only | `extractRuntimeVersion`/`compareRuntimeVersions` in `runtime-version.ts` | `agent_runtimes.md`, both runtime docs |

## Delivery Continuation

- Result: `Pass`
- Next delivery action: finalization on `personal` (no release).
