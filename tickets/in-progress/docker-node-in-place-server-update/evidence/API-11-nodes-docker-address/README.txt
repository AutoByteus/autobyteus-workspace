# API-11 nodes-docker-address browser probe
# Command: env -i PATH="$PATH" HOME=<private tmp> TMPDIR=<private tmp> pnpm -C autobyteus-web test:e2e:nodes-docker-address --docker-image=autobyteus-server-305-test:step1 --output-dir=<this folder>
# Commit: 4c356d69b7 (probe file unchanged since 01c56f1b95); server dist built from this worktree
# Environment: macOS arm64, Docker 29.0.1, Node v22.23.1, headless Chrome; image autobyteus-server-305-test:step1 (sha256:ae18d6c1a66e…, arm64)
# Date: 2026-10-30T16:16Z-16:18Z; Case: API-11
# Receipt: nodes-docker-address-probe.json ("result": "Pass", cases ND-01..ND-05, imageDistDiff, cleanup).
# Redaction: the host's LAN, tailnet and IPv6 addresses in the desk node's candidate list were replaced
# by redacted-* placeholders before commit; loopback and host.docker.internal addresses are unchanged.
