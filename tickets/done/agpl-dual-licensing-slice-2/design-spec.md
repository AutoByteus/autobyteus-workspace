# Design Spec — agpl-dual-licensing, Slice 2 (licence in shipped software, CLA, consistency check)

## Solution And Approval Basis

- Current solution revision ID: `SR-007`
- Approved requirements: [requirements-doc.md](requirements-doc.md), `Approved`. User approval 2026-10-08 (SR-002). REQ-008 manual-CLA form approved by user delegation (SR-004). Holder name confirmed by the user ("yes, the name is Yu Zheng …"). SR-006 corrects the stale SR-005 draft; intended behavior unchanged.
- Slice 2 direction: Project Task Manager 2026-10-08 ("Please go ahead with Slice 2"); user 2026-10-08 ("The software itself, basically we need to keep things consistent").
- Slice 1 (licence text) is complete and merged: `7d4abded6` on `origin/personal`. History: `tickets/done/agpl-dual-licensing/`.
- Behavior-defining supplements: None
- Design status: `Ready`
- Canonical investigation notes: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo-agpl-slice-2/tickets/in-progress/agpl-dual-licensing-slice-2/investigation-notes.md` (see "Slice 2 architecture findings")
- Authorities read (2026-10-08): `references/architecture-design.md`, `design-principles.md`, project `DESIGN.md`, project `TESTING.md`, `templates/design-spec-template.md`
- Conflicts or discrepancies: None

> Not legal advice. The CLA text and licence wording need lawyer review before they are relied on (REQ-011).

## Current-State Read

- After Slice 1, the source repository states AGPL-3.0-only / commercial consistently, but the **shipped software does not carry it**. The desktop app has no licence resource and no copyright string. The released server image and the other runtime images neither copy the licence nor label it. The gateway runtime tarball is staged by `pnpm deploy`, and nothing guarantees licence files in it.
- There is no contribution policy. The repo has had one PR (owner). The owner and agents push directly to `personal`.
- Nothing prevents a future edit from reintroducing an Apache claim on an AGPL component, or a release from shipping one.
- Existing patterns to reuse: per-resource packaging constants plus a preflight check plus an integration test (noVNC notice, isolated-launch marker). A Python repository-policy checker run in the release workflow (`check_repository_artifact_hygiene.py`).

## Task Size And Architectural Risk (Mandatory)

- Task size: `Medium`
- Size rationale: about 20 files across desktop packaging (1 new constants module, `build.ts`, 1 new integration test), 4 Dockerfiles, the gateway packaging script, 1 new Python checker + unittest, 4 release-workflow steps, and 4 docs (CONTRIBUTING, CLA, PR template, LICENSING/README pointers). Every change extends an existing owner using an existing pattern.
- Architectural risk: `Low`
- Risk rationale: There is no runtime, API, persistence, security-boundary or concurrency change. Packaging gains static files and a metadata string through the same mechanisms already used for the noVNC notice. The release gate is the same kind of step as the existing hygiene check. Its failure mode is a visible, early CI failure with an explicit message, and it is deterministic for a given tree (no network).
- Escalation trigger: return a Design Impact if any of these happens:
  - the licence check fails on the current `personal` tree for reasons other than real inconsistencies;
  - the electron-builder `copyright` or extra resources change the signing or notarization results;
  - a Dockerfile change requires restructuring stages;
  - the gateway deploy cannot include LICENSE without changing the package's `files`/publish contract.

## Architecture Investigation Evidence

See investigation notes, "Slice 2 architecture findings". Key facts: electron-builder resolves `from` against the project dir (so `../` paths work), and `copyright` maps to `NSHumanReadableCopyright`/`LegalCopyright`. There is no custom app menu, so the default macOS About shows that string. All four runtime Dockerfiles build from repo-root context, and `.dockerignore` does not exclude the files. The release workflows have a checkout step at which to insert the check.

## Intended Change

1. Every shipped AutoByteus artifact carries `LICENSE` (AGPL text), `LICENSING.md` and `NOTICE`. The macOS About window and the Windows file properties show the copyright and licence line. Docker images are labelled `AGPL-3.0-only`.
2. `CONTRIBUTING.md` + `CLA.md` (v1.0) + a PR-template checkbox: outside contributions are merged only after the CLA is accepted. The copyright holder's own and his agents' work are exempt.
3. `scripts/check_licensing.py` enforces licence consistency and runs as a release gate in all four release workflows.

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior ID | Kind | Requirement / AC | Trigger | Existing Behavior | Approved Change | Target Path / Spine |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-004 | Operational | REQ-007 / AC-005 | Release tag → desktop / Docker / gateway packaging | No licence in artifacts | LICENSE + LICENSING.md + NOTICE in each artifact; About line; OCI label | DS-002 |
| BEH-005 | Operational | REQ-008 / AC-007 | Outside contributor opens PR | No policy | CONTRIBUTING + CLA + PR checkbox; owner merges only after acceptance | DS-003 |
| BEH-001…003 | Contract | REQ-010 / AC-009 | Release tag; local run | Manual grep only (Slice 1) | Automated checker as release gate | DS-002 (gate), DS-004 |

## Relevant Supplemental Task Artifacts

None.

## Task Design Health Assessment (Mandatory)

- Change posture: `Feature` (operational and contract completion)
- Current design issue found: `No`
- Structural triggers considered:
  - *Capability-area reuse*: satisfied. The packaging constants follow the noVNC/marker modules, and the checker follows the hygiene-checker pattern.
  - *Repeated coordination*: the same three licence files are listed for desktop, Docker and gateway. Each packager owns its own mechanism (electron-builder config, Dockerfile COPY, deploy-stage copy), so one shared runtime helper across TS/Docker/Node would be artificial. The single source of the file list is the repository root files themselves, and the checker verifies their text.
  - *Duplicated policy*: the component→licence map lives in exactly one machine place, `scripts/check_licensing.py`. `LICENSING.md` is the human statement, and the checker verifies that every Apache component is named in `LICENSING.md`, so the two cannot silently drift.
  - *Empty indirection*: the CLA bot was rejected (archived third-party action; manual acceptance approved).
- Root cause classification: `No Design Issue Found`
- Refactor needed now: `No`
- Evidence: investigation notes, Slice 2 table.
- Design response: extend the existing owners.
- Residual risk: manual CLA acceptance relies on the owner's discipline at merge time; this was approved (SR-004).

## Terminology

- **Product licence files**: root `LICENSE` (AGPL v3), `LICENSING.md`, `NOTICE`.
- **AGPL / Apache components**: as defined in the Slice 1 design (`tickets/done/agpl-dual-licensing/design-spec.md`, Terminology).

## Legacy Removal Policy (Mandatory)

Nothing obsolete is retained. The Slice 1 manual verification grep is superseded by the checker, which is not a parallel path. No compatibility mechanism is involved.

## Persisted Data / State Transition Decision

`Not Affected`.

## Data-Flow Spine Inventory

| Spine ID | Scope | Behavior IDs | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- | --- |
| DS-002 | Primary End-to-End | BEH-004, BEH-001…003 | Release tag pushed | Artifact published with licence files/label | Each release workflow + its packager | Recipients of binaries receive the terms |
| DS-003 | Primary End-to-End | BEH-005 | Outside contributor opens PR | Owner merges only after CLA acceptance | Copyright holder (manual) via CONTRIBUTING/CLA | Keeps dual-licensing rights |
| DS-004 | Bounded Local | BEH-001…003 | `check_licensing.py` invoked | Exit 0 / exit 1 with grouped violations | `check_licensing.py` | Deterministic consistency rule |

## Primary Execution Spine(s)

- DS-002: `Tag push -> release workflow checkout -> check_licensing.py gate -> packager (electron-builder | docker build | gateway build-runtime-package) adds LICENSE/LICENSING.md/NOTICE (+copyright / OCI label) -> published artifact`
- DS-003: `Contributor -> CONTRIBUTING.md -> PR template CLA checkbox (links CLA.md v1.0) -> owner review -> merge only if accepted`

## Spine Narratives (Mandatory)

| Spine | Narrative | Main Nodes | Owner | Off-Spine |
| --- | --- | --- | --- | --- |
| DS-002 | When a release tag runs, each workflow first proves the tree's licensing is consistent; a failure stops that workflow before any build. Each packager then includes the three root files in its artifact, using its own mechanism, and the desktop build sets the copyright string. | gate, packager, artifact | workflow / packager | packaging constants module, preflight existence checks |
| DS-003 | A contributor reads CONTRIBUTING, opens a PR whose template asks them to tick the CLA box (or comment the acceptance sentence). The owner merges only accepted PRs. | CONTRIBUTING, PR template, CLA | copyright holder | — |
| DS-004 | The checker loads tracked files via `git ls-files`, checks LICENSE hashes, manifest licences, the Apache-component mention in LICENSING.md, and scans for stray Apache claims outside the allowlist; it prints grouped violations. | load → check → report | checker | — |

## Spine Actors / Main-Line Nodes

Release workflows; `check_licensing.py`; electron-builder config (`build.ts`); Dockerfiles; `build-runtime-package.mjs`; CONTRIBUTING/CLA/PR template.

## Ownership Map

- `productLicensePackaging.ts` owns the desktop licence resource list and the copyright string, as constants only.
- `build.ts` owns the electron-builder config and preflight. It consumes the constants and owns no licence policy.
- Each Dockerfile owns its image contents and labels.
- `build-runtime-package.mjs` owns the gateway stage contents.
- `check_licensing.py` owns the machine-readable component→licence map and the consistency rules.
- `LICENSING.md` owns the human statement. `CLA.md` owns the contribution terms. `CONTRIBUTING.md` owns the process.

## Thin Entry Facades / Public Wrappers

N/A.

## Removal / Decommission Plan (Mandatory)

| Item | Why | Replaced By | Scope |
| --- | --- | --- | --- |
| Slice 1's manual grep verification | Becomes a durable automated rule | `scripts/check_licensing.py` | In This Change (documentation only; nothing to delete in code) |

## Return Or Event Spine(s)

N/A.

## Bounded Local / Internal Spines

DS-004 inside `check_licensing.py`: `git ls-files -> check_license_texts -> check_manifests -> check_licensing_doc_mentions -> scan_stray_claims -> report/exit`.

## Off-Spine Concerns Around The Spine

| Concern | Spine | Serves | Responsibility |
| --- | --- | --- | --- |
| Preflight existence check in `build.ts main()` | DS-002 | electron-builder packager | Fail early if a licence file is missing (same as noVNC) |
| Gateway stage verification | DS-002 | gateway packager | Assert `LICENSE`, `LICENSING.md`, `NOTICE` exist in stage before archiving |

## Ownership Boundaries / Boundary Encapsulation Map / Dependency Rules

- `build.ts` imports constants from `productLicensePackaging.ts`; nothing else imports the latter except its test.
- `check_licensing.py` is stdlib-only, has no network access and reads only the git tree. Workflows call it; it never calls workflows.
- Docs link to each other (README → LICENSING.md / CONTRIBUTING.md; CONTRIBUTING → CLA.md). The legal text lives only in `CLA.md`.
- Forbidden: copying CLA terms into CONTRIBUTING or the PR template (they link to `CLA.md`); hard-coding the component map anywhere except the checker.

## Interface Boundary Mapping

| Interface | Subject | Responsibility | Identity Shape | Notes |
| --- | --- | --- | --- | --- |
| `python3 scripts/check_licensing.py [--root PATH]` | Repo licensing | Exit 0 consistent / 1 violations | Repo root path (default: git toplevel of CWD) | Stdout grouped report |
| `PRODUCT_LICENSE_EXTRA_RESOURCES`, `PRODUCT_LICENSE_REQUIRED_FILES`, `PRODUCT_COPYRIGHT` | Desktop licence packaging | Constants | — | Mirrors noVNC module |

## Interface Boundary Check

| Interface | Singular? | Explicit Identity? | Ambiguity | Action |
| --- | --- | --- | --- | --- |
| `check_licensing.py` | Yes | Yes | Low | — |
| packaging constants | Yes | N/A | Low | — |

## Main Domain Subject Naming Check

| Subject | Name | Natural? | Action |
| --- | --- | --- | --- |
| Desktop licence constants | `productLicensePackaging.ts` | Yes | — |
| Checker | `scripts/check_licensing.py` | Yes | — |
| CLA | `CLA.md` | Yes | — |

## Existing Capability / Subsystem Reuse Check

| Need | Existing | Decision |
| --- | --- | --- |
| Packaged desktop resource | noVNC / isolated-marker pattern | Reuse pattern (new sibling module) |
| Repo-policy gate | `check_repository_artifact_hygiene.py` in release-desktop | Reuse pattern (new sibling script; separate concern) |
| CLA automation | `contributor-assistant/github-action` | **Rejected**: archived/unmaintained, node20, name-based allowlist; manual acceptance approved |

## Subsystem / Capability-Area Allocation

Desktop build scripts (`autobyteus-web/build/scripts`); Docker packaging (Dockerfiles); gateway packaging (`autobyteus-message-gateway/scripts`); repository policy scripts (`scripts/`); release CI (`.github/workflows`); repository governance docs (root, `.github/`).

## Final File Responsibility Mapping

| File | Action | Concrete content |
| --- | --- | --- |
| `autobyteus-web/build/scripts/productLicensePackaging.ts` | Add | `PRODUCT_COPYRIGHT = 'Copyright © 2026 Yu Zheng (AutoByteus). Licensed under AGPL-3.0-only or a commercial license.'`; `PRODUCT_LICENSE_EXTRA_RESOURCES = [{from:'LICENSE',to:'LICENSE'},{from:'../LICENSING.md',to:'LICENSING.md'},{from:'../NOTICE',to:'NOTICE'}] as const`; `PRODUCT_LICENSE_REQUIRED_FILES` = the `from` paths. Doc comment as in sibling modules |
| `autobyteus-web/build/scripts/build.ts` | Modify | Import the constants; add `copyright: PRODUCT_COPYRIGHT` to `options`; spread `...PRODUCT_LICENSE_EXTRA_RESOURCES` into `extraResources`; in `main()` add a preflight loop like the noVNC one: `Missing required product license file for packaging: <path>` |
| `autobyteus-web/tests/integration/product-license-packaging.integration.test.ts` | Add | Assert constants, that the required files exist relative to `autobyteus-web`, and that `LICENSE` is the AGPL text (sha256 `0d96a4ff…abcb0`). When `electron-dist` contains packaged apps (same helper approach as `isolated-launch-marker.integration.test.ts`), assert `<resources>/LICENSE`, `LICENSING.md`, `NOTICE` exist; for macOS `.app`, assert `Info.plist` `NSHumanReadableCopyright` equals `PRODUCT_COPYRIGHT` |
| `autobyteus-server-ts/docker/Dockerfile.monorepo` | Modify | In the runtime stage after `WORKDIR /app`: `COPY LICENSE LICENSING.md NOTICE /app/` and `LABEL org.opencontainers.image.licenses="AGPL-3.0-only"` |
| `docker/Dockerfile.allinone`, `docker/Dockerfile.remote-server` | Modify | Same, in the runtime stage after `WORKDIR /app` |
| `autobyteus-message-gateway/docker/Dockerfile` | Modify | Same, after the first `WORKDIR /app` |
| `autobyteus-message-gateway/scripts/build-runtime-package.mjs` | Modify | After `deployGatewayPackageToStage()`: copy `<workspaceRoot>/LICENSING.md` and `<workspaceRoot>/NOTICE` into `stageDir`. Add `verifyLicenseFiles()` (next to `verifyRuntimeEntrypoint`) asserting `LICENSE`, `LICENSING.md`, `NOTICE` exist in `stageDir`, called before archiving. `LICENSE` itself comes from the gateway package (pnpm/npm always pack it); if it does not, copy `autobyteus-message-gateway/LICENSE` explicitly |
| `scripts/check_licensing.py` | Add | See checker specification |
| `scripts/tests/test_check_licensing.py` | Add | unittest using importlib loading (same as `test_release_versions.py`); build temp git repos to cover: passing tree; wrong AGPL hash; missing Apache LICENSE; wrong manifest licence; excluded devkit template manifest ignored; tickets path ignored; stray "Apache License" in an AGPL file flagged; allowlisted file not flagged; binary file skipped; Apache component missing from LICENSING.md flagged |
| `.github/workflows/release-desktop.yml` | Modify | Step `Check licensing consistency` → `python3 scripts/check_licensing.py`, right after `Check repository artifact hygiene` |
| `.github/workflows/release-server-docker.yml` | Modify | Same step after `Checkout workspace` in `build-and-push` |
| `.github/workflows/release-android.yml`, `.github/workflows/release-ios.yml` | Modify | Same step after the first checkout in `prepare-release` |
| `CLA.md` | Add | See CLA specification |
| `CONTRIBUTING.md` | Add | See CONTRIBUTING specification |
| `.github/pull_request_template.md` | Add | Short template with summary section and the CLA checkbox |
| `LICENSING.md` | Modify | Add a "Contributions" section: contributions require accepting `CLA.md`; link CONTRIBUTING.md |
| `README.md` | Modify | In the License section add one line: "Contributions: see [CONTRIBUTING.md](./CONTRIBUTING.md); outside contributions require accepting the [CLA](./CLA.md)." Also add a one-line mention of `scripts/check_licensing.py` next to the existing hygiene-check bullet (README l.~585) |

### `check_licensing.py` specification

- Constants:
  - `AGPL_SHA256 = "0d96a4ff68ad6d4b6f1f30f713b18d5184912ba8dd389f86aa7710db079abcb0"`, `APACHE_SHA256 = "cfc7749b96f63bd31c3c42b5c471bf756814053e847c10f3eb003417bc523d30"`
  - `AGPL_LICENSE_DIRS = ["", "autobyteus-ts", "autobyteus-server-ts", "autobyteus-web", "autobyteus-message-gateway"]`
  - `APACHE_COMPONENTS` = the nine Apache component dirs
  - `MANIFEST_EXCLUDES = ["autobyteus-application-devkit/templates/"]`
  - `CLAIM_PATTERN = re.compile(r"Apache[- ]2\.0|Apache License|apache\.org/licenses")`
  - `CLAIM_ALLOWED_FILES = {"LICENSING.md", "NOTICE", "README.md", "autobyteus-android/gradlew", "autobyteus-android/gradlew.bat", "scripts/check_licensing.py", "scripts/tests/test_check_licensing.py"}`
  - `CLAIM_ALLOWED_PREFIXES = ["autobyteus-web/public/THIRD_PARTY_NOTICES/"] + [d + "/" for d in APACHE_COMPONENTS]`
- Every rule ignores any tracked path containing a `tickets` path segment (historical records).
- Rules:
  1. Each `AGPL_LICENSE_DIRS` entry has `LICENSE` with `AGPL_SHA256`.
  2. Each `APACHE_COMPONENTS` entry has `LICENSE` with `APACHE_SHA256`.
  3. Every tracked `package.json`, except excludes, has `license` equal to `Apache-2.0` if it is under an Apache component, otherwise `AGPL-3.0-only`. A missing field is a violation.
  4. `LICENSING.md` mentions every Apache component dir name.
  5. No tracked text file (skip files containing NUL bytes) outside the allowlist matches `CLAIM_PATTERN`.
- Output: one group per rule with paths (cap samples like the hygiene script). Exit 1 on any violation; otherwise print `Licensing is consistent.` and exit 0. Stdlib only.

### `CLA.md` specification (v1.0; lawyer to review)

Title "AutoByteus Contributor License Agreement — Version 1.0". Do not use the word "Apache" (claim scan). Sections:
1. **Parties.** "You" means the individual or legal entity submitting a Contribution. "Maintainer" means Yu Zheng (AutoByteus), the copyright holder of AutoByteus, and his successors and assigns.
2. **Definitions.** "Contribution": any original work of authorship, including modifications, that You submit to the Maintainer for inclusion in AutoByteus (for example via pull request, issue or patch).
3. **Copyright license.** You grant the Maintainer a perpetual, worldwide, non-exclusive, no-charge, royalty-free, irrevocable license to reproduce, prepare derivative works of, publicly display, publicly perform, sublicense and distribute Your Contributions and derivative works, **under any license terms the Maintainer chooses, including the GNU AGPL-3.0, permissive licenses and proprietary/commercial licenses**.
4. **Patent license.** A perpetual, worldwide, non-exclusive, no-charge, royalty-free, irrevocable patent license to make, use, sell, offer to sell, import and otherwise transfer the Contribution, limited to claims necessarily infringed by the Contribution alone or in combination with AutoByteus. Defensive termination if You sue alleging that AutoByteus or a Contribution infringes a patent.
5. **You keep your copyright.** Nothing else is transferred.
6. **Your representations.** The Contribution is Your original work, or You identify third-party material and its licence separately. You are legally entitled to grant these licences. If an employer has rights, You have permission or a waiver.
7. **No obligation.** The Maintainer need not use any Contribution. The Contribution is provided "AS IS", without warranties.
8. **Notification.** You will notify the Maintainer if any representation becomes inaccurate.
9. **How to accept.** Tick the CLA checkbox in your pull request, or comment exactly: `I have read the AutoByteus CLA (version 1.0) and I agree to its terms.` Acceptance applies to all Contributions You submit to the AutoByteus repositories. An entity accepting must be represented by an authorised person, who states the entity name in the PR.
10. **Note.** "This document has not yet been reviewed by a lawyer and is not legal advice." Keep this until the user replaces it after review.

### `CONTRIBUTING.md` specification

- Short welcome and how to contribute (issue first for larger changes; PRs against `personal`; follow `AGENTS.md`, `DESIGN.md`, `TESTING.md`).
- **Licensing of contributions.** AutoByteus is dual-licensed (link LICENSING.md). Contributions to AGPL components are accepted under the CLA, which lets the copyright holder offer them under AGPL-3.0-only and commercial licences. Contributions to the Apache-2.0 SDK/contract packages are likewise under the CLA.
- **CLA required.** Outside contributors must accept [CLA.md](./CLA.md) (tick the PR checkbox or comment the acceptance sentence). PRs are merged only after acceptance. The copyright holder's own contributions and those made by his AutoByteus agents are exempt.
- No CLA terms are copied here; link only.

### `.github/pull_request_template.md` specification

```
## Summary

<!-- What does this change and why? -->

## Contributor License Agreement

- [ ] I have read the [AutoByteus CLA](https://github.com/AutoByteus/autobyteus-workspace/blob/personal/CLA.md) (version 1.0) and I agree to its terms. <!-- Not required for the copyright holder. -->
```

## Applied Patterns

Packaging constants module + preflight + integration test (existing local pattern). Policy checker script + unittest (existing local pattern).

## Target Subsystem / Folder / File Mapping

As in the Final File Responsibility Mapping. No new folders.

## Folder Boundary Check

| Path | Depth | Clear? | Risk |
| --- | --- | --- | --- |
| `autobyteus-web/build/scripts/` | Packaging constants | Yes | Low |
| `scripts/` | Repo policy | Yes | Low |

## Concrete Examples / Shape Guidance

| Topic | Good | Avoided |
| --- | --- | --- |
| Desktop resources | `extraResources: [..., NO_VNC_…, ...PRODUCT_LICENSE_EXTRA_RESOURCES, ISOLATED_…]` | Inline literal paths in `build.ts` with no preflight |
| Checker failure output | `Stray Apache-2.0 claim in AGPL component files:\n  autobyteus-ts/README.md` | A bare exit 1 with no explanation |
| CLA in docs | CONTRIBUTING links CLA.md | Paraphrased CLA terms in CONTRIBUTING/PR template |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate | Decision | Note |
| --- | --- | --- |
| Keep Slice 1's manual grep as the only check | Rejected | Replaced by checker |
| CLA bot (archived third-party action) | Rejected | Manual acceptance approved (SR-004) |

## Derived Layering

N/A.

## Change / Refactor Sequence

1. `check_licensing.py` + tests; run it on the current tree. It must pass, because Slice 1 is consistent. If it does not, stop and report.
2. CLA.md, CONTRIBUTING.md, PR template, LICENSING.md/README pointers; re-run the checker.
3. Desktop packaging module, `build.ts` and the integration test.
4. Dockerfiles; gateway script.
5. Release-workflow steps.

## Key Tradeoffs

- Manual CLA is cheap and enough for the current contribution volume, but relies on the owner at merge time. A bot can be added later.
- Same three files are copied by three packagers, each with its own native mechanism, rather than an artificial shared helper.
- The checker's whole-file allowlist for README/LICENSING/NOTICE is simple but not line-precise. Acceptable, since those files are the human statements and are reviewed.

## Risks

- **Signing/notarization:** adding resources and a copyright string should not affect macOS signing (resources are signed with the bundle). Validate with the normal build path.
- **Release gate false positive** blocks a release. Mitigation: the checker runs on the current tree before merge; messages are explicit.
- **Legal:** CLA and licence wording need lawyer review.

## Guidance For Implementation

Verification (TESTING.md: smallest layers that prove it):
- `python3 -m unittest scripts/tests/test_check_licensing.py` and `python3 scripts/check_licensing.py` (exit 0 on the tree; demonstrate exit 1 on a deliberate local edit, then revert).
- `pnpm -C autobyteus-web test:nuxt tests/integration/product-license-packaging.integration.test.ts --run`.
- Desktop: build a worktree desktop package for the host platform (the repo's normal desktop build path, e.g. as used by `pnpm --silent isolated-app start --build`). Re-run the integration test so its packaged-output assertions execute. Inspect `<resources>/LICENSE`, `LICENSING.md`, `NOTICE` and `Info.plist` `NSHumanReadableCopyright`. Optionally open the isolated instance's About window for a screenshot (supporting only).
- Docker: `docker build -f autobyteus-server-ts/docker/Dockerfile.monorepo .` if feasible, otherwise at least `docker/Dockerfile.remote-server`. Then `docker run --rm --entrypoint ls <img> /app/LICENSE /app/LICENSING.md /app/NOTICE` and `docker inspect` for the label. If a Docker build is not feasible on this host, record that and prove the Dockerfile edits by review plus `docker build --check` or equivalent.
- Gateway: `pnpm -C autobyteus-message-gateway build:runtime-package` (or the narrowest option that stages and archives), then `tar -tzf <archive> | grep -E '(^|/)(LICENSE|LICENSING.md|NOTICE)$'`.
- Workflows: YAML lint/parse (e.g. `python3 -c "import yaml…"` if available, or `actionlint` if installed). The steps are plain `run:` commands.
- Nothing is released in this ticket. The next real release exercises the gates.
