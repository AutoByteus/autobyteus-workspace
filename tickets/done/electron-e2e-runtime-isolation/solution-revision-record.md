# Solution Revision Record

The latest `requirements.md`, `investigation-notes.md`, and `design-spec.md` remain authoritative. This record indexes the initial solution baseline and any later architecture/downstream rework without duplicating those artifacts.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Result |
| --- | --- | --- | --- | --- |
| SR-001 | Solution designer initial approved solution round | N/A | `Initial Baseline` | Ready for architecture review |
| SR-002 | Architecture reviewer / `design-review-report.md` / round 1 | AR-F-001, AR-F-002, AR-F-003, AR-F-004 | `Design Impact` | Revised package ready for architecture re-review |
| SR-003 | Code reviewer / `code-review-report.md` / round 1 plus explicit user scope correction | CR-F-001, CR-F-002, CR-F-003, CR-F-004, CR-F-005; AR-F-004 reassessment | `Design Impact` + `Requirement Scope Correction` | Revised package ready for scope-constrained architecture re-review |

## Revision Entries

### SR-001 — Same-artifact Electron launch-profile isolation baseline

- Triggering role, report path, and round: Solution designer; initial investigation/requirements/design round; no triggering report.
- Triggering finding IDs: `N/A`
- Prior authoritative result: `N/A`
- Current authoritative result: Approved requirements basis and actionable design are ready for architecture review.
- Why this baseline or revision entry is recorded: Establish the first complete solution package for running a worktree-built packaged Electron E2E process concurrently with the already-running ordinary application.
- Resolution: Use one production-equivalent artifact and an immutable Electron launch profile. Default/explicit `production` preserves existing behavior. Explicit `e2e` requires `AUTOBYTEUS_ELECTRON_SERVER_PORT` and `AUTOBYTEUS_ELECTRON_DATA_ROOT`, resolves before stateful imports, isolates AutoByteus and Electron state, propagates one backend endpoint through main/renderer owners, disables updater activity, and is launched/cleaned by an ownership-safe reusable harness. No special build identity/profile is introduced, and the ordinary application is not stopped.
- Approved behavior or requirement IDs affected: BEH-001 through BEH-007; R-001 through R-010; AC-001 through AC-012.
- Canonical artifacts and sections updated: `requirements.md` (all sections; status `Refined` and approval recorded), `investigation-notes.md` (bootstrap, evidence, current paths, approval, official Electron path-timing evidence), `design-spec.md` (initial complete design).
- Supplemental artifacts updated, added, or removed: None.
- Downstream and architecture-review impact: Architecture reviewer must decide whether the early bootstrap boundary, injected ownership model, renderer propagation/removal plan, same-artifact launcher, and safe concurrency contract are implementation-ready. If passed, implementation must follow the clean-cut removal sequence; API/E2E later owns real packaged coverage investigation/execution.
- Next recipient or routing: `/architecture_reviewer`
- Remaining gaps or risks: Installed `playwright-core`/Electron compatibility for renderer automation; platform-specific PID-tree cleanup; port-allocation race handled by fail-closed checks; final audit for unobserved mutable paths; remote/browser renderer regression risk; future addition of a single-instance lock would conflict with the approved capability.

### SR-002 — Safe-root, adaptable launch, listener, and environment correction

- Triggering role, report path, and round: Architecture reviewer; `/Users/normy/autobyteus_org/autobyteus-worktrees/electron-e2e-runtime-isolation/tickets/done/electron-e2e-runtime-isolation/design-review-report.md`; round 1 / `ARCH-REV-001`.
- Triggering finding IDs: `AR-F-001`, `AR-F-002`, `AR-F-003`, `AR-F-004`
- Prior authoritative result: `Fail / Design Impact`; implementation blocked.
- Current authoritative result: All four design findings are resolved in the canonical design and supporting investigation rationale; package is ready for architecture re-review. Approved requirements and behavior remain unchanged.
- Why this baseline or revision entry is recorded: The initial macro architecture was sound, but reachable filesystem mutation, Playwright ownership, listener/client semantics, and credential inheritance gaps required structural correction before implementation.
- Resolution: (1) Raw roots are projected/canonicalized without mutation, accepted roots must already exist, and only a branded `ResolvedSafeE2EDataRoot` authorizes descendant writes; preparation creates owned roots only with `mkdtemp` under a prevalidated canonical temp parent. (2) Process-neutral `PreparedElectronE2ELaunch` is consumed by separate direct and Playwright adapters behind a common readiness/cleanup session. (3) `EmbeddedServerClientEndpoint` names the loopback client URL while `EmbeddedServerListenerPolicy: preserve-backend-default` preserves `0.0.0.0`; port checks bind with listener-equivalent wildcard semantics and adapters pass no host. (4) E2E preparation uses a cross-platform allowlist, the thin entry scrubs sensitive/unsafe values before dynamic import, and platform managers receive only the post-scrub base environment plus required/internal per-instance overrides; provider/search secrets are seeded into the isolated root.
- Approved behavior or requirement IDs affected: BEH-001, BEH-002, BEH-003, BEH-004, BEH-005, BEH-006; R-002, R-003, R-005, R-006, R-007, R-009; AC-001, AC-003, AC-005, AC-008, AC-009, AC-013. No approved outcome changed.
- Canonical artifacts and sections updated: `requirements.md` BEH-001/002/004, R-005/R-007, AC-003/009/013, constraints/scenarios/approval clarification (no approved outcome change); `investigation-notes.md` current status/source log/design-health/current behavior/constraints/architecture notes; `design-spec.md` current state, intended change, behavior map, health/terminology/removal/data decision, DS-001/002/005/006/007, ownership/boundaries/dependencies/interfaces/subsystems/files/folders/examples/sequence/tradeoffs/risks/guidance; this revision record.
- Supplemental artifacts updated, added, or removed: None.
- Downstream and architecture-review impact: Architecture reviewer should verify each finding against the revised safe-root proof, prepared-resource/adapter composition, client/listener config, and two-stage E2E environment policy. Implementation remains blocked until review passes.
- Next recipient or routing: `/architecture_reviewer`
- Remaining gaps or risks: Host-specific safe environment allowlist validation; filesystem TOCTOU outside the reviewed create-before-check issue; Playwright/package-version compatibility; OS-specific targeted process-tree fallback; accepted port-allocation race; renderer/browser/remote regression audit; future single-instance lock incompatibility.
- Later correction: `SR-003` supersedes only the AR-F-004-derived credential/environment portion of this entry. The safe-root, prepared-adapter, and client/listener corrections remain authoritative. The statement that AR-F-004 caused no approved-outcome change was incorrect because the user had not approved a credential-policy expansion.

### SR-003 — Scope restoration and identity-based cleanup correction

- Triggering role, report path, and round: Code reviewer; `/Users/normy/autobyteus_org/autobyteus-worktrees/electron-e2e-runtime-isolation/tickets/done/electron-e2e-runtime-isolation/code-review-report.md`; round 1 / `CRR-001`, followed by explicit user clarification after that review.
- Triggering finding IDs: `CR-F-001`, `CR-F-002`, `CR-F-003`, `CR-F-004`, `CR-F-005`; reassessment of architecture finding `AR-F-004` and its derived `MP-003`/`AC-013` policy.
- Prior authoritative result: Implementation source review `Fail / Design Impact`; implementation commit `593ffcb5d243721a703bd15f4bb880e4c56b6d83` must not advance to API/E2E. SR-002/ARCH-REV-002 still treated credential sanitization as required.
- Current authoritative result: The canonical requirements and design now restore the user's approved ticket scope and resolve CR-F-001. The package is ready for architecture re-review before implementation rework; implementation and API/E2E remain blocked until the revised path passes their required reviews.
- Why this revision entry is recorded: Code review exposed that DS-006 conflated ambient port state with process/root ownership. The user then confirmed that AR-F-004 had incorrectly expanded this port/data/profile isolation ticket into credential-policy redesign and required existing internal-server/API-key/provider/Codex provisioning and caller environment behavior to remain unchanged.
- Resolution: (1) Adapter-owned whole-process-tree completion is the sole process-lifecycle authorization for disposal of a preparation-owned root. Port availability is a post-completion diagnostic only; a foreign/rebound listener is never signaled and cannot veto root disposal. Unconfirmed tree completion retains the root and fails cleanup. (2) Remove the SR-002 credential allowlist/denylist, main scrub, sanitized backend environment snapshot, generic HOME/config redirection, secret-seeding prerequisite, and AC-013. Preparation preserves caller/test environment values and forces only the three launch-profile isolation keys; platform managers preserve existing environment/provisioning behavior. Add AC-014 and an explicit scope guardrail. (3) `CR-F-002` is superseded and must not add `CODEX_HOME` filtering. Retain implementation corrections `CR-F-003` (dispose owned root after settled Playwright rejection), `CR-F-004` (confirm whole owned tree), and `CR-F-005` (remove dead lifecycle field).
- Approved behavior or requirement IDs affected: BEH-003, BEH-005, BEH-006; R-007, R-008, R-009; AC-009, AC-012, new AC-014; AC-013 removed as unapproved scope. UC-007 and SCN-008 added for environment/provisioning preservation. The user-visible same-artifact/coexistence outcome remains unchanged.
- Canonical artifacts and sections updated: `requirements.md` goal, behavior map, recommendations, in-scope/out-of-scope and explicit scope guardrail, R-007/R-008, AC-009/012/014, assumptions/scenarios/approval history; `investigation-notes.md` status/source chronology/current evidence/findings/constraints/reviewer notes; `design-spec.md` review-resolution tables, behavior/spine/ownership/environment/cleanup boundaries, removal plan, interfaces/files/examples/sequence/tradeoffs/risks/guidance; this revision record.
- Supplemental artifacts updated, added, or removed: None.
- Downstream and architecture-review impact: Architecture review must evaluate CR-F-001's identity-based cleanup contract and verify exact alignment with the explicit scope guardrail. It must not reintroduce credential filtering or another business requirement without user approval. On pass, implementation must remove the AR-F-004-derived source/tests, implement whole-tree cleanup/root disposition, apply CR-F-003 through CR-F-005, and return to code review before API/E2E.
- Next recipient or routing: `/architecture_reviewer`
- Remaining gaps or risks: OS-specific affirmative whole-tree completion mechanics; Playwright/package-version execution; implementation removal of the now-rejected environment policy; accepted port-allocation race diagnostics; realistic packaged coexistence and provider-journey coverage after source review; renderer/browser/remote regression audit; filesystem TOCTOU outside the proven safe-root boundary; future single-instance lock incompatibility.
