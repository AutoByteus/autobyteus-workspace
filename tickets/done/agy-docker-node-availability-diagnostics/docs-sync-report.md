# Docs Sync Report — agy-docker-node-availability-diagnostics

## Scope

- Ticket: `agy-docker-node-availability-diagnostics`. Classification: `task_size=Small`, `architectural_risk=Low`. Route: direct (no independent architecture, source or test-code review).
- Trigger: API/E2E Pass (API-REV-003) from `/software_engineering_team/api_e2e_engineer`, 2026-10-13.
- Bootstrap base reference: `origin/personal` @ `2756d7b29`.
- Integrated base reference used for docs sync: `origin/personal` @ `32aca0818`, merged into the ticket branch as `6e1fbd7e5` (clean merge).
- Post-integration verification reference: `delivery-evidence/dr-001/` (see `release-deployment-report.md`, "Initial Delivery Integration Refresh").

## Why Docs Were Updated

- Summary: The implementation commits (`87b246c7d`, `56b11aeae`) already updated the three long-lived docs that describe this behavior. Delivery checked them against the integrated code and found them accurate. Delivery adds no further changes to product docs. One separate project-guidance update, to `TESTING.md`, is drafted and waits for the user to confirm its wording.
- Why this should live in long-lived project docs:
  - The new `AGY_SIGN_IN_REQUIRED` diagnostic belongs in the AGY module doc.
  - The Model menu's "Unavailable" row and its re-check on open belong in the web chat doc.
  - Docker node users need the recovery step (run `agy` on that node, then reopen the menu).
  - Testers need the `agy` sign-in isolation and test-owned Docker node rules.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result (`Updated`/`No change`/`Needs follow-up`) | Notes |
| --- | --- | --- | --- |
| `autobyteus-server-ts/docs/modules/antigravity_cli_runtime.md` | Owns AGY discovery diagnostics | Updated (in `87b246c7d`/`56b11aeae`) | It describes `AGY_SIGN_IN_REQUIRED` with the final SR-005 text, says output is matched but never echoed, and says unrecognised wording falls back to the generic failure. This matches `antigravity-cli-capability.ts`. |
| `autobyteus-web/docs/chat.md` | Owns the chat Model menu behavior | Updated (in `87b246c7d`/`56b11aeae`) | The new "Unavailable runtimes in the Model menu" section matches `ChatModelMenu.vue` and `useChatModelCatalog.ensureAvailability`: neutral label, reason shown, two-line clamp, only unavailable kinds re-checked on open. |
| `autobyteus-server-ts/docker/README.md` | Docker node users' CLI sign-in guide | Updated (in `87b246c7d`/`56b11aeae`) | The "CLI Auth Model" paragraph quotes the final text and the per-node `/root` sign-in. The base merge changed other parts of this file (legacy Docker retirement); the two sets of changes merged cleanly and the result was checked. |
| `README.md` (root), `docker/` | Changed by the base merge | No change | They don't mention runtime availability or the "Not installed" label. |
| `TESTING.md` | API/E2E drafted a global note on `agy` sign-in isolation and test-owned Docker nodes | Updated | The user approved it on 2026-10-13 (DR-002), and it is committed on its own as `15625371b` (`docs(testing): …`). |
| Repository-wide search | Stale "Not installed" / old AGY texts | No change | `git grep` outside tickets/tests: "Not installed" remains only in the Voice Input extension settings, which is unrelated and out of scope. |

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| `autobyteus-server-ts/docs/modules/antigravity_cli_runtime.md` | Behavior (implementation commit) | New `AGY_SIGN_IN_REQUIRED` diagnostic and how it is selected | New server diagnostic |
| `autobyteus-web/docs/chat.md` | New section (implementation commit) | "Unavailable runtimes in the Model menu" | New menu row and re-check behavior |
| `autobyteus-server-ts/docker/README.md` | User guidance (implementation commit) | What the message means and how to recover on a node | User-facing recovery on Docker nodes |
| `TESTING.md` | Testing guidance (`15625371b`) | `agy` sign-in isolation with a throwaway `HOME` and only the token copied; test-owned Docker nodes | Reusable test practice from this ticket's validation |

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| AGY sign-in classification | A non-zero `agy` exit whose bounded output has sign-in wording becomes `AGY_SIGN_IN_REQUIRED`. The output is never echoed, and new upstream wording falls back to the generic text (RSK-001). | design-spec, investigation-notes | `antigravity_cli_runtime.md` |
| Menu re-check | Only runtimes shown as unavailable are force-re-checked on open; available runtimes are not | design-spec, implementation-handoff | `autobyteus-web/docs/chat.md` |
| Per-node sign-in | Each Docker node's `/root` volume holds its own CLI sign-ins | investigation-notes (8001 vs 8003) | `autobyteus-server-ts/docker/README.md` |
| Testing `agy` and Docker nodes | Throwaway `HOME`; never the user's node containers or volumes | API/E2E execution report | `TESTING.md` |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| `chat.model.notInstalled` ("Not installed" / "未安装") and `data-test="chat-runtime-not-installed"` | `chat.model.unavailable` ("Unavailable" / "不可用"), plus the reason line `data-test="chat-runtime-reason"` | `autobyteus-web/docs/chat.md` |
| Reason only in the row tooltip | Visible reason under the runtime name; the tooltip keeps the full text | `autobyteus-web/docs/chat.md` |
| One availability check per app session | Unavailable runtimes are re-checked on each menu open | `autobyteus-web/docs/chat.md` |

## Delivery Continuation

- Result: `Pass`
- Next delivery action: finalization under `RELEASE.md`, with no release (the user's decision).
- Notes: product docs and the `TESTING.md` guidance are complete.
