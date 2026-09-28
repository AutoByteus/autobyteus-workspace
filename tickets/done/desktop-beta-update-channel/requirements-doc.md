# Requirements Document

## Document Status

- Status: `Approved`
- Current solution revision ID: `SR-005`
- Package identifier: `desktop-beta-update-channel`
- Request / ticket: Stable/Beta desktop update channel
- Requirements owner: Solution Designer
- Date: 2026-09-27
- Approval state and reference: Approved by the user in conversation on 2026-09-27 ("thanks i approve now"). The user restated the Docker usage as: `autobyteus-docker upgrade --all` → latest; `upgrade --all --tag beta` → beta. This is consistent with AC-015/AC-016 under the preserved saved-tag launcher semantics.
- Exact approved requirements baseline / solution revision: SR-002
- Behavior-defining supplements and their approved versions: None

## Problem And Desired Outcome

- Problem: Every desktop release tag is published as a full GitHub release, and every desktop user is offered it. The operator releases up to ~6 versions per day so they can test each merge through the in-app updater. Ordinary users therefore see constant updates and receive untested builds. This happened with the broken macOS updater artifact on 2026-06-19.
- Affected actors or systems: release operator; ordinary desktop users; opt-in beta users; Docker server users (`autobyteus-docker` launcher); desktop and Docker release CI; operator release script.
- Desired outcome: Two update channels, Stable and Beta. Frequent builds are published as Beta and are only offered to desktop installs that opted in. The operator decides when a build becomes Stable, and only then is it offered to everyone.
- Observable definition of success: After a beta release, a default (Stable) desktop install reports "no update available". An install with "Receive beta updates" switched on is offered that beta in-app.

## Relevant Current And Desired Behavior

| Behavior ID | Kind | Related Scenario IDs | Evidence-Backed Current Behavior | Desired Behavior | Intentionally Preserved Behavior | Investigation Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | Operational | SCN-001, SCN-004 | Any `v*` tag push publishes a full (non-pre-release) desktop GitHub release | A tag with a pre-release suffix (e.g. `v1.4.90-beta.3`) is published as a GitHub **pre-release** with working updater metadata. A plain `vX.Y.Z` tag is published as a normal release | Stable tag flow, artifacts, signing, notarization, verification gates, curated release notes for stable, build-only `test` and `manual-dispatch` modes | Source log: release-desktop.yml |
| BEH-002 | System | SCN-002 | Every published release is offered to every desktop install on startup/manual check | Installs on Stable are offered only stable releases | Startup check timing, manual check, click-to-download, install & restart, error UX | appUpdater.ts; GitHubProvider.js |
| BEH-003 | User | SCN-003 | No current supported behavior | Settings → About → Updates has a "Receive beta updates" switch, off by default, saved locally. When on, the install is offered the newest available release, beta or stable | Existing About page content and buttons | AboutSettingsManager.vue |
| BEH-004 | User | SCN-005 | No current supported behavior | Turning the switch off never downgrades. The install stays on its current version until a newer stable exists, then follows Stable | — | semver ordering |
| BEH-005 | User | SCN-003, SCN-005 | Version shown as a raw string | A beta build is clearly identified as Beta on the About page | Current version still displayed | AboutSettingsManager.vue |
| BEH-006 | Operational | SCN-001 | Only `release <version> --release-notes <file>` exists; curated notes are always required | One operator command creates the next beta release without curated notes (generated notes are used) | Existing `release`, `test`, `manual-dispatch` commands and their behavior | desktop-release.sh |
| BEH-007 | Operational | SCN-006 | Android/iOS workflows already treat `-` tags as pre-releases | Unchanged | All current behavior | workflow files |
| BEH-008 | Operational | SCN-007, SCN-008 | Docker workflow publishes `autobyteus-server:<version>` for every tag and moves `latest` only for stable tags. `autobyteus-docker upgrade --all` re-pulls each node's saved image ref (default `:latest`); `--tag` retargets all nodes and is saved. There is no moving tag that follows betas, so following betas means pinning `--tag <exact-version>` on every release | A moving `beta` image tag is published for every release, beta and stable, and always points to the newest build. Running `upgrade --all --tag beta` once makes later plain `upgrade --all` runs follow the newest build. `latest` keeps pointing to stable only | Version tags; `latest` = newest stable; `latest-zh`; launcher upgrade semantics; nodes on `latest` never receive betas | release-server-docker.yml; docker-runtime.sh `upgrade_image_ref_for_node`; server docker README |

## Stakeholders, Actors, And Outcomes

| Actor / Stakeholder | Goal Or Responsibility | Required Outcome | Important Constraint |
| --- | --- | --- | --- |
| Release operator | Test every merge through the real in-app updater | Beta builds are installable in-app on opted-in machines | Promoting to stable is an explicit operator action |
| Ordinary desktop user | Receive stable, deliberately released updates | Never offered a beta unless they opt in | No action needed, including on already-installed versions |
| Opt-in beta user | Receive early builds | Offered each new beta and each newer stable | Can opt out at any time without a downgrade |
| Docker server user | Keep managed server nodes current | `latest` nodes get stable only; nodes switched to `beta` follow every build | Switching is an explicit launcher action per install |

## Scope Guardrail (Mandatory)

### In-Scope Use Cases

- UC-001: The operator publishes a beta desktop release (REQ-001, REQ-006).
- UC-002: A Stable install checks for updates and is offered only stable releases (REQ-002, REQ-003).
- UC-003: A user opts into Beta and receives betas in-app (REQ-004, REQ-005).
- UC-004: The operator publishes a stable release, which reaches both channels (REQ-001, REQ-002, REQ-004).
- UC-005: A beta user opts out and returns to Stable without a downgrade (REQ-007).
- UC-006: The operator (or any Docker user) switches Docker nodes to the beta track once and then upgrades to the newest build with plain `upgrade --all` (REQ-010, REQ-011).
- UC-007: Docker users on `latest` keep receiving only stable images (REQ-010).

### Out Of Scope

- Changes to the Android and iOS release workflows, except aligning the Android release-notes mode so pre-release tags use generated notes. Android writes the same GitHub release body, so this realizes REQ-006; clarified in SR-003 with no change to intended behavior. Both workflows already treat `-` tags as pre-releases (BEH-007). Skipping their builds for beta tags to save CI time is a separate optional ticket.
- Launcher code changes beyond help text. The existing saved-image-ref behavior already supports a moving `beta` tag.
- A `beta-zh` image. The zh variant is built only by manual dispatch today.
- Launcher-enforced protection against switching a node from `beta` back to an older `latest` (documented guidance only).
- A third channel (Nightly/Alpha), staged or percentage rollouts, and forced or assisted downgrades.
- Automatically creating a beta on every merge (CI automation). The operator still triggers releases.
- A server-side or Basic Settings toggle; per-server or admin-enforced channel policy.
- Aggregating beta notes into stable release notes (stable keeps today's curated-notes requirement).

### Non-Goals

- Changing updater mechanics beyond channel selection (download, signing, install, error classification).
- Channel support in the browser/non-Electron web build (there is no updater there).

### Preserved Behavior Boundary

- BEH-001 preserved column; BEH-002 preserved column; BEH-006 preserved column; BEH-007 entirely; BEH-008 preserved column.
- Invariant: a desktop install that never touches the switch behaves exactly as today, except it is no longer offered pre-releases.
- Invariant: a Docker node on `latest` behaves exactly as today and never receives a beta image.

### Review Authority

- Every blocking `Design Impact` or implementation-correction finding must cite an approved requirement, acceptance criterion, or preserved-behavior ID that it protects.
- A finding that would introduce new product behavior, policy, threat model, migration obligation, compatibility promise, or operational contract is a `Requirement Gap`; it requires explicit user approval before becoming authoritative.
- An adjacent concern outside the approved boundary may be recorded as a non-blocking risk, recommendation, or separate-ticket candidate. It is not a required design correction.
- A downstream reviewer comment does not amend this requirements basis. The Solution Designer must update the canonical requirements and obtain renewed user approval before a scope-changing proposal can govern design or implementation.

## Requirements

| Requirement ID | Requirement | Related Behavior IDs | Priority | Rationale | Source / Decision Reference |
| --- | --- | --- | --- | --- | --- |
| REQ-001 | Pushing a desktop tag of the form `vX.Y.Z-beta.N` publishes a GitHub pre-release containing all desktop platform artifacts and valid updater metadata. A plain `vX.Y.Z` tag publishes a normal release exactly as today | BEH-001 | Must | Core separation of beta from stable | User request; release-desktop.yml |
| REQ-002 | A desktop install on the Stable channel is never offered a pre-release, whether the check is automatic at startup or manual | BEH-002 | Must | Ordinary users must not see betas | User request |
| REQ-003 | Already-installed versions without the new switch (e.g. ≤ 1.4.89) are also never offered betas | BEH-002 | Must | Protects the current user base immediately | electron-updater default |
| REQ-004 | Settings → About → Updates provides a "Receive beta updates" switch, off by default, visible to all desktop users. When on, the startup and manual checks offer the newest release newer than the installed version, whether beta or stable | BEH-003 | Must | Per-user opt-in | User decision (About location; user's choice) |
| REQ-005 | The switch value is saved locally on the machine and survives app restarts and in-app upgrades. A missing or unreadable value means Stable | BEH-003 | Must | "Enable once and keep receiving betas" | User statement |
| REQ-006 | The release script provides a beta command that computes the next unused `-beta.N` for the target version (default: next patch after the latest stable tag; operator may override), does not require curated notes, and tags and pushes like `release`. N must stay within 1..98 | BEH-006, BEH-007 | Must | Makes frequent beta releases a one-step action; Android versionCode limit | desktop-release.sh; release-android.yml |
| REQ-007 | Turning the switch off never downgrades. The About page explains that the install stays on its current version until a newer stable release is available | BEH-004 | Must | Clear opt-out expectation | semver ordering |
| REQ-008 | When the running build is a beta, the About page labels the current version as Beta | BEH-005 | Should | Users know what they are running | Recommendation |
| REQ-009 | In the non-Electron web build the switch is unavailable, consistent with the existing disabled "Check for updates" behavior | BEH-003 | Must | No updater there | AboutSettingsManager.vue |
| REQ-010 | Every release tag (beta and stable) publishes the server image under its version tag and moves a `beta` image tag to that image. `latest` moves only for stable tags, as today. If an older tag is re-published by manual dispatch, `beta` must not move backward | BEH-008 | Must | Docker equivalent of the desktop Beta channel; stable Docker users unaffected | User request 2026-09-27 |
| REQ-011 | The Docker launcher help and the server Docker README explain how to follow betas (`upgrade --all --tag beta`) and how to return to stable (`upgrade --all --tag latest`). They warn that returning to `latest` while it is older than the running beta runs an older server on data a newer version may have migrated, so return only once a stable release at least as new is available | BEH-008 | Must | Discoverability; safe opt-out | docker-runtime.sh; README |

## Acceptance Criteria

| AC ID | Related REQ IDs | Related Behavior / Scenario IDs | Preconditions / Trigger | Observable Expected Outcome | Important Alternate Or Failure Outcome | Verification Intent |
| --- | --- | --- | --- | --- | --- | --- |
| AC-001 | REQ-001 | BEH-001 / SCN-001 | Push `vX.Y.Z-beta.N` | GitHub release is marked Pre-release with all desktop artifacts and updater metadata; GitHub "Latest" still points to the previous stable | Workflow fails before publishing if metadata is invalid | CI run on a beta tag; inspect release |
| AC-002 | REQ-001 | BEH-001 / SCN-004 | Push `vX.Y.Z` | Normal release marked Latest, same assets and notes behavior as today | — | CI run; regression check |
| AC-003 | REQ-002, REQ-003 | BEH-002 / SCN-002 | Beta is newest release; install on Stable (new build, and an existing ≤1.4.89 build) checks | "No update available" (or the newest stable if newer than installed) | — | Packaged-app or updater-level test against real/fixture feed |
| AC-004 | REQ-004 | BEH-003 / SCN-003 | Switch on; newer beta exists | Startup and manual checks offer the beta; download and install work as today | — | Packaged-app update test |
| AC-005 | REQ-004 | SCN-003, SCN-004 | Switch on; newest release is a stable newer than installed | Stable offered | — | Updater-level test |
| AC-006 | REQ-005 | SCN-003 | Switch on, then restart, and separately upgrade in-app | Switch still on after both | Missing/corrupt value → shows off, behaves as Stable | Unit + packaged check |
| AC-007 | REQ-004 | SCN-003 | Fresh install | Switch is off | — | UI test |
| AC-008 | REQ-007 | BEH-004 / SCN-005 | On beta `X.Y.Z-beta.N`, switch off | No older stable offered; explanation shown; when stable ≥ `X.Y.Z` appears it is offered | — | Updater-level + UI test |
| AC-009 | REQ-006 | BEH-006 / SCN-001 | Operator runs the beta command twice for the same target | Creates `-beta.1` then `-beta.2`, version bumped, tags pushed; no curated notes required | Refuses when N would exceed 98, when a tag exists, or when the worktree is dirty | Script test |
| AC-010 | REQ-008 | BEH-005 | Running a beta build | About shows the version with a Beta indicator | Stable build shows no indicator | UI test |
| AC-011 | REQ-009 | — | Web (non-Electron) build | Switch not interactive | — | UI test |
| AC-012 | Preserved | BEH-007 / SCN-006 | Beta tag push | Android GitHub pre-release and iOS TestFlight pre-release upload, as today | — | Observe CI on first beta |
| AC-013 | REQ-010 | BEH-008 / SCN-007 | Push `vX.Y.Z-beta.N` | Docker Hub has `:X.Y.Z-beta.N` and `:beta` pointing to the same digest; `:latest` unchanged | — | CI publish plan + registry inspect |
| AC-014 | REQ-010 | BEH-008 / SCN-007 | Push stable `vX.Y.Z` | `:X.Y.Z`, `:latest` and `:beta` all point to the same digest | Manual re-publish of an older tag leaves `:beta` on the newer build | CI publish plan + registry inspect |
| AC-015 | REQ-010, REQ-011 | BEH-008 / SCN-008 | Nodes on `:latest`; run `upgrade --all` after a beta release | Nodes stay on the newest stable image | — | Launcher check |
| AC-016 | REQ-010, REQ-011 | BEH-008 / SCN-007 | Run `upgrade --all --tag beta` once, then plain `upgrade --all` after later releases | Nodes move to each newer build, beta or stable | — | Launcher check |
| AC-017 | REQ-011 | BEH-008 | Read `autobyteus-docker help` and the server Docker README | Both describe `--tag beta`, returning to `latest`, and the downgrade caution | — | Doc/help review |

## Relevant Scenarios And Journeys

| Scenario ID | Kind | Actor / Initiator | Goal / Event | Trigger / Entry Surface | Starting Condition | Steps | Expected Outcome | Alternate / Error | Validity | Evidence / Decision | Related REQ / AC |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-001 | Operational | Release operator | Publish a merged change for self-testing | Beta command of the release script | Clean branch at merged commit | Run beta command → tag pushed → CI publishes pre-release | Beta available to opted-in installs only | CI failure → nothing published | Supported Normal Scenario | User request | REQ-001, REQ-006; AC-001, AC-009 |
| SCN-002 | System | Stable desktop install | Stay current with stable only | Startup or manual check | Betas newer than installed exist | Check → resolve newest stable | Only stable offered | Network/feed errors as today | Supported Normal Scenario | User request | REQ-002, REQ-003; AC-003 |
| SCN-003 | User | Operator or any user | Receive betas | Settings → About → Updates switch | Switch off | Turn on → (re)check → beta offered → download → install | Runs beta; switch stays on | — | Supported Normal Scenario | User decision | REQ-004, REQ-005, REQ-008; AC-004..007, AC-010 |
| SCN-004 | Operational | Release operator | Promote to stable | `release <version> --release-notes` | Betas tested | Tag stable → CI publishes normal release | Offered to both channels | — | Supported Normal Scenario | User request | REQ-001; AC-002, AC-005 |
| SCN-005 | User | Beta user | Leave Beta | Switch off | Running a beta | Turn off → check | No downgrade; next newer stable offered when available | — | Supported Normal Scenario | Designer recommendation | REQ-007; AC-008 |
| SCN-006 | Operational | CI | Other platforms on beta tag | Tag push | — | Android/iOS workflows run | Pre-release handling as today | — | Supported Normal Scenario | workflow files | AC-012 |
| SCN-007 | Operational | Operator / Docker user | Run Docker nodes on the newest build | `autobyteus-docker upgrade --all --tag beta` once, then `upgrade --all` | Nodes on `latest` | Switch once → later releases → `upgrade --all` pulls `:beta` | Nodes track the newest build | Registry/pull errors as today | Supported Normal Scenario | User request 2026-09-27 | REQ-010, REQ-011; AC-013, AC-014, AC-016, AC-017 |
| SCN-008 | Operational | Ordinary Docker user | Keep nodes on stable | `upgrade --all` | Nodes on `latest` | Pull `:latest` | Stable only | — | Supported Normal Scenario | launcher behavior | REQ-010; AC-015 |

## UI, Interaction, And Experience Requirements

- Applicable: `Yes` (small addition to an existing card)
- Linked UI/UX or interaction supplement: N/A — not applicable
- Linked prototype artifacts, ticket, revision, confirmation, visual baseline: N/A — not applicable
- Normative details: A labelled on/off switch "Receive beta updates" in the "AutoByteus Updates" card, with a one-line description, e.g. "Get early builds before they are released to everyone. Turning this off keeps your current version until a newer stable release is available." Beta indicator next to the current version when running a beta. Localized like the rest of the page.
- Permitted variation: exact wording, placement within the card, visual style consistent with existing settings toggles.
- Unresolved product decisions: None

## Quality And Non-Functional Requirements

| Quality ID | Related REQ / AC | Area | Requirement | Conditions | Verification |
| --- | --- | --- | --- | --- | --- |
| QR-001 | REQ-002, AC-003 | Reliability | Zero pre-releases offered to Stable installs | All platforms with in-app update (macOS arm64/x64, Windows, Linux x64/arm64) | CI + updater tests |
| QR-002 | REQ-001, AC-001 | Operability | Beta publish uses the same signing, notarization and verification gates as stable | All desktop platforms | CI run |
| QR-003 | REQ-004 | Compatibility | Toggling takes effect on the next check without restarting the app | Electron | Test |
| QR-004 | REQ-010 | Reliability | `:beta` never points to an older build than the newest published release | Docker Hub | CI logic test |

## Data Continuity And Acceptable Loss

- Persisted or external data affected: `Yes` (new local preference only)
- Must be preserved: the channel choice across restart and in-app upgrade
- Acceptable loss: a missing or corrupt value resets to Stable
- Constraints: stored locally per machine; never sent to the server
- Unknowns: None

## External Contracts And Dependencies

| Contract / Dependency | Required Behavior Or Constraint | Evidence | Uncertainty Or Risk |
| --- | --- | --- | --- |
| GitHub Releases pre-release flag + `/releases/latest` | Excludes pre-releases for Stable installs | electron-updater source | Low |
| electron-updater 6.8.3 | Pre-release selection via `allowPrerelease` | installed source | Beta selection follows feed order (RSK-001) |
| electron-builder 25 channel metadata | Valid updater metadata for beta versions | UNK-001 | To verify in design |
| Android versionCode | Beta number 1..98 | release-android.yml | Low |
| Docker Hub tags | Moving `beta` tag alongside `latest` and version tags | release-server-docker.yml | Guarding against re-publishes moving `beta` backward |

## Supplemental Artifacts

| Artifact Path | Purpose | Related REQ / AC | Status | Approval Applicability |
| --- | --- | --- | --- | --- |
| None | — | — | — | — |

## Assumptions

| ID | Assumption | Why Necessary | Validation | Status |
| --- | --- | --- | --- | --- |
| ASM-001 | Beta tags use the `-beta.N` form only | Keeps channel naming uniform with electron-updater's built-in `beta` handling | Script enforces the form | Proposed |
| ASM-002 | Stable versions keep the current patch-increment scheme; betas precede the next stable of the same number | semver ordering | Script default | Proposed |

## Open Decisions And Questions

| ID | Question | Why It Matters | Options / Evidence | Owner | Status |
| --- | --- | --- | --- | --- | --- |
| DEC-001 | Where the switch lives | Scope/ownership | About → Updates (local) vs Basic Settings (server) | User | Resolved: About → Updates |
| DEC-002 | Include Android/iOS changes? | Scope | They already treat `-` tags as pre-release | User deferred to designer | Resolved (recommendation): no changes; skipping their builds for betas is a separate optional ticket |
| DEC-004 | How Docker follows betas | User wants `upgrade --all` to reach the newest build including betas; ordinary Docker users should stay stable | (a) point `latest` at betas; (b) moving `beta` tag with one-time opt-in; (c) pin exact version tags each time | User | Resolved: (b), approved with SR-002 |
| DEC-003 | Channels | Scope | Stable/Beta vs more | User | Resolved: Stable/Beta |

## Traceability

| REQ | Use Cases | Behaviors | ACs | Scenarios |
| --- | --- | --- | --- | --- |
| REQ-001 | UC-001, UC-004 | BEH-001 | AC-001, AC-002 | SCN-001, SCN-004 |
| REQ-002 | UC-002 | BEH-002 | AC-003 | SCN-002 |
| REQ-003 | UC-002 | BEH-002 | AC-003 | SCN-002 |
| REQ-004 | UC-003, UC-004 | BEH-003 | AC-004, AC-005, AC-007 | SCN-003, SCN-004 |
| REQ-005 | UC-003 | BEH-003 | AC-006 | SCN-003 |
| REQ-006 | UC-001 | BEH-006, BEH-007 | AC-009 | SCN-001 |
| REQ-007 | UC-005 | BEH-004 | AC-008 | SCN-005 |
| REQ-008 | UC-003 | BEH-005 | AC-010 | SCN-003 |
| REQ-009 | UC-003 | BEH-003 | AC-011 | — |
| REQ-010 | UC-006, UC-007 | BEH-008 | AC-013..016 | SCN-007, SCN-008 |
| REQ-011 | UC-006 | BEH-008 | AC-016, AC-017 | SCN-007 |

## Architecture Phase Input

- Scenarios to map: SCN-001..SCN-008
- Constraints: stable flow unchanged; same signing/verification gates for betas; local-only preference; no downgrade
- Deferred to architecture: preference storage and IPC shape; how the channel is applied per check; CI metadata-file handling for pre-release versions; beta-number computation source (git tags vs GitHub releases)
- Technical facts to verify: UNK-001 (builder channel-file names for `-beta.N`); RSK-001 (feed-order behavior)
- Known risks: the mac metadata merge script and the Linux validator assume `latest*.yml` names

## Readiness Check

### Content Ready For Approval

- Relevant current behavior is evidence-backed: `Yes`
- Desired and preserved behavior are explicit: `Yes`
- Scope and non-goals are clear: `Yes`
- Requirements and acceptance criteria are testable and traceable: `Yes`
- Applicable scenarios are covered with validity and evidence: `Yes`
- Prototype and supplemental evidence is integrated consistently: `N/A`
- Applicable UI/UX approval and final visual-reference basis are recorded: `N/A`
- Material assumptions and open decisions are visible: `Yes`
- Content ready for user approval: `Yes`
- Remaining content blocker: None

### Approved Basis Ready For Design

- User approval received: `Yes` (2026-09-27)
- Exact requirements and supplement approval basis recorded: `Yes` (SR-002; no supplements)
- Approved requirements package ready for architecture design: `Yes`
- Remaining blocker: None
