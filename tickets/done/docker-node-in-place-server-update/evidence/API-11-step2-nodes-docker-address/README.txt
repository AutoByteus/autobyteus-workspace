# API-11 (round 2, step 2) nodes-docker-address browser probe
# Command: env -i PATH="$PATH" HOME=<private tmp> TMPDIR=<private tmp> pnpm -C autobyteus-web test:e2e:nodes-docker-address --docker-image=autobyteus-server-305-test:step2 --output-dir=<this folder>
# Commit: 6637b54d46 (code b1029fc1b0); server dist built from this worktree
# Environment: macOS arm64, Docker 29.0.1, Node v22.23.1, headless Chrome; image autobyteus-server-305-test:step2 (sha256:50b3211b4b38…, arm64)
# Date: 2026-10-30T17:27Z-17:31Z; Case: API-11
# Receipt: nodes-docker-address-probe.json ("result": "Pass", ND-01..ND-05, imageDistDiff, cleanup).
# Redaction: the host's LAN, tailnet and IPv6 addresses were replaced by redacted-* placeholders before commit.
