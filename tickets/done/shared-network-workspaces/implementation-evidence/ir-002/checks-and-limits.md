# IR-002 implementation self-checks and limits

Source: development commit `c57ab71c90` plus baseline launcher fix `6717bcb221`
and fixture-only core-test correction `f34fc81aa2`.
This is implementation-scoped evidence, **not API/E2E, physical topology, release,
or user verification**. Root `TESTING.md`, package instructions and the implementation
skill governed execution. No live export, mount, OS job, package installation,
Docker resource, real user dataset or model/provider turn was exercised.

## Current results and reproduction

Commands below run from the assigned worktree unless a directory is specified.
For compact command paths, set `E=tickets/in-progress/shared-network-workspaces/implementation-evidence/ir-002`.
For earlier suite logs that do not include the shell preamble, these are reproduction
commands for the recorded runner/scope; no unrecorded scheduling flags are claimed.

| Scope / command | Result | Evidence |
| --- | --- | --- |
| `pnpm -C autobyteus-server-ts exec vitest run tests/unit --no-watch` | 686 files passed, 4 skipped; 5,402 tests passed, 7 skipped | `server-unit-final.log` |
| `pnpm -C autobyteus-server-ts typecheck` | Pass, including normal shared-package pretypecheck builds | `typecheck-command-final.log`; earlier `server-typecheck-final2.log` |
| `pnpm -C autobyteus-server-ts build` | Pass, current production output plus sanitized built-module/bootstrap smoke | `server-build-final.log` |
| `pnpm -C autobyteus-ts exec vitest run tests/unit/tools/terminal --no-watch` | 17 files, 109 tests passed | `core-terminal-unit-2.log`; core build in `core-build.log` and later typecheck prebuild |
| `pnpm -C autobyteus-web test:nuxt components/settings/__tests__/NodeManager.spec.ts components/settings/__tests__/NfsGuideCard.spec.ts utils/__tests__/nfsLauncherCommands.spec.ts --run` | 3 files, 21 tests passed | `web-unit-final.log` |
| `pnpm -C autobyteus-web guard:web-boundary`, `guard:localization-boundary`, `audit:localization-literals` | All pass; zero unresolved localization findings | `web-guards-final.log` contains exact commands |
| Actual Nuxt components in task-owned Chrome: `node "$E/ui/render-selfcheck.mjs" render-NEW` with a fresh output directory | 8 asserted cases pass; no browser errors; copy failure also awaited/asserted by visible state | `ui/render-2/result.json`, screenshots, `ui/render-2-console.log`, harness and fixture |
| `cd autobyteus-nfs && GOTOOLCHAIN=local <Go1.27.2>/bin/go test -race ./...` then `go vet ./...` | 7 test packages pass; command package has no tests; vet pass | `go-race-final2.log`, `go-vet-final2.log` |
| `python3 "$E/go-cross-build.py"` | Darwin/Linux arm64/amd64 compile; native Darwin-arm64 `version` succeeds, unqualified `verify-release` correctly refuses | `go-cross-build-final2.log`, `go-build-receipt-final2.json`; foreign binaries **not executed** |
| `python3 -m unittest scripts/tests/test_public_docker_launcher_shared_workspace.py -v` | 38 cases run successfully, including 2 unavailable-PowerShell skips (not passes) | `launcher-regressions-2.log` |
| `python3 -m unittest scripts/tests/test_nfs_packaging_and_launcher.py scripts/tests/test_nfs_installer_fixture.py -v` | 6 tests pass; valid fake download invokes verifier/version; checksum, link and traversal/extra-member refusals; scratch removed | `nfs-packaging-final.log` |
| Ruby YAML parser and `bash -n` on NFS installer/launcher modules | Syntax pass; not an executed CI workflow | `packaging-syntax-final.log` |
| `python3 scripts/check_licensing.py`, `python3 scripts/check_repository_artifact_hygiene.py`, `git diff --cached --check` | Pass after explicit staging; source-size audit within limits | `licensing-final.log`, `artifact-hygiene-*-final.log`, `source-audit.json` |

The extended healthy preview unit scope (`healthy-preview-unit.log`) passed 2 files /
11 tests: exact PNG/SVG bytes/MIME, encoded path, HTML and static relative assets,
missing files; existing completed-artifact projection/no-store checks remain. The
full server suite also includes these cases. No REST route implementation changed.
Mounted UI previews, actual HTTP auth/projection and full application journeys are
not established by in-process unit injection.

### Native linked discovery (no model inference)

Task-owned signed-out homes and fixtures exercised installed native **metadata**
surfaces, not paid prompts: Claude SDK 0.3.280 plugin `supportedCommands`, Codex
0.162.1 `skills/config/write` extraRoots plus `skills/list`, Grok 1.0.52 plugin/ACP
`_x.ai/skills/list`. All final linked-discovery cases passed. Codex/Grok reported
canonical source manifest paths; Claude reported logical/frontmatter names under
the plugin namespace, not necessarily the directory alias. Source/support fixtures
and project contents were retained; exact native child exits and temporary-home
cleanup appear in each `*-discovery-result.json` / `claude-skill-name-confirmed.json`.

This does **not** prove native tool execution, a previously unread support asset
being opened by the runtime, healthy NFS execution, two live peers, restored turns,
or source-byte retention. Host-side support-file inspection is explicitly narrower.
Current source has unit coverage for exact profile cleanup, close failure/retry,
partial preparation, source Update/Remove independence, collision policy, separate
Codex clients and shared-path no-temp fallback. Full native proof remains downstream.

## Retained failures and corrections

- `server-unit-all.log` is the earlier non-green broad run, not the authoritative
  result. Filtered dependency links omitted shared SDK workspace packages; corrected
  workspace installation/prebuild. One async discovery fixture needed another event
  loop turn rather than an immediate microtask assertion. A changed admission method
  was edited while that first suite ran, producing a fixture mismatch. Final full
  runs were frozen; `server-unit-stable.log` and then `server-unit-final.log` pass.
- Initial `core-terminal-unit.log` asserted serialization of the entire in-memory
  context, including an existing background-manager resolver. Corrected the new
  assertion to the actual persisted `customData` boundary; child-only env tests and
  the 109-test rerun pass. No production behavior was changed to satisfy that test.
- Initial Claude mixed-name **directory-name hypothesis** failed. Kept
  `claude-directory-name-hypothesis.mjs` and original result. A positive directory
  control plus logical/frontmatter-name assertions passed; production uses that
  observed contract. No silent skip, copy fallback or shared plugin was added.
- `launcher-regressions.log` caught an existing macOS system-Bash apostrophe quoting
  defect and the first NFS change taking a launcher module beyond its size limit.
  The quote defect reproduced with the baseline function (`launcher-baseline-quote.*`)
  and was fixed separately in `6717bcb221`; desired-config/run argument ownership was
  split to `container-config.sh`. Rerun: 38 run, 2 skipped, no failures.
- First rendered run completed its assertions but Nuxt scratch cleanup raced on
  ENOTEMPTY. Kept `ui/render-1-console.log`; removed the exact leftover task home and
  added bounded cleanup retries. `render-2` confirms browser, server, page and home
  removal. No unrelated browser/app was used or stopped.
- Initial Go extraction attempts failed on Python 3.9's missing tar filter API and
  the archive's top `go` member. Corrected member checks after official checksum
  verification; only a task-owned temporary toolchain was installed. A later shell
  cleanup form was rejected before execution; cross-build cleanup instead uses
  Python `TemporaryDirectory`. No privileged command was run.
- Source self-review corrected interrupted Apple two-file apply, retained package
  mask cleanup errors, daemon identity, exact replacement ownership, pending selected
  node publication/detach recovery, disposable probe cleanup and generated Ganesha
  config removal without source/recovery deletion. Final Go race/vet and compile
  receipts postdate these edits.
- First staged whitespace audit caught an extra blank EOF in the new shell module;
  removed it and reran the cached diff check before the development commit.

Warnings retained in logs (not failed checks): stale Browserslist metadata, KaTeX
fixture quirks-mode warning, Node localization module-type warning. No dependency
upgrade or global repository policy change was added for those warnings.

## Packaging/source basis and hygiene

- `source-audit.json` hashes all 139 changed source/test/doc paths (including the later fixture-only baseline fix) against reviewed
  upstream `65b0e6e57a`. Current production-source hash is
  `8267720954e31425f761b500fa6abdd88134b3e3bbd97b715c99a7fa058d202d`.
- Every changed source implementation file remains <=500 nonempty lines. New Go
  files remain <=220 effective nonempty lines after splitting plan/apply/lifecycle,
  detach, mount observation, ownership/recovery and interactive CLI concerns. New
  snapshot mapping has >220 raw lines including spacing but one cohesive wire-map
  responsibility and <=220 nonempty lines; no extra abstraction was justified.
  Largest changed TS implementation is 473; launcher runtime shrank from 497 to 450.
- Official references checked for implementation details, not qualification:
  [Go distribution metadata](https://go.dev/dl/?mode=json),
  [Docker Engine v1.47 API](https://docs.docker.com/reference/api/engine/version/v1.47/),
  [Ganesha V4.3 source](https://github.com/nfs-ganesha/nfs-ganesha/tree/V4.3),
  [Moby capability-scoped seccomp profile](https://github.com/moby/profiles/blob/main/seccomp/default.json),
  [GitHub runner labels](https://docs.github.com/en/actions/reference/runners/github-hosted-runners).
  Runner availability/docs are not proof that this unrun workflow succeeds. Ubuntu
  package/base pins come from the reviewed reference experiment's actual inventory;
  current clean-install/package-availability qualification remains outstanding.
- `release-lock.json` intentionally has no qualified targets/source/user receipt;
  publish gate refuses. Default UI release descriptor remains null. No asset URL,
  release, signed binary, public image pull or installation command was shipped.
- No generated SDK `dist` output, binary, credential or raw test database is staged.
  Credential-shape scan found no private-key/token shapes in the evidence; this is
  an artifact audit, not a claim of exhaustive security review.

## Still required, by the selected downstream owners

Independent source review; current-build selected hosting/client matrix including
**managed Docker clients on both Mac/Linux**; clean-machine install, root permissions,
Ganesha file handles/capabilities, actual nfsd reload and serial reconnect; live exact
Docker preservation/rollback/normal launcher upgrade; healthy streaming media/HTML/
relative assets/completed-artifact previews and explorer reload; actual runtime tools,
previously unread support assets, peers stopped/restored, source Update/Remove and
ordinary local/AGY regressions. Independent physical Mac/Linux/Docker proof, docs sync,
merge to `origin/personal`, explicit user verification and permitted release are
pre-delivery gates. No consent for those live actions is inferred here.

DEC015 remains: hard NFS may stall file/preview/terminal and unrelated work. D-001
is deferred, not repaired. There is no bounded-outage guarantee, action worker pool,
probe-every-file protocol, stream lease, source snapshot/pin or local fallback.

## Expanded self-testing requested before final handoff

The user requested broader testing personally. No testing was delegated. See
`expanded-local-checks.py` and its JSON receipt for exact clean-environment commands,
PIDs, return codes and temporary-home cleanup. This adds complete affected core,
web and Electron unit suites, web build and narrowly selected non-provider
integration regressions. The full server unit suite/build/typecheck already passed.
The final result must also account for `core-unit-all-rerun-result.json`; the first
expanded core result is deliberately retained as failed.

The first full core run: 297 files/2,018 tests passed, one existing file-utils
traversal fixture failed. Its unchanged baseline source hashes are recorded in
`core-baseline-fixture.json`. HOME=TMPDIR is legitimate for credential-free tests;
the old fixture's supposed forbidden target was actually inside the intentionally
permitted Temp root. The test now uses a pure synthetic workspace outside allowed
Temp/Downloads for its traversal rejection case; no filesystem operations or
production security behavior changed. The full core suite was rerun, not just the
single assertion.

Go statement coverage (`go-coverage.log`) is intentionally not called full service
qualification: backend32.3%, CLI19.6%, config64.0%, Docker38.9%, platform22.6%,
service47.2%, setup8.2%, main0%. Most privileged real-platform paths remain unexecuted
locally. Race/vet/compilation and mocked adapter tests do not erase this gap.

Expanded full core rerun passed **298 files / 2,019 tests** in the same clean
HOME=TMPDIR environment. Fixture-only baseline commit: `f34fc81aa2`. Production
source hash is unchanged; no security permission check was weakened.

### Final expanded authoritative results

| Command / scope | Result on current source | Receipt |
| --- | --- | --- |
| `pnpm -C autobyteus-ts exec vitest run tests/unit --no-watch --maxWorkers=2` | 298 files / 2,019 tests pass after fixture-only correction | `core-unit-all-rerun.log`, `core-unit-all-rerun-result.json` |
| `pnpm -C autobyteus-web test:nuxt --run --maxWorkers=2` | **Fail**:611 files pass,1 fail,2 skip;4,258 tests pass,3 fail,5 skip | `web-unit-all.log`, `expanded-local-checks-result.json` |
| `pnpm -C autobyteus-web test:electron --run --maxWorkers=2` | **Fail**:35 files pass,1 fail,1 skip;188 tests pass,3 fail,1 skip | `electron-unit-all.log`, `expanded-local-checks-result.json` |
| `pnpm -C autobyteus-web build` | Pass;20 prerendered routes, not packaged Electron | `web-build.log` |
| `pnpm -C autobyteus-server-ts test:integration:prepare` | Pass; normal server/shared SDK/devkit/BriefStudio preparation | `integration-prepare.log` |
| Selected agent-manager/service/backend-factory, skill and explorer integration (exact9 paths in JSON) | 9 files / 52 tests pass; DummyLLM only | `changed-boundary-integration.log`, `expanded-local-checks-result.json` |

The two full frontend suite failures are the same three cases, not six distinct
bugs. Baseline source and test hashes prove unchanged origins. See
`updater-baseline-finding.json`, `updater-follow-up.md` and the candidate-only patch.
A temporary candidate diagnostic change was checked separately; its rerun logs do
not replace the current-source failures. No test was disabled to make a green result.
The implementation skill scope restriction and TESTING.md rule9's product-change
follow-up provision apply to this unrelated updater product change. The follow-up is for project Tasks-owner
triage, not an automatically assigned/delegated task.

All full-suite executions used throwaway HOME/TMPDIR and a short environment
allowlist, not inherited provider credentials. Normal builds generated SDK dist
outputs; those remain untracked and unstaged. `toolchain-cleanup.json` confirms
removal of the exact task-owned Go distribution; user toolchains/caches untouched.
Full API/E2E and physical-topology qualification were not run: the role boundary
reserves those checks for independent validation, and there is no live resource or
provider authority inferred from this local testing request.

### Candidate disposition, not a source-suite pass

The diagnostic-only updater candidate passed Nuxt612 files/4,262 tests (2 files/
5 tests skipped), Electron36 files/192 tests (1 file/1 test skipped), and Electron
transpilation. It adds one explicit stack-path regression, hence the additional
case. It was then removed from the two production/test files, with SHA receipts in
`updater-candidate-disposition.json`. Current-source Electron rerun and transpile
are recorded separately in `electron-current-source-result.json`; the baseline
three failures persist as expected. The canonical source still has the original
frontend failure. `expanded-rerun.py` now refuses unless the exact historical
candidate is present, so its old result cannot be mistaken for a new green run.

For durable logs, trailing horizontal whitespace and redundant blank EOF were
normalized without removing failures, messages or ANSI bytes; before/after hashes
are in `log-normalization.json`. The unapplied candidate patch uses zero context;
it is evidence for separate triage, not an automatically applicable product fix.
