# Design Spec

## Current-State Read

The v1.3.46 Desktop Release workflow fails on GitHub-hosted Windows during `actions/checkout`, before any desktop build command starts. The committed repository tree contains raw Xcode `.xcresult` evidence bundles archived under `tickets/done/ios-wrapper-app/...`. These bundles are generated directories with nested `Data/data.*` and `Data/refs.*` files whose generated filenames create very long relative paths. On Windows, checkout fails with `Filename too long` before `pnpm build:electron:windows` can run.

The current artifact boundary is too loose: durable ticket records, validation summaries, and logs are mixed with transient/generated build and test artifacts. Existing `.gitignore` covers some iOS local build outputs, but it does not broadly prevent `.xcresult` bundles or downloaded GitHub Actions artifact drops from being committed under ticket evidence. Desktop Release has no repository hygiene preflight before platform build jobs fan out.

## Intended Change

Remove generated, checkout-hostile artifacts from the committed tree; preserve human-readable evidence; add repository-level guardrails; and wire the guard into Desktop Release before platform jobs start. The iOS App Store Connect missing app-record error is explicitly excluded from this urgent remediation.

## Task Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Bug Fix + Cleanup
- Current design issue found (`Yes`/`No`/`Unclear`): Yes
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Missing Invariant + File Placement Or Responsibility Drift
- Refactor needed now (`Yes`/`No`/`Deferred`/`Unclear`): Yes
- Evidence: 13 committed `.xcresult` directories and 669 tracked `.xcresult` files under `tickets/done/ios-wrapper-app`; Windows checkout fails on those paths before build.
- Design response: Establish a repository artifact hygiene invariant owned by a guard script and release preflight, and clean the committed tree.
- Refactor rationale: Without a guard and explicit artifact boundary, the same ticket archival/finalization workflow can reintroduce generated evidence and break Windows releases again.
- Intentional deferrals and residual risk, if any: iOS App Store Connect app-record setup is deferred and must not block this Windows checkout remediation. Git history rewrite is deferred; current tree cleanup is enough for new release commits.

## Terminology

- `Durable ticket evidence`: Human-readable markdown reports, summaries, key logs, and small exported evidence intentionally kept for audit/review.
- `Generated evidence`: Tool-produced output directories or archives such as `.xcresult` bundles, simulator app zips, DerivedData/build directories, and downloaded CI artifact trees.
- `Repository hygiene guard`: Script that scans tracked files and fails if generated or checkout-hostile artifacts are tracked.

## Design Reading Order

1. Data-flow spine: release checkout and artifact archival flows.
2. Capability allocation: ticket evidence cleanup, ignore policy, and release preflight.
3. File responsibilities: guard script, `.gitignore`, workflow wiring, artifact removals.
4. Folder/path mapping.

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Required action: Remove raw `.xcresult` evidence bundles and generated simulator app zip(s) from the committed repository tree.
- Treat removal as first-class design work: The fix is invalid if it merely adds `core.longpaths` or works around Windows while leaving generated artifacts committed.
- Decision rule: Do not keep raw generated evidence in git for backward compatibility with previous ticket archival behavior.

## Data-Flow Spine Inventory

| Spine ID | Scope (`Primary End-to-End`/`Return-Event`/`Bounded Local`) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- |
| DS-WIN-001 | Primary End-to-End | Desktop Release trigger | Windows build step reached after checkout | Desktop Release workflow | This is the user-visible release path currently blocked before build. |
| DS-HYG-001 | Primary End-to-End | Developer/delivery artifact staging | Guard pass/fail before merge/release | Repository hygiene guard | Prevents generated artifacts from entering the tracked tree again. |
| DS-REC-001 | Primary End-to-End | Ticket validation evidence | Durable archived record | Ticket evidence package | Preserves audit value while removing raw generated output. |

## Primary Execution Spine(s)

- DS-WIN-001: `Release trigger -> prepare-release checkout on Ubuntu -> repository hygiene guard -> platform job fan-out -> Windows checkout -> Windows desktop build`
- DS-HYG-001: `Tracked file list -> hygiene guard rules -> violation report -> commit/release blocked`
- DS-REC-001: `Raw validation output -> curated summaries/logs/reports -> archived ticket record -> release audit`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-WIN-001 | Desktop Release should fail early on Linux if the repository tree is unsafe, otherwise Windows checkout should succeed and the job should reach the real build command. | Release trigger, prepare-release, hygiene guard, Windows checkout, Windows build | Desktop Release workflow | GitHub runner path limits, release metadata, submodule checkout |
| DS-HYG-001 | The guard derives truth from `git ls-files`, not filesystem accidents, so only committed/tracked files are judged. | Tracked file list, rule evaluator, failure output | Repository hygiene guard | Ignore policy, path-length threshold, generated-artifact patterns |
| DS-REC-001 | Ticket evidence should keep curated text records and selected small evidence, while raw generated bundles remain external/local. | Raw output, curator/removal, durable record | Ticket evidence package | CI artifacts, screenshots, result bundles |

## Spine Actors / Main-Line Nodes

- Desktop Release workflow
- Repository hygiene guard
- Ticket evidence package
- Windows checkout/build job

## Ownership Map

- Desktop Release workflow owns release sequencing and platform job fan-out. It must enforce the repository hygiene guard before platform jobs begin.
- Repository hygiene guard owns tracked-tree invariants: no raw `.xcresult` internals, no generated ticket build zips, no checkout-risk path lengths.
- Ticket evidence package owns durable audit records only; it must not own raw generated tool output.
- Windows checkout/build job owns Windows desktop build execution only after a safe checkout; it must not be asked to compensate for unsafe repository artifacts.

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| `.gitignore` patterns | Repository hygiene guard + git ignore policy | Prevent accidental staging of generated files | Final validation of already-tracked files |
| Desktop `prepare-release` guard step | Repository hygiene guard | Runs invariant in release flow | Artifact classification policy duplicated in YAML |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope (`In This Change`/`Follow-up`) | Notes |
| --- | --- | --- | --- | --- |
| `tickets/done/ios-wrapper-app/**/*.xcresult/` | Raw generated Xcode bundles are checkout-hostile and not durable source/docs | Human-readable summaries/logs/reports | In This Change | Remove from git with `git rm -r` |
| `tickets/done/ios-wrapper-app/**/github-run-*-artifacts/**/*.zip` generated app/build archive(s) | Generated build output should not be committed to ticket archive | CI artifact retention or textual summary | In This Change | Keep logs/summaries from same folder if useful |
| Prior implicit policy allowing raw generated evidence in tickets | Caused release checkout regression | Guard script + ignore policy | In This Change | No compatibility exception |
| iOS App Store Connect missing app-record failure | Separate external setup issue | Follow-up app-record/access task | Follow-up | Explicitly out of scope |

## Return Or Event Spine(s) (If Applicable)

- Guard failure event: `Tracked violation -> guard stderr/stdout violation list -> workflow failure summary -> implementation/delivery correction`.

## Bounded Local / Internal Spines (If Applicable)

- Guard local spine: `git ls-files -> classify path -> collect violations -> print grouped diagnostics -> exit 1/0`. This matters because the guard must check tracked files, not merely ignored local files.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| `.gitignore` generated artifact patterns | DS-HYG-001, DS-REC-001 | Repository hygiene guard / git policy | Stop new untracked generated artifacts being staged accidentally | Prevents recurrence before guard stage | YAML/workflow-only checks would not protect local staging |
| Path-length threshold | DS-HYG-001, DS-WIN-001 | Repository hygiene guard | Catch checkout-risk tracked paths conservatively | Windows checkout cannot run a repo script before checkout | If hidden in Windows job, failure remains too late |
| Evidence preservation | DS-REC-001 | Ticket evidence package | Keep summaries/logs/reports after raw bundles removed | Maintains auditability | Removing whole ticket evidence would lose useful context |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision (`Reuse`/`Extend`/`Create New`) | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Ignore generated files | `.gitignore` | Extend | Existing repository-wide git ignore owner | N/A |
| Release preflight | `.github/workflows/release-desktop.yml` `prepare-release` | Extend | Existing common release metadata gate for all desktop jobs | N/A |
| Tracked-tree artifact invariant | `scripts/` | Create New | No existing repository hygiene script was found | Existing release scripts are release drivers, not tracked-tree policy owners |
| Durable evidence | `tickets/done/ios-wrapper-app` summaries/logs | Reuse | Existing archived ticket record remains useful | N/A |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision (`Reuse`/`Extend`/`Create New`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Repository hygiene | Guard script, tracked path rules, diagnostics | DS-HYG-001 | Repository maintainers, release workflow | Create New | Keep rule ownership out of workflow YAML |
| Desktop Release workflow | Running guard before platform jobs | DS-WIN-001 | Release automation | Extend | Guard runs in `prepare-release` |
| Ticket evidence archive | Curated retained evidence, removal of generated output | DS-REC-001 | Delivery/audit process | Extend/Clean | Remove generated internals |

## Draft File Responsibility Mapping

| Candidate File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `scripts/check_repository_artifact_hygiene.py` | Repository hygiene | Guard script | Scan `git ls-files`, enforce disallowed generated artifacts and path-length threshold | One cohesive tracked-tree invariant | No |
| `.gitignore` | Git ignore policy | Ignore patterns | Prevent accidental staging of raw `.xcresult`, generated ticket artifact dirs/zips | Existing git ignore owner | N/A |
| `.github/workflows/release-desktop.yml` | Desktop Release workflow | Release preflight | Run guard in `prepare-release` after checkout | Existing common release gate | N/A |
| `tickets/done/ios-wrapper-app/**` | Ticket evidence archive | Durable record | Remove generated bundles, keep summaries/logs/reports | Existing ticket archive | N/A |

## Reusable Owned Structures Check

No reusable data structure extraction is needed. The guard can own its rule list internally because no existing duplicate guard logic exists.

## Shared Structure / Data Model Tightness Check

N/A. No shared runtime data model is introduced.

## Final File Responsibility Mapping

| File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `scripts/check_repository_artifact_hygiene.py` | Repository hygiene | Guard script | Enforce no tracked `.xcresult`, no tracked generated ticket zips, no tracked path over threshold | Centralizes policy and diagnostics | No |
| `.gitignore` | Git ignore policy | Ignore pattern list | Ignore `.xcresult/`, ticket `github-run-*-artifacts/`, generated archives where appropriate | Existing policy file | N/A |
| `.github/workflows/release-desktop.yml` | Desktop Release workflow | Release preflight | Add `python3 scripts/check_repository_artifact_hygiene.py` in `prepare-release` | Reuses workflow gate before platform fan-out | N/A |
| Removed paths under `tickets/done/ios-wrapper-app` | Ticket evidence archive | Durable evidence cleanup | Delete generated `.xcresult` bundles and generated app zip(s) | Cleanup belongs where bad artifacts live | N/A |

## Ownership Boundaries

The repository hygiene guard is the authoritative boundary for tracked artifact policy. `.gitignore` helps prevent accidental staging but cannot validate already-tracked files. Desktop Release must call the guard rather than duplicating path rules in YAML. Ticket evidence must remain curated and human-readable; raw tool output belongs in external CI artifacts or local ignored folders, not in the committed archive.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `scripts/check_repository_artifact_hygiene.py` | Path classification, disallowed patterns, threshold diagnostics | Desktop Release workflow, local validation, reviewers | Reimplementing generated-artifact checks directly in workflow YAML | Add flags/options to the script |
| `tickets/done/...` curated evidence boundary | Reports, summaries, logs, selected short evidence | Delivery/archive process | Dropping raw generated tool directories into tickets | Add exported summaries or external artifact references |

## Dependency Rules

- Desktop Release may depend on the hygiene guard script.
- The guard may depend on `git ls-files` and standard Python only.
- The guard must not depend on platform-specific build tools or Apple/Xcode tooling.
- Ticket evidence may include text logs/reports but must not include raw `.xcresult` bundles or generated build archives.
- Do not solve this by setting Windows `core.longpaths` alone; that bypasses the artifact-boundary problem and leaves generated files committed.

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `python3 scripts/check_repository_artifact_hygiene.py` | Tracked repository tree | Validate artifact/path hygiene | Current git worktree | Optional future flags may tune threshold, but default must protect release |
| Desktop workflow step | Release preflight | Invoke guard before platform builds | Release ref checkout | Runs after Ubuntu checkout |

## Interface Boundary Check

| Interface | Responsibility Is Singular? (`Yes`/`No`) | Identity Shape Is Explicit? (`Yes`/`No`) | Ambiguous Selector Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| Guard script CLI | Yes | Yes: current git worktree | Low | N/A |
| Workflow guard step | Yes | Yes: checked out release ref | Low | N/A |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Name Is Natural And Self-Descriptive? (`Yes`/`No`) | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Guard script | `check_repository_artifact_hygiene.py` | Yes | Low | N/A |
| Ticket evidence archive | `tickets/done/ios-wrapper-app` | Yes | Medium if raw output returns | Guard and ignore patterns prevent drift |

## Applied Patterns (If Any)

- Preflight guard: A simple tracked-tree validation step runs before expensive or platform-sensitive release jobs.
- Curated evidence: Replace raw generated evidence with summaries/logs/reports or external artifact references.

## Target Subsystem / Folder / File Mapping

| Path | Kind (`Folder`/`Module`/`File`) | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `scripts/check_repository_artifact_hygiene.py` | File | Repository hygiene guard | Validate tracked files for generated artifacts/path length | Existing scripts folder for repo-level commands | Build logic, Xcode-specific parsing |
| `.github/workflows/release-desktop.yml` | File | Desktop Release workflow | Run guard in `prepare-release` | Existing release workflow | Duplicated guard pattern logic |
| `.gitignore` | File | Git ignore policy | Ignore raw/generated evidence | Existing repository ignore owner | Tracked-file validation logic |
| `tickets/done/ios-wrapper-app` | Folder | Curated ticket evidence | Retain reports/summaries/logs; remove generated bundles | Existing archived ticket | `.xcresult`, generated app zips, raw build dirs |

## Folder Boundary Check

| Path / Folder | Intended Structural Depth (`Transport`/`Main-Line Domain-Control`/`Persistence-Provider`/`Off-Spine Concern`/`Mixed Justified`) | Ownership Boundary Is Clear? (`Yes`/`No`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Justification / Corrective Action |
| --- | --- | --- | --- | --- |
| `scripts/` | Off-Spine Concern | Yes | Low | Existing place for repo-level utility scripts |
| `.github/workflows/` | Main-Line release orchestration | Yes | Low | Workflow calls guard, does not own rules |
| `tickets/done/ios-wrapper-app` | Mixed Justified archive | Yes after cleanup | Medium | Ticket archive may contain varied evidence, but no raw generated output |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Bad / Avoided Shape | Why The Example Matters |
| --- | --- | --- | --- |
| iOS simulator evidence | Keep `summary.txt`, `xcodebuild-test.log`, `api-e2e-validation-report.md` | Commit `AutoByteusMobile.xcresult/Data/data.0~...` | Keeps auditability without breaking Windows checkout |
| CI artifact reference | Keep a short log and GitHub run URL/artifact name | Commit exploded `github-run-...-artifacts/**/.xcresult` and simulator app zip | Downloaded artifacts are not repository source |
| Windows mitigation | Remove generated files and guard tracked tree | Only set `core.longpaths=true` | The latter hides the artifact-boundary regression |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision (`Rejected`/`N/A`) | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| Keep `.xcresult` bundles and enable Windows long paths | Might make checkout succeed on some runners | Rejected | Remove generated bundles from git and add guard |
| Compress `.xcresult` bundles into committed zips | Preserves raw evidence in git with shorter paths | Rejected for urgent fix | Keep summaries/logs; use external CI artifacts if raw bundles are needed later |
| Exclude Windows release checkout paths | Could avoid ticket archive in Windows workspace | Rejected | Desktop release should checkout a healthy repository tree |

## Derived Layering (If Useful)

- Release orchestration layer: `.github/workflows/release-desktop.yml`.
- Repository policy layer: `scripts/check_repository_artifact_hygiene.py` and `.gitignore`.
- Evidence/archive layer: `tickets/done/ios-wrapper-app` curated records.

## Migration / Refactor Sequence

1. Add/extend `.gitignore` patterns for `.xcresult/`, generated ticket artifact directories, and generated archives where appropriate.
2. Add `scripts/check_repository_artifact_hygiene.py` with tracked-file checks:
   - fail on paths containing `.xcresult/` or ending `.xcresult`;
   - fail on generated app/build zip artifacts under ticket `github-run-*-artifacts` paths;
   - fail on tracked relative path length above the chosen conservative threshold (200 chars recommended unless implementation finds a better justified value);
   - print actionable violation summaries.
3. Remove raw `.xcresult` directories from `tickets/done/ios-wrapper-app` with `git rm -r`.
4. Remove generated simulator app zip(s) from ticket evidence; retain text logs/summaries from the same evidence tree where useful.
5. Run the guard and record output.
6. Wire the guard into Desktop Release `prepare-release` after checkout and before version validation/platform fan-out completion.
7. Validate `git ls-files` no longer reports `.xcresult` paths or over-threshold paths.
8. Validate Desktop Release Windows checkout/build path through a GitHub-hosted run or equivalent evidence. Record any post-checkout Windows build issue separately.

## Key Tradeoffs

- Removing raw `.xcresult` bundles loses committed screenshots/internal result metadata, but preserves repository portability and release reliability. Human-readable summaries/logs remain.
- A 200-character relative path guard is conservative. It may occasionally require shortening legitimate future paths, but current non-`.xcresult` tracked files already satisfy it.
- Guarding release `prepare-release` catches future release tree problems before platform fan-out, but branch PR hygiene should still run locally or in validation.

## Risks

- A different Windows build failure may surface after checkout is unblocked.
- If downstream agents remove too much evidence, auditability could suffer; retain summaries/logs/reports.
- If generated artifacts are needed for forensic debugging, they should be linked as external GitHub artifacts or regenerated, not committed raw.

## Guidance For Implementation

- Do not touch application runtime logic.
- Keep the diff focused: artifact removals, `.gitignore`, guard script, Desktop Release workflow preflight, and remediation ticket evidence.
- Use `git rm -r` for tracked `.xcresult` bundles so deletions are explicit.
- Before handoff, run:
  - `python3 scripts/check_repository_artifact_hygiene.py`
  - `git ls-files | grep -E '\.xcresult(/|$)'` should return no matches
  - a path-length audit showing no tracked relative path exceeds the guard threshold
  - workflow YAML syntax/lint if available
- Preserve the iOS App Store Connect failure as out of scope.
