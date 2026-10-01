# Reproducing the upstream contract probes

Research result: [../upstream-compaction-research.md](../upstream-compaction-research.md).

The temp root was `/tmp/autobyteus-compaction-research-20260926.kVSGz5`. Pin fresh clones to commits in `repositories.json` before reproduction; do not silently use newer source. The selected-declaration harness reads upstream source without editing it; it does not import whole applications or run an end-to-end app. Its injected boundaries are commented in the script and described in the report.

```sh
node contract-probes.cjs <root-containing-five-clones> <path-to-typescript/lib/typescript.js>
```

This writes `contract-probe-results.json` into the clone root. Run with shell `set -o pipefail` if piping output. The original runtime/TypeScript versions are recorded in the result JSON.

Hermes used a disposable Python 3.11.15 virtual environment. `hermes-environment.txt` records installed versions (minimal research environment, not a fully bootstrapped upstream dev environment). Its canonical runner was invoked from the clone as follows:

```sh
HERMES_PYTHON=<venv>/bin/python HERMES_TEST_WORKERS=1 HERMES_TEST_FILE_RETRIES=0 \
  scripts/run_tests.sh tests/agent/test_context_compressor_summary_continuity.py
HERMES_PYTHON=<venv>/bin/python HERMES_TEST_WORKERS=1 HERMES_TEST_FILE_RETRIES=0 \
  scripts/run_tests.sh tests/agent/test_pre_compress_memory_context.py \
  tests/agent/test_compressor_truncated_summary_guard.py \
  tests/agent/test_context_compressor_reasoning_fallback.py
```

The first attempt failed to collect because `ruamel.yaml` was missing; dependencies were added before successful runs. All model outcomes in the selected tests/probes are mocks or fixtures. No paid-provider credentials are needed. Codex was inspected only; Rust toolchain absent.

Licenses: Hermes/OpenCode/DSH MIT; ZCode/Codex Apache-2.0. Full upstream source/license remains in each clone; the saved harness dynamically extracts declarations rather than vendoring project source.
