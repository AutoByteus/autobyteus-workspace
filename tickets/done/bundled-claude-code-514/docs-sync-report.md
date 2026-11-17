# Docs Sync Report

## Scope

- Ticket: `bundled-claude-code-514` (Project Task `autobyteus-514`), option A+ (SR-002): stop packaging the Claude Agent SDK's platform binaries; keep using the installed `claude`. `task_size: Small`, `architectural_risk: Low`, route: direct low-risk (independent architecture review, code review and test-code review `Not Applicable`).
- Trigger: API/E2E `API-REV-001` Pass (final confidence 95.9%, no category below 95%), handoff to delivery on SR-002 / IR-001.
- Bootstrap base reference: `origin/personal` @ `e16f0b0d55`.
- Integrated base reference used for docs sync: `origin/personal` @ `2b73308ce5` (autobyteus-458, 21 commits: phone conversation, Text size and phone Settings; web files, docs and tests only), merged into the ticket branch as `5eedccb85c` (no conflict) before any delivery edit.
- Post-integration verification reference: ticket branch `5eedccb85c` (the docs edit on top of it): `pnpm -C autobyteus-server-ts typecheck` PASS, `pnpm -C autobyteus-web typecheck` PASS, `claudeAgentSdkBinaryPackaging.spec.ts` 7 tests PASS (see `release-deployment-report.md`).

## Why Docs Were Updated

- Summary: desktop builds and the Docker server package no longer ship `@anthropic-ai/claude-agent-sdk-<platform>`. The packaging doc already carries the rule (written by implementation). The server doc that explains which Claude Code program runs still implied the SDK's bundled CLI might be involved.
- Why this should live in long-lived project docs: the next change to packaging, the SDK version or the Claude executable path must know that the path is always passed, that the SDK's own binary is never used or shipped, and that the build fails without the SDK package.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result (`Updated`/`No change`/`Needs follow-up`) | Notes |
| --- | --- | --- | --- |
| `DESIGN.md` | Project design rules (rule 12: build steps and gates) | No change | Rule 12 is what required the build-only release run (done by implementation, `IMP-08`); the ticket adds no rule and no design case. |
| `TESTING.md` | Fresh-start build; Docker server nodes (server-package build mounted into a test-owned container) | No change | API/E2E followed the Docker section as written (built the `server-package` target, mounted it read-only over `/opt/autobyteus/server-package`, test-owned container only). The listing of release artifacts was a one-off, not a rule. No command in the reports no longer works. |
| `RELEASE.md` | Build-only release run rule; checks before tagging | No change | Followed as written; no deviation. |
| `autobyteus-web/docs/electron_packaging.md` | Staging rules for the desktop server bundle | No change (already updated by the implementation) | One paragraph after the staging rules names the prune, its script, why it is safe (the path is always passed) and the build failure when the SDK is missing. Confirmed against the final code: `prepare-server.sh`, `prepare-server.mjs` and `Dockerfile.monorepo` call `claude-agent-sdk-binary-packaging.mjs`. |
| `autobyteus-server-ts/docs/modules/agent_execution.md` | States which Claude Code program runs ("not necessarily the CLI bundled with the pinned SDK") | Updated | See Docs Updated. |
| `autobyteus-server-ts/docker/README.md` | Docker node contents (Claude Code preinstalled; no mention of the SDK's bundled binary) | No change | Still true: the image's `claude` is what runs. |
| Other docs mentioning the SDK, packaging sizes or the bundled CLI | Searched all `*.md` outside `tickets/` for the platform-binary package names, "bundled CLI", `pathToClaudeCodeExecutable` | No change | No other doc states the SDK ships a platform binary or quotes the old package sizes. |

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| `autobyteus-server-ts/docs/modules/agent_execution.md` | Behavior clarification | The Claude executable paragraph now says the SDK's own platform binary is never used (every `query`: sessions, model catalog, usage, passes the resolved path), that desktop builds and the Docker server package no longer ship the SDK's `@anthropic-ai/claude-agent-sdk-<platform>` packages (the SDK package stays; the build fails when it is missing), that a user without an installed Claude Code sees Claude as not available, and what a future SDK that ignored the path would do (its explicit "Native CLI binary … not found" error). Links to the packaging doc. | Readers of the runtime doc could take the pinned SDK's bundled CLI as a fallback; it is not shipped. |

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| Why the SDK binary can be dropped | The server resolves the SDK in one place and passes a Claude Code path on all three `query` uses; the SDK looks up its platform package only when no path is given. The bundled copy in the macOS app also did not work (re-signed, `SharedArrayBuffer is not defined`). Option B/C (switch to the bundled program) was weighed and not chosen. | `requirements-doc.md` (Findings, DEC-001), `implementation-handoff.md` (Safety premise), `investigation-notes.md` | `electron_packaging.md` (rule and reason), `agent_execution.md` (runtime consequence) |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| `@anthropic-ai/claude-agent-sdk-<platform>` packages in desktop builds and the Docker server package (about 200–240 MB each) | Nothing: removed after staging by `claude-agent-sdk-binary-packaging.mjs`; the installed `claude` runs | `electron_packaging.md`, `agent_execution.md` |

## No-Impact Decision (Use Only If Truly No Docs Changes Are Needed)

- Not used. Docs impact: `Updated` (one long-lived doc by delivery, one by implementation). `DESIGN.md`, `TESTING.md`, `RELEASE.md` reviewed: no change, reasons above.

## Delivery Continuation

- Result: `Pass`
- Next delivery action: verification from evidence (done, see `release-deployment-report.md`), archive, finalization onto `origin/personal`, no release.
- Notes: no follow-up was found by any role or by delivery (no `follow-ups.md`).
