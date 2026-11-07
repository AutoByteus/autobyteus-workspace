# Solution Handoff — one-step-phone-pairing (autobyteus-395, with autobyteus-391)

- Result: `Architecture Design Complete`
- Classification: `task_size = Large`, `architectural_risk = High` (design-spec.md, "Task Size And Architectural Risk")
- Route: the handoff rule for Large or High → `/software_engineering_team/architecture_reviewer`
- Solution revision: `SR-012` (with SR-012a: the user's approval of the design)
- From: Solution Designer (Software Engineering Team coordinator), 2026-11-07

## Original request

Project Task `autobyteus-395` in Project `project_a1377344-25db-482a-97cc-ecfdb0fb495a`, from `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`), for the user. It now also covers the cancelled `autobyteus-391` (switching between nodes inside `/mobile`).

The user's words:
- 2026-11-06: "Is it possible like there's just one button? It doesn't matter whether I use Tailscale or not … click and it generates a QR code … scan, and then I'm connected … On the Docker node I can also do it this way … I can add multiple nodes on my phone".
- 2026-11-07: "they just want to genreate a qrcode, and scan immediately … they want to be able to connect multiple nodes so that they could switch between different nodes on phone".

## Goals

On the desktop, one press per way to connect, with the best ready way pre-selected and every address checked. The same works for the desktop's node, local Docker nodes and remote nodes. On the phone, scan and be connected, nodes keep their names, and you can switch between nodes from inside a page. Existing pairings keep working.

## Documents (all in this folder)

- [requirements-doc.md](requirements-doc.md) — `Approved` (SR-011; SR-012 technical edits DEC-019…DEC-021). Scope Guardrail, REQ-001…REQ-023, AC-001…AC-016, DEC-001…DEC-021.
- [investigation-notes.md](investigation-notes.md) — evidence E-01…E-27 (Measured / Read noted per row), unknowns U-001…U-005.
- [design-spec.md](design-spec.md) — the architecture; status `Ready`; the user's approval recorded.
- [solution-revision-record.md](solution-revision-record.md) — SR-001…SR-012a.
- [follow-ups.md](follow-ups.md) — FU-001 (iOS), FU-002 (one node at two addresses), FU-003 (duplicate IP helpers in server-addressing).
- [product-design-request.md](product-design-request.md) — the brief to the Product Team (context only).
- The normative UI/UX spec (external, Product-owned): `/Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/one-step-phone-pairing/ui-ux-spec.md` with `visual-references/VIS-001…VIS-034`; UI reference revision `d2e960cc`, record `34677c88`.

## Approval basis

- The user approved the UI/UX design on 2026-11-07: "if things are consistant. then i approve".
- He approved the plan on 2026-11-07: "I trust that you can make reasonable decisions. For this ticket, we need to release a beta. since for my codex i dont have limit now, i waive for codex if delivery engineer asks".
- The Solution Designer decided the network and technical points within his direction ("you know the best", "you know the different network environments more than me"). The decisions are recorded in the requirements doc with reasons.

## Constraints

- No new Android permission.
- The trusted private network model stays; plain HTTP only on private addresses, never public exposure.
- AutoByteus does not run Tailscale commands.
- The user's real nodes, Tailscale configuration and paired phones stay untouched; tests use isolated nodes.
- No real node names, addresses, live codes or secrets in fixtures, logs, screenshots or commits. The Task's screenshots show his real node name: never copy them.
- Windows: low priority. Mac and Linux are verified; Windows only must not break (QR-006).

## Workspace

- Worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/one-step-phone-pairing`, branch `codex/one-step-phone-pairing` (not pushed).
- Base `origin/personal` @ `677f61de0b`; finalization target `origin/personal`.

## Release direction (for delivery)

- Release a **beta** for this ticket after finalization.
- The user waives a release smoke check that needs Codex: "i waive for codex if delivery engineer asks".

## Open risks for review

- U-001, U-004, U-005: Linux detection rules were read, not run.
- U-006: Tailscale Serve and the `--https=<port+10000>` rule (optional Advanced text only).
- U-003: desktop address checks under the 403 Origin rule.
- The `@JavascriptInterface` bridge surface (design-spec Key Tradeoffs).

## Expected next step

Independent architecture review of design-spec.md against the approved requirements and the UI/UX spec. On Pass, implementation follows the configured route. Findings that change intended behavior return to the Solution Designer.

## Route taken

- 2026-11-07: sent to `/software_engineering_team/architecture_reviewer` (run `architecture_reviewer_216348f5f87944b4a511f6990bebad76`) by the rule for Large or High.

## Round 2 (SR-013, after ARCH-REV-001)

- All findings AR-001…AR-009 are addressed in design-spec.md: the bridge, the way composition per node kind, Android entry forms, the classifier rules, the opaque session ID and the Serve port rule. Requirements wording is updated, and DEC-022…DEC-024 are recorded in requirements-doc.md.
- Shared-intent decision (AR-006): DEC-023, a pairing link shared into the app pairs at once, like Paste a link.
- The user, 2026-11-07, on the computer name: "If we cannot get the computer name, that's also fine from my side". Fallback recorded.
- 2026-11-07: returned to `/software_engineering_team/architecture_reviewer` for round 2.
- 2026-11-07: round 3 (SR-014, AR-010 and N-1…N-6) returned to `/software_engineering_team/architecture_reviewer`.
