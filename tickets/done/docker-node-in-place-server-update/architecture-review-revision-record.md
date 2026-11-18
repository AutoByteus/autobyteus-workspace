# Architecture Review Revision Record — autobyteus-305 (Docker nodes update their server in place)

The latest `design-review-report.md` (same folder) is authoritative. This record keeps the initial baseline and the delta of each later review round.

## Revision Index

| Revision ID | Review Round / Trigger | Related Solution Revision IDs | Prior Decision | Current Decision | Affected Finding IDs |
| --- | --- | --- | --- | --- | --- |
| ARCH-REV-001 | Round 1 / Solution Designer `Architecture Design Complete` (Large / High) | SR-003, SR-004 | N/A | Fail (Design Impact) | AR-001..AR-012 |
| ARCH-REV-002 | Round 2 / Solution Designer revision for ARCH-REV-001 (SR-005, Large / High) | SR-003, SR-005 | Fail | Pass | AR-001..AR-012 resolved; N-1 non-blocking note |
| ARCH-REV-003 | Round 3 / basis confirmation for build step 2 (`handoff-step-2.md`) | SR-005, SR-006, SR-007 | Pass | Pass | N-1 closed (SR-006); no new findings |
| ARCH-REV-004 | Round 4 / build step 3 with the SR-009 delta (`handoff-step-3.md`) | SR-005, SR-009 | Pass | Pass | No findings; non-blocking notes N-2, N-3 |
| ARCH-REV-005 | Round 5 / basis confirmation for build step 4 (`handoff-step-4.md`) | SR-005, SR-009, SR-011 | Pass | Pass | No findings; non-blocking note N-4 |

## Revision Entries

### ARCH-REV-001 — Initial review of the in-place update design

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/docker-node-in-place-server-update/tickets/in-progress/docker-node-in-place-server-update/design-review-report.md`
- Review round and trigger: round 1; Solution Designer run `solution_designer_f2a096fe80af461e9d7c04ea18dfd6fc`, `Architecture Design Complete`, SR-004, `task_size: Large`, `architectural_risk: High`
- Triggering role, report path, and finding IDs: Solution Designer, `handoff-architecture-design-complete.md`; no prior findings
- Relevant solution revision IDs: `SR-003` (requirements approval), `SR-004` (design)
- Prior authoritative decision: N/A
- Current authoritative decision: `Fail`, classification `Design Impact` (AR-012 is an editorial `Requirement Gap`)
- Baseline established:
  - Behavior basis confirmed against the approved requirements and the current code at `9d59ab82ec`. Classification Large / High confirmed.
  - Confirmed as sound: `UpdateRun` owns the update sequence; both entry forms reach one gated `UpdateService`; signature and fit come before any download or change; the data copy is taken only for migrations (DEC-005); one server volume per node; `bootstrap.sh` removal; C1–C4 limited to the DEC-007 exception.
  - Blocking gaps:
    - AR-001: AC-006 refusal at boot.
    - AR-002: one owner of the server child during an update.
    - AR-003: data-copy space check before the point of no return; restore and cleanup order.
    - AR-004: description bound to the requested version.
    - AR-005: consumers of the image layout, including the TESTING.md Docker rule and the compose server volume.
    - AR-006: `zh` variant and manual-dispatch forms.
    - AR-007: track meanings and IMAGE_REF kinds.
  - Small items: AR-008..AR-012.

#### Prior Finding Resolution

None.

- New or remaining finding IDs: AR-001 (High), AR-002 (High), AR-003 (High), AR-004 (Medium), AR-005 (Medium), AR-006 (Medium), AR-007 (Medium), AR-008 (Low), AR-009 (Low), AR-010 (Low), AR-011 (Low), AR-012 (Low, editorial Requirement Gap)
- Material classification changes: none (Large / High confirmed)
- Recommended recipient: Solution Designer
- Remaining risks or uncertainty:
  - the DEC-016 revision changes the presented download figure (0.31 GB per machine → about 0.94 GB on a 3-node machine); recommend confirming with the user and stating the cross-node code-tampering reason;
  - REQ-003 wording vs AC-009;
  - the confirm window and automatic resume (step 5);
  - status polling after 5 minutes.

### ARCH-REV-002 — Re-review of the SR-005 revision

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/docker-node-in-place-server-update/tickets/in-progress/docker-node-in-place-server-update/design-review-report.md`
- Review round and trigger: round 2; Solution Designer run `solution_designer_f2a096fe80af461e9d7c04ea18dfd6fc`, `Architecture Design Complete`, SR-005 (revision for ARCH-REV-001), Large / High
- Triggering role, report path, and finding IDs: Solution Designer, `handoff-architecture-design-complete.md`, design-spec "Resolution of ARCH-REV-001"; AR-001..AR-012
- Relevant solution revision IDs: `SR-003`, `SR-005`
- Prior authoritative decision: `Fail` (ARCH-REV-001)
- Current authoritative decision: `Pass`
- What changed: each resolution was checked against the current design-spec, requirements and investigation notes, not against the resolution table alone. All findings are resolved. One non-blocking wording note (N-1) is left for implementation.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| AR-001 | Open (High) | Resolved | SR-005 | DS-003 boot step 4: explicit `NEEDS_NEW_IMAGE` when N does not fit and only older packages fit; the starter stays up, serves C2 status, runs no server; the "Selection at boot" example includes the case; the `UpdateService` gate refuses while no server runs |
| AR-002 | Open (High) | Resolved | SR-005 | `ServerSupervisor` is the one owner of the child, with modes `supervising`/`updating` set by `beginUpdate`/`endUpdate`; one awaiter of `exited`; DS-007 exit-case table maps each phase to `SERVER_EXITED_DURING_UPDATE`, `INTERRUPTED` or `FAILED_AFTER_SWITCH`; boundary row forbids other spawners |
| AR-003 | Open (High) | Resolved | SR-005 | DS-006: `needsCopy` and `checkSpace` (package + data size + margins) before the point of no return; re-check at the copy, failing to the old server without a trial; `beginTrial` after the copy completes; rollback restore → `rollBackTrial` → delete → start; commit `commitTrial` → delete; DS-003 repeatable restore with a trial and leftover cleanup without one; DEC-005 reasoning updated |
| AR-004 | Open (Medium) | Resolved | SR-005 | `PackageVerifier` order: signature → binding (version, arch, `archive.name`) → fit → SHA → `server-package.json` equality; `DESCRIPTION_MISMATCH`; step 3 test with a renamed older pair |
| AR-005 | Open (Medium) | Resolved | SR-005 | Current-State Read lists the six consumers; Change Scope gives a decision and step for each (TESTING.md rule rewritten for `/opt/autobyteus/server-package`; three tests; compose `autobyteus-server-server-packages` volume; READMEs); the e2e PID comes from `cli.mjs status` |
| AR-006 | Open (Medium) | Resolved | SR-005 | DS-004 table: tag push / manual default (`--clobber`, ordered) / `publish_zh` (no package job; AC-011 limited to default images); zh digest in `system-level.json` inputs |
| AR-007 | Open (Medium) | Resolved | SR-005 | `beta` = newest recognized release, beta or stable (`releases.atom`); `stable` = `/releases/latest`; IMAGE_REF table with refusals for pinned and custom images; `latest-zh` → stable |
| AR-008 | Open (Low) | Resolved | SR-005 | Removal plan rows for `AUTOBYTEUS_WORKSPACE_ROOT` (3 places), `.env.example:12-18`, `docker-start.sh:250-254`, e2e `:210`; evidence sentence corrected |
| AR-009 | Open (Low) | Resolved | SR-005 | `UpdateStatus` is the one owner of the running version; `ServerPackageInfo` removed; `AUTOBYTEUS_STARTER_SOCKET` in C4 makes presence explicit (`unavailable` vs `error`) |
| AR-010 | Open (Low) | Resolved | SR-005 | Frozen set names the `cli.mjs` arguments, one-line JSON output and exit codes 0/1/2 (C2) and `server-package.json` (C3); unknown codes show `message` |
| AR-011 | Open (Low) | Resolved | SR-005 | `SelfCheck` environment: fresh folder with its own `.env`, workspace and home, environment built from scratch, no `AUTOBYTEUS_*` or starter socket, loopback, free port; boot cleans `self-check-*` |
| AR-012 | Open (Low, editorial) | Resolved | SR-005 | Requirements REQ-003, REQ-006, DEC-005 and SCN-001 corrected (checked in the file); investigation behaviors renamed `CUR-001..CUR-007`; DS-007 cites CUR-003 |

- New or remaining finding IDs: none blocking. N-1 (non-blocking stale wording):
  - DEC-016 still names the `<node>-server` volume;
  - the `starter.mjs` and `starter-client.ts` file-mapping rows;
  - the `system-level.json` row lacks `baseImages`;
  - the example says `serverProcess.stop()`;
  - the Legacy Removal Policy list is shorter than the Removal plan.
- Material classification changes: none (Large / High)
- Recommended recipient: Implementation Engineer (build step 1); informational notification to the Solution Designer
- Remaining risks or uncertainty:
  - the DEC-016 download figure is awaiting the user's confirmation;
  - a node in `NEEDS_NEW_IMAGE` refuses in-place updates (consistent with AC-006);
  - a fetch during a `--clobber` re-publish can fail once;
  - R-07 (step 5);
  - step 5 waits for autobyteus-284/285/287;
  - tell the user before `gh secret set`.

### ARCH-REV-003 — The SR-005 basis confirmed for build step 2

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/docker-node-in-place-server-update/tickets/in-progress/docker-node-in-place-server-update/design-review-report.md` (section "Step 2 Basis Confirmation")
- Review round and trigger: round 3; Solution Designer run `solution_designer_f2a096fe80af461e9d7c04ea18dfd6fc`, `Architecture Design Complete` for build step 2 (`handoff-step-2.md`); step 1 finalized (merge `eec6522b27`, `origin/personal` @ `77fb8bf2d1`)
- Relevant solution revision IDs: `SR-005` (design), `SR-006` (N-1 wording), `SR-007` (step 1 receipt, PRQ-001 delivered)
- Prior authoritative decision: `Pass` (ARCH-REV-002)
- Current authoritative decision: `Pass`, applying to build step 2
- What changed:
  - Checked that the design is unchanged apart from the SR-006 wording fixes.
  - Checked that step 1 as built matches the design that step 2 relies on (package path, `server-package.json` writer, `system-level.json` with `baseImages`, supervisord seam). Implementation assumptions A-1 and A-2 stay within the design.
  - Checked that autobyteus-284's server shutdown bound (10 s cleanup plus tree sweep, `server-process-shutdown.ts:8`) fits the starter's 120 s stop limit.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| N-1 (non-blocking) | Open | Resolved | SR-006 | DEC-016 names `<node>-server-packages`; the `starter-client.ts` row uses `AUTOBYTEUS_STARTER_SOCKET`; the `system-level.json` row has `baseImages`; the example says `supervisor.stop()` |

- New or remaining finding IDs: none. Non-blocking implementation note: set supervisord `stopwaitsecs` above the server's shutdown bound in `supervisor-autobyteus-server.conf`.
- Material classification changes: none (Large / High)
- Recommended recipient: Implementation Engineer (build step 2); informational notification to the Solution Designer
- Remaining risks or uncertainty:
  - the DEC-016 figure is awaiting the user's confirmation;
  - step 5 still waits for autobyteus-285 and -287.

### ARCH-REV-004 — Build step 3 and the SR-009 delta

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/docker-node-in-place-server-update/tickets/in-progress/docker-node-in-place-server-update/design-review-report.md` (section "Step 3 Review: SR-009 Delta")
- Review round and trigger: round 4; Solution Designer run `solution_designer_f2a096fe80af461e9d7c04ea18dfd6fc`, `Architecture Design Complete` for build step 3 (`handoff-step-3.md`); step 2 finalized (merge `a0f4b491f7`, `origin/personal` @ `6b34f900b6`)
- Relevant solution revision IDs: `SR-005` (design), `SR-009` (RU-23, CR2-N1)
- Prior authoritative decision: `Pass` (ARCH-REV-003)
- Current authoritative decision: `Pass` for build step 3
- What changed:
  - The design-spec diff holds only the delta: the `NO_PACKAGES_VOLUME` gate in `UpdateService`, the optional `updateBlocker` in C2/C1, launcher `status` showing the starter state, and the release-notes instruction.
  - Each part checked: gate scenario (API-12 evidence; the MP-001 consequence), mount detection (no Dockerfile `VOLUME`, `Dockerfile.monorepo:120`), additive frozen-contract change, single gate owner.
  - Step 2 as built supports step 3: `ServerSupervisor` and its `exited` promise, `stopwaitsecs=30`, and D-1..D-3 confirmed by CRR-003.

#### Prior Finding Resolution

None open.

- New or remaining finding IDs: none. Non-blocking notes:
  - N-2: `updateBlocker` comes from `UpdateService`'s one gate rule;
  - N-3: launcher `status` tolerates a node without a starter or a stopped container.
- Material classification changes: none (Large / High)
- Recommended recipient: Implementation Engineer (build step 3); informational notification to the Solution Designer
- Remaining risks or uncertainty:
  - the DEC-016 figure is awaiting the user's confirmation;
  - step 5 waits for autobyteus-285 and -287;
  - the release notes of the release that ships step 3 must tell launcher users to reinstall the launcher.

### ARCH-REV-005 — The basis confirmed for build step 4 (desktop)

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/docker-node-in-place-server-update/tickets/in-progress/docker-node-in-place-server-update/design-review-report.md` (section "Step 4 Basis Confirmation")
- Review round and trigger: round 5; Solution Designer run `solution_designer_f2a096fe80af461e9d7c04ea18dfd6fc`, `Architecture Design Complete` for build step 4 (`handoff-step-4.md`); step 3 finalized, beta v1.5.11-beta.6 released (`origin/personal` @ `1bed6deeaf`)
- Relevant solution revision IDs: `SR-005`, `SR-009` (design); `SR-010`, `SR-011` (evidence)
- Prior authoritative decision: `Pass` (ARCH-REV-004)
- Current authoritative decision: `Pass`, applying to build step 4
- What changed:
  - Checked that there is no design or requirements change (`git diff` empty).
  - Checked that step 3 as built supports step 4: C1 GET shape, the owner route class for all methods on `/rest/node-update`, the starter's request path.
  - Placed the carried items: CR3-N1 inside `SelfCheck`, with output only to the starter log (AC-012); the stale `previous` cleanup is optional and, if done, in `PackageStore.choose`.

#### Prior Finding Resolution

None open. N-2 and N-3 were implementation notes for step 3.

- New or remaining finding IDs: none. Non-blocking note N-4: a row state for `inPlaceUpdate: "error"` and for a failed GET.
- Material classification changes: none (Large / High)
- Recommended recipient: Implementation Engineer (build step 4); informational notification to the Solution Designer
- Remaining risks or uncertainty:
  - the DEC-016 figure is awaiting the user's confirmation;
  - step 5 waits for autobyteus-285 and -287.
