# Initial Prototype Baseline — Requirements Investigation Notes

## Investigation Meta

- Request / ticket: Initial prototype baseline
- Workspace root: `/home/autobyteus/workspace/.codex/worktrees/initial-prototype-baseline`
- Repository mode: `Git`
- Task worktree / branch: `/home/autobyteus/workspace/.codex/worktrees/initial-prototype-baseline` / `codex/initial-prototype-baseline`
- Base or reference revision: Prototype team fetched `origin/personal` at bootstrap kickoff on 2026-08-22 and pinned the then-latest exact commit `8ef282ba77705180d985e7000d801f0e0068cdc1`.
- Bootstrap result: Observable prototype baseline accepted under PPA-001 and user-approved; repository placement remains valid after the task branch was rebased onto latest `origin/personal`. Rewritten owning prototype commit: `a9e3634667ed6cc9cd3bf9528362a7b50d131427`.
- Bootstrap blocker: None.
- Current requirements revision ID: `RER-006`
- Investigation status: Complete for Git base synchronization; approved prototype source pin remains unchanged pending any explicit refresh request.

## Initial Request And Clarifications

- Original request: “i need to have initial prototype baseline. this is the requriement.”
- Clarifications received: The captured baseline must use the latest source revision. This ticket is only for the product prototype and does not authorize architecture design or production software engineering.
- User-supplied facts and constraints: An initial prototype baseline is the requested outcome; latest source is required; completion is terminal at the accepted product prototype.
- Initial ambiguity: Resolved as `autobyteus-web`, following the prior recommendation and user's latest-source confirmation. A kickoff fetch must translate “latest” into an exact reproducible commit.

## Product And Domain Understanding

- Product area: Current-state product prototype bootstrap.
- Affected actors or systems: User/product reviewer, product prototyper, prototype bootstrapper, and one selected frontend application.
- Existing user or operational purpose: Establish trustworthy, runnable current-state evidence before future-state prototype changes.
- Relevant terminology: “Baseline” means complete observable parity for the selected source frontend revision, not a partial mockup or screenshot collection.

## Source Log

| Source ID / Date | Source Type | Exact Source / Command / Query | Why Consulted | Relevant Finding | Follow-Up |
| --- | --- | --- | --- | --- | --- |
| SRC-001 / 2026-08-22 | User | Initial request in this thread | Establish intent | User explicitly requests an initial prototype baseline but does not name the frontend. | Obtain `DEC-001`. |
| SRC-002 / 2026-08-22 | Contract | `/home/autobyteus/workspace/autobyteus-agents/agent-teams/requirements-engineering-team/shared/product-prototype-principles.md` | Determine governing baseline rules | Existing-frontend bootstrap requires one explicit application boundary, source-stack alignment, complete observable parity, deterministic mocks, isolation, and itemized evidence before future-state work. | Carry requirements into the prototype packet. |
| SRC-003 / 2026-08-22 | Command | `find . -maxdepth 2 -type d`; `find ui-prototypes autobyteus-web/ui-prototypes ...` at base revision | Identify candidate client and prototype boundaries | Candidate clients include `autobyteus-web`, Android, iOS, and application packages. Discovered prototype directories are named for focused features/surfaces; the shallow inventory did not establish a canonical complete current-state runnable baseline. | Recheck applicable existing roots after app selection. |
| SRC-004 / 2026-08-22 | Code | `autobyteus-web/package.json`, `autobyteus-web/nuxt.config.ts`, mobile project manifests, application package manifests | Support an informed target recommendation | `autobyteus-web` is the primary standalone Nuxt/Vue client and has a documented `pnpm dev` command; Android and iOS are separate native client boundaries. | Recommend `autobyteus-web`, but require user selection. |
| SRC-005 / 2026-08-22 | Command | `git status --short --branch`; `git worktree list --porcelain`; `git log -5 --oneline --decorate` | Verify safe task workspace and base | Original checkout was clean on shared branch `personal` at `8ef282b...`; a dedicated task worktree/branch was created from that revision. | Keep canonical artifacts in the task worktree. |
| SRC-006 / 2026-08-22 | User / Command | User clarification; `git fetch origin personal`; `git symbolic-ref refs/remotes/origin/HEAD`; `git rev-parse origin/personal` | Resolve freshness and terminal-scope questions | User requires latest source and prototype-only completion. Remote default is `origin/personal`; after fetch, its latest commit is `8ef282ba77705180d985e7000d801f0e0068cdc1`. | Prototype team fetches again at kickoff and pins exact commit. |
| SRC-007 / 2026-08-22 | Code / Doc | `autobyteus-web/README.md`, `package.json`, `nuxt.config.ts`, `pages/`, `middleware/`, `docs/remote_access.md` | Prepare selected-frontend handoff context | Source is Nuxt 3/Vue/TypeScript with pnpm, browser/Electron/mobile configurations, feature gates, and `pnpm dev`; source service boundaries must be mocked. | Bootstrapper completes exhaustive inventory. |
| SRC-008 / 2026-08-22 | Prototype / User | `/home/autobyteus/workspace/autobyteus-web-prototype/ui-ux-spec.md`; `/home/autobyteus/workspace/autobyteus-web-prototype/product-prototyper-baseline-review.md`; user message **“approved”** recorded by Product Prototyper | Verify authoritative UI/UX package, PPA-001, and explicit approval | Complete corrected current-state baseline is accepted and user-approved; approval excludes future-state, architecture, and production-engineering scope. | Integrate into canonical requirements. |
| SRC-009 / 2026-08-22 | Runtime / Command | `corepack pnpm validate:final-package` in `/home/autobyteus/workspace/autobyteus-web-prototype`; `git status --short --branch`; `git log -1` | Independently verify final package consistency and committed state | 73/73 checks pass; prototype Git workspace is clean on `main` at `7ab23b60aa6fd85ff7ce62720a2fbc5ea41e01a6`. | Record terminal evidence. |
| SRC-010 / 2026-08-22 | Prototype evidence | Parity inventory, bootstrap report, comparison report, evidence index, mock boundaries, runbook, scenario catalog, and final-reference manifest under `/home/autobyteus/workspace/autobyteus-web-prototype` | Reconcile requirements and acceptance criteria with final evidence | 347/347 rendered/matrix rows, 49/49 journeys, 369/369 retained presentation files, 15/15 final references, 7/7 prototype tests, and 13/13 isolation checks pass; no missing, discrepant, unknown, or unsubstantiated UI IDs remain. | Preserve cumulative package. |
| SRC-011 / 2026-08-24 | User / Product Prototyper finding | Requirement Impact message reporting the user’s explicit rejection of the standalone prototype repository | Determine whether RER-003 remains terminal | User requires the prototype to be tracked through the existing `autobyteus-workspace` repository. Observable UI/UX approval remains valid; repository provenance and paths must be corrected. | Record RER-004 and reroute focused correction. |
| SRC-012 / 2026-08-24 | Command | Git top-level/branch/status/log inspection for `/home/autobyteus/workspace/autobyteus-workspace`, ticket worktree, external prototype root, and proposed destination | Verify repository relationships and choose an isolated corrected destination | External root has its own `.git`, branch `main`, commit `7ab23b60...`, and no remote. Ticket worktree uses common Git dir `/home/autobyteus/workspace/autobyteus-workspace/.git`, branch `codex/initial-prototype-baseline`, is clean at requirements commit `e5f9ea363...`, and proposed destination is absent. | Use repository-relative `ui-prototypes/autobyteus-web-prototype` in the ticket worktree. |
| SRC-013 / 2026-08-24 | Prototype correction | `/home/autobyteus/workspace/.codex/worktrees/initial-prototype-baseline/ui-prototypes/autobyteus-web-prototype/repository-placement-correction.md` and linked repository-placement evidence | Verify AC-007–AC-009 | Project is ordinary owning-repository content at the required path; 1,934 tracked files, no nested `.git` or gitlinks, zero rejected active-root matches, 808/808 approved image hashes and 15/15 final references preserved, and all correction validations pass. | Integrate corrected commit/path and restore terminal status. |
| SRC-014 / 2026-08-24 | Command / Runtime | Independent `corepack pnpm validate:repository-placement`; `corepack pnpm validate:final-package`; Git ownership/status checks; HTTP probe of port 3200 | Independently confirm returned correction and review availability | 31/31 placement checks and 73/73 final-package checks pass; owning branch is clean at `6ed910fc...`; old external root is absent; corrected production-build review URL returns HTTP 200. | Record RER-005 completion evidence. |
| SRC-015 / 2026-08-24 | User / Command | User request to base the current project on latest original branch; `git fetch origin personal`; ancestry inspection; `git rebase origin/personal`; post-rebase validations | Synchronize the task branch without committing on the shared original branch | `origin/personal` advanced from `8ef282b...` to `3ab4946...`; task branch rebased successfully with no conflicts. Merge-base is now `3ab4946...`, branch was zero behind/four commits ahead before the RER-006 provenance commit, and 31/31 placement plus 73/73 package checks still pass. | Commit RER-006 provenance update on the task branch. |
| SRC-016 / 2026-08-24 | Command | `git diff --name-only 8ef282b...3ab4946... -- autobyteus-web` | Determine whether Git rebase alone updates the approved observable prototype baseline | 104 `autobyteus-web` files changed between the approved source pin and latest original branch, including visible settings/provider/token-usage surfaces. | Do not silently claim UI parity to `3ab4946...`; an explicit refresh requires prototype reconciliation and review. |

## Relevant Existing Behavior And Production Paths

| Behavior ID | Kind | Supported Trigger Or Governing Contract | Current Production Path / Lifecycle | Current Outcome / Invariants | Evidence | Confidence / Unknown |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | Operational | User requests latest baseline; shared prototype contract governs boundary selection | Repository contains multiple frontend/client applications | `autobyteus-web` at the latest fetched `origin/personal` commit is the selected application snapshot | SRC-001 through SRC-007 | High; kickoff commit must be reverified |
| BEH-002 | User | Existing frontend bootstrap mode in shared contract | Current UI is served by the selected `autobyteus-web` pin | Its complete observable current state is reproduced and accepted as the baseline authority | SRC-002, SRC-008, SRC-010 | High; complete inventory accepted |
| BEH-003 | System | Prototype mock and workspace-isolation rules | Production frontend calls services/auth/persistence/integrations | Prototype replaces those boundaries deterministically, blocks external/API boundaries, and uses only synthetic local state | SRC-002, SRC-010 | High; 13/13 boundary checks pass |
| BEH-004 | Operational | User requires owning-workspace version control | Approved files were at an external standalone Git root rejected by the user | Project now exists as ordinary tracked content in the existing ticket worktree at `ui-prototypes/autobyteus-web-prototype`; old root/metadata are removed; paths and validation provenance are corrected | SRC-011–SRC-014 | High; correction complete |

## Relevant Codebase And Technical Facts

| Path / Component / Contract | Current Responsibility Or Behavior | Requirement Implication | Architecture Question Deferred Downstream |
| --- | --- | --- | --- |
| `/home/autobyteus/workspace/.codex/worktrees/initial-prototype-baseline/autobyteus-web` | Selected Nuxt 3/Vue/TypeScript client using pnpm; `pnpm dev` runs browser mode; Electron and mobile-web configurations are also supported | Prototype must use its stack and inventory browser, Electron, mobile, locale, feature, node, and access-context configurations | None; prototype internals are not target architecture |
| `/home/autobyteus/workspace/.codex/worktrees/initial-prototype-baseline/autobyteus-android` | Native Android client project | Separate potential application boundary | None at this stage |
| `/home/autobyteus/workspace/.codex/worktrees/initial-prototype-baseline/autobyteus-ios` | Native iOS client project | Separate potential application boundary | None at this stage |
| `/home/autobyteus/workspace/.codex/worktrees/initial-prototype-baseline/applications` | Packaged application examples with frontend SDK dependencies | May expose embedded surfaces but are not interchangeable with the primary frontend boundary | Determine only if the user selects one |

## Runtime, Probe, Or Reproduction Findings

| Method / Command | Scenario | Observation | Requirement Implication | Artifact / Evidence Path |
| --- | --- | --- | --- | --- |
| `git fetch origin personal`; revision checks | Latest-source verification | `origin/personal` is the default remote branch and resolves to `8ef282ba77705180d985e7000d801f0e0068cdc1` on 2026-08-22. | Pin this commit for current handoff evidence; re-fetch at actual bootstrap kickoff. | Command output recorded in SRC-006 |
| Product Prototyper and bootstrap evidence suite | Complete controlled source-versus-prototype parity | 60/60 preserved rows, 48/48 corrected rows, 123/123 route-matrix rows, 116/116 correction-matrix rows, 18/18 preserved journeys, and 31/31 corrected journeys pass with no prototype browser errors or known observable discrepancy. | AC-002, AC-005, and AC-006 are met. | `/home/autobyteus/workspace/.codex/worktrees/initial-prototype-baseline/ui-prototypes/autobyteus-web-prototype/comparison-report.md` |
| `corepack pnpm validate:final-package` | Final approval package consistency | 73/73 checks pass, including approval, source pin, PPA-001, inventory totals, screenshot hashes, local Monaco assets, and no pending/draft placeholders in the UI/UX spec. | Prototype package is consistent with RER-002 requirements and safe to integrate. | `/home/autobyteus/workspace/.codex/worktrees/initial-prototype-baseline/ui-prototypes/autobyteus-web-prototype/evidence/validation/product-prototyper-final-package-consistency.txt` |
| Git inspection | Prior rejected prototype provenance | Clean standalone `main` workspace at local commit `7ab23b60aa6fd85ff7ce62720a2fbc5ea41e01a6`; no remote configured. | Files remain the corrective source, but this repository/branch/commit is noncanonical and must not be carried as owning history. | `/home/autobyteus/workspace/autobyteus-web-prototype` |
| Git top-level comparison | Repository placement correction | External prototype resolves to itself as a standalone top level; ticket worktree resolves to the existing `autobyteus-workspace` common Git directory on dedicated branch `codex/initial-prototype-baseline`; target path is absent. | Standalone commit is noncanonical. Corrected absolute target is `/home/autobyteus/workspace/.codex/worktrees/initial-prototype-baseline/ui-prototypes/autobyteus-web-prototype`. | SRC-012 |
| `corepack pnpm validate:repository-placement` | Corrected ownership, paths, and hash preservation before and after branch rebase | 31/31 checks pass: owning worktree/branch, ordinary index modes, no nested Git/gitlink, no stale rejected root, corrected manifest paths, preserved approval/source pin, 808/808 image hashes and 15/15 final-reference hashes. | AC-007–AC-009 remain met after base synchronization. | `/home/autobyteus/workspace/.codex/worktrees/initial-prototype-baseline/ui-prototypes/autobyteus-web-prototype/evidence/repository-placement/repository-placement-validation.txt` |
| `corepack pnpm validate:final-package` | Corrected-root final package consistency | 73/73 checks pass from the relocated package. | Existing AC-001–AC-006 evidence remains valid after relocation. | Corrected prototype root |
| Git/status and HTTP probes | Owning commit and runnable review | Branch `codex/initial-prototype-baseline` is clean at `6ed910fc...`; old external root absent; corrected-root production build serves HTTP 200 at port 3200. | Terminal locator and repository provenance are verified. | SRC-014 |

## Stakeholder And User Evidence

| Source / Actor | Need, Problem, Or Constraint | Evidence Strength | Requirement Implication | Open Question |
| --- | --- | --- | --- | --- |
| User | Wants the latest initial `autobyteus-web` prototype baseline and no downstream production engineering | Direct clarification and explicit approval | Product prototype is the terminal product outcome; complete corrected baseline is approved | None |

## External Contracts, Standards, And Dependencies

| Contract / Dependency | Version / Authority | Relevant Behavior Or Constraint | Evidence | Unknown / Risk |
| --- | --- | --- | --- | --- |
| Product Prototype Principles | Current team contract at investigation time | Complete observable parity; source technology; deterministic mocks; controlled evidence; workspace isolation; role ownership | SRC-002, SRC-010 | No unresolved compliance gap |

## Persisted Data And State Facts

- Affected stored or external subject: Production data is explicitly out of scope; synthetic prototype fixture state only.
- Location and representative shape: Deterministic fixtures and adapters documented in `/home/autobyteus/workspace/.codex/worktrees/initial-prototype-baseline/ui-prototypes/autobyteus-web-prototype/mock-boundaries.md` and scenario catalog.
- Approximate volume: Small deterministic fixture set sufficient to cover inventoried visible states.
- Current readers and writers: Prototype-local Pinia overlays, localStorage, scripted host state, intercepted actions, and local mock transports; no production writer.
- Current unknown/extra-field behavior: Not relevant to prototype completion; production contract fidelity is explicitly unproven.
- Required semantics or data that must be preserved: Observable source data shapes and visible outcomes only.
- Acceptable loss, reset, rebuild, or regeneration: All prototype-local synthetic state.
- Privacy, retention, compliance, downtime, or operational constraints: No credentials, personal/customer data, production export, or production write.
- Remaining evidence gap: None for the approved observable prototype boundary.

## Product Prototype Decision

- Prototype needed: `Yes — completed, including repository-placement correction`
- Decision rationale: The user explicitly requested an initial prototype baseline, and runnable evidence is the intended deliverable.
- Requirement / behavior IDs involved: BEH-001 through BEH-003; REQ-001 through REQ-007.
- Product decisions or uncertainties to resolve: None.
- Critical journey and states: Complete current-state `autobyteus-web` inventory across browser, Electron, and mobile configurations, including known feature, locale, node, access, responsive, empty/loading/error/permission/recovery states.
- Known constraints and non-goals: Current-state parity only; same source technology; deterministic mock boundaries; isolated run; no screenshot/hotspot substitute; no future-state redesign.
- Alternative evidence path / next action when no prototype is used: N/A; prototype is explicitly requested.
- Prototype request artifact / message reference: Initial PPA-001 package plus RER-004 correction completed and returned by Product Prototyper.

## Prototype Findings

- Prototype package path: `/home/autobyteus/workspace/.codex/worktrees/initial-prototype-baseline/ui-prototypes/autobyteus-web-prototype`, rewritten owning prototype commit `a9e3634667ed6cc9cd3bf9528362a7b50d131427` after rebase.
- Approved UI/UX specification path: `/home/autobyteus/workspace/.codex/worktrees/initial-prototype-baseline/ui-prototypes/autobyteus-web-prototype/ui-ux-spec.md`.
- Review URL: `http://127.0.0.1:3200`.
- Explicit user-confirmation reference: User message **“approved”** on 2026-08-22 immediately after review request for the complete corrected baseline; recorded in `ui-ux-spec.md`, `product-prototyper-baseline-review.md`, and the final-reference manifest.
- Journeys and scenarios validated: `JRN-001`–`JRN-049`; all 49 pass. Complete stable inventory includes routes, configuration, state, host, workspace, mobile, locale/responsive, and discovery groups documented in `ui-ux-spec.md` and `parity-inventory.md`.
- Final visual-reference paths: `/home/autobyteus/workspace/.codex/worktrees/initial-prototype-baseline/ui-prototypes/autobyteus-web-prototype/final-reference-screenshots/README.md` and `manifest.json`; VIS-001–VIS-015 and their approved hashes are preserved exactly.
- Product decisions supported by evidence: Current-state baseline only; exact pin `8ef282ba77705180d985e7000d801f0e0068cdc1`; no future-state delta; no architecture/production-engineering authorization; local Monaco mirror removes ordinary-review external dependency without visible/interactive change.
- Alternatives rejected or still open: Android/iOS and packaged-application authoring roots are excluded as independent baselines; no future-state redesign is requested.
- Mocked boundaries and production gaps: All production services, persistence, authentication, host/native, execution, streaming, files, terminal, Browser/VNC, model/provider/tool/MCP, messaging, application, update/extension, and media boundaries are deterministic local simulations. Production readiness and integration fidelity remain unproven and out of scope.
- Requirements sections affected: Document status, acceptance outcome, UI/UX locator, supplements, traceability, readiness, and completion classification.

## Supplemental Artifact Inventory

| Artifact Path | Owner | Purpose | Scope | Related Requirement / AC IDs | Status | Approval Applicability / State |
| --- | --- | --- | --- | --- | --- | --- |
| `/home/autobyteus/workspace/.codex/worktrees/initial-prototype-baseline/tickets/in-progress/initial-prototype-baseline/requirements-revision-record.md` | Requirements Engineering | Requirements-round history | RER-001 onward | All | Current | Informational; approval is recorded in canonical requirements |
| `/home/autobyteus/workspace/.codex/worktrees/initial-prototype-baseline/ui-prototypes/autobyteus-web-prototype/ui-ux-spec.md` | Product Prototyper | Canonical approved UI/UX supplement | Complete current-state baseline | All | Approved / PPA-001 | User-approved |
| `/home/autobyteus/workspace/.codex/worktrees/initial-prototype-baseline/ui-prototypes/autobyteus-web-prototype/final-reference-screenshots/README.md` | Product Prototyper | Final visual-reference inventory | VIS-001–VIS-015 | REQ-002, REQ-005; AC-002, AC-005 | Final | User-approved baseline references |
| `/home/autobyteus/workspace/.codex/worktrees/initial-prototype-baseline/ui-prototypes/autobyteus-web-prototype/final-reference-screenshots/manifest.json` | Product Prototyper | Reference hashes and clean-capture evidence | 15 final references | REQ-002, REQ-005, REQ-006 | Final / 15 of 15 | User-approved evidence |
| `/home/autobyteus/workspace/.codex/worktrees/initial-prototype-baseline/ui-prototypes/autobyteus-web-prototype/product-prototyper-baseline-review.md` | Product Prototyper | Review history and PPA-001 | Initial gaps, corrections, acceptance, final decision | REQ-005, REQ-007; AC-005, AC-006 | Final | Acceptance and approval evidence |
| `/home/autobyteus/workspace/.codex/worktrees/initial-prototype-baseline/ui-prototypes/autobyteus-web-prototype/parity-inventory.md` | Prototype Bootstrapper | Complete parity inventory | All stable inventory IDs | REQ-002, REQ-005 | Accepted | Approved baseline evidence |
| `/home/autobyteus/workspace/.codex/worktrees/initial-prototype-baseline/ui-prototypes/autobyteus-web-prototype/prototype-bootstrap-report.md` | Prototype Bootstrapper | Bootstrap and validation outcome | Current-state parity baseline | REQ-001–REQ-007 | Complete | Supporting evidence |
| `/home/autobyteus/workspace/.codex/worktrees/initial-prototype-baseline/ui-prototypes/autobyteus-web-prototype/comparison-report.md` | Prototype Bootstrapper | Controlled comparison results | 347 rendered/matrix rows; 49 journeys | REQ-002, REQ-005 | Pass | Approved baseline evidence |
| `/home/autobyteus/workspace/.codex/worktrees/initial-prototype-baseline/ui-prototypes/autobyteus-web-prototype/evidence-index.md` | Prototype Bootstrapper | Evidence navigation | Complete prototype evidence | REQ-002, REQ-005 | Final | Supporting evidence |
| `/home/autobyteus/workspace/.codex/worktrees/initial-prototype-baseline/ui-prototypes/autobyteus-web-prototype/mock-boundaries.md` | Prototype Bootstrapper | Deterministic isolation contract | Production/external boundaries | REQ-004, REQ-006; AC-004 | Final | Approved boundary evidence |
| `/home/autobyteus/workspace/.codex/worktrees/initial-prototype-baseline/ui-prototypes/autobyteus-web-prototype/prototype-runbook.md` | Prototype Bootstrapper | Reproducible run/validation instructions | Canonical prototype | REQ-003, REQ-006 | Final | Operational supplement |
| `/home/autobyteus/workspace/.codex/worktrees/initial-prototype-baseline/ui-prototypes/autobyteus-web-prototype/prototype-scenarios.md` | Prototype Bootstrapper | Deterministic scenario catalog | Complete visible state/journey set | REQ-002, REQ-004 | Final | Approved baseline evidence |
| `/home/autobyteus/workspace/.codex/worktrees/initial-prototype-baseline/ui-prototypes/autobyteus-web-prototype` | Product Prototyper | Corrected canonical owning-repository root | Complete approved project | REQ-008, REQ-009; AC-007–AC-009 | Complete at rewritten prototype commit `a9e363466...` | User-mandated repository provenance satisfied; observable approval unchanged |
| `/home/autobyteus/workspace/.codex/worktrees/initial-prototype-baseline/ui-prototypes/autobyteus-web-prototype/repository-placement-correction.md` | Product Prototyper | Repository ownership, relocation, path rewrite, validation, and hash-preservation result | RER-004 correction | REQ-008, REQ-009; AC-007–AC-009 | Complete | Requirements-correction evidence |

## Assumptions, Unknowns, And Risks

| ID | Type | Description | Why It Matters | Resolution / Owner | Status |
| --- | --- | --- | --- | --- | --- |
| ASM-001 | Assumption | `origin/personal` remains the authoritative branch for “latest” at kickoff. | Determines the snapshot to pin. | Prototype team fetched and pinned `8ef282ba77705180d985e7000d801f0e0068cdc1`. | Validated |
| DEC-001 | Unknown | Selected source frontend application. | Determines stable prototype naming, inventory, runtime investigation, and handoff. | User selected `autobyteus-web`. | Resolved |
| RISK-001 | Risk | Treating the entire monorepo as one frontend baseline would conflate independent application boundaries. | Could make parity unbounded and invalidate evidence. | Requirements Engineering prevents handoff until selection. | Controlled |
| RISK-002 | Risk | A complete `autobyteus-web` baseline may be substantially larger than feature-specific prototypes. | Schedule/effort may be significant, but the existing-frontend parity contract does not permit silent scope reduction. | Complete inventory and parity evidence delivered. | Closed |
| RISK-003 | Risk | Two unchanged pinned-source unit-harness cases fail. | Failures could be mistaken for prototype gaps. | Bootstrap report records both; exact observable journeys JRN-047 and JRN-049 pass, so they are source harness defects rather than prototype discrepancies. | Controlled / non-blocking |
| RISK-004 | Risk | Removing or moving the external standalone repository destructively before the corrected target is verified could lose approved evidence. | The approved package is large and contains normative evidence. | Product Prototyper copied and verified 1,924/1,924 files before path rewriting, preserved 808/808 evidence/reference image hashes, committed the target, then removed the external root. | Closed |

## Requirement Implications

- The requested outcome directly satisfies the prototype gate.
- `autobyteus-web` is the explicit source frontend; “latest” must be pinned to the exact newest `origin/personal` commit at bootstrap kickoff.
- Once selected, every supported/discoverable observable client item in that application boundary is in parity scope; a partial mockup is not an acceptable baseline.
- Safe deterministic mock boundaries and complete parity evidence are part of acceptance, not implementation preferences.
- The approved package meets all observable parity requirements with no known missing, discrepant, unknown, or unsubstantiated UI inventory ID.
- Approval applies only to this pinned current-state prototype; later source refreshes or future-state changes require explicit reconciliation and approval.
- Repository placement is requirements-defining for this ticket. The correction must preserve all approved observable evidence while replacing the rejected standalone provenance with ordinary files tracked by the existing workspace repository.
- Git ancestry is now synchronized to latest fetched `origin/personal` at `3ab4946c...`. The approved prototype remains a reproducible snapshot of source pin `8ef282b...`; because 104 frontend files changed upstream, any request to make the observable baseline itself current requires explicit prototype refresh/reconciliation rather than silent file replacement.

## Notes For Downstream Architecture Design

- No target architecture or production software-engineering work is authorized by this prototype-only request.
- Prototype implementation structure is non-authoritative for production.
- Any later architecture work would require a separate user request and must distinguish approved future-state requirements from current-state prototype evidence.
