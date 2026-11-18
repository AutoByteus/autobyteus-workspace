# Handoff — autobyteus-305: Architecture Design Complete

- Package: `docker-node-in-place-server-update`
- Task: Project Task `autobyteus-305` in Project `project_a1377344-25db-482a-97cc-ecfdb0fb495a`, "Docker nodes: let the server update itself inside its container …"
- Requested by: `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`), on the user's request of 2026-10-25
- Result: `Architecture Design Complete`, SR-005 (revision after ARCH-REV-001 Fail; previous round SR-004)
- Classification: `task_size: Large`, `architectural_risk: High` (design-spec.md, "Task Size And Architectural Risk")
- Workspace:
  - worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/docker-node-in-place-server-update`;
  - branch `codex/docker-node-in-place-server-update`;
  - base `origin/personal` @ `9d59ab82ec`;
  - finalization target `origin/personal`.
  - The ticket documents are uncommitted files in the worktree's ticket folder.
- Ticket folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/docker-node-in-place-server-update/tickets/in-progress/docker-node-in-place-server-update/`

## Original request and goal

The user: every server change produces a new Docker image, so after every desktop update he must pull a 1.4 GB image and recreate each Docker node. The OS, Node and Chromium almost never change; that was measured byte-identical across 23 releases.

Goal: a Docker node replaces its server inside the same container, on the user's action (from the desktop or by command), with a verified package. A failed update leaves the old version running. A new image is needed only for system changes, and the node says so. Mid-turn runs come back automatically.

## Approval basis

- Requirements `Approved` at SR-003 by the user, 2026-10-30, in the Solution Designer conversation: "Yeah, yeah, I feel like you're recommended. These are good … I accept that."
- DEC-004 (no update-request switch), DEC-005 (data copy only when the update brings a data migration, deleted once the new version runs) and DEC-011 (image every release, kept for simplicity) were decided by the user the same day.
- DEC-016 was revised by the Solution Designer during design: one server volume per node, not shared, because the data copy holds the vault.
- Behavior-defining supplement: `options-report.md` at SR-003. The design lists its refinements under "Changes against the options report".

## Constraints the reviewer must hold the design to

- **Supply chain:** a node runs only Ed25519-signed packages (key in the image, secret in GitHub).
- **No automatic updates.**
- **Nothing exposed to agents:** no tool exists. Phones are refused (`TRUSTED_NETWORK_OWNER`).
- **No secrets in logs.**
- **Data:** never lose user data; the copy and restore are scoped by DEC-005.
- **No release** unless the user asks.
- **Proof** from a clean clone and on a real Docker node; the user's nodes `autobyteus-server-0/1/2` are not touched.
- **DESIGN.md rule 9:** exception limited to the frozen contracts C1–C4 (DEC-007).

## Evidence

The investigation notes hold all evidence (Source Log, Re-analysis 2026-10-30, Architecture Investigation Findings A-01..A-13). The key items:
- **Measured download per upgrade:** 1.38–1.44 GB.
- **Measured package:** 313 MB.
- **Reproduced start:** the package, mounted read-only into the published image, was healthy in 7 s.
- **Reproduced verification:** Ed25519 verify works in the image's Node.
- **Probed downloads:** GitHub release downloads and track resolution use no API quota.

## Dependencies and open items

- Build step 5 waits for autobyteus-284 (bounded stop; code review passed, not merged), autobyteus-285 and autobyteus-287. The Task records `dependsOn`.
- U-02: the package job must wait for the GitHub release that the desktop workflow creates.
- Follow-ups: FU-001..FU-004 (`follow-ups.md`), none urgent, not yet sent (they are sent when the ticket leaves the team).

## Round 2 (SR-005)

- **What changed:** every finding AR-001..AR-012 is resolved, as listed in design-spec.md "Resolution of ARCH-REV-001"; details are in solution-revision-record.md SR-005.
- **Prior review:** design-review-report.md (ARCH-REV-001). Its basis was SR-004.
- **Residual:** the user is asked to confirm DEC-016's changed download figure (non-blocking).

## Expected next step

An independent architecture review of `design-spec.md` against the approved requirements. On Pass, implementation of build step 1 (design-spec "Change / Refactor Sequence"). Before running `gh secret set SERVER_PACKAGE_SIGNING_KEY`, tell the user: he asked to be told, and to be asked when a browser confirmation is needed.

## Documents

- `handoff-architecture-design-complete.md` (this file)
- `requirements-doc.md`
- `investigation-notes.md`
- `solution-revision-record.md`
- `design-spec.md`
- `design-review-report.md` (ARCH-REV-001, reviewer-owned)
- `options-report.md` (approved supplement)
- `follow-ups.md`

## Route record

Rule applied (get_handoff_rules, 2026-10-30): "Architecture Design Complete with task_size=Large or architectural_risk=High … ready for independent architecture review" → `/software_engineering_team/architecture_reviewer`. No other rule matches.
- Round 2 (2026-10-30): the same rule → `/software_engineering_team/architecture_reviewer` (run `architecture_reviewer_8d839e37d73a4a328ffe4b14d4b26da8`).
